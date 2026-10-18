const mojibakeMarkers = /[\u00d8\u00d9\u00db\u00c3\u00c2\u00e2]/;
const windows1252Bytes: Record<string, number> = {
  '\u20ac': 0x80, '\u201a': 0x82, '\u0192': 0x83, '\u201e': 0x84, '\u2026': 0x85,
  '\u2020': 0x86, '\u2021': 0x87, '\u02c6': 0x88, '\u2030': 0x89, '\u0160': 0x8a,
  '\u2039': 0x8b, '\u0152': 0x8c, '\u017d': 0x8e, '\u2018': 0x91, '\u2019': 0x92,
  '\u201c': 0x93, '\u201d': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02dc': 0x98, '\u2122': 0x99, '\u0161': 0x9a, '\u203a': 0x9b, '\u0153': 0x9c,
  '\u017e': 0x9e, '\u0178': 0x9f,
};

/** Repairs legacy Persian strings that were once decoded as Latin-1. */
export function repairMojibake(value: string | undefined): string | undefined {
  if (!value || !mojibakeMarkers.test(value)) return value;
  try {
    const bytes = Uint8Array.from(value, (character) => {
      const codePoint = character.codePointAt(0) || 0;
      return windows1252Bytes[character] ?? (codePoint <= 0xff ? codePoint : 0x3f);
    });
    const repaired = new TextDecoder('utf-8').decode(bytes);
    return repaired.includes('\ufffd') ? value : repaired;
  } catch {
    return value;
  }
}
