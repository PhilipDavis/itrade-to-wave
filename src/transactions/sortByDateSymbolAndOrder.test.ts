import { makeTx } from "../util/makeTx";
import { sortByDateSymbolAndOrder } from "./sortByDateSymbolAndOrder";

describe('sortTransactions', () => {
    it('date in order returns -1', () => {
        const a = makeTx('BUY', 'FOO', 10);  // 10th of July
        const b = makeTx('SELL', 'FOO', 20); // 20th of July

        expect(sortByDateSymbolAndOrder(a, b)).toBe(-1);
    });

    it('date out of order returns 1', () => {
        const a = makeTx('BUY', 'FOO', 20);  // 20th of July
        const b = makeTx('SELL', 'FOO', 10); // 10th of July

        expect(sortByDateSymbolAndOrder(a, b)).toBe(1);
    });
    
    it('same date, symbol in order returns -1', () => {
        const a = makeTx('BUY', 'BAR', 10);
        const b = makeTx('SELL', 'FOO', 10);

        expect(sortByDateSymbolAndOrder(a, b)).toBe(-1);
    });
    
    it('same date, symbol out of order returns 1', () => {
        const a = makeTx('BUY', 'FOO', 10);
        const b = makeTx('SELL', 'BAR', 10);

        expect(sortByDateSymbolAndOrder(a, b)).toBe(1);
    });
    
    it('same date, same symbol, order in order returns -1', () => {
        const a = makeTx('BUY', 'FOO', 10, 1);
        const b = makeTx('SELL', 'FOO', 10, 2);

        expect(sortByDateSymbolAndOrder(a, b)).toBe(-1);
    });
    
    it('same date, same symbol, order out of order returns 1', () => {
        const a = makeTx('BUY', 'FOO', 10, 2);
        const b = makeTx('SELL', 'FOO', 10, 1);

        expect(sortByDateSymbolAndOrder(a, b)).toBe(1);
    });
    
    it('same date, same symbol, same order returns 0', () => {
        const a = makeTx('BUY', 'FOO', 10, 1);
        const b = makeTx('SELL', 'FOO', 10, 1);

        expect(sortByDateSymbolAndOrder(a, b)).toBe(0);
    });
    
    it('same date, same symbol, order undefined returns 0', () => {
        const a = makeTx('BUY', 'FOO', 10);
        const b = makeTx('SELL', 'FOO', 10);

        expect(sortByDateSymbolAndOrder(a, b)).toBe(0);
    });
    
    it('same date, same symbol, first order defined returns -1', () => {
        const a = makeTx('BUY', 'FOO', 10, 1);
        const b = makeTx('SELL', 'FOO', 10);

        expect(sortByDateSymbolAndOrder(a, b)).toBe(-1);
    });
    
    it('same date, same symbol, second order defined returns 1', () => {
        const a = makeTx('BUY', 'FOO', 10);
        const b = makeTx('SELL', 'FOO', 10, 1);

        expect(sortByDateSymbolAndOrder(a, b)).toBe(1);
    });
});
