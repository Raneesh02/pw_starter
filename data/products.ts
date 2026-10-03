export type QuantityCase = {
  id: string; // e.g. 'C04-01'
  qty: number;
};

export const QUANTITY_CASES: QuantityCase[] = Array.from({ length: 10 }, (_, i) => ({
  id: `C04-${String(i + 1).padStart(2, '0')}`,
  qty: i + 1,
}));

export const PRODUCTS = {
  search: {
    validKeyword: 'Pliers',
    invalidKeyword: 'xyzabc123',
  },
  categories: {
    handTools: 'Hand Tools',
    powerTools: 'Power Tools',
  },
  sort: {
    priceAsc: 'price,asc',
    nameAsc: 'name,asc',
  },
};
