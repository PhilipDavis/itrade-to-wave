import { Transaction } from "./transaction";

export function sortByDateSymbolAndOrder(a: Transaction, b: Transaction): number {
    // First, sort by date -- earliest comes first
    if (a.transactionDate < b.transactionDate) return -1;
    if (a.transactionDate > b.transactionDate) return 1;

    // Then, sort by stock symbol
    if (a.symbol < b.symbol) return -1;
    if (a.symbol > b.symbol) return 1;

    // Then, sort by the relative order specifier (if defined)
    // and favour defined values over not defined
    if (a.order === undefined && b.order === undefined) return 0;
    if (b.order === undefined) return -1;
    if (a.order === undefined) return 1;
    return a.order - b.order;
}
