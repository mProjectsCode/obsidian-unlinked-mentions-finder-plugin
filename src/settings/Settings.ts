export interface UnlinkedMentionsFinderSettings {
	linkToSelf: boolean;
	onlyIndexMarkdownFiles: boolean;
}

export const DEFAULT_SETTINGS: UnlinkedMentionsFinderSettings = {
	linkToSelf: false,
	onlyIndexMarkdownFiles: true,
};
