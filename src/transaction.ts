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
};
