const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Formats an account balance / listing price as USD. */
export function usd(amount: number): string {
  return USD.format(amount ?? 0);
}
