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
    let targetUid: string | null = null;
    if (!email.includes("@")) {
      const snap = await get(ref(db, "users"));
      if (!snap.exists()) throw new Error("ไม่พบบัญชีผู้ใช้");
      const users = snap.val() as Record<string, UserProfile>;
      const match = Object.values(users).find(
        (u) => (u.username || "").toLowerCase() === email.toLowerCase()
      );
      if (!match) throw new Error("ไม่พบชื่อผู้ใช้นี้");
      email = match.email;
      targetUid = match.uid;
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await update(ref(db, `users/${cred.user.uid}`), {
        lastLoginAt: Date.now(),
        lastLoginStatus: "success",
        lastLoginError: null,
      });
    } catch (err: any) {
      // Best-effort: record failed attempt if we know the uid
      if (!targetUid) {
        try {
          const snap = await get(ref(db, "users"));
          if (snap.exists()) {
            const users = snap.val() as Record<string, UserProfile>;
            const match = Object.values(users).find(
              (u) => (u.email || "").toLowerCase() === email.toLowerCase()
            );
            if (match) targetUid = match.uid;
          }
        } catch {}
      }
      if (targetUid) {
        try {
          await update(ref(db, `users/${targetUid}`), {
            lastLoginAt: Date.now(),
            lastLoginStatus: "failed",
            lastLoginError: err?.code || err?.message || "unknown",
          });
        } catch {}
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
