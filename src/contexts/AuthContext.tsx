import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { ref, set, onValue, get, update, onDisconnect, serverTimestamp } from "firebase/database";
import { auth, db } from "@/lib/firebase";

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  points: number;
  role: "user" | "admin";
  createdAt: number;
  avatarUrl?: string;
  lastLoginAt?: number;
  lastLoginStatus?: "success" | "failed";
  lastLoginError?: string;
  online?: boolean;
  lastSeenAt?: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  register: (email: string, password: string, username: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const profileRef = ref(db, `users/${u.uid}`);
        // Mark online + register onDisconnect to flip offline + record lastSeen
        try {
          await update(profileRef, { online: true, lastSeenAt: Date.now() });
          onDisconnect(profileRef).update({ online: false, lastSeenAt: serverTimestamp() as any });
        } catch {}
        const unsubProfile = onValue(profileRef, (snap) => {
          if (snap.exists()) setProfile(snap.val() as UserProfile);
        });
        setLoading(false);
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const register = async (email: string, password: string, username: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: username });

    // Check if there's any user. If not — make this one admin.
    const usersSnap = await get(ref(db, "users"));
    const isFirstUser = !usersSnap.exists();

    const newProfile: UserProfile = {
      uid: cred.user.uid,
      email,
      username,
      points: 0,
      role: isFirstUser ? "admin" : "user",
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      lastLoginStatus: "success",
      online: true,
      lastSeenAt: Date.now(),
    };
    await set(ref(db, `users/${cred.user.uid}`), newProfile);
  };

  const login = async (identifier: string, password: string) => {
    let email = identifier.trim();

    // If user typed a username instead of email, look it up.
    // This requires /users to be publicly readable in Firebase rules.
    if (!email.includes("@")) {
      try {
        const snap = await get(ref(db, "users"));
        if (!snap.exists()) throw new Error("ไม่พบบัญชีผู้ใช้");
        const users = snap.val() as Record<string, UserProfile>;
        const match = Object.values(users).find(
          (u) => (u.username || "").toLowerCase() === email.toLowerCase()
        );
        if (!match) throw new Error("ไม่พบชื่อผู้ใช้นี้");
        email = match.email;
      } catch (e: any) {
        const msg = String(e?.message || e?.code || "");
        if (msg.toLowerCase().includes("permission")) {
          throw new Error("กรุณาเข้าสู่ระบบด้วยอีเมล (ระบบไม่อนุญาตให้ค้นหาด้วยชื่อผู้ใช้)");
        }
        throw e;
      }
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      try {
        await update(ref(db, `users/${cred.user.uid}`), {
          lastLoginAt: Date.now(),
          lastLoginStatus: "success",
          lastLoginError: null,
        });
      } catch {
        // ignore — profile node may not be writable yet
      }
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }
      if (code === "auth/too-many-requests") {
        throw new Error("พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่");
      }
      if (code === "auth/network-request-failed") {
        throw new Error("เครือข่ายมีปัญหา กรุณาลองใหม่");
      }
      throw err;
    }
  };

  const logout = async () => {
    if (auth.currentUser) {
      try {
        await update(ref(db, `users/${auth.currentUser.uid}`), {
          online: false,
          lastSeenAt: Date.now(),
        });
      } catch {}
    }
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (!user) return;
    const snap = await get(ref(db, `users/${user.uid}`));
    if (snap.exists()) setProfile(snap.val() as UserProfile);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin: profile?.role === "admin",
        register,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
