import * as dotenv from 'dotenv';
import { WaveDriver } from "./wave/WaveDriver";
import { TransactionProcessor } from './TransactionProcessor';

dotenv.config();

// Some tests could potentially run for a long time.
jest.setTimeout(90000);

describe('WaveDriver', () => {
    let wave: WaveDriver;
    let processor: TransactionProcessor;

    // Launch the browser once at the beginning.
    // Typically, when integration testing we'd ideally
    // want to start with a clean setup for each test...
    // But this is testing against a live system and
    // I'm not too concerned about the login functionality.
    // The primary goal is to test transaction entry.
    beforeAll(async () => {
        expect(process.env.WAVE_LOGIN).toBeDefined();
        expect(process.env.WAVE_PASSWORD).toBeDefined();

        wave = await WaveDriver.launch();
        await wave.login(process.env.WAVE_LOGIN!, process.env.WAVE_PASSWORD!);
        
        const txPage = await wave.loadTransactionsPage();
        processor = new TransactionProcessor(txPage);
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


    it('can record a stock sale', async () => {
        await processor.recordStockSale(new Date(2021, 6, 1), '*** TEST STOCK SALE ***', 100, 'Scotia iTRADE', 'Securities', 0.05, 0.04, 'This is a test entry');

        await expectRow('.transactions-list-v2__row--journal', 'Jul 1, 2021', 'Sell 100 *** TEST STOCK SALE ***', 'Journal entry', '$0.05');
    });

    it('can record a cash dividend', async () => {
        await processor.recordCashDividend(new Date(2021, 6, 1), '*** TEST CASH DIV ***', 100, 'Scotia iTRADE', 0.04, '*** TEST *** CASH DIV  ON     100 SHS REC 06/01/21 PAY 07/01/21');

        await expectRow('.transactions-list-v2__row--journal', 'Jul 1, 2021', 'Dividend paid on 100 *** TEST CASH DIV ***', 'Journal entry', '$0.04');
    });

    it('can record a stock purchase', async () => {
        await processor.recordStockPurchase(new Date(2021, 6, 1), '*** TEST STOCK BUY ***', 100, 'Scotia iTRADE', 'Securities', 0.05, 'This is a test entry');

        await expectRow('.transactions-list-v2__row', 'Jul 1, 2021', 'Buy 100 *** TEST STOCK BUY ***\nScotia iTRADE', 'Securities', '$0.05');
    });
});
