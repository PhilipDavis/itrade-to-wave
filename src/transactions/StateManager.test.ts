import { promises as fs } from 'fs';
import { StandardHeader } from '../iTrade/parseCsv';
import { StateManager } from "./StateManager";
import { toCsv } from './toCsv';

describe('StateManager', () => {
    describe('loadFromDisk', () => {
        afterEach(async () => {
            // Delete all the files we created in the test
            try { await fs.unlink('./test/unknown-transaction.processed.csv'); } catch (err) {}

            const filenames = await fs.readdir('./test/')
            const myTestFilenames = filenames.filter(f => /^valid-holdings\.\d+\.json$/.test(f));
            await Promise.all(myTestFilenames.map(f => fs.unlink(`./test/${f}`)));
        });

        it('throws an error when transaction file is missing', async () => {
            expect(() => StateManager.loadFromDisk('./test/non-existent-filename.csv', './test/valid-holdings.json')).rejects.toThrowError();
        });

        it('rejects non-CSV transaction filenames', async () => {
            expect(() => StateManager.loadFromDisk('./test/not-a-csv.txt', './test/valid-holdings.json')).rejects.toThrowError();
        });

        it('rejects non-JSON holdings filenames', async () => {
            expect(() => StateManager.loadFromDisk('./test/valid-transactions.csv', './test/not-a-csv.txt')).rejects.toThrowError();
        });

        it('throws an error when an unknown transaction is found', async () => {
            expect(() => StateManager.loadFromDisk('./test/unknown-transaction.csv', './test/valid-holdings.json')).rejects.toThrowError();
        });
    });

    describe('withNextTransaction', () => {
        let timestamp: number;
        let holdingsJsonFilename: string;
        let transactionsCsvFilename: string;
        let processedCsvFilename: string;

        beforeEach(() => {
            timestamp = Date.now();
            holdingsJsonFilename = `./test/holdings-${timestamp}.json`;
            transactionsCsvFilename = `./test/tx-${timestamp}.csv`;
            processedCsvFilename = `./test/tx-${timestamp}.processed.csv`;
        });

        afterEach(async () => {
            // Delete all the files we created in the test
            const filenames = await fs.readdir('./test/')
            const myTestFilenames = filenames.filter(f => f.indexOf(`-${timestamp}`) > 0);
            await Promise.all(myTestFilenames.map(f => fs.unlink(`./test/${f}`)));
        });

        describe('upon success', () => {
            it('updates holdings when changed', async () => {
                // Arrange
                const holdings = {
                    FOO: { acb: 1009.99, qty: 100 },
                    BAR: { acb: 2009.99, qty: 200 },
                };
                await fs.writeFile(holdingsJsonFilename, JSON.stringify(holdings));
                await fs.writeFile(transactionsCsvFilename, `${StandardHeader}\nFOO CORP      ,FOO,04-Jul-2021,06-Jul-2021,CAD,BUY,200.00,CAD,10.000,-2009.99,`);
                const stateManager = await StateManager.loadFromDisk(transactionsCsvFilename, holdingsJsonFilename);

                // Act
                await stateManager.withNextTransaction(async (tx, holding) => {
                    return { acb: 3019.98, qty: 300 };
                });

                // Assert
                const updatedHoldings = JSON.parse((await fs.readFile(holdingsJsonFilename)).toString());
                expect(updatedHoldings).toMatchObject({
                    FOO: { acb: 3019.98, qty: 300 }, // This stock has been updated
                    BAR: { acb: 2009.99, qty: 200 },
                });
            });

            it('updates processed', async () => {
                // Arrange
                let expected = ''; // Assigned later
                const holdings = {
                    FOO: { acb: 1009.99, qty: 100 },
                    BAR: { acb: 2009.99, qty: 200 },
                };
                await fs.writeFile(holdingsJsonFilename, JSON.stringify(holdings));
                await fs.writeFile(transactionsCsvFilename, `${StandardHeader}\nFOO CORP      ,FOO,04-Jul-2021,06-Jul-2021,CAD,BUY,200.00,CAD,10.000,-2009.99,`);
                const stateManager = await StateManager.loadFromDisk(transactionsCsvFilename, holdingsJsonFilename);

                // Act
                await stateManager.withNextTransaction(async (tx, holding) => {
                    expected = toCsv(tx);
                    return holding;
                });

                // Assert
                const updatedProcessed = (await fs.readFile(processedCsvFilename)).toString();
                expect(updatedProcessed).toEqual(expected);
            });

            it('returns false when no more transactions', async () => {
                // Arrange
                const holdings = {
                    FOO: { acb: 1009.99, qty: 100 },
                    BAR: { acb: 2009.99, qty: 200 },
                };
                await fs.writeFile(holdingsJsonFilename, JSON.stringify(holdings));
                await fs.writeFile(transactionsCsvFilename, `${StandardHeader}\nFOO CORP      ,FOO,04-Jul-2021,06-Jul-2021,CAD,BUY,200.00,CAD,10.000,-2009.99,`);
                const stateManager = await StateManager.loadFromDisk(transactionsCsvFilename, holdingsJsonFilename);

                // Act
                const result1 = await stateManager.withNextTransaction(async (tx, holding) => holding);
                const result2 = await stateManager.withNextTransaction(async (tx, holding) => holding);

                // Assert
                expect(result1).toBe(true);
                expect(result2).toBe(false);
            });

            it('skips already-processed transactions', async () => {
                // Arrange
                const holdings = {
                    FOO: { acb: 2009.99, qty: 200 },
                };
                await fs.writeFile(holdingsJsonFilename, JSON.stringify(holdings));
                await fs.writeFile(transactionsCsvFilename, `${StandardHeader}\n`
                    + 'FOO CORP      ,FOO,04-Jul-2021,06-Jul-2021,CAD,BUY,200.00,CAD,10.000,-2009.99,\n'
                    + 'FOO CORP      ,FOO,05-Jul-2021,07-Jul-2021,CAD,BUY,100.00,CAD,10.000,-1009.99,\n'
                );
                await fs.writeFile(processedCsvFilename, 'FOO CORP,FOO,04-Jul-2021,06-Jul-2021,CAD,BUY,200,CAD,10,-2009.99\n');
                const stateManager = await StateManager.loadFromDisk(transactionsCsvFilename, holdingsJsonFilename);
                const spy = jest.fn((tx, holding) => Promise.resolve(holding));

                // Act
                await stateManager.withNextTransaction(spy); // First should call our function with the 2nd transaction
                await stateManager.withNextTransaction(spy); // Second should return without calling our function

                // Assert that we only received the second transaction
                expect(spy).toBeCalledTimes(1);
                expect(spy.mock.calls[0][0]).toMatchObject({
                    desc: 'FOO CORP',
                    symbol: 'FOO',
                    transactionDate: new Date(2021, 6, 5),
                    qty: 100,
                    settlementAmount: -1009.99,
                });
            });
        });


        describe('upon failure', () => {
            it("doesn't update holdings", async () => {
                // Arrange
                const holdings = {
                    FOO: { acb: 1009.99, qty: 100 },
                    BAR: { acb: 2009.99, qty: 200 },
                };
                await fs.writeFile(holdingsJsonFilename, JSON.stringify(holdings));
                await fs.writeFile(transactionsCsvFilename, `${StandardHeader}\nFOO CORP      ,FOO,04-Jul-2021,06-Jul-2021,CAD,BUY,200.00,CAD,10.000,-2009.99,`);
                const stateManager = await StateManager.loadFromDisk(transactionsCsvFilename, holdingsJsonFilename);

                // Act
                try {
                    await stateManager.withNextTransaction(tx => {
                        throw new Error('FAIL!');
                    });
                }
                catch (err) {}

                // Assert
                const notUpdatedHoldings = JSON.parse((await fs.readFile(holdingsJsonFilename)).toString());
                expect(notUpdatedHoldings).toMatchObject(holdings);
            });

            it("doesn't update processed", async () => {
                // Arrange
                let expected = ''; // Assigned later
                const holdings = {
                    FOO: { acb: 1009.99, qty: 100 },
                    BAR: { acb: 2009.99, qty: 200 },
                };
                await fs.writeFile(holdingsJsonFilename, JSON.stringify(holdings));
                await fs.writeFile(transactionsCsvFilename, `${StandardHeader}\nFOO CORP      ,FOO,04-Jul-2021,06-Jul-2021,CAD,BUY,200.00,CAD,10.000,-2009.99,`);
                const stateManager = await StateManager.loadFromDisk(transactionsCsvFilename, holdingsJsonFilename);

                // Act
                try {
                    await stateManager.withNextTransaction(tx => {
                        expected = toCsv(tx);
                        throw new Error('FAIL!');
                    });
                }
                catch (err) {}

                // Assert
                const updatedProcessed = (await fs.readFile(processedCsvFilename)).toString();
                expect(updatedProcessed).not.toContain(expected);
            });
        });
    });
});
