import * as dotenv from 'dotenv';
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

const login = process.env.WAVE_LOGIN;
if (!login) {
    throw new Error('Missing WAVE_LOGIN environment parameter');
}

const password = process.env.WAVE_PASSWORD;
if (!password) {
    throw new Error('Missing WAVE_PASSWORD environment parameter');
}

(async () => {
    let exitCode = 0;

    const waveDriver = await WaveDriver.launch();
    try {
        await waveDriver.login(login, password);
        const txPage = await waveDriver.loadTransactionsPage();

        //await txPage.addExpense(new Date(2021, 6, 1), 'TEST ENTRY', 'Scotia iTRADE', 'Securities', 0.01);
        await txPage.addJournalTransaction(new Date(2021, 5, 5), 'TEST ENTRY', 'Scotia iTRADE' ,'Securities', 'Realized Gains/Losses', 0.03, 0.02);
    }
    catch (err) {
        process.stdout.write(err.message);
        exitCode = 1;
    }
    finally {
        await waveDriver.close();
    }

    process.exit(exitCode);
})();    
