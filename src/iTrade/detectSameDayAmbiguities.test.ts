import { makeTx } from "../util/makeTx";
import { detectSameDayAmbiguities } from "./detectSameDayAmbiguities";

describe('detectSameDayAmbiguities' , () => {
    describe('without order', () => {
        it('returns an empty array when only same day buys', () => {
            const transactions = [
                makeTx('BUY', 'FOO', 1),
                makeTx('BUY', 'FOO', 1),
                makeTx('BUY', 'FOO', 1),
                makeTx('BUY', 'BAR', 1),
            ];
            const result = detectSameDayAmbiguities(transactions);
            expect(result).toHaveLength(0);
        });

        it('returns an empty array when only same day sells', () => {
            const transactions = [
                makeTx('SELL', 'FOO', 1),
                makeTx('SELL', 'FOO', 1),
                makeTx('SELL', 'FOO', 1),
                makeTx('SELL', 'BAR', 1),
            ];
            const result = detectSameDayAmbiguities(transactions);
            expect(result).toHaveLength(0);
        });

        it('returns an empty array when no same day buy and sell', () => {
            const transactions = [
                makeTx('BUY', 'FOO', 1),
                makeTx('SELL', 'BAR', 1),
                makeTx('BUY', 'BAR', 2),
                makeTx('SELL', 'FOO', 2),
            ];
            const result = detectSameDayAmbiguities(transactions);
            expect(result).toHaveLength(0);
        });

        it('returns an empty array when same day transactions have no conflict', () => {
            const transactions = [
                makeTx('BUY', 'FOO', 6),
                makeTx('REI', 'FOO', 6),
                makeTx('CASH DIV', 'FOO', 6),
            ];
            const result = detectSameDayAmbiguities(transactions);
            expect(result).toHaveLength(0);
        });

        it('returns same day buys and sells of different symbols', () => {
            const transactions = [
                makeTx('BUY', 'FOO', 1),
                makeTx('SELL', 'FOO', 1),
                makeTx('BUY', 'BAZ', 2),
                makeTx('SELL', 'BAR', 2),
                makeTx('BUY', 'BAR', 2),
            ];
            const result = detectSameDayAmbiguities(transactions);
            expect(result).toEqual([
                [ transactions[0], transactions[1] ],
                [ transactions[3], transactions[4] ],
            ]);
        });

        it('returns same day buys and sells of same symbol on different days', () => {
            const transactions = [
                makeTx('BUY', 'FOO', 1),
                makeTx('SELL', 'FOO', 1),
                makeTx('BUY', 'BAZ', 2),
                makeTx('SELL', 'FOO', 2),
                makeTx('BUY', 'FOO', 2),
            ];
            const result = detectSameDayAmbiguities(transactions);
            expect(result).toEqual([
                [ transactions[0], transactions[1] ],
                [ transactions[3], transactions[4] ],
            ]);
        });
    });


    describe('with order', () => {
        it('returns an empty array with same day buys and sells of different symbols', () => {
            const transactions = [
                makeTx('BUY', 'FOO', 1, 1),
                makeTx('SELL', 'FOO', 1, 2),
                makeTx('BUY', 'BAZ', 2),
                makeTx('SELL', 'BAR', 2, 2),
                makeTx('BUY', 'BAR', 2, 1),
            ];
            const result = detectSameDayAmbiguities(transactions);
            expect(result).toHaveLength(0);
        });

        it('returns an empty array with same day buys and sells of same symbol on different days', () => {
            const transactions = [
                makeTx('BUY', 'FOO', 1, 1),
                makeTx('SELL', 'FOO', 1, 2),
                makeTx('BUY', 'BAZ', 2),
                makeTx('SELL', 'FOO', 2, 2),
                makeTx('BUY', 'FOO', 2, 1),
            ];
            const result = detectSameDayAmbiguities(transactions);
            expect(result).toHaveLength(0);
        });

        it('returns non-ordered with same day buys and sells of same symbol on different days', () => {
            const transactions = [
                makeTx('BUY', 'FOO', 1, 1),
                makeTx('SELL', 'FOO', 1, 2),
                makeTx('BUY', 'BAZ', 2),
                makeTx('SELL', 'FOO', 2),
                makeTx('BUY', 'FOO', 2),
            ];
            const result = detectSameDayAmbiguities(transactions);
            expect(result).toEqual([
                [ transactions[3], transactions[4] ],
            ]);
        });

        it('returns ordered and non-ordered with same day buys and sells of same symbol', () => {
            const transactions = [
                makeTx('BUY', 'FOO', 1, 1), // ordered
                makeTx('SELL', 'FOO', 1),   // non-ordered
            ];
            const result = detectSameDayAmbiguities(transactions);
            expect(result).toEqual([
                [ transactions[0], transactions[1] ],
            ]);
        });
    });
});
