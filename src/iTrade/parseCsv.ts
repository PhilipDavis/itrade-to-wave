import { Transaction } from '../transactions/transaction';
import moment from 'moment';

export const StandardHeader = 'Description,Symbol,Transaction Date,Settlement Date,Account Currency,Type,Quantity,Currency of Price,Price,Settlement Amount';

//
// These are the headers verbatim out of the iTrade
// transaction CSV. Each header is assigned a function
// that converts an input column to a transaction field
//
const csvHeaderFuncs: Record<string, (tx: Partial<Transaction>, input: string) => Partial<Transaction>> = {
    'Description':       readString('desc'),
    'Symbol':            readString('symbol'),
    'Transaction Date':  readDate('transactionDate'),
    'Settlement Date':   readDate('settlementDate'),
    'Account Currency':  readString('accountCurrency'),
    'Type':              readString('type'),
    'Quantity':          readNumber('qty'),
    'Currency of Price': readString('currency'),
    'Price':             readNumber('unitPrice'),
    'Settlement Amount': readNumber('settlementAmount'),
};

const csvHeaders = Object.keys(csvHeaderFuncs);

//
// Parse input CSV into an array of Transaction objects.
// Note: doesn't deal with quotes and escaping because the
// input does not require it. So we'll use a simple string
// split rather than a finite state machine (or npm library).
//
export function parseCsv(input: string): Transaction[] {
    const lines = input && input.split(/[\r\n]/).filter(line => !!line);
    if (!lines || !lines.length) {
        throw new Error('Input is empty');
    }

    //
    // Validate the header line. We do NOT want to attempt
    // to import if the data columns we are given does not
    // match our expectations.
    //
    const [ headerLine, ...dataLines ] = lines;
    const columnNames = headerLine.split(',');
    for (const columnName of columnNames) {
        if (csvHeaders.indexOf(columnName) === -1) {
            throw new Error(`Unexpected column ${columnName}`);
        }
    }
    for (const columnName of csvHeaders) {
        if (columnNames.indexOf(columnName) === -1) {
            throw new Error(`Missing column ${columnName}`);
        }
    }

    //
    // Read transactions from the data lines
    //
    const transactions = dataLines.map(line => {
        const values = line.split(',').map(value => value.trim());
        const tx = values.reduce<Partial<Transaction>>((tx, value, i) => {
            // Note: the iTrade CSV puts an extra comma at the end of each data
            // line (but not header line). Bail out when we run out of columns.
            if (i >= columnNames.length) {
                return tx;
            }
            const columnName = columnNames[i];
            const fn = csvHeaderFuncs[columnName];
            return fn(tx, value);
        }, {});
        return tx as Transaction;
    });

    return transactions;
}


//
// Helper functions to assign typed properties to a transaction object
//

function readString(propertyName: keyof Transaction) {
    return (tx: Partial<Transaction>, input: string) => ({
        ...tx,
        [propertyName]: input.trim()
    });
}

function readDate(propertyName: keyof Transaction) {
    return (tx: Partial<Transaction>, input: string) => ({
        ...tx,
        [propertyName]: moment(input, 'DD-MMM-YYYY', true).toDate()
    });
}

function readNumber(propertyName: keyof Transaction) {
    return (tx: Partial<Transaction>, input: string) => ({
        ...tx,
        [propertyName]: parseFloat(input)
    });
}
