export class Perf {
    /**
     * @type {Object<string, { avgTime: number, totalTime: number, startTime: number, calls: number, lastElapsedTime: number }>}
     */
    static metrics = {};

    /**
     * @type {Object<string, number>}
     */
    static counter = {};

    /**s
     * @param {string} routineName
     */
    static start(routineName) {
        if (!this.metrics[routineName]) {
            this.metrics[routineName] = { avgTime: 0, totalTime: 0, lastElapsedTime: 0, calls: 0, startTime: 0 };
        }
        this.metrics[routineName].startTime = performance.now();
    }

    /**
     * @param {string} routineName
     */
    static end(routineName) {
        if (!this.metrics[routineName]) {
            console.error(`<${routineName}>: start time is not set.`);
            return;
        }

        const endTime = performance.now();
        const entry = this.metrics[routineName];

        if (entry.startTime === 0) {
            console.error(`<${routineName}>: start time is not set.`);
            return;
        }

        const elapsedTime = endTime - entry.startTime;
        entry.totalTime += elapsedTime;
        entry.calls += 1;
        entry.avgTime = entry.totalTime / entry.calls;
        entry.startTime = 0;
        entry.lastElapsedTime = elapsedTime;
    }

    /**
     * @param {string} counterName
     */
    static count(counterName) {
        if (!this.counter[counterName]) {
            this.counter[counterName] = 0;
        }
        this.counter[counterName] += 1;
    }

    static print() {
        console.log(this.metrics);
        if (Object.entries(this.counter).length) {
            console.log(this.counter);
        }
    }

    /**
     * @type {number | null}
     */
    static schedule = null;

    static scheduledPrint() {
        if (this.schedule !== null) {
            return;
        }
        this.schedule = setInterval(() => {
            this.print();
        }, 1000);
    }

    static unschedule() {
        if (this.schedule !== null) {
            clearInterval(this.schedule);
            this.schedule = null;
        }
    }
}
