import { WaveDriver } from "./WaveDriver";
import * as dotenv from 'dotenv';

dotenv.config();

describe('WaveDriver', () => {
    let wave: WaveDriver;

    beforeEach(async () => {
        wave = new WaveDriver();
        await wave.launch();
    });

    afterEach(async () => {
        await wave.close();
    });

    it('can login', async () => {
        expect(process.env.WAVE_LOGIN).toBeDefined();
        expect(process.env.WAVE_PASSWORD).toBeDefined();
        await wave.login(process.env.WAVE_LOGIN, process.env.WAVE_PASSWORD);
    }, 30000);
});
