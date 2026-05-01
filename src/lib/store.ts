import { ref, push, set, get, update, remove, runTransaction } from "firebase/database";
import { db, PLANARIA_API_KEY, TRUEWALLET_API, CHECKSLIP_API, BANK_RECEIVER_NAME } from "./firebase";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  /** Multi-line stock: each non-empty line = 1 deliverable item (license / file link / code) */
  stockItems: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  createdAt: number;
}

export interface DiscountCode {
  id: string;
  code: string;
  type: "discount" | "point"; // discount = % off, point = add points
  value: number;
  maxUses: number;
  usedCount: number;
  usedBy?: Record<string, boolean>;
  active: boolean;
  createdAt: number;
}

export interface Order {
  id: string;
  userId: string;
  username: string;
  items: { productId: string; productName: string; price: number; deliveredItem: string }[];
  subtotal: number;
  discountCode: string;
  discountPct: number;
  finalPrice: number;
  createdAt: number;
}

export interface Topup {
  id: string;
  userId: string;
  username: string;
  method: "truewallet" | "bank" | "code";
  amount: number;
  ref: string;
  createdAt: number;
}

export const stockCount = (s: string) =>
  (s || "").split(/\r?\n/).filter((l) => l.trim().length > 0).length;

// CRUD - Categories
export const createCategory = async (data: Omit<Category, "id" | "createdAt">) => {
  const r = push(ref(db, "categories"));
  await set(r, { ...data, id: r.key, createdAt: Date.now() });
};
export const updateCategory = (id: string, data: Partial<Category>) =>
  update(ref(db, `categories/${id}`), data);
export const deleteCategory = (id: string) => remove(ref(db, `categories/${id}`));

// CRUD - Products
export const createProduct = async (data: Omit<Product, "id" | "createdAt">) => {
  const r = push(ref(db, "products"));
  await set(r, { ...data, id: r.key, createdAt: Date.now() });
};
export const updateProduct = (id: string, data: Partial<Product>) =>
  update(ref(db, `products/${id}`), data);
export const deleteProduct = (id: string) => remove(ref(db, `products/${id}`));

/** Atomically pop the first non-empty stock line from a product. Returns null if out of stock. */
export const popStockItem = async (productId: string): Promise<string | null> => {
  let popped: string | null = null;
  await runTransaction(ref(db, `products/${productId}/stockItems`), (current: string | null) => {
    if (!current) return current;
    const lines = current.split(/\r?\n/);
    const idx = lines.findIndex((l) => l.trim().length > 0);
    if (idx === -1) return current;
    popped = lines[idx].trim();
    lines.splice(idx, 1);
    return lines.join("\n");
  });
  return popped;
};

// CRUD - Discount Codes
export const createDiscount = async (data: Omit<DiscountCode, "id" | "createdAt" | "usedCount">) => {
  const r = push(ref(db, "discounts"));
  await set(r, { ...data, id: r.key, usedCount: 0, createdAt: Date.now() });
};
export const updateDiscount = (id: string, data: Partial<DiscountCode>) =>
  update(ref(db, `discounts/${id}`), data);
export const deleteDiscount = (id: string) => remove(ref(db, `discounts/${id}`));

export const findDiscountByCode = async (code: string): Promise<DiscountCode | null> => {
  const snap = await get(ref(db, "discounts"));
  if (!snap.exists()) return null;
  const list = Object.values(snap.val()) as DiscountCode[];
  return list.find((d) => d.code.toUpperCase() === code.toUpperCase() && d.active) || null;
};

// User points
export const adjustPoints = async (uid: string, delta: number) => {
  const userRef = ref(db, `users/${uid}/points`);
  const snap = await get(userRef);
  const current = snap.exists() ? Number(snap.val()) : 0;
  await set(userRef, current + delta);
};
export const setUserRole = (uid: string, role: "user" | "admin") =>
  update(ref(db, `users/${uid}`), { role });

// Orders
export const createOrder = async (data: Omit<Order, "id" | "createdAt">) => {
  const r = push(ref(db, "orders"));
  // Strip undefined just in case
  const clean: any = { ...data, id: r.key, createdAt: Date.now() };
  Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);
  await set(r, clean);
  return r.key as string;
};

// Topups
export const recordTopup = async (data: Omit<Topup, "id" | "createdAt">) => {
  const r = push(ref(db, "topups"));
  await set(r, { ...data, id: r.key, createdAt: Date.now() });
};

// ============ Payment APIs ============
export const verifyTruewalletGift = async (phone: string, giftLink: string) => {
  const formData = new FormData();
  formData.append("keyapi", PLANARIA_API_KEY);
  formData.append("phone", phone);
  formData.append("gift_link", giftLink);

  const res = await fetch(TRUEWALLET_API, { method: "POST", body: formData });
  return await res.json();
};

export const verifyBankSlip = async (qrcodeText: string) => {
  const formData = new FormData();
  formData.append("keyapi", PLANARIA_API_KEY);
  formData.append("qrcode_text", qrcodeText);

  const res = await fetch(CHECKSLIP_API, { method: "POST", body: formData });
  return await res.json();
};

export const isReceiverNameMatch = (name: string) => {
  if (!name) return false;
  const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  return normalize(name).includes(normalize(BANK_RECEIVER_NAME));
};

export const redeemPointCode = async (
  uid: string,
  code: string
): Promise<{ success: boolean; message: string; amount?: number }> => {
  const snap = await get(ref(db, "discounts"));

  if (!snap.exists()) {
    return { success: false, message: "ไม่พบโค้ด" };
  }

  const list = Object.values(snap.val()) as DiscountCode[];

  const item = list.find(
    (d) => d.code.toUpperCase() === code.toUpperCase() && d.active
  );

  if (!item) {
    return { success: false, message: "โค้ดไม่ถูกต้อง" };
  }

  if (item.type !== "point") {
    return { success: false, message: "โค้ดนี้ไม่ใช่ Point Code" };
  }

  if (item.usedBy?.[uid]) {
    return { success: false, message: "คุณใช้โค้ดนี้ไปแล้ว" };
  }

  if (item.usedCount >= item.maxUses) {
    return { success: false, message: "โค้ดถูกใช้ครบแล้ว" };
  }

  await adjustPoints(uid, item.value);

  await update(ref(db, `discounts/${item.id}`), {
    usedCount: item.usedCount + 1,
    [`usedBy/${uid}`]: true
  });

  return {
    success: true,
    message: "ใช้โค้ดสำเร็จ",
    amount: item.value
  };
};
