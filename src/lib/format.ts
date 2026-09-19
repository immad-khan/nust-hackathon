export const CURRENCY_PREFIX = "Rs ";

export function formatPrice(amount: number): string {
  return `${CURRENCY_PREFIX}${amount.toLocaleString("en-PK")}`;
}

export function ratingToStars(rating: number): number {
  return Math.round((rating / 10) * 2) / 2;
}

export function formatRating(rating: number): string {
  return (rating / 10).toFixed(1);
}

export const SHIPPING_FEE = 350;

export function shippingFor(subtotal: number): number {
  if (subtotal === 0) return 0;
  return SHIPPING_FEE;
}

export function optimizeImageUrl(url: string, width = 600): string {
  if (!url) return url;
  if (url.includes("pexels.com")) {
    const clean = url.split("?")[0];
    const h = Math.round(width * 1.25);
    return `${clean}?auto=compress&cs=tinysrgb&fit=crop&w=${width}&h=${h}`;
  }
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    if (!url.includes("/upload/f_auto")) {
      return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
    }
  }
  return url;
}
