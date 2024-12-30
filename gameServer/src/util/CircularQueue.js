export class CircularQueue {
	/**
	 * @param {number} maxSize
	 */
	constructor(maxSize) {
		if (maxSize <= 0) {
			throw new Error("Max size must be greater than 0");
		}
		this.buffer = new Uint16Array(maxSize * 2);
		this.maxSize = maxSize;
		this.head = 0;
		this.tail = 0;
		this.size = 0;
	}

	isFull() {
		return this.size === this.maxSize;
	}

	isEmpty() {
		return this.size === 0;
	}

	/**
	 * @param {number[]} pair
	 */
	enqueue(pair) {
		if (this.isFull()) {
			throw new Error("Queue is full");
		}
		if (!Array.isArray(pair) || pair.length !== 2) {
			throw new Error("The value must be a pair (array of two elements)");
		}

		this.buffer[this.tail] = pair[0];
		this.buffer[(this.tail + 1) % (this.maxSize * 2)] = pair[1];

		this.tail = (this.tail + 2) % (this.maxSize * 2);
		this.size++;
	}

	dequeue() {
		if (this.isEmpty()) {
			throw new Error("Queue is empty");
		}

		const pair = [this.buffer[this.head], this.buffer[(this.head + 1) % (this.maxSize * 2)]];

		this.head = (this.head + 2) % (this.maxSize * 2);
		this.size--;
		return pair;
	}

	peek() {
		if (this.isEmpty()) {
			throw new Error("Queue is empty");
		}
		return [this.buffer[this.head], this.buffer[(this.head + 1) % (this.maxSize * 2)]];
	}

	clear() {
		this.head = 0;
		this.tail = 0;
		this.size = 0;
	}
}
