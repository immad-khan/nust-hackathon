"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  slug: string;
  name: string;
  price: number;
  image: string;
  variant: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  wishlist: string[];
  isOpen: boolean;
  ready: boolean;
  subtotal: number;
  count: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (slug: string, variant: string) => void;
  updateQuantity: (slug: string, variant: string, quantity: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleWishlist: (slug: string) => void;
  isWishlisted: (slug: string) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_KEY = "prem-cart-v1";
const WISH_KEY = "prem-wishlist-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const rawCart = window.localStorage.getItem(CART_KEY);
      if (rawCart) setItems(JSON.parse(rawCart) as CartItem[]);
      const rawWish = window.localStorage.getItem(WISH_KEY);
      if (rawWish) setWishlist(JSON.parse(rawWish) as string[]);
    } catch {
      // ignore malformed storage
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, ready]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
  }, [wishlist, ready]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      setItems((prev) => {
        const index = prev.findIndex(
          (row) => row.slug === item.slug && row.variant === item.variant,
        );
        if (index >= 0) {
          const next = [...prev];
          next[index] = {
            ...next[index],
            quantity: next[index].quantity + quantity,
          };
          return next;
        }
        return [...prev, { ...item, quantity }];
      });
      setIsOpen(true);
    },
    [],
  );

  const removeItem = useCallback((slug: string, variant: string) => {
    setItems((prev) =>
      prev.filter((row) => !(row.slug === slug && row.variant === variant)),
    );
  }, []);

  const updateQuantity = useCallback(
    (slug: string, variant: string, quantity: number) => {
      setItems((prev) =>
        prev
          .map((row) =>
            row.slug === slug && row.variant === variant
              ? { ...row, quantity: Math.max(0, quantity) }
              : row,
          )
          .filter((row) => row.quantity > 0),
      );
    },
    [],
  );

  const toggleWishlist = useCallback((slug: string) => {
    setWishlist((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    return {
      items,
      wishlist,
      isOpen,
      ready,
      subtotal,
      count,
      addItem,
      removeItem,
      updateQuantity,
      clear: () => setItems([]),
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      toggleWishlist,
      isWishlisted: (slug: string) => wishlist.includes(slug),
    };
  }, [
    items,
    wishlist,
    isOpen,
    ready,
    addItem,
    removeItem,
    updateQuantity,
    toggleWishlist,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
