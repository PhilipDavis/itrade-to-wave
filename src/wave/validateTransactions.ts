import { Transaction } from "../transactions/transaction";

const ValidTransactions = [
    'BUY',
    'SELL',
    'CASH DIV',
    'REI',
    'RTC',
    'TRANSFER', // Going to ignore these... transfers added automatically elsewhere
];

//
// Throw an error if there are any transactions that we don't recognize.
// I'd rather fail the entire batch and figure out what's wrong than
// allow a partial batch to be imported.
//
export function validateTransactions(transactions: Transaction[]): void {
    transactions.forEach(tx => {
        if (ValidTransactions.indexOf(tx.type) === -1) {
            throw new Error(`Unsupported transaction type ${tx.type}`);
        }
    });
}
