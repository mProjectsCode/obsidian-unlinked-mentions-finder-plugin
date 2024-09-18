import type { TFile } from 'obsidian';
import { getFrontMatterInfo, parseFrontMatterAliases } from 'obsidian';
import type UnlinkedMentionsFinderPlugin from 'src/main';
import { Parser } from 'src/Parser';

export interface Mention {
	text: string;
	file: TFile;
	line: string;
	index: number;
	lineNumber: number;
	lineIndex: number;
	mentions: TFile[];
}

export class MentionFinder {
	plugin: UnlinkedMentionsFinderPlugin;
	fileNames: string[] = [];
	fileNameMap = new Map<string, TFile[]>();

	constructor(plugin: UnlinkedMentionsFinderPlugin) {
		this.plugin = plugin;
	}

	init(): void {
		this.buildFileNameIndex();
	}

	private buildFileNameIndex(): void {
		this.fileNameMap.clear();

		for (const file of this.plugin.app.vault.getFiles()) {
			this.insertIntoFileNameMap(file.basename, file);

			const frontmatter = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
			const aliases = parseFrontMatterAliases(frontmatter) ?? [];
			for (const alias of aliases) {
				this.insertIntoFileNameMap(alias, file);
			}
		}

		this.fileNames = Array.from(this.fileNameMap.keys());
		this.fileNames.sort((a, b) => b.length - a.length);
	}

	private insertIntoFileNameMap(fileName: string, file: TFile): void {
		fileName = fileName.toLowerCase();

		if (this.fileNameMap.has(fileName)) {
			this.fileNameMap.get(fileName)?.push(file);
		} else {
			this.fileNameMap.set(fileName, [file]);
		}
	}

	async findMentionsInVault(): Promise<Mention[]> {
		const result: Mention[] = [];

		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			result.push(...(await this.findMentionsInFile(file)));
		}

		return result;
	}

	async findMentionsInFile(file: TFile): Promise<Mention[]> {
		let text = await this.plugin.app.vault.cachedRead(file);
		const frontmatterInfo = getFrontMatterInfo(text);
		text = text.slice(frontmatterInfo.contentStart);

		return this.findMentionsInText(text, frontmatterInfo.contentStart, file);
	}

	findMentionsInText(text: string, startIndex: number, file: TFile): Mention[] {
		const result: Mention[] = [];
		const parser = new Parser(text, startIndex);
		let inLink = false;

		while (!parser.atEnd) {
			if (parser.lineIndex === 0 && parser.current() === '#') {
				parser.advanceToNextLine();
				continue;
			}

			if (this.matchStringAtIndex(parser, false, parser.currentLine(), parser.lineIndex, '[[')) {
				inLink = true;
				parser.advanceN(2);
				continue;
			}

			if (this.matchStringAtIndex(parser, false, parser.currentLine(), parser.lineIndex, ']]')) {
				inLink = false;
				parser.advanceN(2);
				continue;
			}

			if (inLink) {
				parser.advance();
				continue;
			}

			if (!(parser.isAlphanumeric(parser.lineIndex) && !parser.isAlphanumeric(parser.lineIndex - 1))) {
				parser.advance();
				continue;
			}

			const mention = this.findMention(parser, parser.currentLine(), parser.lineIndex);
			if (mention) {
				let files = this.fileNameMap.get(mention.toLowerCase()) ?? [];
				files = files.filter(f => f.path !== file.path);

				if (files.length > 0) {
					result.push({
						text: parser.currentLine().substring(parser.lineIndex, parser.lineIndex + mention.length),
						file: file,
						index: parser.index,
						line: parser.currentLine(),
						lineNumber: parser.lineNumber,
						lineIndex: parser.lineIndex,
						mentions: files,
					});
				}

				parser.advanceN(mention.length);
			} else {
				parser.advance();
			}
		}
		return result;
	}

	private findMention(parser: Parser, text: string, index: number): string | undefined {
		for (const fileName of this.fileNames) {
			if (this.matchStringAtIndex(parser, true, text, index, fileName)) {
				return fileName;
			}
		}

		return undefined;
	}

	private matchStringAtIndex(parser: Parser, word: boolean, text: string, index: number, match: string): boolean {
		for (let i = 0; i < match.length; i++) {
			if (index + i >= text.length) {
				return false;
			}

			if (text[index + i].toLowerCase() !== match[i]) {
				return false;
			}
		}

		return !word || !parser.isAlphanumeric(index + match.length);
	}

	async linkMention(mention: Mention, target: TFile): Promise<boolean> {
		const linkText = this.plugin.generateLink(target, mention.file.path, mention.text);
		return await this.plugin.safeReplaceAtIndex(mention.file, mention.index, mention.text, linkText);
	}
}
