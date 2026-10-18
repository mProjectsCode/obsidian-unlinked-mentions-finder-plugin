<script lang="ts">
	import type { App, TFile } from 'obsidian';

	let {
		file,
		app,
	}: {
		file: TFile;
		app: App;
	} = $props();

	let href = $derived(file.path);

	function openFile() {
		void app.workspace.openLinkText(href, '', true).catch(console.error);
	}
</script>

<a data-href={href} href={href} class="internal-link" target="_blank" rel="noopener" aria-label={href} onclick={() => openFile()}>
	{file.basename}
</a>
