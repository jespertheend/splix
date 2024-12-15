/**
 * Limit the number of messages sent to the server within a time interval
 * to guard against socket abuse.
 * 
 * @example
 * const rateLimiter = new DinoRateLimiter({
 *    maxMessages: 20, // Allow a maximum of 20 messages
 *    interval: 100, // Within a 100ms time window
 *    onRateLimitExceeded: () => {
 *        socket.close(); // close the connection when limit is exceeded
 *    }
 * });
 * 
 * // Trigger the tick() method when a message is received
 * if (rateLimiter.tick()) {
 *    console.log('Rate limit exceeded');
 * } else {
 *    console.log('Message received');
 * }
 */

export class DinoRateLimiter {
    /**
     * @param {Object} options - Configurations
     * @param {number} options.maxMessages - Maximum number of messages allowed in the time interval.
     * @param {number} options.interval - Time interval in milliseconds for the rate limit.
     * @param {Function} [options.onRateLimitExceeded] - Optional callback to invoke when the rate limit is exceeded.
     */
    constructor({ maxMessages, interval, onRateLimitExceeded = undefined }) {
        /** @type {number[]} */
        this.messageTimeQueue = [];
        this.maxMessages = maxMessages;
        this.interval = interval;
        this.onRateLimitExceeded = onRateLimitExceeded;
    }

    /**
     * Checks if the rate limit is exceeded and pushes the message timestamp to the 
     * message queue. This method must be called every time a message is received. 
     * If the rate limit is reached, it executes the `onRateLimitExceeded` callback.
     *
     * @returns {boolean} - Returns true if the rate limit is exceeded, otherwise false.
     * 
     * @callback onRateLimitExceeded
     * @description Callback function that is executed when the rate limit is exceeded.
     */
    tick() {
        const now = Date.now();
        this.messageTimeQueue.push(now);

        // remove old message timestamps
        while (this.messageTimeQueue.length > 0 && now - this.messageTimeQueue[0] > this.interval) {
            this.messageTimeQueue.shift();
        }

        // console.log(this.messageTimeQueue.length); // DEBUG

        if (this.messageTimeQueue.length > this.maxMessages && this.onRateLimitExceeded) {
            this.onRateLimitExceeded();
            return true;
        }

        return false;
    }
}
