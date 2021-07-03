import { ElementHandle, JSHandle, Page } from "puppeteer";

export class PageHelper {
    protected readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }
    
    protected async waitForElementWithText(className: string, text: string, options?: { timeout?: number; polling?: string | number }) {
        await this.page.waitForFunction(`(cn, t) => {
            const elements = [ ...document.getElementsByClassName(cn) ];
            return elements.find(el => el.innerText === t)
        }`, options, className, text);
    }

    protected async clickElementWithText(className: string, text: string) {
        const handle = await this.page.evaluateHandle((cn: string, t: string) => {
            const elements = document.getElementsByClassName(cn);
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i] as HTMLElement;
                if (element.innerText === t) {
                    return element;
                }
            }
        }, className, text);

        const element = handle && handle.asElement();
        if (!element) {
            throw new Error(`Failed to find '${text}'`);
        }
        await element.click();
    }

    //
    // Helper function to overwrite the contents of an input field.
    // Note: when the target uses React, we can't simply replace
    // the value of the HTML element. So use some keyboard shortcuts
    // to select all contents before typing the value.
    //
    protected async setFieldValue(selector: string, value: string) {
        const field = await this.page.waitForSelector(selector);
        if (!field) {
            throw new Error(`Failed to find field ${selector}`);
        }
        await field.focus();

        // Select all contents of the field
        await this.page.keyboard.down('Control');
        await field.press('a');
        await this.page.keyboard.up('Control');

        // Replace previous contents
        await field.type(value);
        await this.delay(100);
    }

    protected async delay(milliseconds: number) {
        await new Promise(resolve => setTimeout(resolve, milliseconds));
    }
}
