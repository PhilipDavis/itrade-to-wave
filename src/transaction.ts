export type TransactionType =
    'BUY'
    | 'SELL'
    | 'CASH DIV'
    | 'REI'
;

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
