import type { TFile, WorkspaceLeaf } from 'obsidian';
import { Notice, Plugin } from 'obsidian';
import { HeadingMentionFinder } from 'src/HeadingMentionFinder';
import { MentionFinder } from 'src/MentionFinder';
import type { MyPluginSettings } from 'src/settings/Settings';
import { DEFAULT_SETTINGS } from 'src/settings/Settings';
import { SampleSettingTab } from 'src/settings/SettingTab';
import { UnlinkedMentionsFinderView } from 'src/ui/UnlinkedMentionsFinderView';

export const UNLINKED_MENTIONS_FINDER_VIEW_TYPE = 'unlinked-mentions-finder-view';
export const UNLINKED_HEADING_MENTIONS_FINDER_VIEW_TYPE = 'unlinked-heading-mentions-finder-view';

export default class UnlinkedMentionsFinderPlugin extends Plugin {
	// @ts-ignore defined in on load;
	settings: MyPluginSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerView(UNLINKED_MENTIONS_FINDER_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
			const mentionFinder = new MentionFinder(this);
			return new UnlinkedMentionsFinderView(UNLINKED_MENTIONS_FINDER_VIEW_TYPE, leaf, this, mentionFinder);
		});

		this.registerView(UNLINKED_HEADING_MENTIONS_FINDER_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
			const mentionFinder = new HeadingMentionFinder(this);
			return new UnlinkedMentionsFinderView(UNLINKED_HEADING_MENTIONS_FINDER_VIEW_TYPE, leaf, this, mentionFinder);
		});

		this.addCommand({
			id: 'open-unlinked-mentions-finder',
			name: 'Open Unlinked Mentions Finder',
			callback: async () => {
				await this.activateView(UNLINKED_MENTIONS_FINDER_VIEW_TYPE);
			},
		});

		this.addCommand({
			id: 'open-unlinked-heading-mentions-finder',
			name: 'Open Unlinked Heading Mentions Finder',
			callback: async () => {
				await this.activateView(UNLINKED_HEADING_MENTIONS_FINDER_VIEW_TYPE);
			},
		});
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as MyPluginSettings;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async activateView(viewType: string): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null;
		const leaves = workspace.getLeavesOfType(viewType);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({ type: viewType, active: true });
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		await workspace.revealLeaf(leaf);
	}

	/**
	 * Replaces a string at a specific index in a file.
	 * This checks that the string at the index matches the expected string before replacing it.
	 * If the string matches and the replacement is successful, it returns true.
	 * If the replacement was unsuccessful (e.g., the string at the index has changed), it returns false.
	 *
	 * @param file the file to replace in
	 * @param index the start index of the expected string
	 * @param expected the expected string at the position
	 * @param replacement the replacement string for the expected string
	 * @returns
	 */
	async safeReplaceAtIndex(file: TFile, index: number, expected: string, replacement: string): Promise<boolean> {
		try {
			let modified = false;
			await this.app.vault.process(file, text => {
				const pre = text.slice(0, index);
				const post = text.slice(index + expected.length);
				const oldText = text.slice(index, index + expected.length);

				if (oldText !== expected) {
					new Notice('Failed to replace text. The text has changed since it was found.');
					return text;
				}

				modified = true;
				return pre + replacement + post;
			});

			return modified;
		} catch (e) {
			new Notice('Failed to replace text. See the console for more info.');
			console.warn(e);
			return false;
		}
	}
}
