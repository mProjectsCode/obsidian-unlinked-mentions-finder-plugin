export interface MyPluginSettings {
	linkToSelf: boolean;
	onlyIndexMarkdownFiles: boolean;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	linkToSelf: false,
	onlyIndexMarkdownFiles: true,
};
