import type { App, SettingDefinitionItem } from 'obsidian';
import { PluginSettingTab } from 'obsidian';
import type UnlinkedMentionsFinderPlugin from 'src/main';

export class UnlinkedMentionsFinderSettingTab extends PluginSettingTab {
	plugin: UnlinkedMentionsFinderPlugin;

	constructor(app: App, plugin: UnlinkedMentionsFinderPlugin) {
		super(app, plugin);

		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Link to self',
				desc: 'Allows a note to link to itself.',
				control: { type: 'toggle', key: 'linkToSelf' },
			},
			{
				name: 'Only find unlinked mentions of markdown files',
				desc: `Only find unlinked mentions of markdown files and don't find unlinked mentions of other file types such as PDFs.`,
				control: { type: 'toggle', key: 'onlyIndexMarkdownFiles' },
			},
		];
	}
}
