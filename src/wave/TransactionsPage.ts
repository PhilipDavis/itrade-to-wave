import { Page } from "puppeteer";
import moment from 'moment';
import { PageHelper } from "../util/PageHelper";

export class TransactionsPage extends PageHelper {
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
    static SaveLabel = 'Save';
    
    static TransactionRowSelector = '.transactions-list-v2__row';
    static HeaderSelector = '.wv-header__title';
    static NewRowSelector = '.transactions-list-v2__row--new';
    static CheckBoxFieldSelector = `${TransactionsPage.NewRowSelector} .wv-checkbox .wv-input`;
    static DateFieldSelector = `${TransactionsPage.NewRowSelector} .wv-datepicker .wv-input`;
    static DescriptionCellSelector = `${TransactionsPage.NewRowSelector} .transactions-list-v2__row__description-cell`;
    static DescriptionFieldSelector = `${TransactionsPage.NewRowSelector} .transactions-list-v2__row__description-cell .wv-input`;
    static AmountCellSelector = `${TransactionsPage.NewRowSelector} .transactions-list-v2__row__amount-cell`;
    static AmountFieldSelector = `${TransactionsPage.NewRowSelector} .transactions-list-v2__row__amount-cell .wv-input`;

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
    static JournalAddCreditButtonSelector = `${TransactionsPage.JournalColumnSelector(2)} button.wv-button--small`;


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

    async addExpense(date: Date, description: string, cashAccountName: string, equitiesAccountName: string, amount: number) {
        await this.clickElementWithText(TransactionsPage.ButtonClass, TransactionsPage.AddExpenseLabel);

        await this.page.waitForSelector(TransactionsPage.NewRowSelector);

        // Find the date field and triple-click to highlight the contents
        const dateField = await this.page.waitForSelector(TransactionsPage.DateFieldSelector);
        if (!dateField) {
            throw new Error('Failed to find date field');
        }
        dateField.click({ clickCount: 3 });

        // Enter the date
        const dateValue = moment(date).format('YYYY-MM-DD');
        await dateField.type(dateValue);

        // Click the description cell
        // (Note: the input doesn't exist until the container is clicked/focused)
        const descriptionCell = await this.page.$(TransactionsPage.DescriptionCellSelector);
        descriptionCell && await descriptionCell.click();

        // Enter the description
        const descriptionField = await this.page.waitForSelector(TransactionsPage.DescriptionFieldSelector);
        if (!descriptionField) {
            throw new Error('Failed to find description field');
        }
        await descriptionField.type(description);

        // Tab to get to the account field and select the account
        await this.page.keyboard.press("Tab");
        await this.waitForElementWithText(TransactionsPage.SelectOptionClass, cashAccountName);
        await this.clickElementWithText(TransactionsPage.SelectOptionClass, cashAccountName);

        // Tab to get to the category field and select the category
        await this.page.keyboard.press("Tab");
        await this.waitForElementWithText(TransactionsPage.SelectOptionClass, equitiesAccountName);
        await this.clickElementWithText(TransactionsPage.SelectOptionClass, equitiesAccountName);

        // Can't tab from the category drop down... so focus the amount field directly
        const amountCell = await this.page.$(TransactionsPage.AmountCellSelector);
        amountCell && await amountCell.click();
        const amountField = await this.page.waitForSelector(TransactionsPage.AmountFieldSelector);
        if (!amountField) {
            throw new Error('Failed to find amount field');
        }
        await amountField.type(`${amount}`);   

        // Click on some other element to finalize the new row.
        // Arbitrarily choose the page title
        await this.page.click(TransactionsPage.HeaderSelector);
    }

    async addJournalTransaction(date: Date, description: string, cashAccountName: string, equitiesAccountName: string, gainsLossesAccount: string, settlementAmount: number, bookValue: number) {
        await this.clickElementWithText(TransactionsPage.ButtonClass, TransactionsPage.MoreLabel);
        await this.clickElementWithText(TransactionsPage.DropDownMenuClass, TransactionsPage.AddJournalTransactionLabel);

        // Wait for the new entry dialog to appear
        await this.page.waitForSelector(TransactionsPage.JournalEntrySelector);

        // Add another credit entry for the gain/loss
        const addCreditButton = await this.page.waitForSelector(TransactionsPage.JournalAddCreditButtonSelector);
        if (!addCreditButton) {
            throw new Error('Failed to find Add credit button');
        }
        await addCreditButton.click();

        // Enter the date
        await this.setFieldValue(TransactionsPage.JournalDateFieldSelector, moment(date).format('YYYY-MM-DD'));

        // Enter the description
        await this.page.type(TransactionsPage.JournalDescriptionFieldSelector, description);

        // Enter the debit amount
        await this.setFieldValue(TransactionsPage.JournalDebitAmountSelector(1), `${settlementAmount}`);

        // Select the debit account
        await this.page.click(TransactionsPage.JournalDebitAccountToggleSelector(1));
        await this.delay(500);
        await this.waitForElementWithText(TransactionsPage.SelectOptionClass, cashAccountName);
        await this.clickElementWithText(TransactionsPage.SelectOptionClass, cashAccountName);

        // Give time for the page to react
        await this.delay(500);

        // Enter the credit amount
        await this.setFieldValue(TransactionsPage.JournalCreditAmountSelector(1), `${bookValue}`);

        // Select the credit account
        await this.page.click(TransactionsPage.JournalCreditAccountToggleSelector(1));
        await this.delay(500);
        await this.waitForElementWithText(TransactionsPage.SelectOptionClass, equitiesAccountName);
        await this.clickElementWithText(TransactionsPage.SelectOptionClass, equitiesAccountName);

        // Give time for the page to react
        await this.delay(500);

        // Enter the credit amount
        const gain = Math.round((settlementAmount - bookValue) * 100) / 100;
        await this.setFieldValue(TransactionsPage.JournalCreditAmountSelector(2), `${gain}`);

        // Select the credit account
        await this.page.click(TransactionsPage.JournalCreditAccountToggleSelector(2));
        await this.delay(500);
        await this.waitForElementWithText(TransactionsPage.SelectOptionClass, gainsLossesAccount);
        await this.clickElementWithText(TransactionsPage.SelectOptionClass, gainsLossesAccount);

        // Give time for the page to react
        await this.delay(500);

        // Save the transaction
        await this.clickElementWithText(TransactionsPage.PrimaryButtonClass, TransactionsPage.SaveLabel);
    }
}
