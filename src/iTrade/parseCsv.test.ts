import { parseCsv } from "./parseCsv";

const StandardHeader = 'Description,Symbol,Transaction Date,Settlement Date,Account Currency,Type,Quantity,Currency of Price,Price,Settlement Amount';

describe('parseCsv', () => {
    describe('transaction types', () => {
        const cases = [
            { expected: 'BUY',  line: 'ACME CORP      ,ACME,28-Jun-2021,30-Jun-2021,CAD,BUY,200.00,CAD,10.000,-2009.99,' },
            { expected: 'SELL', line: 'ACME CORP      ,ACME,28-Jun-2021,30-Jun-2021,CAD,SELL,200.00,CAD,10.000,1990.01,' },
            { expected: 'CASH DIV', line: 'ACME CORP CASH DIV  ON     200 SHS REC 06/01/21 PAY 06/28/21      ,ACME,28-Jun-2021,30-Jun-2021,CAD,CASH DIV,0.00,CAD,0.000,2.50,' },
            { expected: 'REI',  line: 'ACME CORP FUNDS HELD FOR REINVESTMENT      ,ACME,28-Jun-2021,30-Jun-2021,CAD,REI,0.00,CAD,0.000,-2.50,' },
        ];
        cases.forEach(({ expected, line }) => {
            it(`recognizes ${expected}`, () => {
                const csv = `${StandardHeader}\n${line}`;
                const transactions = parseCsv(csv);
                expect(transactions).toHaveLength(1);
                expect(transactions[0]).toHaveProperty('type', expected);
            });
        });
    });

    it('parses valid transactions', () => {
        const csv = `${StandardHeader}\nACME CORP      ,ACME,28-Jun-2021,30-Jun-2021,CAD,BUY,200.00,CAD,10.000,-2009.99,\nACME CORP      ,ACME,28-Jun-2021,30-Jun-2021,CAD,SELL,200.00,CAD,10.000,1990.01,`;
        const result = parseCsv(csv);
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
            desc: 'ACME CORP',
            symbol: 'ACME',
            transactionDate: new Date(2021, 5, 28),
            settlementDate: new Date(2021, 5, 30),
            accountCurrency: 'CAD',
            type: 'BUY',
            qty: 200,
            currency: 'CAD',
            unitPrice: 10,
            settlementAmount: -2009.99,
        });
        expect(result[1]).toMatchObject({
            desc: 'ACME CORP',
            symbol: 'ACME',
            transactionDate: new Date(2021, 5, 28),
            settlementDate: new Date(2021, 5, 30),
            accountCurrency: 'CAD',
            type: 'SELL',
            qty: 200,
            currency: 'CAD',
            unitPrice: 10,
            settlementAmount: 1990.01,
        });
    });

    it('throws an error when an unknown column is found', () => {
        const csv = 'Description,Symbol,Transaction Date,Foo,Settlement Date,Account Currency,Type,Quantity,Currency of Price,Price,Settlement Amount\nACME CORP      ,ACME,28-Jun-2021,Bar,30-Jun-2021,CAD,SELL,200.00,CAD,10.000,1990.01,';
        expect(() => parseCsv(csv)).toThrowError('Unexpected column Foo');
    });

    it('throws an error when an expected column is missing', () => {
        const csv = 'Description,Symbol,Settlement Date,Account Currency,Type,Quantity,Currency of Price,Price,Settlement Amount\nACME CORP      ,ACME,30-Jun-2021,CAD,SELL,200.00,CAD,10.000,1990.01,';
        expect(() => parseCsv(csv)).toThrowError('Missing column Transaction Date');
    });
});
