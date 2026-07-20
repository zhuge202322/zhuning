const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatProductPrice(price: number) {
  return price > 0 ? usdFormatter.format(price) : "Price on request";
}
