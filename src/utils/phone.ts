const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

function toAsciiDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = persianDigits.indexOf(digit);
    return String(persianIndex >= 0 ? persianIndex : arabicDigits.indexOf(digit));
  });
}

export function formatIranianPhoneInput(value: string): string {
  const compact = toAsciiDigits(value).replace(/[^\d+]/g, '');
  if (compact.startsWith('+989')) return `0${compact.slice(3, 13)}`;
  if (compact.startsWith('00989')) return `0${compact.slice(4, 14)}`;
  if (compact.startsWith('989')) return `0${compact.slice(2, 12)}`;
  if (compact.startsWith('9')) return `0${compact.slice(0, 10)}`;
  return compact.slice(0, 11);
}

