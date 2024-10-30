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

	findLongestPrefix(word: string, startIndex: number = 0): { value: T | undefined; length: number; str: string } {
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

		return {
			value: lastEndOfWord?.value,
			length: lastEndOfWord?.depth ?? 0,
			str: word.slice(startIndex, startIndex + (lastEndOfWord?.depth ?? 0)),
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
