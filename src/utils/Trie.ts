export class Trie<T> {
	root: TrieNode<T>;

	constructor() {
		this.root = new TrieNode();
	}

	insert(word: string, value: T): void {
		this.root.insert(word, 0, value);
	}

	has(word: string): boolean {
		return this.root.has(word);
	}

	findLongestPrefix(word: string, startIndex: number = 0): { value: T; length: number; str: string } | undefined {
		let node = this.root;
		let lastEndOfWord = node.isEndOfWord ? node : undefined;

		for (let i = startIndex; i < word.length; i++) {
			const char = word[i].toLowerCase();
			const child = node.children.get(char);
			if (!child) {
				break;
			}

			if (child.isEndOfWord) {
				lastEndOfWord = child;
			}

			node = child;
		}

		if (!lastEndOfWord) {
			return undefined;
		}

		return {
			value: lastEndOfWord.value as T, // safe because a node always has a value if it is an end of word
			length: lastEndOfWord.depth,
			str: word.slice(startIndex, startIndex + lastEndOfWord.depth),
		};
	}
}

export class TrieNode<T> {
	depth: number;
	children: Map<string, TrieNode<T>>;
	isEndOfWord: boolean;
	value: T | undefined;

	constructor(depth: number = 0) {
		this.depth = depth;
		this.children = new Map();
		this.isEndOfWord = false;
		this.value = undefined;
	}

	insert(word: string, index: number, value: T): void {
		if (word.length === index) {
			if (this.isEndOfWord) {
				throw new Error(`Duplicate key: ${word}`);
			}
			this.isEndOfWord = true;
			this.value = value;
			return;
		}

		const firstChar = word[index];
		let child = this.children.get(firstChar);
		if (!child) {
			child = new TrieNode(this.depth + 1);
			this.children.set(firstChar, child);
		}

		child.insert(word, index + 1, value);
	}

	has(word: string, index: number = 0): boolean {
		if (word.length === index) {
			return this.isEndOfWord;
		}

		const firstChar = word[index];
		const child = this.children.get(firstChar);
		if (!child) {
			return false;
		}
		return child.has(word, index + 1);
	}
}
