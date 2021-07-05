import * as dotenv from 'dotenv';
import { StateManager } from './transactions/StateManager';
import { toCsv } from './transactions/toCsv';
import { TransactionType } from './transactions/transaction';
import { TransactionProcessor } from './transactions/TransactionProcessor';
import { WaveDriver } from './wave/WaveDriver';

dotenv.config();

process.stdin
    .setEncoding('utf8')
    .on('data', key => {
        // Ctrl-C to exit
        if (key.toString() === '\u0003') {
            process.exit();
        }
    })
    .resume();

const loadEnv = (name: string) => process.env[name] || (() => { throw new Error(`Missing ${name} environment parameter`) })();

const login = loadEnv('WAVE_LOGIN');
const password = loadEnv('WAVE_PASSWORD');
const cashAccountName = loadEnv('WAVE_CASH_ACCOUNT');
const equitiesAccountName = loadEnv('WAVE_EQUITIES_ACCOUNT');
const transactionsCsvFilename = loadEnv('CSV');
const holdingsJsonFilename = loadEnv('HOLDINGS_JSON');
const batchSize = parseInt(loadEnv('BATCH_SIZE'), 10);


(async () => {
    let exitCode = 0;

    console.log('Loading data...');
    const stateManager = await StateManager.loadFromDisk(transactionsCsvFilename, holdingsJsonFilename);

    console.log('Launching browser...');
    const waveDriver = await WaveDriver.launch();
    try {
        console.log('Logging into Wave...');
        await waveDriver.login(login, password);

        console.log('Navigating to the Transactions page...');
        const txPage = await waveDriver.loadTransactionsPage();

        const txProcessor = new TransactionProcessor(txPage, cashAccountName, equitiesAccountName);

        console.log('Ready to begin');
        let processedCount = 0;
        while (true) {
            const done = await stateManager.withNextTransaction(async (tx, holding) => {
                tx.type === TransactionType.CashDiv
                    ? console.log(`Processing ${tx.type} ${tx.symbol} $${tx.settlementAmount}...`)
                    : console.log(`Processing ${tx.type} ${tx.qty} ${tx.symbol}...`);
                
                try {
                    return await txProcessor.process(tx, holding);
                }
                catch (err) {
                    throw new Error(`Failed on "${toCsv(tx).trim()}": ${err.message}`);
                }
            });
            if ((++processedCount >= batchSize && batchSize > 0) || done) {
                break;
            }
        }
        console.log(`Processed ${processedCount} transactions`);
    }
    catch (err) {
        console.error(err.message);
        exitCode = 1;
    }
    finally {
        console.log('Closing browser...');
        await waveDriver.close();
    }

    console.log(`Exiting with code ${exitCode}`);
    process.exit(exitCode);
})();    
