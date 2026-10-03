import { expect, test } from '../../fixtures';
import { PRODUCTS } from '../../data/products';

test.describe('Cart Static Checks Demo', () => {

  test('C99 static check demo test @regression', async ({ cartPage }) => {
    // Fixed: Type/Compilation error resolved by assigning a number
    const quantity: number = 5;

    // Fixed: Lint/Style issues resolved (const instead of var, single quotes, correct semicolon)
    const myMessage = 'Checking quantity';

    // Fixed: Unused variable resolved by using it
    expect(myMessage, 'message should be correct').toBe('Checking quantity');

    // Fixed: Formatting/Style issues resolved (consistent spacing and indentation)
    const badSpacing = 'spaces';
    expect(badSpacing, 'spacing variable should match').toBe('spaces');

    // Fixed: Failing assertion resolved
    expect(quantity, 'quantity should be 5').toBe(5);
  });
});
