import { TransactionType, Transaction } from "../transactions/transaction";

//
// Helper method to make a transaction record.
// This should only be used for unit testing
// (i.e. not part of the production codebase)
//
export function makeTx(type: TransactionType, symbol: string, dayOfMonth: number, order?: number): Transaction {    
    // Generate a random unit price from $9 to $11
    const unitPrice = 10 + Math.round((Math.random() * 2 - 1) * 1000) / 1000;
    const fee = 9.99;
    let qty = 100;

    let settlementAmount = 0;
    switch (type) {
        case TransactionType.Buy:  settlementAmount = -(unitPrice * qty + fee); break;
        case TransactionType.Sell: settlementAmount =   unitPrice * qty - fee;  break;
        // Don't care about other transaction types (YET!)
        // Note: we *would* care about other types if a new transaction
        //       type is added that affects the cost basis of a holding.
    }

    return {
        desc: `${symbol} CORP COM VTG SHS`,
        symbol,
        type,
        transactionDate: new Date(2021, 6, dayOfMonth),
        settlementDate: new Date(2021, 6, dayOfMonth + 2),
        currency: 'CAD',
        accountCurrency: 'CAD',
        qty: 100,
        unitPrice,
        settlementAmount,
        order,
    };
}
