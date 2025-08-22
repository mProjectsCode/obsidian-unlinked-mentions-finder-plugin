import type { TFile } from 'obsidian';
import { getFrontMatterInfo, parseFrontMatterAliases } from 'obsidian';
import type { IMentionFinder } from 'src/IMentionFinder';
import type UnlinkedMentionsFinderPlugin from 'src/main';
import { Parser } from 'src/utils/Parser';
import { Trie } from 'src/utils/Trie';

// These files are not checked for mentions
const SKIP_PROPERTY = 'ulmf_skip';
// These files are ignored in indexing
const IGNORE_PROPERTY = 'ulmf_ignore';
const CASE_SENSITIVE_PROPERTY = 'ulmf_case_sensitive';
const IGNORE_ALIASES_PROPERTY = 'ulmf_ignore_aliases';
const IGNORE_TITLE_PROPERTY = 'ulmf_ignore_title';

export interface Mention<T> {
	text: string;
	file: TFile;
	line: string;
	index: number;
	lineNumber: number;
	lineIndex: number;
	mentions: T[];
}

export interface IndexEntry {
	file: TFile;
	caseSensitive: boolean;
	str: string;
}

export class MentionFinder implements IMentionFinder<TFile> {
	plugin: UnlinkedMentionsFinderPlugin;
	fileNameMap = new Map<string, IndexEntry[]>();
	fileNameTrie = new Trie<IndexEntry[]>();

	constructor(plugin: UnlinkedMentionsFinderPlugin) {
		this.plugin = plugin;
		this.buildFileNameIndex();
	}

	async findMentions(rebuildIndex: boolean): Promise<Mention<TFile>[]> {
		if (rebuildIndex) {
			this.buildFileNameIndex();
		}

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

		this.fileNameTrie = new Trie<IndexEntry[]>();
		for (const [name, entry] of this.fileNameMap) {
			if (entry && entry.length > 0) {
				this.fileNameTrie.insert(name, entry);
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

	async findMentionsInVault(): Promise<Mention<TFile>[]> {
		const intermediate = await Promise.all(
			this.plugin.app.vault
				.getMarkdownFiles()
				.filter(file => {
					return this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.[SKIP_PROPERTY] !== true;
				})
				.map(async file => {
					return await this.findMentionsInFile(file);
				}),
		);

		return intermediate.flat();
	}

	async findMentionsInFile(file: TFile): Promise<Mention<TFile>[]> {
		let text = await this.plugin.app.vault.cachedRead(file);
		const frontmatterInfo = getFrontMatterInfo(text);
		text = text.slice(frontmatterInfo.contentStart);

		return this.findMentionsInText(text, frontmatterInfo.contentStart, file);
	}

	findMentionsInText(text: string, startIndex: number, file: TFile): Mention<TFile>[] {
		const result: Mention<TFile>[] = [];
		const parser = new Parser(text, startIndex);
		let inLink = false;

		while (!parser.atEnd) {
			// line starts with a hashtag, so it's a header, so we skip it
			if (parser.lineIndex === 0 && parser.currentMatches('#')) {
				parser.advanceToNextLine();
				continue;
			}

			// we found the beginning of a link
			if (parser.currentMatches('[') && parser.nextMatches('[')) {
				inLink = true;
				parser.advanceN(2);
				continue;
			}

			// we found the end of a link
			if (parser.currentMatches(']') && parser.nextMatches(']')) {
				inLink = false;
				parser.advanceN(2);
				continue;
			}

			// do nothing if we are in a link
			if (inLink) {
				parser.advance();
				continue;
			}

			// we only want to match at the beginning of a word, so search for a place where non letters end.
			// e.g. "foo bar (baz)"
			//       ^   ^    ^
			// are the positions where we want to match
			//
			// so we skip if we see whitespace or punctuation
			// and we skip if the previous character was a letter, because then we are in the middle of a word
			if (!parser.currentAlphanumeric() || parser.previousAlphanumeric()) {
				parser.advance();
				continue;
			}

			const mention = this.fileNameTrie.findLongestPrefix(parser.currentLine(), parser.lineIndex);

			// if we found a mention and the mention is followed by a non-alphanumeric character,
			// we can safely assume that this is a mention and not part of a word
			if (mention && !parser.isAlphanumeric(parser.lineIndex + mention.length)) {
				const files = [];

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

	async linkMention(mention: Mention<TFile>, target: TFile): Promise<boolean> {
		const linkText = this.plugin.app.fileManager.generateMarkdownLink(target, mention.file.path, '', mention.text);
		return await this.plugin.safeReplaceAtIndex(mention.file, mention.index, mention.text, linkText);
	}
}
