import { JournalLine, TransactionsPage } from "./wave/TransactionsPage";

export class TransactionProcessor {
    private readonly txPage: TransactionsPage;

    constructor(txPage: TransactionsPage) {
        this.txPage = txPage;        
    }

    async recordStockPurchase(date: Date, symbol: string, qty: number, cashAccount: string, equitiesAccount: string, settlementAmount: number, notes: string = '') {
        const description = `Buy ${qty} ${symbol}`;
        await this.txPage.addExpense(date, description, cashAccount, equitiesAccount, settlementAmount, notes);
    }

    async recordStockSale(date: Date, symbol: string, qty: number, cashAccount: string, equitiesAccount: string, settlementAmount: number, costAmount: number, notes: string = '') {
        const description = `Sell ${qty} ${symbol}`;

        const journalLines: JournalLine[] = [
            {
                type: 'debit',
                accountName: cashAccount,
                amount: settlementAmount,
            },
            {
                type: 'credit',
                accountName: equitiesAccount,
                amount: costAmount,
            },            
        ];
        
        // Careful: Math in JavaScript can be imprecise. (e.g. 0.03 - 0.02 === 0.00999999999999)
        const gainOrLoss = Math.round((settlementAmount - costAmount) * 100) / 100;
        if (gainOrLoss) {
            journalLines.push({
                type: gainOrLoss > 0 ? 'credit' : 'debit',
                accountName: 'Realized Gains/Losses',
                amount: Math.abs(gainOrLoss),
            });
        }

        await this.txPage.addJournalTransaction(date, description, notes, journalLines);
    }

    async recordCashDividend(date: Date, symbol: string, qty: number, cashAccount: string, settlementAmount: number, notes: string = '') {
        const description = `Dividend paid on ${qty} ${symbol}`;

        const journalLines: JournalLine[] = [
            {
                type: 'debit',
                accountName: cashAccount,
                amount: settlementAmount,
            },
            {
                type: 'credit',
                accountName: 'Dividend Income',
                amount: settlementAmount,
            },            
        ];

        await this.txPage.addJournalTransaction(date, description, notes, journalLines);
    }
}
