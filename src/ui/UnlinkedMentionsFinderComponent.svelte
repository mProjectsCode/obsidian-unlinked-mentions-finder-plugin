<script lang="ts" generics="T">
	import { TFile } from 'obsidian';
	import LinkComponent from './LinkComponent.svelte';
	import type { Mention } from '../MentionFinder';
	import MentionHighlight from './MentionHighlight.svelte';
	import { UnlinkedMentionsFinderView } from './UnlinkedMentionsFinderView';

	const {
		view,
	}: {
		view: UnlinkedMentionsFinderView<T>;
	} = $props();

	let mentions: Mention<T>[] = $state([]);
	let locked: boolean = $state(false);

	async function withLocked<T>(fn: () => Promise<T>): Promise<T> {
		locked = true;
		try {
			return await fn();
		} finally {
			locked = false;
		}
	}

	async function findMentions(rebuildIndex: boolean) {
		mentions = await withLocked(async () => view.mentionFinder.findMentions(rebuildIndex));
	}

	async function linkResult(mention: Mention<T>, target: T) {
		await withLocked(async () => {
			if (await view.mentionFinder.linkMention(mention, target)) {
				mentions = mentions.filter(m => m !== mention);
				await reScanFile(mention.file);
			}
		});
	}

	async function reScanFile(file: TFile) {
		const newMentions = await view.mentionFinder.findMentionsInFile(file);
		const regionStart = mentions.findIndex(r => r.file === file);
		if (regionStart === -1) {
			mentions.push(...newMentions);
			return;
		}

		mentions = mentions.filter(r => r.file !== file);
		mentions.splice(regionStart, 0, ...newMentions);
	}
</script>

<button onclick={() => findMentions(false)} disabled={locked}>Find Mentions</button>
<button onclick={() => findMentions(true)} disabled={locked}>Rebuild File Index</button>

{#if mentions.length > 0}
	<p>Found {mentions.length} mentions</p>

	<table style="width: 100%">
		<thead>
			<tr>
				<th>Mention</th>
				<th>In</th>
				<th>Link</th>
			</tr>
		</thead>
		<tbody>
			{#each mentions.slice(0, 100) as mention}
				<tr>
					<td><MentionHighlight mention={mention}></MentionHighlight></td>
					<td><LinkComponent file={mention.file} app={view.plugin.app}></LinkComponent></td>
					<td>
						{#each mention.mentions as m}
							<!-- <LinkComponent file={mention} app={view.plugin.app}></LinkComponent> -->
							<button onclick={() => void linkResult(mention, m)} disabled={locked}>{m instanceof TFile ? m.name : String(m)}</button>
						{/each}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else if locked}
	<p>Searching...</p>
{:else}
	<p>No mentions found</p>
{/if}
