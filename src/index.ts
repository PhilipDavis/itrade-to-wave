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

const Color = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    FgGreen: "\x1b[32m",
    FgRed: "\x1b[31m",
    FgWhite: "\x1b[37m",
};
const good = `${Color.Bright}${Color.FgGreen}✓${Color.Reset}`;
const bad = `${Color.Bright}${Color.FgRed}✘${Color.Reset}`;

(async () => {
    let exitCode = 0;

    console.log('Loading data...');
    const stateManager = await StateManager.loadFromDisk(transactionsCsvFilename, holdingsJsonFilename);

    if (stateManager.sameDayAmbiguities.length > 0) {
        console.log('Found ambiguous transactions!');
        console.log('Please add an order number to the end of each line in these groups:');
        stateManager.sameDayAmbiguities.forEach((group, i) => {
            console.log(`Group #${Color.Bright}${Color.FgWhite}${i + 1}${Color.Reset}:`);
            group.forEach(tx => {
                console.log(`\t${toCsv(tx).trim()} ${tx.order === undefined ? bad : good}`);
            });
            console.log();
        });
        process.exit(2);
    }

    console.log('Launching browser...');
    const waveDriver = await WaveDriver.launch();
    let processedCount = 0;
    try {
        console.log('Logging into Wave...');
        await waveDriver.login(login, password);

        console.log('Navigating to the Transactions page...');
        const txPage = await waveDriver.loadTransactionsPage();

        const txProcessor = new TransactionProcessor(txPage, cashAccountName, equitiesAccountName);

        console.log('Ready to begin');
        while (true) {
            const more = await stateManager.withNextTransaction(async (tx, holding) => {
                tx.type === TransactionType.CashDiv
                    ? console.log(`Processing ${Color.Bright}${tx.type} ${tx.symbol} $${tx.settlementAmount}${Color.Reset}...`)
                    : console.log(`Processing ${Color.Bright}${tx.type} ${Math.abs(tx.qty)} ${tx.symbol}${Color.Reset}...`);
                
                try {
                    return await txProcessor.process(tx, holding);
                }
                catch (err) {
                    throw new Error(`Failed on "${toCsv(tx).trim()}": ${err.message}`);
                }
            });
            if ((++processedCount >= batchSize && batchSize > 0) || !more) {
                break;
            }
        }
    }
    catch (err) {
        console.error(err.message);
        exitCode = 1;
    }
    finally {
        console.log(`Processed ${Color.Bright}${processedCount}${Color.Reset} transactions`);

        console.log('Closing browser...');
        await waveDriver.close();
    }

    console.log(`Exiting with code ${exitCode}`);
    process.exit(exitCode);
})();    
