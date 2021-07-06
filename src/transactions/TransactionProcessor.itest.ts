import * as dotenv from 'dotenv';
import { WaveDriver } from "../wave/WaveDriver";
import { TransactionProcessor } from './TransactionProcessor';
import { TransactionsPage } from '../wave/TransactionsPage';
import { Holding } from './holdings';

dotenv.config();

// Some tests could potentially run for a long time.
jest.setTimeout(90000);

const cashAccountName = process.env.WAVE_CASH_ACCOUNT!;
const equitiesAccountName = process.env.WAVE_EQUITIES_ACCOUNT!;

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
        expect(process.env.WAVE_LOGIN).toBeDefined();
        expect(process.env.WAVE_PASSWORD).toBeDefined();
        expect(process.env.WAVE_CASH_ACCOUNT).toBeDefined();
        expect(process.env.WAVE_EQUITIES_ACCOUNT).toBeDefined();

        wave = await WaveDriver.launch();
        await wave.login(process.env.WAVE_LOGIN!, process.env.WAVE_PASSWORD!);
        
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


    it('can record a stock sale', async () => {
        const symbol = '*** TEST STOCK SALE ***';
        const holding: Holding = { acb: 2.00, qty: 100 };
        const processor = new TransactionProcessor(txPage, cashAccountName, equitiesAccountName);

        const result = await processor.process({
            desc: 'This is a test entry',
            symbol,
            transactionDate: new Date(2021, 6, 1),
            settlementDate: new Date(2021, 6, 3),
            accountCurrency: 'CAD',
            type: 'SELL',
            qty: -100,
            currency: 'CAD',
            unitPrice: 0.015,
            settlementAmount: 1.50,
        }, holding);

        // Verify the row appears in the transaction list
        await expectRow('.transactions-list-v2__row--journal', 'Jul 1, 2021', 'Sell 100 *** TEST STOCK SALE ***', 'Journal entry', '$2.00');

        // Verify the ACB and Quantity are updated
        expect(result).toMatchObject({
            acb: 0,
            qty: 0,
        });
    });

    it('can record a cash dividend', async () => {
        const symbol = '*** TEST CASH DIV ***';
        const holding: Holding = { acb: 0.80, qty: 200 };
        const processor = new TransactionProcessor(txPage, cashAccountName, equitiesAccountName);

        const result = await processor.process({
            // Note: quantity will be read from this description string, not the qty field nor the current stock qty!
            desc: 'TEST ENTRY CASH DIV  ON     100 SHS REC 06/01/21 PAY 07/01/21      ',
            symbol,
            transactionDate: new Date(2021, 6, 1),
            settlementDate: new Date(2021, 6, 1),
            accountCurrency: 'CAD',
            type: 'CASH DIV',
            qty: 0,
            currency: 'CAD',
            unitPrice: 0,
            settlementAmount: 0.04,
        }, holding);

        // Verify the row appears in the transaction list
        await expectRow('.transactions-list-v2__row--journal', 'Jul 1, 2021', 'Dividend paid on 100 *** TEST CASH DIV ***', 'Journal entry', '$0.04');

        // Verify the ACB and Quantity remain unchanged
        expect(result).toMatchObject({
            acb: 0.80,
            qty: 200,
        });
    });

    it('can record a stock purchase', async () => {
        const symbol = '*** TEST STOCK BUY ***';
        const holding: Holding = { acb: 2.00, qty: 100 };
        const processor = new TransactionProcessor(txPage, cashAccountName, equitiesAccountName);
        
        const result = await processor.process({
            desc: 'This is a test entry',
            symbol,
            transactionDate: new Date(2021, 6, 1),
            settlementDate: new Date(2021, 6, 3),
            accountCurrency: 'CAD',
            type: 'BUY',
            qty: 100,
            currency: 'CAD',
            unitPrice: 0.01,
            settlementAmount: 1.09,
        }, holding);

        // Verify the row appears in the transaction list
        await expectRow('.transactions-list-v2__row', 'Jul 1, 2021', 'Buy 100 *** TEST STOCK BUY ***\nScotia iTRADE', 'Securities', '$1.00');

        // Verify the ACB and Quantity have been updated
        expect(result).toMatchObject({
            acb: 3.09,
            qty: 200,
        });
    });
});
