const test = require('node:test');
const assert = require('node:assert/strict');
const getVariantPrice = require('./productPricing');

test('uses the base price for the first or unknown size', () => {
  const sizes = '["12W","24W","36W"]';
  assert.equal(getVariantPrice(899000, sizes, '12W'), 900000);
  assert.equal(getVariantPrice(899000, sizes, 'unknown'), 900000);
});

test('applies the same size multipliers used by cart prices', () => {
  const sizes = '["12W","24W","36W"]';
  assert.equal(getVariantPrice(899000, sizes, '24W'), 1030000);
  assert.equal(getVariantPrice(899000, sizes, '36W'), 1210000);
});

test('rejects malformed variant data', () => {
  assert.throws(
    () => getVariantPrice(899000, '{"invalid":true}', '12W'),
    /Dữ liệu biến thể kích thước/
  );
});
