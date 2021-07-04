import moment from "moment";
import { Transaction } from "./transaction";

//
// Convert a Transaction to a CSV line (DOS line endings).
// Note: we don't add an extra comma like iTrade does.
// Also, the line we write out will differ in other ways
// from the source data -- e.g. extra white space removed
// Also note: we don't quote or escape because the source
// data is expected to not contain commas.
//
export function toCsv(tx: Transaction): string {
    return [
        tx.desc,
        tx.symbol,
        moment(tx.transactionDate).format('DD-MMM-YYYY'),
        moment(tx.settlementDate).format('DD-MMM-YYYY'),
        tx.accountCurrency,
        tx.type,
        tx.qty,
        tx.currency,
        tx.unitPrice,
        tx.settlementAmount,
    ].join(',') + '\r\n';
}
