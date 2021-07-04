import { Transaction, TransactionType } from "./transaction";
import { JournalLine, TransactionsPage } from "./wave/TransactionsPage";

export interface TransactionProcessor {
    on(event: 'acb-changed', handler: (acb: number) => void): TransactionProcessor;
}

export class TransactionProcessor {
    private readonly txPage: TransactionsPage;
    private readonly cashAccount: string;
    private readonly equitiesAccount: string;
    private readonly adjustedCostBases: Record<string, number>;
    private readonly stockQuantities: Record<string, number>;

    constructor(txPage: TransactionsPage, cashAccount: string, equitiesAccount: string, adjustedCostBases: Record<string, number>, stockQuantities: Record<string, number>) {
        this.txPage = txPage;
        this.cashAccount = cashAccount;
        this.equitiesAccount = equitiesAccount;
        this.adjustedCostBases = adjustedCostBases;
        this.stockQuantities = stockQuantities;
    }

    async process(tx: Transaction) {
        switch (tx.type) {
            case TransactionType.Buy:
                await this.recordStockPurchase(tx);
                break;
            
            case TransactionType.Sell:
                await this.recordStockSale(tx);
                break;

            case TransactionType.CashDiv:
                await this.recordCashDividend(tx);
                break;

            case TransactionType.Held:
                // Funds being held/released for reinvestment.
                // These transactions are just informational and don't get
                // sent to Wave because nothing is moving between accounts.
                break;

            default:
                throw new Error(`Unsupported transaction type ${tx.type}`);
        }
    }

    private async recordStockPurchase(tx: Transaction) {
        const description = `Buy ${tx.qty} ${tx.symbol}`;
        await this.txPage.addExpense(tx.transactionDate, description, this.cashAccount, this.equitiesAccount, tx.settlementAmount, tx.desc);

        // Add the transaction settlement amount to the adjusted cost base for this stock.
        // Note that settlement amount includes the trading fee, which we're adding to
        // the ACB because we're treating everything as income rather than capital gains.
        // This is not accounting advice. Do something different if you're holding stocks
        // for a long time... because capital gains are more tax-efficient than income. 
        const acb = this.adjustedCostBases[tx.symbol] || 0;
        this.adjustedCostBases[tx.symbol] = acb + Math.abs(tx.settlementAmount);

        const qty = this.stockQuantities[tx.symbol] || 0;
        this.stockQuantities[tx.symbol] = qty + tx.qty;
    }

    private async recordStockSale(tx: Transaction) {
        const description = `Sell ${tx.qty} ${tx.symbol}`;

        const acb = this.adjustedCostBases[tx.symbol];
        if (!acb) {
            throw new Error(`Missing ACB for stock ${tx.symbol}`);
        }

        const qty = this.stockQuantities[tx.symbol];
        if (!qty) {
            throw new Error(`Missing quantity for stock ${tx.symbol}`);
        }

        // Take the number of shares sold and calculate how much of
        // our total book value that accounts for. That amount will
        // be used to calculate the realized gains/losses.
        // Round to the nearest cent.
        const acbPerShare = acb / qty;
        const costAmount = Math.round(tx.qty * acbPerShare * 100) / 100;

        const journalLines: JournalLine[] = [
            {
                type: 'debit',
                accountName: this.cashAccount,
                amount: tx.settlementAmount,
            },
            {
                type: 'credit',
                accountName: this.equitiesAccount,
                amount: costAmount,
            },
        ];
        
        // Careful: Math in JavaScript can be imprecise. (e.g. 0.03 - 0.02 === 0.00999999999999)
        const gainOrLoss = Math.round((tx.settlementAmount - costAmount) * 100) / 100;
        if (gainOrLoss) {
            journalLines.push({
                type: gainOrLoss > 0 ? 'credit' : 'debit',
                accountName: 'Realized Gains/Losses',
                amount: Math.abs(gainOrLoss),
            });
        }

        await this.txPage.addJournalTransaction(tx.transactionDate, description, tx.desc, journalLines);

        //
        // Remove the sold shares from the adjusted cost base.
        // Note: calculate using qty and unitPrice because the settlementAmount
        // includes the trading fee, which should not be removed from ACB.
        // Rather, trading fee eats into the gains because we're treating
        // the gains as income, not capital gain.
        //
        this.adjustedCostBases[tx.symbol] = acb - (tx.qty * acbPerShare);

        this.stockQuantities[tx.symbol] = qty - tx.qty;
    }

    async recordCashDividend(tx: Transaction) {
        // Read quantity from the description because iTrade does not put it in the quantity field
        const regex = /CASH DIV\s+ON\s+(\d+) SHS REC \d\d\/\d\d\/\d\d PAY \d\d\/\d\d\/\d\d/;
        const match = regex.exec(tx.desc);
        if (!match) {
            throw new Error(`Failed to find share quantity in dividend description "${tx.desc}"`);
        }
        const qty = parseInt(match[1], 10);

        const description = `Dividend paid on ${qty} ${tx.symbol}`;

        const journalLines: JournalLine[] = [
            {
                type: 'debit',
                accountName: this.cashAccount,
                amount: tx.settlementAmount,
            },
            {
                type: 'credit',
                accountName: 'Dividend Income',
                amount: tx.settlementAmount,
            },            
        ];

        await this.txPage.addJournalTransaction(tx.settlementDate, description, tx.desc, journalLines);
    }
}
