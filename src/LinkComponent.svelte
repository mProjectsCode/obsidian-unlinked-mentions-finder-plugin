<script lang="ts">
	import type { App, TFile } from 'obsidian';

	let {
		file,
		app,
	}: {
		file: TFile;
		app: App;
	} = $props();

	let href = $derived(file.path.substring(0, file.path.length - file.extension.length));

	function openFile() {
		app.workspace.openLinkText(href, '', true);
	}
</script>

<a data-href={href} href={href} class="internal-link" target="_blank" rel="noopener" aria-label={href} onclick={() => openFile()}>
	{file.basename}
</a>
