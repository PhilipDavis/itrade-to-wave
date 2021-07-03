import { EventEmitter, PageEventObject } from "puppeteer";
import { RequestWatcher } from "./RequestWatcher";
import { performance } from 'perf_hooks';

class TestHelper {
    handlers: Partial<Record<keyof PageEventObject, (event: any) => void>> = {};

    on<K extends keyof PageEventObject>(eventName: K, handler: (event: PageEventObject[K]) => void): EventEmitter {
        this.handlers[eventName] = handler;
        return this as unknown as EventEmitter;
    }

    emit(eventName: keyof PageEventObject) {
        this.handlers[eventName]!(undefined);
    }
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('RequestWatcher', () => {
    describe('no requests', () => {
        it('resolves immediately', async () => {
            const page = new TestHelper();
            const requestWatcher = new RequestWatcher(page);

            const start = performance.now();
            let elapsed = -1;
            await requestWatcher.waitForNetworkIdle().then(() => {
                elapsed = performance.now() - start;
            });

            expect(elapsed).toBeGreaterThanOrEqual(0);
            expect(elapsed).toBeLessThan(20);
        });
    });

    describe('single request', () => {
        it('notifies when the request finishes', async () => {
            const page = new TestHelper();
            const requestWatcher = new RequestWatcher(page);

            page.emit('request');

            const start = performance.now();
            let elapsed = -1;
            const promise = requestWatcher.waitForNetworkIdle().then(() => {
                elapsed = performance.now() - start;
            });

            await Promise.all([
                delay(100).then(() => page.emit('requestfinished')),
                promise
            ]);

            expect(elapsed).toBeGreaterThanOrEqual(100);
            expect(elapsed).toBeLessThan(130);
        });

        it('throws an error on timeout', async() => {
            const page = new TestHelper();
            const requestWatcher = new RequestWatcher(page);

            page.emit('request');

            const start = performance.now();
            let elapsed = -1;
            const promise = requestWatcher.waitForNetworkIdle({ timeout: 50 }).then(() => {}, (err: Error) => {
                elapsed = performance.now() - start;
            });

            await delay(100);
            expect(elapsed).toBeGreaterThanOrEqual(50);
            expect(elapsed).toBeLessThan(90);
        });
    });

    describe('multiple requests', () => {
        it('notifies when the last request finishes', async () => {
            const page = new TestHelper();
            const requestWatcher = new RequestWatcher(page);

            page.emit('request');

            const start = performance.now();
            let elapsed = -1;
            const promise = requestWatcher.waitForNetworkIdle().then(() => {
                elapsed = performance.now() - start;
            });

            await Promise.all([
                delay(10).then(() => page.emit('request')),
                delay(20).then(() => page.emit('requestfinished')),
                delay(90).then(() => page.emit('request')),
                delay(100).then(() => page.emit('requestfailed')),
                delay(150).then(() => page.emit('requestfinished')),
                promise
            ]);

            expect(elapsed).toBeGreaterThanOrEqual(150);
            expect(elapsed).toBeLessThan(180);
        });
    });

    describe('multiple waiters', () => {
        it('notifies all waiters', async () => {
            const page = new TestHelper();
            const requestWatcher = new RequestWatcher(page);

            page.emit('request');

            const start1 = performance.now();
            let elapsed1 = -1;
            const promise1 = requestWatcher.waitForNetworkIdle().then(() => {
                elapsed1 = performance.now() - start1;
            });

            const start2 = performance.now();
            let elapsed2 = -1;
            const promise2 = requestWatcher.waitForNetworkIdle().then(() => {
                elapsed2 = performance.now() - start2;
            });

            const start3 = performance.now();
            let elapsed3 = -1;
            const promise3 = requestWatcher.waitForNetworkIdle().then(() => {
                elapsed3 = performance.now() - start3;
            });

            await Promise.all([
                promise1,
                promise2,
                promise3,
                await delay(100).then(() => page.emit('requestfinished'))
            ]);

            expect(elapsed1).toBeGreaterThanOrEqual(100);
            expect(elapsed1).toBeLessThan(130);

            expect(elapsed2).toBeGreaterThanOrEqual(100);
            expect(elapsed2).toBeLessThan(130);

            expect(elapsed3).toBeGreaterThanOrEqual(100);
            expect(elapsed3).toBeLessThan(130);
        });
    });
});
