import { ref, push, set, get, update, remove } from "firebase/database";
import { db, PLANARIA_API_KEY, TRUEWALLET_API, CHECKSLIP_API, BANK_RECEIVER_NAME } from "./firebase";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  stock: number;
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
  active: boolean;
  createdAt: number;
}

export interface Order {
  id: string;
  userId: string;
  username: string;
  productId: string;
  productName: string;
  price: number;
  discountCode?: string;
  finalPrice: number;
  createdAt: number;
}

export interface Topup {
  id: string;
  userId: string;
  username: string;
  method: "truewallet" | "bank";
  amount: number;
  ref: string;
  createdAt: number;
}

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
  await set(r, { ...data, id: r.key, createdAt: Date.now() });
};

// Topups
export const recordTopup = async (data: Omit<Topup, "id" | "createdAt">) => {
  const r = push(ref(db, "topups"));
  await set(r, { ...data, id: r.key, createdAt: Date.now() });
};

// ============ Payment APIs ============
// NOTE: เรียกตรงจาก browser ตามที่ user ระบุ — อาจติด CORS ได้ตามนโยบาย API server
export const verifyTruewalletGift = async (phone: string, giftLink: string) => {
  const formData = new FormData();
  formData.append("keyapi", PLANARIA_API_KEY);
  formData.append("phone", phone);
  formData.append("gift_link", giftLink);

  const res = await fetch(TRUEWALLET_API, { method: "POST", body: formData });
  const data = await res.json();
  return data;
};

export const verifyBankSlip = async (qrcodeText: string) => {
  const formData = new FormData();
  formData.append("keyapi", PLANARIA_API_KEY);
  formData.append("qrcode_text", qrcodeText);

  const res = await fetch(CHECKSLIP_API, { method: "POST", body: formData });
  const data = await res.json();
  return data;
};

export const isReceiverNameMatch = (name: string) => {
  if (!name) return false;
  const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  return normalize(name).includes(normalize(BANK_RECEIVER_NAME));
};
