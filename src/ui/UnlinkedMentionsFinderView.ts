import type { WorkspaceLeaf } from 'obsidian';
import { ItemView } from 'obsidian';
import type { IMentionFinder } from 'src/IMentionFinder';
import type UnlinkedMentionsFinderPlugin from 'src/main';
import UnlinkedMentionsFinderComponent from 'src/ui/UnlinkedMentionsFinderComponent.svelte';
import type { Component as SvelteComponent } from 'svelte';
import { mount, unmount } from 'svelte';

export class UnlinkedMentionsFinderView<T> extends ItemView {
	component: ReturnType<SvelteComponent> | undefined;
	plugin: UnlinkedMentionsFinderPlugin;
	mentionFinder: IMentionFinder<T>;
	viewType: string;

	constructor(viewType: string, leaf: WorkspaceLeaf, plugin: UnlinkedMentionsFinderPlugin, mentionFinder: IMentionFinder<T>) {
		super(leaf);

		this.viewType = viewType;
		this.plugin = plugin;
		this.mentionFinder = mentionFinder;
	}

	getViewType(): string {
		return this.viewType;
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
