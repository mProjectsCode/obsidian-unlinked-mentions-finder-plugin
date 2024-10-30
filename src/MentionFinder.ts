import type { TFile } from 'obsidian';
import { getFrontMatterInfo, parseFrontMatterAliases } from 'obsidian';
import type UnlinkedMentionsFinderPlugin from 'src/main';
import { Parser } from 'src/Parser';
import { Trie } from 'src/Trie';

const IGNORE_PROPERTY = 'ulmf_ignore';
const CASE_SENSITIVE_PROPERTY = 'ulmf_case_sensitive';
const IGNORE_ALIASES_PROPERTY = 'ulmf_ignore_aliases';
const IGNORE_TITLE_PROPERTY = 'ulmf_ignore_title';

export interface Mention {
	text: string;
	file: TFile;
	line: string;
	index: number;
	lineNumber: number;
	lineIndex: number;
	mentions: TFile[];
}

export interface IndexEntry {
	file: TFile;
	caseSensitive: boolean;
	str: string;
}

export class MentionFinder {
	plugin: UnlinkedMentionsFinderPlugin;
	fileNames: string[] = [];
	fileNameMap = new Map<string, IndexEntry[]>();
	fileNameTrie = new Trie<IndexEntry[]>();

	constructor(plugin: UnlinkedMentionsFinderPlugin) {
		this.plugin = plugin;
	}

	init(): void {
		this.buildFileNameIndex();
	}

	async rebuildFileNameIndex(): Promise<Mention[]> {
		this.buildFileNameIndex();
		return this.findMentionsInVault();
	}

	private buildFileNameIndex(): void {
		this.fileNameMap.clear();

		for (const file of this.plugin.app.vault.getFiles()) {
			if (this.plugin.settings.onlyIndexMarkdownFiles && !file.extension.toLowerCase().includes('md')) {
				continue;
			}

			const frontmatter = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
			// ignore flag
			if (frontmatter?.[IGNORE_PROPERTY] === true) {
				continue;
			}

			const caseSensitive = frontmatter?.[CASE_SENSITIVE_PROPERTY] === true;

			// aliases only flag
			if (frontmatter?.[IGNORE_TITLE_PROPERTY] !== true) {
				this.insertIntoFileNameMap(file.basename, file, caseSensitive);
			}

			if (frontmatter?.[IGNORE_ALIASES_PROPERTY] !== true) {
				const aliases = parseFrontMatterAliases(frontmatter) ?? [];
				for (const alias of aliases) {
					this.insertIntoFileNameMap(alias, file, caseSensitive);
				}
			}
		}

		this.fileNames = Array.from(this.fileNameMap.keys());
		this.fileNames.sort((a, b) => b.length - a.length);

		this.fileNameTrie = new Trie<IndexEntry[]>();
		for (const fileName of this.fileNames) {
			const entry = this.fileNameMap.get(fileName);
			if (entry && entry.length > 0) {
				this.fileNameTrie.insert(fileName, entry);
			}
		}
	}

	private insertIntoFileNameMap(fileName: string, file: TFile, caseSensitive: boolean): void {
		const lowerCaseFileName = fileName.toLowerCase();

		if (this.fileNameMap.has(lowerCaseFileName)) {
			this.fileNameMap.get(lowerCaseFileName)?.push({
				file: file,
				caseSensitive: caseSensitive,
				str: fileName,
			});
		} else {
			this.fileNameMap.set(lowerCaseFileName, [
				{
					file: file,
					caseSensitive: caseSensitive,
					str: fileName,
				},
			]);
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

			if (!parser.isAlphanumeric(parser.lineIndex) || parser.isAlphanumeric(parser.lineIndex - 1)) {
				parser.advance();
				continue;
			}

			// const mention = this.findMention(parser, parser.currentLine(), parser.lineIndex);
			const mention = this.fileNameTrie.findLongestPrefix(parser.currentLine(), parser.lineIndex);
			// console.log(mention, parser.currentLine(), parser.lineIndex);

			if (mention.value && !parser.isAlphanumeric(parser.lineIndex + mention.length)) {
				// let files = this.plugin.settings.linkToSelf ? mention.value : mention.value.filter(e => e.file.path !== file.path);
				// files = files.filter(e => e.caseSensitive ? e.str === mention.str : e);

				const files = new Array<TFile>();

				for (const element of mention.value) {
					if (!this.plugin.settings.linkToSelf && element.file.path === file.path) {
						continue;
					}

					if (element.caseSensitive && element.str !== mention.str) {
						continue;
					}

					files.push(element.file);
				}

				if (files.length !== 0) {
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
