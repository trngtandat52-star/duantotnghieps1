function getVariantPrice(basePrice, variantsSize, variantSize) {
  let sizes = [];
  if (Array.isArray(variantsSize)) {
    sizes = variantsSize;
  } else if (variantsSize) {
    sizes = JSON.parse(variantsSize);
    if (!Array.isArray(sizes)) {
      throw new Error('Dữ liệu biến thể kích thước của sản phẩm không hợp lệ.');
    }
  }

  const sizeIndex = sizes.findIndex((size) => String(size) === variantSize);
  const multiplier = sizeIndex === 1 ? 1.15 : sizeIndex === 2 ? 1.35 : 1;
  return Math.round(((Number(basePrice) || 0) * multiplier) / 10000) * 10000;
}

module.exports = getVariantPrice;
