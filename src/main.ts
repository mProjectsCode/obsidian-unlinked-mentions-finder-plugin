import type { WorkspaceLeaf } from 'obsidian';
import { Plugin } from 'obsidian';
import { MentionFinder } from 'src/MentionFinder';
import type { MyPluginSettings } from 'src/settings/Settings';
import { DEFAULT_SETTINGS } from 'src/settings/Settings';
import { SampleSettingTab } from 'src/settings/SettingTab';
import { UNLINKED_MENTIONS_FINDER_VIEW_TYPE, UnlinkedMentionsFinderView } from 'src/UnlinkedMentionsFinderView';

export default class UnlinkedMentionsFinderPlugin extends Plugin {
	// @ts-ignore defined in on load;
	settings: MyPluginSettings;

	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerView(UNLINKED_MENTIONS_FINDER_VIEW_TYPE, (leaf: WorkspaceLeaf) => new UnlinkedMentionsFinderView(leaf, this));

		this.addCommand({
			id: 'test',
			name: 'Test',
			callback: async () => {
				const mentionFinder = new MentionFinder(this);
				mentionFinder.init();

				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					return;
				}

				const text = await this.app.vault.cachedRead(activeFile);
				const mentions = mentionFinder.findMentionsInText(text, activeFile);
				console.log(mentions);
			},
		});

		this.addCommand({
			id: 'test2',
			name: 'Test2',
			callback: async () => {
				const mentionFinder = new MentionFinder(this);
				mentionFinder.init();

				const mentions = await mentionFinder.findMentionsInVault();
				console.log(mentions);
			},
		});

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
		workspace.revealLeaf(leaf);
	}
}
