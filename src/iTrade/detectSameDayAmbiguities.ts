import moment from "moment";
import { mapValues, values } from "lodash";
import { Transaction, TransactionType } from "../transactions/transaction";

//
// These transaction types cause ordering ambiguity
// when transacted on the same day in the same symbol.
// The adjusted cost base will be different depending
// on the order in which transactions are processed,
// which, in turn, affects the realized gains/losses.
//
const problemTransactionTypes = [
    TransactionType.Buy,
    TransactionType.Sell,
];

type SymbolAndDate = string;
const makeKey = (tx: Transaction): SymbolAndDate => `${tx.symbol}:${moment(tx.transactionDate).format('DD-MMM-YYYY')}`;

//
// Given a set of transactions, we need to determine which (if any) of the
// transactions are ambiguous with respect to the order of operations.
// Specifically, the transactions exported from iTrade don't have a defined
// order when multiple transactions for the same symbol occurred on the same
// date. So we need to detect these occurrences to ensure that our realized
// gains/losses calcuations are correct.
//
export function detectSameDayAmbiguities(transactions: Transaction[]): Transaction[][] {
    const transactionsBySymbolAndDate: Record<SymbolAndDate, Record<TransactionType, Transaction[]>> = {};

    //
    // Sort all the transactions into buckets by symbol + date
    // and then by transaction type. For example,
    // {
    //   "FOO:04-Jul-2021": {
    //     "BUY": [ tx, tx ]
    //   },
    //   "FOO:05-Jul-2021": {
    //     "BUY": [ tx ],
    //     "SELL": [ tx ]
    //   },
    // }
    //
    for (const tx of transactions) {
        const key = makeKey(tx);
        const transactionsByType = transactionsBySymbolAndDate[key] || {};
        const matches = transactionsByType[tx.type] || [];
        transactionsByType[tx.type] = [ ...matches, tx ];
        transactionsBySymbolAndDate[key] = transactionsByType;
    }

    //
    // Eliminate all symbol + date pairs that contain only
    // a single transaction type bucket (i.e. no conflicts)
    //
    for (const key of Object.keys(transactionsBySymbolAndDate)) {
        const transactionsByType = transactionsBySymbolAndDate[key];
        if (Object.keys(transactionsByType).length === 1) {
            delete transactionsBySymbolAndDate[key];
        }
    }

    //
    // Combine the transaction type buckets within each
    // symbol + date bucket so we have:
    // {
    //   "FOO:05-Jul-2021": [ tx, tx ]
    // }
    //
    const combined = mapValues(transactionsBySymbolAndDate, value => {
        const transactionTypes = Object.keys(value) as TransactionType[];
        return transactionTypes.reduce<Transaction[]>((all, tt) => ([ ...all, ...value[tt] ]), []);
    });

    //
    // Eliminate all buckets where all the contained transactions
    // have an order defined. These are no longer ambiguous.
    //
    for (const key of Object.keys(combined)) {
        if (!combined[key].some(tx => tx.order === undefined)) {
            delete combined[key];
        }
    }

    // And, finally, discard the symbol and date... just return the transaction groups
    return values(combined);
}
