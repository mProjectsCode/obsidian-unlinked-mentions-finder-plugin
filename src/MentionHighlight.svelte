<script lang="ts">
	import type { Mention } from './MentionFinder';

	const { mention }: { mention: Mention } = $props();

	const pre = mention.line.substring(0, mention.lineIndex);
	const post = mention.line.substring(mention.lineIndex + mention.text.length);
</script>

{pre}<span class="ulmf-mention-highlight">{mention.text}</span>{post}
