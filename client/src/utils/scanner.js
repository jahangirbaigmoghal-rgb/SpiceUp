const EMBEDDED_PREFIXES = ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29'];

export function normaliseScan(value) {
  return String(value || '').trim().replace(/[\r\n\t]/g, '');
}

export function findProductForEntry(products, rawValue) {
  const value = normaliseScan(rawValue);
  if (!value) return null;

  const embedded = parseEmbeddedScaleBarcode(value, products);
  if (embedded) return embedded;

  const upper = value.toUpperCase();
  const product = products.find((p) => [p.barcode, p.plu, p.sku, p.quickCode]
    .filter(Boolean)
    .some((code) => String(code).toUpperCase() === upper));

  return product ? { product, source: 'direct' } : null;
}

export function parseEmbeddedScaleBarcode(rawValue, products = []) {
  const digits = normaliseScan(rawValue).replace(/\D/g, '');
  if (!/^\d{13}$/.test(digits) || !EMBEDDED_PREFIXES.includes(digits.slice(0, 2))) return null;

  const product = findEmbeddedProduct(products, digits);
  if (!product) return null;

  const prefixLength = String(product.scaleBarcodePrefix || product.barcode || '').length || 7;
  const payloadDigits = digits.slice(prefixLength, -1).slice(-5);
  const payloadValue = Number(payloadDigits);
  if (!Number.isFinite(payloadValue) || payloadValue <= 0) return null;

  const mode = product.scaleBarcodeMode || 'weight';
  const quantity = mode === 'price'
    ? Math.max(0.001, Math.round((payloadValue / Math.max(1, Number(product.pricePence || 1))) * 1000) / 1000)
    : Math.max(0.001, Math.round((payloadValue / 1000) * 1000) / 1000);

  return {
    product,
    source: 'scale_label',
    quantity,
    scan: {
      checkDigitValid: isValidEan13(digits),
      embeddedMode: mode,
      embeddedValue: payloadValue,
      rawBarcode: digits
    },
    weight: {
      grossWeight: quantity,
      tareWeight: Number(product.defaultTareGrams || 0) / 1000,
      netWeight: quantity,
      weightUnit: product.unitOfMeasure === 'litre' ? 'litre' : 'kg',
      weightSource: 'scale_label',
      scaleId: `EAN13:${digits.slice(0, -1)}`
    }
  };
}

export function displayQuantity(line) {
  if (line.soldByWeight) {
    const unit = line.weightUnit || line.unitOfMeasure || 'kg';
    return `${Number(line.netWeight || line.quantity || 0).toFixed(3)} ${unit}`;
  }
  return String(line.quantity);
}

export function shortcutLabel(product) {
  return product.hotkey || product.quickCode || product.plu || product.sku;
}

function findEmbeddedProduct(products, digits) {
  const configured = products
    .filter((p) => p.scaleBarcodePrefix)
    .sort((a, b) => String(b.scaleBarcodePrefix).length - String(a.scaleBarcodePrefix).length);
  const matched = configured.find((p) => digits.startsWith(String(p.scaleBarcodePrefix)));
  if (matched) return matched;

  const sevenDigitItemCode = digits.slice(0, 7);
  return products.find((p) => [p.barcode, p.plu].filter(Boolean).some((code) => String(code) === sevenDigitItemCode));
}

function isValidEan13(digits) {
  const body = digits.slice(0, 12).split('').map(Number);
  const total = body.reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 1 : 3), 0);
  const expected = (10 - (total % 10)) % 10;
  return expected === Number(digits[12]);
}
