import type { TFile, WorkspaceLeaf } from 'obsidian';
import { Notice, Plugin } from 'obsidian';
import type { MyPluginSettings } from 'src/settings/Settings';
import { DEFAULT_SETTINGS } from 'src/settings/Settings';
import { SampleSettingTab } from 'src/settings/SettingTab';
import { UNLINKED_MENTIONS_FINDER_VIEW_TYPE, UnlinkedMentionsFinderView } from 'src/UnlinkedMentionsFinderView';

export default class UnlinkedMentionsFinderPlugin extends Plugin {
	// @ts-ignore defined in on load;
	settings: MyPluginSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerView(UNLINKED_MENTIONS_FINDER_VIEW_TYPE, (leaf: WorkspaceLeaf) => new UnlinkedMentionsFinderView(leaf, this));

		this.addCommand({
			id: 'open-unlinked-mentions-finder',
			name: 'Open Unlinked Mentions Finder',
			callback: async () => {
				await this.activateView(UNLINKED_MENTIONS_FINDER_VIEW_TYPE);
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

	async safeReplaceAtIndex(file: TFile, index: number, str: string, replacement: string): Promise<boolean> {
		try {
			let modified = false;
			await this.app.vault.process(file, text => {
				const pre = text.slice(0, index);
				const post = text.slice(index + str.length);
				const oldText = text.slice(index, index + str.length);

				if (oldText !== str) {
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

	generateLink(file: TFile, sourcePath: string, text: string): string {
		return this.app.fileManager.generateMarkdownLink(file, sourcePath, '', text);
	}
}
