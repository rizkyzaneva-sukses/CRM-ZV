/**
 * Formats a number or numeric string to Indonesian Rupiah currency format.
 * Examples:
 *   formatRupiah(166000) => "Rp 166.000"
 *   formatRupiah("166000.00") => "Rp 166.000"
 *   formatRupiah(0) => "Rp 0"
 */
export function formatRupiah(amount) {
  if (amount == null || amount === '') return 'Rp 0';
  const num = Math.round(Number(amount) || 0);
  return `Rp ${num.toLocaleString('id-ID')}`;
}
