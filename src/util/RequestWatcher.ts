import { EventEmitter, PageEventObject } from "puppeteer";
import { setTimeout } from 'timers';

//
// Declare only the parts of Page that we need.
// This makes unit testing easier.
//
interface IPageEventsSource {
    on<K extends keyof PageEventObject>(eventName: K, handler: (event: PageEventObject[K]) => void): EventEmitter;
}

type Waiter = {
    timeoutObj: NodeJS.Timeout;
    resolve(): void;
};

//
// Helper class to determine when there are no active network requests.
// We often want to wait for network idle because I encountered cases
// where typing text into a field was interrupted -- and it seemed like
// the cause was React updating the page after performing some network
// requests.
//
export class RequestWatcher {
    private activeCount: number = 0;
    private waiters: Waiter[] = [];

    constructor(page: IPageEventsSource) {
        page.on('request', this.onRequestStarted.bind(this));
        page.on('requestfinished', this.onRequestFinished.bind(this));
        page.on('requestfailed', this.onRequestFinished.bind(this));
    }

    private onRequestStarted() {
        this.activeCount++;
    }
    
    private onRequestFinished() {
        if (--this.activeCount === 0) {
            // Clone and empty the waiters array
            const waiters = [ ...this.waiters ];
            this.waiters = [];

            // Notify all waiters that the network is idle
            for (const { timeoutObj, resolve } of waiters) {
                clearTimeout(timeoutObj);
                resolve();
            }
        }
    }

    async waitForNetworkIdle({ timeout = 30000 }: { timeout?: number } = {}) {
        if (this.activeCount <= 0) {
            return;
        }
        return await new Promise<void>((resolve, reject) => {
            const timeoutObj: NodeJS.Timeout = setTimeout(() => reject(new Error('Timeout waiting for idle network')), timeout);
            this.waiters.push({ timeoutObj, resolve });
        });
    }
}
