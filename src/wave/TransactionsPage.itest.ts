import * as dotenv from 'dotenv';
import { WaveDriver } from "./WaveDriver";
import { JournalLine, TransactionsPage } from "./TransactionsPage";

dotenv.config();

// Some tests could potentially run for a long time.
jest.setTimeout(90000);

describe('WaveDriver', () => {
    let wave: WaveDriver;
    let txPage: TransactionsPage;

    // Launch the browser once at the beginning.
    // Typically, when integration testing we'd ideally
    // want to start with a clean setup for each test...
    // But this is testing against a live system and
    // I'm not too concerned about the login functionality.
    // The primary goal is to test transaction entry.
    beforeAll(async () => {
        const wsUrl = ''; // TODO: read from Chrome (or manually paste value here)
        expect(wsUrl).not.toBe('');

        wave = await WaveDriver.connect(wsUrl);        
        txPage = await wave.loadTransactionsPage();
    });

    afterAll(async () => {
        await wave.close();
    });

    // Helper method to verify that a row exists in the transaction table
    async function expectRow(selector: string, dateString: string, desc: string, accountName: string, amountString: string) {
        const result = await wave.page.evaluate((sel: string, v1: string, v2: string, v3: string, v4: string) => {
            const rows = document.querySelectorAll(sel);
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i] as HTMLElement;
                if (row.innerText === `\t\n${v1}\n\t\n${v2}\n${v3}\n\t\n${v4}\n\t`) {
                    return true;
                }
            }
        }, selector, dateString, desc, accountName, amountString);
        expect(result).toBeTruthy();
    }


    it('can enter a purchase', async () => {
        await txPage.addExpense(new Date(2021, 6, 3), '*** TEST ENTRY: BUY ***', 'Scotia iTRADE', 'Securities', 0.01, 'This is a test entry');

        await expectRow('.transactions-list-v2__row', 'Jul 3, 2021', '*** TEST ENTRY: BUY ***\nScotia iTRADE', 'Securities', '$0.01');
    });

    it('can enter a gain', async () => {
        const journalLines: JournalLine[] = [
            { type: 'debit',  accountName: 'Scotia iTRADE',         amount: 0.03 },
            { type: 'credit', accountName: 'Securities',            amount: 0.02 },
            { type: 'credit', accountName: 'Realized Gains/Losses', amount: 0.01 },
        ];
        await txPage.addJournalTransaction(new Date(2021, 6, 1), '*** TEST ENTRY: GAIN ***', 'This is a test entry', journalLines);

        await expectRow('.transactions-list-v2__row--journal', 'Jul 1, 2021', '*** TEST ENTRY: GAIN ***', 'Journal entry', '$0.03');
    });

    it('can enter a loss', async () => {
        const journalLines: JournalLine[] = [
            { type: 'debit',  accountName: 'Scotia iTRADE',         amount: 0.02 },
            { type: 'credit', accountName: 'Securities',            amount: 0.04 },
            { type: 'debit',  accountName: 'Realized Gains/Losses', amount: 0.02 },
        ];
        await txPage.addJournalTransaction(new Date(2021, 6, 1), '*** TEST ENTRY: LOSS ***', 'This is a test entry', journalLines);

        await expectRow('.transactions-list-v2__row--journal', 'Jul 1, 2021', '*** TEST ENTRY: LOSS ***', 'Journal entry', '$0.04');
    });

    it('can enter a wash', async () => {
        const journalLines: JournalLine[] = [
            { type: 'debit',  accountName: 'Scotia iTRADE',         amount: 0.01 },
            { type: 'credit', accountName: 'Securities',            amount: 0.01 },
        ];
        await txPage.addJournalTransaction(new Date(2021, 6, 3), '*** TEST ENTRY: WASH ***', 'This is a test entry', journalLines);

        await expectRow('.transactions-list-v2__row--journal', 'Jul 3, 2021', '*** TEST ENTRY: WASH ***', 'Journal entry', '$0.01');
    });

    it('can enter multiple transactions', async () => {
        await txPage.addJournalTransaction(new Date(2021, 6, 1), '*** TEST ENTRY: MULTI1 ***', 'This is a test entry', [
            { type: 'debit',  accountName: 'Scotia iTRADE',         amount: 0.11 },
            { type: 'credit', accountName: 'Securities',            amount: 0.10 },
            { type: 'credit', accountName: 'Realized Gains/Losses', amount: 0.01 },
        ]);
        await txPage.addJournalTransaction(new Date(2021, 6, 2), '*** TEST ENTRY: MULTI2 ***', 'This is a test entry', [
            { type: 'debit',  accountName: 'Scotia iTRADE',         amount: 0.12 },
            { type: 'credit', accountName: 'Securities',            amount: 0.10 },
            { type: 'credit', accountName: 'Realized Gains/Losses', amount: 0.02 },
        ]);
        await txPage.addJournalTransaction(new Date(2021, 6, 3), '*** TEST ENTRY: MULTI3 ***', 'This is a test entry', [
            { type: 'debit',  accountName: 'Scotia iTRADE',         amount: 0.13 },
            { type: 'credit', accountName: 'Securities',            amount: 0.10 },
            { type: 'credit', accountName: 'Realized Gains/Losses', amount: 0.03 },
        ]);

        await expectRow('.transactions-list-v2__row--journal', 'Jul 1, 2021', '*** TEST ENTRY: MULTI1 ***', 'Journal entry', '$0.11');
        await expectRow('.transactions-list-v2__row--journal', 'Jul 2, 2021', '*** TEST ENTRY: MULTI2 ***', 'Journal entry', '$0.12');
        await expectRow('.transactions-list-v2__row--journal', 'Jul 3, 2021', '*** TEST ENTRY: MULTI3 ***', 'Journal entry', '$0.13');
    });
});
