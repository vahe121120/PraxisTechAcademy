// Backend money fields are always integers in minor units. This is the
// single conversion point for display — never divide by 100 anywhere else.
export function formatMoney(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: major % 1 === 0 ? 0 : 2,
    }).format(major);
  } catch {
    // Unknown/unsupported currency code — fall back to a plain label rather
    // than letting Intl throw and break the page.
    return `${major.toLocaleString()} ${currency}`;
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
