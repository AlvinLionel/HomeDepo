export interface CartItem {
  key: string;
  productId: number;
  storeId: number;
  name: string;
  brand: string;
  storeName: string;
  price: number;
  imageUrl: string;
  quantity: number;
  stockQuantity: number;
}

const CART_STORAGE_KEY = "homexCart";
export const CART_UPDATED_EVENT = "homex-cart-updated";

const isCartItem = (value: unknown): value is CartItem => {
  if (!value || typeof value !== "object") return false;
  
  const item = value as Record<string, unknown>;

  return (
    typeof item.key === "string" &&
    typeof item.productId === "number" &&
    typeof item.storeId === "number" &&
    typeof item.name === "string" &&
    typeof item.brand === "string" &&
    typeof item.storeName === "string" &&
    typeof item.price === "number" &&
    typeof item.imageUrl === "string" &&
    typeof item.quantity === "number" &&
    typeof item.stockQuantity === "number"
  );
};

export function readCart(): CartItem[] {
  const storedCart = localStorage.getItem(CART_STORAGE_KEY);
  if (!storedCart) return [];

  const parsedCart: unknown = JSON.parse(storedCart);
  if (!Array.isArray(parsedCart)) return [];
  return parsedCart.filter(isCartItem);
}

export function getCartItemCount(): number {
  return readCart().reduce((total, item) => total + item.quantity, 0);
}

export function saveCart(items: CartItem[]): void {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function addCartItem(item: Omit<CartItem, "key" | "quantity">): void {
  const cart = readCart();
  const key = `${item.productId}:${item.storeId}`;
  const existing = cart.find((cartItem) => cartItem.key === key);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + 1, item.stockQuantity);
    existing.stockQuantity = item.stockQuantity;
    existing.price = item.price;
  } else {
    cart.push({ ...item, key, quantity: 1 });
  }

  saveCart(cart);
}
