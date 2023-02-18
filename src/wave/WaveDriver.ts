import { omit } from "lodash";
import { launch, connect, Page } from "puppeteer";
import { PageHelper } from "../util/PageHelper";
import { TransactionsPage } from "./TransactionsPage";

export class WaveDriver extends PageHelper {
    static UsernameFieldSelector = '#id_username';
    static PasswordFieldSelector = '#id_password';
    static SignInButtonSelector = '.id-auth__login-submit-button';
    static MenuToggleSelector = '.wv-topbar__menu-toggle';
    
    static HeadingTitleClass = 'wv-heading--title';
    static MenuItemLinkClass = 'wv-nav__menu__item__link';

    // This is obsolete now because Wave now uses a Captcha system to detect automated browsers.
    // Rather than reverse engineer the website (which probably violates the ToS ;) we'll just
    // connect to an existing browser instance that we've already logged into.
    static async launch() {
        const browser = await launch({
            headless: false,
            defaultViewport: {
                width: 800,
                height: 800,
            },
            env: omit(process.env, 'WAVE_LOGIN', 'WAVE_PASSWORD'),
            slowMo: 20,
            args: [
                "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
            ],
        });
        const page = await browser.newPage();
        return new WaveDriver(page);
    }

    static async connect(wsUrl: string) {
        const browser = await connect({
            browserWSEndpoint: wsUrl,
            slowMo: 20,
        });
        const pages = await browser.pages();
        const pageTitles = await Promise.all(pages.map(p => p.title()));
        const wavePageIndex = pageTitles.findIndex(s => s.match(/Wave/));
        if (wavePageIndex < 0) {
            throw new Error('No Wave page found in the browser');
        }
        const page = pages[wavePageIndex];
        return new WaveDriver(page);
    }

    private constructor(page: Page) {
        super(page);
    }

    async close() {
        await this.page.browser().close();
    }

    async login(username: string, password: string) {
        await this.page.goto('https://my.waveapps.com/login/', { waitUntil: 'networkidle0' });
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
        await this.delay(750);
        const onTransactionsPage = await this.findElementWithText(WaveDriver.HeadingTitleClass, 'Transactions'); 
        if (!onTransactionsPage) {
            await this.clickElementWithText(WaveDriver.MenuItemLinkClass, 'Accounting');
            await this.delay(500);
            await this.clickElementWithText(WaveDriver.MenuItemLinkClass, 'Transactions');
            await this.delay(500);
        }
        return await TransactionsPage.fromPage(this.page);
    }
}
