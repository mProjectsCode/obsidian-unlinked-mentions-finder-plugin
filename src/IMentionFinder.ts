import type { TFile } from 'obsidian';
import type { Mention } from 'src/MentionFinder';

export interface IMentionFinder<T> {
	findMentions(rebuildIndex: boolean): Promise<Mention<T>[]>;
	findMentionsInFile(file: TFile): Promise<Mention<T>[]>;
	linkMention(mention: Mention<T>, target: T): Promise<boolean>;
}
