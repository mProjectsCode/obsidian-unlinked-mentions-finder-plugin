<script lang="ts" generics="T">
	import type { Mention } from '../MentionFinder';

	let { mention }: { mention: Mention<T> } = $props();

	let m = $state(mention);

	let pre = $derived(mention.line.substring(0, mention.lineIndex));
	let post = $derived(mention.line.substring(mention.lineIndex + mention.text.length));
</script>

{pre}<span class="ulmf-mention-highlight">{mention.text}</span>{post}
