import { toCsv } from './toCsv';
import { Transaction, TransactionType } from './transaction';
import { makeTx } from '../util/makeTx';
import { Holding, Holdings } from './holdings';
import { StateManager } from './StateManager';

const noOp = () => Promise.resolve();

describe('StateManager', () => {
    describe('loadFromData', () => {
        it('throws an error when an unsupported transaction type is detected', async () => {
            const transactions = [
                makeTx('BUY', 'FOO', 5),
                makeTx('UNKNOWN' as TransactionType, 'FOO', 6),
            ];

            await expect(StateManager.loadFromData(transactions, {}, {}, noOp, noOp)).rejects.toThrowError();
        });
    });

    describe('withNextTransaction', () => {
        describe('when there are ambiguous transactions', () => {
            it('will throw an error', async() => {
                const transactions = [
                    makeTx('BUY', 'FOO', 1),
                    makeTx('SELL', 'FOO', 1),
                    makeTx('BUY', 'BAR', 1),
                ];
                const stateManager = await StateManager.loadFromData(transactions, {}, {}, noOp, noOp);
                const spy = jest.fn((tx, holding) => Promise.resolve(holding));

                await expect(stateManager.withNextTransaction(spy)).rejects.toThrowError();
                expect(spy).not.toHaveBeenCalled();
            });
        });

        it('processes transactions chronologically', async () => {
            // Arrange
            const holdings = {
                FOO: { acb: 1009.99, qty: 100 },
                BAR: { acb: 2009.99, qty: 200 },
            };
            const transactions = [
                makeTx('SELL', 'FOO', 20), // 20th of July
                makeTx('BUY', 'FOO', 10),  // 10th of July
            ];
            const stateManager = await StateManager.loadFromData(transactions, {}, holdings, noOp, noOp);
            const spy = jest.fn((tx: Transaction, h: Holding) => Promise.resolve(h));

            // Act
            await stateManager.withNextTransaction(spy);
            await stateManager.withNextTransaction(spy);

            // Assert
            expect(spy.mock.calls[0][0]).toMatchObject({ type: 'BUY', symbol: 'FOO' });
            expect(spy.mock.calls[1][0]).toMatchObject({ type: 'SELL', symbol: 'FOO' });
        });

        it('processes disambiguated transactions chronologically', async () => {
            // Arrange
            const holdings = {
                FOO: { acb: 1009.99, qty: 100 },
                BAR: { acb: 2009.99, qty: 200 },
            };
            const transactions = [
                makeTx('SELL', 'FOO', 10, 2), // 10th of July, second order
                makeTx('BUY', 'FOO', 10, 1),  // 10th of July, first order
            ];
            const stateManager = await StateManager.loadFromData(transactions, {}, holdings, noOp, noOp);
            const spy = jest.fn((tx: Transaction, h: Holding) => Promise.resolve(h));

            // Act
            await stateManager.withNextTransaction(spy);
            await stateManager.withNextTransaction(spy);

            // Assert
            expect(spy.mock.calls[0][0]).toMatchObject({ type: 'BUY', symbol: 'FOO' });
            expect(spy.mock.calls[1][0]).toMatchObject({ type: 'SELL', symbol: 'FOO' });
        });

        describe('upon success', () => {
            it('updates holdings when changed', async () => {
                // Arrange
                const holdings = {
                    FOO: { acb: 1009.99, qty: 100 },
                    BAR: { acb: 2009.99, qty: 200 },
                };
                const transactions = [
                    makeTx('BUY', 'FOO', 4),
                ];
                const spy = jest.fn(noOp);
                const stateManager = await StateManager.loadFromData(transactions, {}, holdings, noOp, spy);

                // Act
                await stateManager.withNextTransaction(async (tx, holding) => {
                    return { acb: 3019.98, qty: 300 };
                });

                // Assert
                expect(spy).toHaveBeenCalledWith<[ Holdings ]>({
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
                const transactions = [
                    makeTx('BUY', 'FOO', 4),
                ];
                const spy = jest.fn(noOp);
                const stateManager = await StateManager.loadFromData(transactions, {}, holdings, spy, noOp);

                // Act
                await stateManager.withNextTransaction(async (tx, holding) => {
                    expected = toCsv(tx);
                    return holding;
                });

                // Assert
                expect(spy).toHaveBeenCalledWith<[ string ]>(expected);
            });

            it('returns false when no more transactions', async () => {
                // Arrange
                const holdings = {
                    FOO: { acb: 1009.99, qty: 100 },
                    BAR: { acb: 2009.99, qty: 200 },
                };
                const transactions = [
                    makeTx('BUY', 'FOO', 4),
                ];
                const stateManager = await StateManager.loadFromData(transactions, {}, holdings, noOp, noOp);

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
                const transactions = [
                    makeTx('BUY', 'FOO', 4),
                    makeTx('SELL', 'FOO', 5),
                ];
                const processed = {
                    [toCsv(transactions[0]).trim()]: true,
                };
                const stateManager = await StateManager.loadFromData(transactions, processed, holdings, noOp, noOp);
                const spy = jest.fn((tx, holding) => Promise.resolve(holding));

                // Act
                await stateManager.withNextTransaction(spy); // First should call our function with the 2nd transaction
                await stateManager.withNextTransaction(spy); // Second should return without calling our function

                // Assert that we only received the second transaction
                expect(spy).toBeCalledTimes(1);
                expect(spy.mock.calls[0][0]).toMatchObject({
                    symbol: 'FOO',
                    type: 'SELL'
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
                const transactions = [
                    makeTx('BUY', 'FOO', 4),
                    makeTx('SELL', 'FOO', 5),
                ];
                const spy = jest.fn(noOp);
                const stateManager = await StateManager.loadFromData(transactions, {}, holdings, spy, noOp);

                // Act
                try {
                    await stateManager.withNextTransaction(async tx => {
                        throw new Error('FAIL!');
                    });
                }
                catch (err) {}

                // Assert
                expect(spy).not.toHaveBeenCalled();
            });

            it("doesn't update processed", async () => {
                // Arrange
                const holdings = {
                    FOO: { acb: 1009.99, qty: 100 },
                    BAR: { acb: 2009.99, qty: 200 },
                };
                const transactions = [
                    makeTx('BUY', 'FOO', 4),
                    makeTx('SELL', 'FOO', 5),
                ];
                const spy = jest.fn(noOp);
                const stateManager = await StateManager.loadFromData(transactions, {}, holdings, noOp, spy);

                // Act
                try {
                    await stateManager.withNextTransaction(async tx => {
                        throw new Error('FAIL!');
                    });
                }
                catch (err) {}

                // Assert
                expect(spy).not.toHaveBeenCalled();
            });
        });
    });
});
