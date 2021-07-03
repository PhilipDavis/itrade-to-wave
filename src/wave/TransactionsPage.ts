import moment from 'moment';
import { Page } from "puppeteer";
import { PageHelper } from "../util/PageHelper";

export type JournalLine = {
    type: 'debit' | 'credit';
    accountName: string;
    amount: number;
};

export class TransactionsPage extends PageHelper {
    static NavItemClass = 'wv-nav__item';
    static SmallButtonClass = 'wv-button--small';
    static PrimaryButtonClass = 'wv-button--primary';
    static ButtonClass = 'wv-button';
    static DropDownMenuClass = 'wv-dropdown__menu__link';
    static MenuItemLabelClass = 'wv-nav__menu__item__label';
    static SelectOptionClass = 'wv-select__menu__option';
    static JournalTableButtonClass = 'transactions-list-v2__journal__table__button';

    static AddExpenseLabel = 'Add expense';
    static MoreLabel = 'More';
    static AddJournalTransactionLabel = 'Add journal transaction';
    static AddCreditLabel = 'Add credit';
    static NotesLabel = 'Notes';
    static SaveLabel = 'Save';
    
    static TransactionRowSelector = '.transactions-list-v2__row';
    static SelectMenuSelector = '.wv-select__menu';
    static SelectMenuOptionSelector = `${TransactionsPage.SelectMenuSelector} .${TransactionsPage.SelectOptionClass}`;

    static TxModalOpenSelector = '.transactions-list-v2__anchor-transaction-modal.wv-modal--open';
    static TxSelector = '.transactions-list-v2__details';
    static TxDateFieldSelector = `${TransactionsPage.TxSelector} .wv-datepicker .wv-input`;
    static TxDescFieldSelector = `${TransactionsPage.TxSelector} .transactions-list-v2__anchor-transaction__edit__field--description .wv-input`;
    static TxAccountFieldSelector = `${TransactionsPage.TxSelector} .transactions-list-v2__anchor-transaction__edit__field--account__select`;
    static TxAmountFieldSelector = `${TransactionsPage.TxSelector} .anchor-transaction__line-item-amount__account-amount .wv-input`;
    static TxCategoryFieldSelector = `${TransactionsPage.TxSelector} .transactions-list-v2__anchor-transaction__line-items__line-item__fields__form-field`;
    static TxNotesFieldSelector = '.transactions-list-v2__anchor-transaction__notes textarea';
    static TxSaveButtonSelector = `${TransactionsPage.TxModalOpenSelector} .transactions-list-V2__transaction__footer__item.${TransactionsPage.PrimaryButtonClass}`;

    static JournalModalOpenSelector = '.wv-modal.transactions-list-v2__journal-entry-modal.wv-modal--open';
    static JournalEntrySelector = '.transactions-list-v2__details__edit.transactions-list-v2__journal-entry';
    static JournalSelector = '.transactions-list-v2__journal-entry';
    static JournalDateFieldSelector = `${TransactionsPage.JournalEntrySelector} .wv-datepicker .wv-input`;
    static JournalDescriptionFieldSelector = `${TransactionsPage.JournalEntrySelector} .transactions-list-v2__journal-entry__journal-entry-fields__description-form-field .wv-input`;
    static JournalColumnSelector = (col: number) => `${TransactionsPage.JournalSelector} .line-item-column:nth-child(${col})`;
    static JournalDebitColumnSelector = TransactionsPage.JournalColumnSelector(1);
    static JournalCreditColumnSelector = TransactionsPage.JournalColumnSelector(2);
    static JournalDebitAmountSelector = (row: number) => `${TransactionsPage.JournalDebitColumnSelector} .line-item-box:nth-child(${row}) .wv-input--amount`;
    static JournalCreditAmountSelector = (row: number) => `${TransactionsPage.JournalCreditColumnSelector} .line-item-box:nth-child(${row}) .wv-input--amount`;
    static JournalDebitAccountToggleSelector = (row: number) => `${TransactionsPage.JournalDebitColumnSelector} .line-item-box:nth-child(${row}) .wv-select__toggle`;
    static JournalCreditAccountToggleSelector = (row: number) => `${TransactionsPage.JournalCreditColumnSelector} .line-item-box:nth-child(${row}) .wv-select__toggle`;
    static JournalAddCreditButtonSelector = `${TransactionsPage.JournalCreditColumnSelector} button.wv-button--small`;
    static JournalAddDebitButtonSelector = `${TransactionsPage.JournalDebitColumnSelector} button.wv-button--small`;
    static JournalNotesFieldSelector = '.transactions-list-v2__details__notes.transactions-list-v2__journal-entry textarea';


    private constructor(page: Page) {
        super(page);
    }

    static async fromPage(page: Page) {
        //
        // Wait for the transactions to load.
        // Note: This assumes there is at least one transaction on the books
        //
        await page.waitForSelector(TransactionsPage.TransactionRowSelector);
        return new TransactionsPage(page);
    }

