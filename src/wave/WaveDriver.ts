import { omit } from "lodash";
import { launch, Page } from "puppeteer";
import { PageHelper } from "../util/PageHelper";
import { TransactionsPage } from "./TransactionsPage";

export class WaveDriver extends PageHelper {
    static UsernameFieldSelector = '#id_username';
    static PasswordFieldSelector = '#id_password';
    static SignInButtonSelector = '.id-auth__login-submit-button';
    static MenuToggleSelector = '.wv-topbar__menu-toggle';
    
    static HeadingTitleClass = 'wv-heading--title';
    static MenuItemLinkClass = 'wv-nav__menu__item__link';

    static async launch() {
        const browser = await launch({
            headless: false,
            defaultViewport: {
                width: 800,
                height: 800,
            },
            env: omit(process.env, 'WAVE_LOGIN', 'WAVE_PASSWORD'),
            slowMo: 10,
            args: [],
        });
        const page = await browser.newPage();
        return new WaveDriver(page);
    }

    private constructor(page: Page) {
        super(page);
    }

    async close() {
        await this.page.browser().close();
    }

    async login(username: string, password: string) {
        await this.page.goto('https://my.waveapps.com/login/', { waitUntil: 'load' });
        await this.page.type(WaveDriver.UsernameFieldSelector, username);
        await this.page.type(WaveDriver.PasswordFieldSelector, password);
        await this.page.click(WaveDriver.SignInButtonSelector);
        await this.waitForElementWithText(WaveDriver.HeadingTitleClass, 'Dashboard', { timeout: 30000 });
    }

    private async toggleMenu() {
        const menuToggle = await this.page.waitForSelector(WaveDriver.MenuToggleSelector);
        if (!menuToggle) {
            throw new Error('Failed to find menu toggle');
        }
        await menuToggle.click();
    }

    async loadTransactionsPage() {
        await this.toggleMenu();
        await this.delay(750);
        await this.clickElementWithText(WaveDriver.MenuItemLinkClass, 'Accounting');
        await this.delay(500);
        await this.clickElementWithText(WaveDriver.MenuItemLinkClass, 'Transactions');
        await this.delay(500);
        await this.toggleMenu();

        return await TransactionsPage.fromPage(this.page);
    }
}
