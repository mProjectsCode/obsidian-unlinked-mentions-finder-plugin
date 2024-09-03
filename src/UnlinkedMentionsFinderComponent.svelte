<script lang="ts">
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
							<LinkComponent file={mention} app={view.plugin.app}></LinkComponent>
						{/each}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<p>No mentions found</p>
{/if}
