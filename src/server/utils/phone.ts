const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

function toAsciiDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = persianDigits.indexOf(digit);
    if (persianIndex >= 0) return String(persianIndex);
    return String(arabicDigits.indexOf(digit));
  });
}

/** The single persisted/displayed phone format for this Iran-only product. */
export function normalizeIranianPhoneNumber(phone: string): string {
  const compact = toAsciiDigits(phone).trim().replace(/[\s()\-]/g, '');
  let local = compact;

  if (compact.startsWith('+98')) local = `0${compact.slice(3)}`;
  else if (compact.startsWith('0098')) local = `0${compact.slice(4)}`;
  else if (compact.startsWith('98') && compact.length === 12) local = `0${compact.slice(2)}`;
  else if (compact.startsWith('9') && compact.length === 10) local = `0${compact}`;

  if (!/^09\d{9}$/.test(local)) throw new Error('شماره موبایل معتبر ایران وارد کنید.');
  return local;
}

/** Used by phone inputs so a pasted international Iranian number becomes local immediately. */
export function formatIranianPhoneInput(value: string): string {
  const compact = toAsciiDigits(value).replace(/[^\d+]/g, '');
  if (compact.startsWith('+989')) return `0${compact.slice(3, 13)}`;
  if (compact.startsWith('00989')) return `0${compact.slice(4, 14)}`;
  if (compact.startsWith('989')) return `0${compact.slice(2, 12)}`;
  if (compact.startsWith('9')) return `0${compact.slice(0, 10)}`;
  return compact.slice(0, 11);
}
