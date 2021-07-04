export type StockSymbol = string;

//
// This defines the expected schema for the holdings.json file. e.g.
// {
//   "FOO": { "acb": 1009.99, "qty": 100 },
//   "BAR": { "acb": 2019.98, "qty": 200 }
// }
//

export type Holding = {
    acb: number;
    qty: number;    
};

export type Holdings = Record<StockSymbol, Holding>;

export const newHolding = {
    acb: 0,
    qty: 0,
};
