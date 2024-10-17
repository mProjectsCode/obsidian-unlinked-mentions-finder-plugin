import type { App } from 'obsidian';
import { PluginSettingTab, Setting } from 'obsidian';
import type UnlinkedMentionsFinderPlugin from 'src/main';

export class SampleSettingTab extends PluginSettingTab {
	plugin: UnlinkedMentionsFinderPlugin;

	constructor(app: App, plugin: UnlinkedMentionsFinderPlugin) {
		super(app, plugin);

		this.plugin = plugin;
	}

	display(): void {
		this.containerEl.empty();

		new Setting(this.containerEl)
			.setName('Link to self')
			.setDesc('Allows a note to link to itself.')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.linkToSelf).onChange(value => {
					this.plugin.settings.linkToSelf = value;
					void this.plugin.saveSettings();
				});
			});
	}
}
