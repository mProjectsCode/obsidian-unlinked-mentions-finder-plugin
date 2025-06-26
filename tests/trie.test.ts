import { describe, test, expect, beforeEach } from 'bun:test';
import { Trie } from 'src/Trie';

describe('Trie', () => {
	let trie: Trie<number>;

	beforeEach(() => {
		trie = new Trie<number>();
	});

	test('has', () => {
		trie.insert('hello', 1);
		expect(trie.has('hello')).toBe(true);
		expect(trie.has('hell')).toBe(false);
		expect(trie.has('world')).toBe(false);
	});

	test('longestPrefix 1', () => {
		trie.insert('hello', 1);
		trie.insert('hell', 2);
		trie.insert('heaven', 3);

		const result = trie.findLongestPrefix('test helloworld', 5);
		expect(result?.value).toBe(1);
		expect(result?.length).toBe(5);
		expect(result?.str).toBe('hello');
	});

	test('longestPrefix 2', () => {
		trie.insert('hello', 1);
		trie.insert('hell', 2);
		trie.insert('heaven', 3);

		const result = trie.findLongestPrefix('test hellworld', 5);
		expect(result?.value).toBe(2);
		expect(result?.length).toBe(4);
		expect(result?.str).toBe('hell');
	});

	test('longestPrefix 3', () => {
		trie.insert('hello', 1);
		trie.insert('hell', 2);
		trie.insert('heaven', 3);

		const result = trie.findLongestPrefix('test hellworld', 3);
		expect(result).toBeUndefined();
	});

	test('longestPrefix 3', () => {
		trie.insert('hello', 1);
		trie.insert('hell', 2);
		trie.insert('heaven', 3);

		const result = trie.findLongestPrefix('test heavy', 5);
		expect(result).toBeUndefined();
	});
});
