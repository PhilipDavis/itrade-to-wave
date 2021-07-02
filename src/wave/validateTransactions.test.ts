import { Transaction } from "../transaction";
import { validateTransactions } from "./validateTransactions";

function makeTx(input: Partial<Transaction> = {}): Transaction {
    return {
        desc: 'ACME CORP',
        symbol: 'ACME',
        transactionDate: new Date(2021, 5, 28),
        settlementDate: new Date(2021, 5, 30),
        accountCurrency: 'CAD',
        type: 'BUY',
        qty: 200,
        currency: 'CAD',
        unitPrice: 10,
        settlementAmount: -2009.99,
        ...input,
    };
}

describe('validateTransactions', () => {
    it('throws an error for unsupported transaction types', () => {
        const transactions = [
            makeTx(),
            makeTx({ type: 'SELL', settlementAmount: 1990.01 }),
            makeTx({ type: 'FOO' } as any)
        ];
        expect(() => validateTransactions(transactions)).toThrowError('Unsupported transaction type FOO');
    });
});
