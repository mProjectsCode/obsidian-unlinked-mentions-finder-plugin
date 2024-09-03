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

	function findMentions() {
		view.mentionFinder.findMentionsInVault().then(res => {
			results = res;
		});
	}

	async function linkResult(result: Mention, target: TFile) {
		if (await view.mentionFinder.linkMention(result, target)) {
			results = results.filter(r => r !== result);
		}
	}
</script>

<button onclick={() => findMentions()}>Find Mentions</button>

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
							<button onclick={() => void linkResult(result, mention)}>{mention.name}</button>
						{/each}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<p>No mentions found</p>
{/if}
