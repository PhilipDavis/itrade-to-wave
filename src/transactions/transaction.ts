export type TransactionType =
    'BUY'
    | 'SELL'
    | 'CASH DIV'
    | 'REI'
;
export const TransactionType = {
    Buy: 'BUY' as TransactionType,
    Sell: 'SELL' as TransactionType,
    CashDiv: 'CASH DIV' as TransactionType,
    Held: 'REI' as TransactionType,
    // Note: When adding a new transaction type, decide if the new type
    //       also needs to be added to the problemTransactionTypes
    //       array in src/iTrade/detectSameDayAmbiguities.ts
} as const;

export type Currency =
    'CAD'
    | 'USD'
;

export type Money = number;

export type Transaction = {
    desc: string;
    symbol: string;
    transactionDate: Date;
    settlementDate: Date;
    accountCurrency: Currency;
    type: TransactionType;
    qty: number;
    currency: Currency; // Currency of the security
    unitPrice: Money;
    settlementAmount: Money;

    // Order does not come from iTrade data. Rather, it is a relative index number
    // to disambiguate between buys and sells of the same stock on the same day.
    // Smaller order numbers represent transactions that happened first (so order
    // 1 happened before order 2, which both happened before order 3, etc).
    // Order numbers must be assigned manually in the CSV file by the operator.
    // Order numbers must be unique for a given symbol and date pair.
    order?: number;
};
