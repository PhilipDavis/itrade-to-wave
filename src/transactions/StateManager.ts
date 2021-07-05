import { promises as fs } from 'fs';
import { isEqual } from 'lodash';
import { detectSameDayAmbiguities } from '../iTrade/detectSameDayAmbiguities';
import { parseCsv } from '../iTrade/parseCsv';
import { validateTransactions } from '../wave/validateTransactions';
import { Holding, Holdings, newHolding } from './holdings';
import { sortByDateSymbolAndOrder } from './sortByDateSymbolAndOrder';
import { toCsv } from './toCsv';
import { Transaction } from './transaction';

export class StateManager {
    private index: number = -1;
    private readonly transactions: Transaction[];
    private readonly processed: Record<string, boolean>;
    private holdings: Holdings;
    private readonly appendProcessed: (line: string) => Promise<void>;
    private readonly updateHoldings: (h: Holdings) => Promise<void>;
    readonly sameDayAmbiguities: ReadonlyArray<ReadonlyArray<Transaction>>;

    private constructor(
        transactions: Transaction[],
        processed: Record<string, boolean>,
        holdings: Holdings,
        appendProcessed: (line: string) => Promise<void>,
        updateHoldings: (h: Holdings) => Promise<void>,
    ) {
        this.transactions = [ ...transactions ].sort(sortByDateSymbolAndOrder);
        this.processed = processed;
        this.holdings = holdings;
        this.appendProcessed = appendProcessed;
        this.updateHoldings = updateHoldings;

        this.sameDayAmbiguities = detectSameDayAmbiguities(transactions);
    }

    //
    // Factory method to load data from memory
    // (also used by unit tests so they don't have to access disk resources)
    //
    static async loadFromData(
        transactions: Transaction[],
        processed: Record<string, boolean>,
        holdings: Holdings,
        appendProcessed: (line: string) => Promise<void>,
        updateHoldings: (h: Holdings) => Promise<void>,
    ) {
        validateTransactions(transactions);
        return new StateManager(transactions, processed, holdings, appendProcessed, updateHoldings);
    }

    //
    // Factory method to load data from disk
    //
    static async loadFromDisk(transactionsCsvFilename: string, holdingsJsonFilename: string) {
        if (!/.+\.csv$/i.test(transactionsCsvFilename)) {
            throw new Error('Transaction file must be a .csv file');
        }
        if (!/.+\.json$/i.test(holdingsJsonFilename)) {
            throw new Error('Holdings file must be a .json file');
        }

        //
        // Load the transactions from the user-supplied CSV filename
        //
        const transactionsCsv = (await fs.readFile(transactionsCsvFilename)).toString('ascii');
        const transactions = parseCsv(transactionsCsv);

        //
        // Load the list of processed transactions (so we know which of
        // the input lines we've already added e.g. on a previous run
        // and we don't attempt to add them again on this run).
        //
        const processedFilenameWithoutExtension = transactionsCsvFilename.substr(0, transactionsCsvFilename.length - 4);
        const processedCsvFilename = `${processedFilenameWithoutExtension}.processed.csv`;
        const processedLines = (await fs.readFile(processedCsvFilename, { flag: 'a+' })).toString('ascii').split(/[\n\r]/);
        const processed: Record<string, true> = processedLines.reduce((obj, line) => ({ ...obj, [line]: true }), {});
        const appendProcessed =  async (line: string) => {
            await fs.appendFile(processedCsvFilename, line);
        };

        //
        // Load the existing holdings (ACB and quantities)
        //
        const holdingsJson = (await fs.readFile(holdingsJsonFilename, { flag: 'a+' })).toString('ascii');
        const holdings: Holdings = JSON.parse(holdingsJson || '{}');
        const updateHoldings = async (h: Holdings) => {
            await fs.writeFile(holdingsJsonFilename, JSON.stringify(h, null, 2));
        };

        //
        // Backup the holdings file because we will rewrite it
        // after each processed operation.
        //
        const holdingsFilenameWithoutExtension = holdingsJsonFilename.substr(0, holdingsJsonFilename.length - 5);
        const holdingsBackupJsonFilename = `${holdingsFilenameWithoutExtension}.${Date.now()}.json`;
        await fs.copyFile(holdingsJsonFilename, holdingsBackupJsonFilename);

        return await StateManager.loadFromData(transactions, processed, holdings, appendProcessed, updateHoldings);
    }

    private isProcessed(tx: Transaction) {
        const line = toCsv(tx);
        return !!this.processed[line.trim()];
    }

    private async setProcessed(tx: Transaction) {
        const line = toCsv(tx);
        this.processed[line.trim()] = true;
        await this.appendProcessed(line);
    }

    async withNextTransaction(fn: (tx: Transaction, h: Holding) => Promise<Holding>): Promise<boolean> {
        if (this.sameDayAmbiguities.length > 0) {
            throw new Error('Resolve ambiguities before processing transactions');
        }

        while (true) {
            // Advance; and bail out if we're done processing
            if (++this.index >= this.transactions.length) {
                return false;
            }

            // Skip this transaction if we've already processed it
            const tx = this.transactions[this.index];
            if (this.isProcessed(tx)) {
                continue;
            }

            // Look up the current info on the transacted symbol
            const holding = this.holdings[tx.symbol] || newHolding;

            // Delegate to the caller to process the transaction
            const resultantHolding = await fn(tx, holding);

            // Mark the transaction as processed
            await this.setProcessed(tx);

            // Update the holdings if the current transaction changed them
            if (!isEqual(holding, resultantHolding)) {
                this.holdings = {
                    ...this.holdings,
                    [tx.symbol]: resultantHolding,
                };
                await this.updateHoldings(this.holdings);
            }

            // Indicate that we successfully processed the transaction
            return true;
        }
    }
}
