export class Parser {
	lines: string[];
	lineNumber: number;
	lineIndex: number;
	atEnd: boolean;

	constructor(str: string) {
		this.lines = str.split('\n');
		this.lineNumber = 1;
		this.lineIndex = 0;
		this.atEnd = false;
	}

	current(): string {
		return this.currentLine()[this.lineIndex];
	}

	currentLine(): string {
		return this.lines[this.lineNumber - 1];
	}

	advanceToNextLine(): void {
		this.lineNumber += 1;
		this.lineIndex = 0;

		if (this.lineNumber > this.lines.length) {
			this.atEnd = true;
		}
	}

	advance(): void {
		if (this.lineIndex >= this.currentLine().length) {
			this.lineNumber += 1;
			this.lineIndex = 0;

			if (this.lineNumber > this.lines.length) {
				this.atEnd = true;
			}
		} else {
			this.lineIndex += 1;
		}
	}

	advanceN(n: number): void {
		for (let i = 0; i < n; i++) {
			this.advance();
		}
	}

	previousAlphanumeric(): boolean {
		if (this.lineIndex === 0) {
			return false;
		}
		const char = this.currentLine()[this.lineIndex - 1];
		return /^[\p{L}\p{N}]*$/u.test(char);
	}

	isAlphanumeric(index: number): boolean {
		if (index < 0 || index >= this.currentLine().length) {
			return false;
		}
		const char = this.currentLine()[index];
		return /^[\p{L}\p{N}]*$/u.test(char);
	}
}
