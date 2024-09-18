<script lang="ts">
	import type { TFile } from 'obsidian';
	import LinkComponent from './LinkComponent.svelte';
	import type { Mention } from './MentionFinder';
	import MentionHighlight from './MentionHighlight.svelte';
	import { UnlinkedMentionsFinderView } from './UnlinkedMentionsFinderView';

	const {
		view,
	}: {
		view: UnlinkedMentionsFinderView;
	} = $props();

	let results: Mention[] = $state([]);
	let locked: boolean = $state(false);

	function findMentions() {
		locked = true;
		results = [];
		view.mentionFinder.findMentionsInVault().then(res => {
			locked = false;
			results = res;
		});
	}

	async function linkResult(result: Mention, target: TFile) {
		locked = true;

		if (await view.mentionFinder.linkMention(result, target)) {
			results = results.filter(r => r !== result);

			await reScanFile(result.file);

			locked = false;
		}

		locked = false;
	}

	async function reScanFile(file: TFile) {
		const newMentions = await view.mentionFinder.findMentionsInFile(file);
		const regionStart = results.findIndex(r => r.file === file);
		if (regionStart === -1) {
			results.push(...newMentions);
			return;
		}

		results = results.filter(r => r.file !== file);
		results.splice(regionStart, 0, ...newMentions);
	}
</script>

<button onclick={() => findMentions()} disabled={locked}>Find Mentions</button>

{#if results.length > 0}
	<table style="width: 100%">
		<thead>
			<tr>
				<th>Mention</th>
				<th>In</th>
				<th>Link</th>
			</tr>
		</thead>
		<tbody>
			{#each results as result}
				<tr>
					<td><MentionHighlight mention={result}></MentionHighlight></td>
					<td><LinkComponent file={result.file} app={view.plugin.app}></LinkComponent></td>
					<td>
						{#each result.mentions as mention}
							<!-- <LinkComponent file={mention} app={view.plugin.app}></LinkComponent> -->
							<button onclick={() => void linkResult(result, mention)} disabled={locked}>{mention.name}</button>
						{/each}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<p>No mentions found</p>
{/if}
