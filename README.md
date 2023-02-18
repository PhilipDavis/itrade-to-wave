# iTrade-to-Wave
A script to automate the import of stock transactions from Scotia iTrade to Wave Accounting.

## How to Run
- See below... but, first, read through the caveats and other notes.

## Notes
- Transaction CSV from iTrade has an extra comma at the end of each line
- When a given stock has buy and sell transactions on the same day, the order of transactions in the CSV is undefined.
    - When this condition is identified, the process will indicate which lines need disambiguation.
    - Add a number at the end of the line to indicate the relative ordering of the lines. For example:
        - FOO CORP,FOO,05-Jul-2021,07-Jul-2021,CAD,SELL,1000.00,CAD,11.200,11190.01,*4*
        - FOO CORP,FOO,05-Jul-2021,07-Jul-2021,CAD,BUY,1000.00,CAD,10.000,-10009.99,*1*
        - FOO CORP,FOO,05-Jul-2021,07-Jul-2021,CAD,BUY,1000.00,CAD,10.200,-10209.99,*3*
        - FOO CORP,FOO,05-Jul-2021,07-Jul-2021,CAD,SELL,1000.00,CAD,11.000,10990.01,*2*
    - You can also manually rearrange the lines to be in order -- but the relative index is still required 


## Caveats
- Assumes the parameters in the .env file (credentials, account names, etc) are filled out correctly
- Only handles a single trading account
- Cash dividends are the only type of dividend tested (stock dividends and return of capital are not supported)
- Only tested with stocks -- i.e. no support for options or other types of securities
- Only tested with long positions
- Currently only handles CAD account... no foreign currencies
- Doesn't handle stock splits
- Assumes that all gains are income rather than capital gains
- Records dividend income only when it is received (as opposed to first putting it in a Dividends Receivable account on the record date and moving into Dividend Income when paid).
- Everything is based on transaction date, not the settlement date
- It assumes you don't trade identical symbols on different exchanges... this hasn't been tested
- The transactions created in Wave are left as Not Reviewed. It's prudent to have a separate (manual) review process
- *New as of F2022*: Wave login is now protected by Captcha. Rather that try to defeat it, we now connect to an existing browser that has already been logged into manually (more details in How to Run)

## Warning
- Wave uses Optimizely for running A/B tests so it's possible that parts of the website I saw when developing this tool are different for someone else.
- The website structure can change over time, which may break this tool
- Dollar amounts in iTrade transaction exports are limited to three digits of precision. This can lead to rounding errors in the cost basis and realized gains and losses. Be sure to review the output carefully.
- This software was designed for my needs. You are welcome to use it and/or modify it for your needs but you assume all liability. I make no guarantees of its performance or fitness for any purpose.

## How to Run

### Installation
This assumes you already have Node.js and npm installed
1. Download the source code
2. run `npm i` to install the dependencies

### Run the tests (BROKEN)
*As of F2022* Wave login is protected by Captcha... the tests won't work as is because they try to login.

As noted above, the layout and structure of Wave may change over time, and even for different users.
Therefore, it's highly suggested that you run the integration tests and only continue with the
program if all tests pass.
1. type `npm run test` to run the unit tests (press q to exit when done)
2. Copy the .env.sample to .env and edit it to contain your details
3. type `npm run itest` to run the integration tests
4. wait until completion and verify that all tests pass
5. Log into Wave and manually delete the test entries

### Prepare your Inputs and Go!
1. Download your transactions from iTrade
2. Manually enter your holdings in data/holdings.json (refer to data/holdings.sample.json)
3. Copy the .env.sample to .env and edit it to contain your details
4. Close all instances of Chrome
5. Launch Chrome with remote debugging enabled
    ```
    "%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
    ```
TODO: finish the part of code that reads the websocket URL from Chrome (http://127.0.0.1:9222/json/version)
6. Navigate to Wave and login to your account
7. type `npm run start` in the project directory

### When transactions are ambiguous...
Buys and sells of the same stock on the same day are exported in random order.
The program detects this scenario and will let you know which rows need to be updated.
Once you've disambiguated the rows, rerun the program and it will continue if everything has been fixed.
