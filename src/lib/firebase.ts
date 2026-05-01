import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCvPeQm44upvmBbGIS_yqK6K5H4cQJVxg0",
  authDomain: "iphoinks.firebaseapp.com",
  databaseURL: "https://iphoinks-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iphoinks",
  storageBucket: "iphoinks.firebasestorage.app",
  messagingSenderId: "956963134522",
  appId: "1:956963134522:web:2615e2057217e3637ba903",
  measurementId: "G-5VBZL5T49Z",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Planaria API config (จากที่ user ระบุ)
export const PLANARIA_API_KEY = "273bdfe95844615a5ae960a14907b2f5";
export const TRUEWALLET_API = "https://www.planariashop.com/api/truewallet.php";
export const CHECKSLIP_API = "https://www.planariashop.com/api/checkslip.php";
// ชื่อผู้รับที่ยอมรับสำหรับสลิปธนาคาร
export const BANK_RECEIVER_NAME = "ด.ช. ธวัชชัย คอทอง";
// เบอร์/พร้อมเพย์ของร้าน
export const SHOP_TRUEWALLET_PHONE = "0832045174";
export const SHOP_PROMPTPAY = "0832045174";
export const ADMIN_SECRET = "2009";
