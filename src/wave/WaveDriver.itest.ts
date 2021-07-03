import * as dotenv from 'dotenv';
import { WaveDriver } from "./WaveDriver";

dotenv.config();

// Some tests could potentially run for a long time.
jest.setTimeout(90000);

describe('WaveDriver', () => {
    let wave: WaveDriver;

    afterEach(async () => {
        wave && await wave.close();
    });

    it('can login and load the transaction page', async () => {
        expect(process.env.WAVE_LOGIN).toBeDefined();
        expect(process.env.WAVE_PASSWORD).toBeDefined();

        wave = await WaveDriver.launch();
        await wave.login(process.env.WAVE_LOGIN!, process.env.WAVE_PASSWORD!);

        await wave.loadTransactionsPage();
    });
});
