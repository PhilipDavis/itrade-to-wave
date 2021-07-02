import { launch, Browser, Page } from "puppeteer";

export class WaveDriver {
    browser: Browser;
    page: Page;

    static UsernameId = '#id_username';
    static PasswordId = '#id_password';
    static SignInButton = '.id-auth__login-submit-button';
    static TransactionsLink = ".wv-nav__menu__item__link[text='Transactions']";
    static AddIncomeButton = ".wv-button[text='Add Income']";
    static AddExpenseButton = ".wv-button[text='Add Expense']";

    async launch() {
        this.browser = await launch({
            headless: false,
            slowMo: 10,
            args: [],
        });
        this.page = await this.browser.newPage();
    }

    async close() {
        await this.browser.close();
    }

    async login(username: string, password: string) {
        await this.page.goto('https://my.waveapps.com/login/', { waitUntil: 'load' });
        await this.page.type(WaveDriver.UsernameId, username);
        await this.page.type(WaveDriver.PasswordId, password);
        await this.page.click(WaveDriver.SignInButton);

        // Go to the Transactions page
        const link = await this.page.waitForSelector(WaveDriver.TransactionsLink);
        await link.click();

        await this.page.waitForSelector(WaveDriver.AddIncomeButton);
    }
}
