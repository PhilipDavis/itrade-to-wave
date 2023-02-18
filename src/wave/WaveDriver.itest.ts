import * as dotenv from 'dotenv';
import { WaveDriver } from "./WaveDriver";

dotenv.config();

// Some tests could potentially run for a long time.
jest.setTimeout(90000);

describe('WaveDriver', () => {
    let wave: WaveDriver;

    it('can connect and load the transaction page', async () => {
        const wsUrl = ''; // TODO: read from Chrome (or manually paste value here)
        expect(wsUrl).not.toBe('');

        wave = await WaveDriver.connect(wsUrl);

        await wave.loadTransactionsPage();
    });
});
