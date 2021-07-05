import * as dotenv from 'dotenv';
import { StateManager } from './transactions/StateManager';
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

    const stateManager = await StateManager.loadFromDisk(transactionsCsvFilename, holdingsJsonFilename);

    const waveDriver = await WaveDriver.launch();
    try {
        await waveDriver.login(login, password);
        const txPage = await waveDriver.loadTransactionsPage();

        const txProcessor = new TransactionProcessor(txPage, cashAccountName, equitiesAccountName);

        while (true) {
            const done = await stateManager.withNextTransaction(async (tx, holding) => {
                tx.type === TransactionType.CashDiv
                    ? console.log(`Processing ${tx.type} ${tx.symbol} $${tx.settlementAmount}...`)
                    : console.log(`Processing ${tx.type} ${tx.qty} ${tx.symbol}...`);
                return await txProcessor.process(tx, holding);
            });
            if ((++processedCount >= batchSize && batchSize > 0) || done) {
                break;
            }
        }
    }
    catch (err) {
        console.error(err.message);
        exitCode = 1;
    }
    finally {
        await waveDriver.close();
    }

    process.exit(exitCode);
})();    
