import type { TFile } from 'obsidian';
import { getFrontMatterInfo } from 'obsidian';
import type { IMentionFinder } from 'src/IMentionFinder';
import type UnlinkedMentionsFinderPlugin from 'src/main';
import type { Mention } from 'src/MentionFinder';
import { Parser } from 'src/utils/Parser';

const HEADING_REGEXP = /^[\W\D]?(\w\d+)(\w?)\b/;
const MENTION_REGEXP = /^(\w\d+)(\w?)\b/;

interface IndexEntry {
	// like `A45`
	identifier: string;
	// Maps sub-identifiers to headings
	// like `c`, as in `A45c` to the heading `# A45c - Foo Bar`
	subEntries: Map<string | undefined, string>;
}

export class HeadingMentionFinder implements IMentionFinder<string> {
	plugin: UnlinkedMentionsFinderPlugin;

	constructor(plugin: UnlinkedMentionsFinderPlugin) {
		this.plugin = plugin;
	}

	async findMentions(_: boolean): Promise<Mention<string>[]> {
		const all = [];
		for (const file of this.plugin.app.vault.getFiles()) {
			const mentions = await this.findMentionsInFile(file);
			all.push(...mentions);
		}
		return all;
	}

	private buildIndex(file: TFile): IndexEntry[] {
		const headings = this.plugin.app.metadataCache.getFileCache(file)?.headings;
		if (!headings) {
			return [];
		}

		const index: IndexEntry[] = [];
		for (const heading of headings) {
			const match = HEADING_REGEXP.exec(heading.heading);
			if (match) {
				const identifier = match[1];
				const subIdentifier = match[2] || undefined;

				const existing = index.find(entry => entry.identifier === identifier);
				if (existing) {
					existing.subEntries.set(subIdentifier, heading.heading);
				} else {
					const map = new Map<string | undefined, string>();
					map.set(subIdentifier, heading.heading);

					const newEntry: IndexEntry = {
						identifier: identifier,
						subEntries: map,
					};
					index.push(newEntry);
				}
			}
		}

		return index;
	}

	private findBestMatch(identifier: string, subIdentifier: string | undefined, index: IndexEntry[]): string | undefined {
		const entry = index.find(entry => entry.identifier === identifier);
		if (entry) {
			return entry.subEntries.get(subIdentifier);
		}
		return undefined;
	}

	async findMentionsInFile(file: TFile): Promise<Mention<string>[]> {
		const index = this.buildIndex(file);

		let text = await this.plugin.app.vault.cachedRead(file);
		const frontmatterInfo = getFrontMatterInfo(text);
		text = text.slice(frontmatterInfo.contentStart);

		const result: Mention<string>[] = [];
		const parser = new Parser(text, frontmatterInfo.contentStart);
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

			const line = parser.currentLine();
			const match = MENTION_REGEXP.exec(line);
			if (match) {
				const identifier = match[1];
				const subIdentifier = match[2] || undefined;
				const total = identifier + (subIdentifier ?? '');
				const heading = this.findBestMatch(identifier, subIdentifier, index);

				if (heading) {
					result.push({
						text: total,
						file: file,
						index: parser.index + match.index,
						line: line,
						lineNumber: parser.lineNumber,
						lineIndex: parser.lineIndex + match.index,
						mentions: [heading],
					});
				}

				parser.advanceN(identifier.length);
			} else {
				parser.advance();
			}
		}

		return result;
	}

	async linkMention(mention: Mention<string>, target: string): Promise<boolean> {
		const linkText = this.plugin.app.fileManager.generateMarkdownLink(mention.file, mention.file.path, `#${target}`, mention.text);
		return await this.plugin.safeReplaceAtIndex(mention.file, mention.index, mention.text, linkText);
	}
}
