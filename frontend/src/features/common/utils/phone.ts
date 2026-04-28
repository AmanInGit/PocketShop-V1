const DEFAULT_COUNTRY_CODE = '+91';

export function digitsOnly(input: string | null | undefined): string {
  return (input ?? '').replace(/\D/g, '');
}

export function toE164Phone(input: string | null | undefined): string | null {
  const digits = digitsOnly(input);
  if (!digits) return null;

  if (digits.length === 10) {
    return `${DEFAULT_COUNTRY_CODE}${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  if (digits.length >= 11 && input?.trim().startsWith('+')) {
    return `+${digits}`;
  }

  return null;
}

export function toIndian10DigitPhone(input: string | null | undefined): string | null {
  const digits = digitsOnly(input);
  if (!digits) return null;
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return null;
}

export function getPhoneLookupCandidates(input: string | null | undefined): string[] {
  const candidates = new Set<string>();
  const e164 = toE164Phone(input);
  const tenDigit = toIndian10DigitPhone(input);

  if (e164) candidates.add(e164);
  if (tenDigit) candidates.add(tenDigit);

  return Array.from(candidates);
}