    async addExpense(date: Date, description: string, cashAccountName: string, equitiesAccountName: string, amount: number, notes: string) {
        // Click Add expense button
        await this.clickElementWithText(TransactionsPage.ButtonClass, TransactionsPage.AddExpenseLabel);

        // Wait for the dialog to load
        await this.page.waitForSelector(TransactionsPage.TxSelector);

        // Enter the date
        await this.setFieldValue(TransactionsPage.TxDateFieldSelector, moment(date).format('YYYY-MM-DD'));

        // Enter the description
        await this.setFieldValue(TransactionsPage.TxDescFieldSelector, description);

        // Enter the account name
        await this.selectMenuOption(TransactionsPage.TxAccountFieldSelector, cashAccountName);

        // Enter the amount
        await this.setFieldValue(TransactionsPage.TxAmountFieldSelector, `${amount}`);

        // Enter the category
        await this.selectMenuOption(TransactionsPage.TxCategoryFieldSelector, equitiesAccountName);

        // Enter the notes, if non-empty
        if (notes) {
            await this.clickElementWithText(TransactionsPage.NavItemClass, TransactionsPage.NotesLabel);
            const notesField = await this.page.waitForSelector(TransactionsPage.TxNotesFieldSelector);
            notesField && await notesField.type(notes);
        }

        // Save the transaction
        await this.page.click(TransactionsPage.TxSaveButtonSelector);

        // Wait for the dialog to disappear
        await this.page.waitForSelector(TransactionsPage.TxModalOpenSelector, { hidden: true });

        // Give the page time to react (e.g. send data to server, redraw DOM, ...)
        await this.delay(1000);
        await this.waitForNetworkIdle();
    }

    //
    // Helper method to handle Wave's custom dropdown fields
    //
    private async selectMenuOption(menuSelector: string, optionText: string) {
        // Click the select field to open the dropdown menu
        await this.page.waitForSelector(menuSelector);
        await this.page.click(menuSelector);

        // Wait for the menu to appear and load at least one entry
        await this.page.waitForSelector(TransactionsPage.SelectMenuOptionSelector);

        // Select the menu option with the given text
        await this.clickElementWithText(TransactionsPage.SelectOptionClass, optionText);

        // Wait for the menu to disappear
        await this.page.waitForSelector(TransactionsPage.SelectMenuSelector, { hidden: true });

        // Give the page time to react (e.g. send data to server, redraw DOM, ...)
        await this.delay(1000);
        await this.waitForNetworkIdle();
    }

    private async enterDebit(row: number, accountName: string, amount: number) {
        await this.setFieldValue(TransactionsPage.JournalDebitAmountSelector(row), `${amount}`);
        await this.selectMenuOption(TransactionsPage.JournalDebitAccountToggleSelector(row), accountName);
    }

    private async enterCredit(row: number, accountName: string, amount: number) {
        await this.setFieldValue(TransactionsPage.JournalCreditAmountSelector(row), `${amount}`);
        await this.selectMenuOption(TransactionsPage.JournalCreditAccountToggleSelector(row), accountName);
    }

    async addJournalTransaction(date: Date, description: string, notes: string, lines: JournalLine[]) {
        await this.clickElementWithText(TransactionsPage.ButtonClass, TransactionsPage.MoreLabel);
        await this.clickElementWithText(TransactionsPage.DropDownMenuClass, TransactionsPage.AddJournalTransactionLabel);

        // Wait for the new entry dialog to appear
        await this.page.waitForSelector(TransactionsPage.JournalEntrySelector);

        // Enter the date
        await this.setFieldValue(TransactionsPage.JournalDateFieldSelector, moment(date).format('YYYY-MM-DD'));

        // Enter the description
        await this.page.type(TransactionsPage.JournalDescriptionFieldSelector, description);

        let debitCount = 0;
        let creditCount = 0;

        // Enter each debit/credit line
        for (const line of lines) {
            if (line.type === 'credit') {
                if (++creditCount > 1) {
                    await this.page.click(TransactionsPage.JournalAddCreditButtonSelector);
                }
                await this.enterCredit(creditCount, line.accountName, line.amount);
            }
            else {
                if (++debitCount > 1) {
                    await this.page.click(TransactionsPage.JournalAddDebitButtonSelector);
                }
                await this.enterDebit(debitCount, line.accountName, line.amount);
            }
        }

        // Enter the notes, if non-empty
        if (notes) {
            await this.clickElementWithText(TransactionsPage.NavItemClass, TransactionsPage.NotesLabel);
            const notesField = await this.page.waitForSelector(TransactionsPage.JournalNotesFieldSelector);
            notesField && await notesField.type(notes);
        }

        // Save the transaction
        await this.clickElementWithText(TransactionsPage.PrimaryButtonClass, TransactionsPage.SaveLabel);

        // Wait for the new entry dialog to disappear
        await this.page.waitForSelector(TransactionsPage.JournalModalOpenSelector, { hidden: true });

        // Give the page time to react (e.g. send data to server, redraw DOM, ...)
        await this.delay(1000);
        await this.waitForNetworkIdle();
    }
}
