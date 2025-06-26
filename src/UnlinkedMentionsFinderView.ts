import type { WorkspaceLeaf } from 'obsidian';
import { ItemView } from 'obsidian';
import type UnlinkedMentionsFinderPlugin from 'src/main';
import { MentionFinder } from 'src/MentionFinder';
import UnlinkedMentionsFinderComponent from 'src/UnlinkedMentionsFinderComponent.svelte';
import type { Component as SvelteComponent } from 'svelte';
import { mount, unmount } from 'svelte';

export const UNLINKED_MENTIONS_FINDER_VIEW_TYPE = 'unlinked-mentions-finder-view';

export class UnlinkedMentionsFinderView extends ItemView {
	component: ReturnType<SvelteComponent> | undefined;
	plugin: UnlinkedMentionsFinderPlugin;
	mentionFinder: MentionFinder;

	constructor(leaf: WorkspaceLeaf, plugin: UnlinkedMentionsFinderPlugin) {
		super(leaf);

		this.plugin = plugin;
		this.mentionFinder = new MentionFinder(plugin);
		this.mentionFinder.init();
	}

	getViewType(): string {
		return UNLINKED_MENTIONS_FINDER_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Unlinked Mentions Finder';
	}

	protected async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.classList.add('markdown-rendered');

		this.component = mount(UnlinkedMentionsFinderComponent, {
			target: this.contentEl,
			props: {
				view: this,
			},
		});
	}

	protected async onClose(): Promise<void> {
		if (this.component) {
			void unmount(this.component);
		}
	}
}
