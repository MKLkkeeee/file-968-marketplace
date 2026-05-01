import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Product } from "@/lib/store";

export interface CartItem {
  product: Product;
  qty: number;
}

interface CartContextType {
  items: CartItem[];
  add: (p: Product, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const STORAGE_KEY = "file968_cart";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add = (p: Product, qty = 1) =>
    setItems((prev) => {
      const i = prev.findIndex((x) => x.product.id === p.id);
      if (i === -1) return [...prev, { product: p, qty }];
      const next = [...prev];
      next[i] = { ...next[i], qty: next[i].qty + qty };
      return next;
    });

  const remove = (id: string) => setItems((prev) => prev.filter((x) => x.product.id !== id));
  const setQty = (id: string, qty: number) =>
    setItems((prev) => prev.map((x) => (x.product.id === id ? { ...x, qty: Math.max(1, qty) } : x)));
  const clear = () => setItems([]);

  const count = items.reduce((s, x) => s + x.qty, 0);
  const subtotal = items.reduce((s, x) => s + x.product.price * x.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, setQty, clear, count, subtotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
