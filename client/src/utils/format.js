export const gbp = (pence = 0) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((Number(pence) || 0) / 100);

export const toPence = (value) => Math.round(Number(value || 0) * 100);

export function vatBreakdown(lines) {
  return lines.reduce((acc, line) => {
    const rate = String(line.vatRate || 0);
    acc[rate] ||= { vatRate: line.vatRate || 0, netPence: 0, vatPence: 0, grossPence: 0 };
    const gross = Math.round(line.pricePence * line.quantity) - (line.discountPence || 0);
    const net = line.vatRate ? Math.round((gross * 100) / (100 + line.vatRate)) : gross;
    acc[rate].grossPence += gross;
    acc[rate].netPence += net;
    acc[rate].vatPence += gross - net;
    return acc;
  }, {});
}
