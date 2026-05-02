import { useRef, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { onValue, ref as dbRef2, get } from "firebase/database";
import { Product } from "@/lib/store";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PasswordStrength } from "@/components/PasswordStrength";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { ref as dbRef, update } from "firebase/database";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { toast } from "sonner";
import { Camera, CheckCircle2, Clock, Coins, Heart, History, KeyRound, Loader2, Mail, Package, Send, Shield, ShoppingCart, User as UserIcon, Wallet, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { transferPointsByUsername } from "@/lib/store";
import { motion } from "framer-motion";
import { fileToResizedDataUrl } from "@/lib/imageUtils";

export default function Profile() {
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Transfer money states
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferPwd, setTransferPwd] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "found" | "notfound" | "self">("idle");
  const [foundUsername, setFoundUsername] = useState<string>("");

  // ตรวจสอบ username แบบ debounce
  useEffect(() => {
    const name = transferTo.trim();
    if (!name) { setUsernameStatus("idle"); setFoundUsername(""); return; }
    if (profile && name.toLowerCase() === (profile.username || "").toLowerCase()) {
      setUsernameStatus("self"); setFoundUsername(""); return;
    }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      try {
        const snap = await get(dbRef2(db, "users"));
        if (!snap.exists()) { setUsernameStatus("notfound"); setFoundUsername(""); return; }
        const users = snap.val() as Record<string, any>;
        const target = Object.values(users).find(
          (u: any) => (u?.username || "").toLowerCase() === name.toLowerCase()
        ) as any;
        if (target?.username) {
          setFoundUsername(target.username);
          setUsernameStatus("found");
        } else {
          setFoundUsername("");
          setUsernameStatus("notfound");
        }
      } catch {
        setUsernameStatus("notfound");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [transferTo, profile?.username]);


  const handleOpenTransferConfirm = () => {
    if (!profile || !user) return;
    const toName = transferTo.trim();
    const amount = Math.floor(Number(transferAmount));
    if (!toName) return toast.error("กรุณากรอกชื่อผู้ใช้ปลายทาง");
    if (toName.toLowerCase() === (profile.username || "").toLowerCase())
      return toast.error("ไม่สามารถโอนให้ตัวเองได้");
    if (usernameStatus === "checking") return toast.error("กำลังตรวจสอบชื่อผู้ใช้ กรุณารอสักครู่");
    if (usernameStatus !== "found") return toast.error("ไม่พบชื่อผู้ใช้ปลายทาง");
    if (!Number.isFinite(amount) || amount <= 0)
      return toast.error("จำนวนเงินต้องมากกว่า 0");
    if (amount > (profile.points || 0)) return toast.error("ยอดเงินไม่เพียงพอ");
    if (!transferPwd) return toast.error("กรุณากรอกรหัสผ่านเพื่อยืนยัน");
    setConfirmOpen(true);
  };

  const handleConfirmTransfer = async () => {
    if (!user || !auth.currentUser?.email) return;
    setTransferring(true);
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, transferPwd);
      await reauthenticateWithCredential(auth.currentUser, cred);
      const amount = Math.floor(Number(transferAmount));
      const res = await transferPointsByUsername(user.uid, transferTo.trim(), amount);
      toast.success(`โอน ฿${amount.toLocaleString()} ให้ ${res.toUsername} สำเร็จ`);
      setTransferTo(""); setTransferAmount(""); setTransferPwd("");
      setConfirmOpen(false);
      await refreshProfile();
    } catch (e: any) {
      const code = e?.code || "";
      if (code.includes("wrong-password") || code.includes("invalid-credential")) {
        toast.error("รหัสผ่านไม่ถูกต้อง");
      } else {
        toast.error("โอนเงินไม่สำเร็จ", { description: e?.message });
      }
    } finally {
      setTransferring(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("ไฟล์ใหญ่เกินไป (สูงสุด 5MB)");
    setUploadingAvatar(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file, 256, 0.85);
      await update(dbRef(db, `users/${user.uid}`), { avatarUrl: dataUrl });
      await refreshProfile();
      toast.success("อัปโหลดรูปโปรไฟล์สำเร็จ");
    } catch (err: any) {
      toast.error("อัปโหลดไม่สำเร็จ", { description: err?.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    try {
      await update(dbRef(db, `users/${user.uid}`), { avatarUrl: null });
      await refreshProfile();
      toast.success("ลบรูปโปรไฟล์แล้ว");
    } catch (e: any) {
      toast.error("ลบไม่สำเร็จ", { description: e?.message });
    }
  };

  if (!profile || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  const validateStrongPassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "รหัสผ่านต้องอย่างน้อย 8 ตัวอักษร";
    if (!/[a-z]/.test(pwd)) return "รหัสผ่านต้องมีตัวพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว";
    if (!/[A-Z]/.test(pwd)) return "รหัสผ่านต้องมีตัวพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว";
    if (!/[0-9]/.test(pwd)) return "รหัสผ่านต้องมีตัวเลข (0-9) อย่างน้อย 1 ตัว";
    if (!/[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(pwd)) {
      return "รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว เช่น @ # $ % - _ !";
    }
    return null;
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      return toast.error("กรุณากรอกข้อมูลให้ครบ");
    }
    const pwdErr = validateStrongPassword(newPwd);
    if (pwdErr) return toast.error("รหัสผ่านไม่ปลอดภัย", { description: pwdErr });
    if (newPwd !== confirmPwd) return toast.error("รหัสผ่านใหม่ไม่ตรงกัน");
    if (newPwd === currentPwd) return toast.error("รหัสผ่านใหม่ต้องไม่เหมือนรหัสปัจจุบัน");
    if (!auth.currentUser?.email) return toast.error("ไม่พบอีเมล");

    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPwd);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPwd);
      toast.success("เปลี่ยนรหัสผ่านสำเร็จ");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (e: any) {
      const code = e?.code || "";
      if (code.includes("wrong-password") || code.includes("invalid-credential")) {
        toast.error("รหัสผ่านปัจจุบันไม่ถูกต้อง");
      } else if (code.includes("weak-password")) {
        toast.error("รหัสผ่านใหม่อ่อนเกินไป");
      } else {
        toast.error("เปลี่ยนรหัสผ่านไม่สำเร็จ", { description: e?.message });
      }
    } finally {
      setSaving(false);
    }
  };

  // Real-time checklist สำหรับรหัสผ่านใหม่
  const newPwdChecks = [
    { label: "อย่างน้อย 8 ตัวอักษร", ok: newPwd.length >= 8 },
    { label: "มีตัวพิมพ์เล็ก (a-z)", ok: /[a-z]/.test(newPwd) },
    { label: "มีตัวพิมพ์ใหญ่ (A-Z)", ok: /[A-Z]/.test(newPwd) },
    { label: "มีตัวเลข (0-9)", ok: /[0-9]/.test(newPwd) },
    { label: "มีอักขระพิเศษ (@ # $ % - _ !)", ok: /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(newPwd) },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="container max-w-4xl px-3 sm:px-6 py-6 sm:py-10"
      >
        <h1 className="font-display text-4xl font-bold flex items-center gap-3">
          <UserIcon className="h-8 w-8" /> โปรไฟล์
        </h1>
        <p className="mt-1 text-white/50">จัดการบัญชีและความปลอดภัย</p>

        {/* Profile summary */}
        <Card className="card-elegant mt-8 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl transition-all hover:border-white/30"
                  title="เปลี่ยนรูปโปรไฟล์"
                >
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-9 w-9 text-white" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    {uploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl font-bold">{profile.username}</h2>
                  {isAdmin && (
                    <Badge variant="default" className="gap-1">
                      <Shield className="h-3 w-3" /> ADMIN
                    </Badge>
                  )}
                </div>
                <p className="mt-1 flex items-center gap-2 text-sm text-white/50">
                  <Mail className="h-3.5 w-3.5" /> {profile.email}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                    <Camera className="h-3.5 w-3.5" /> เปลี่ยนรูป
                  </Button>
                  {profile.avatarUrl && (
                    <Button size="sm" variant="ghost" onClick={handleRemoveAvatar}>
                      ลบรูป
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">ยอดเงินของคุณ</p>
              <div className="mt-2 flex items-baseline gap-2">
                <Coins className="h-6 w-6 text-warning" />
                <span className="font-display text-4xl font-bold gradient-text">
                  {profile.points.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => navigate("/topup")}>
              <Wallet className="h-4 w-4" /> เติมเงิน
            </Button>
            <Button variant="outline" onClick={() => navigate("/orders")}>
              <History className="h-4 w-4" /> ประวัติการซื้อ
            </Button>
          </div>
        </Card>

        {/* Last login info */}
        <Card className="card-elegant mt-6 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold">การเข้าสู่ระบบล่าสุด</h3>
              <p className="text-xs text-white/50">บันทึกเวลาและสถานะการเข้าใช้งานของคุณ</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wider text-white/40">สถานะ</p>
              <div className="mt-2 flex items-center gap-2">
                {profile.lastLoginStatus === "failed" ? (
                  <><XCircle className="h-4 w-4 text-destructive" /><span className="font-semibold text-destructive">ล้มเหลว</span></>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 text-success" /><span className="font-semibold text-success">สำเร็จ</span></>
                )}
              </div>
              {profile.lastLoginError && profile.lastLoginStatus === "failed" && (
                <p className="mt-1 text-xs text-white/40">{profile.lastLoginError}</p>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wider text-white/40">เวลาเข้าสู่ระบบล่าสุด</p>
              <p className="mt-2 text-sm font-medium">
                {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString("th-TH") : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wider text-white/40">สถานะปัจจุบัน</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${profile.online ? "bg-success animate-pulse" : "bg-white/30"}`} />
                <span className="text-sm font-medium">{profile.online ? "ออนไลน์" : "ออฟไลน์"}</span>
              </div>
              {!profile.online && profile.lastSeenAt && (
                <p className="mt-1 text-xs text-white/40">
                  ใช้งานล่าสุด: {new Date(profile.lastSeenAt).toLocaleString("th-TH")}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Change password */}
        <Card className="card-elegant mt-6 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold">จัดการรหัสผ่าน</h3>
              <p className="text-xs text-white/50">เปลี่ยนรหัสผ่านเพื่อความปลอดภัย</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>รหัสผ่านปัจจุบัน</Label>
              <Input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>
            <div>
              <Label>รหัสผ่านใหม่</Label>
              <Input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="อย่างน้อย 8 ตัว ผสมตัวอักษร เลข อักขระพิเศษ"
                className="mt-1"
              />
              <PasswordStrength password={newPwd} />
            </div>
            <div>
              <Label>ยืนยันรหัสผ่านใหม่</Label>
              <Input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>
          </div>

          {newPwd.length > 0 && (
            <ul className="mt-3 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2 md:grid-cols-3">
              {newPwdChecks.map((c) => (
                <li
                  key={c.label}
                  className={"flex items-center gap-1.5 " + (c.ok ? "text-success" : "text-white/40")}
                >
                  <span className={"inline-block h-3.5 w-3.5 rounded-full text-center text-[10px] leading-[14px] " + (c.ok ? "bg-success/20" : "bg-white/10")}>
                    {c.ok ? "✓" : "•"}
                  </span>
                  {c.label}
                </li>
              ))}
            </ul>
          )}

          <Button onClick={handleChangePassword} disabled={saving} className="mt-5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            บันทึกรหัสผ่านใหม่
          </Button>
        </Card>

        {/* Transfer Money */}
        <Card className="card-elegant mt-6 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Send className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold">โอนเงินให้ผู้ใช้อื่น</h3>
              <p className="text-xs text-white/50">
                ยอดคงเหลือ: <span className="text-white">฿{(profile.points || 0).toLocaleString()}</span>
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>ชื่อผู้ใช้ปลายทาง</Label>
              <Input
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                placeholder="username"
                maxLength={50}
                className={
                  "mt-1 transition-colors " +
                  (usernameStatus === "found"
                    ? "border-success focus-visible:ring-success/40"
                    : usernameStatus === "notfound" || usernameStatus === "self"
                    ? "border-destructive focus-visible:ring-destructive/40"
                    : "")
                }
              />
              {transferTo.trim() && (
                <p
                  className={
                    "mt-1.5 flex items-center gap-1.5 text-xs " +
                    (usernameStatus === "found"
                      ? "text-success"
                      : usernameStatus === "checking"
                      ? "text-white/50"
                      : "text-destructive")
                  }
                >
                  {usernameStatus === "checking" && (
                    <><Loader2 className="h-3 w-3 animate-spin" /> กำลังตรวจสอบ...</>
                  )}
                  {usernameStatus === "found" && (
                    <><CheckCircle2 className="h-3 w-3" /> พบผู้ใช้: {foundUsername}</>
                  )}
                  {usernameStatus === "notfound" && (
                    <><XCircle className="h-3 w-3" /> ไม่พบชื่อผู้ใช้นี้</>
                  )}
                  {usernameStatus === "self" && (
                    <><XCircle className="h-3 w-3" /> ไม่สามารถโอนให้ตัวเองได้</>
                  )}
                </p>
              )}
            </div>
            <div>
              <Label>จำนวนเงิน (฿)</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label>รหัสผ่านยืนยัน</Label>
              <Input
                type="password"
                value={transferPwd}
                onChange={(e) => setTransferPwd(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>
          </div>

          <Button onClick={handleOpenTransferConfirm} disabled={transferring} className="mt-5">
            <Send className="h-4 w-4" />
            โอนเงิน
          </Button>
        </Card>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันการโอนเงิน</AlertDialogTitle>
              <AlertDialogDescription>
                คุณต้องการโอน{" "}
                <span className="font-semibold text-foreground">
                  ฿{Math.floor(Number(transferAmount) || 0).toLocaleString()}
                </span>{" "}
                ให้กับ{" "}
                <span className="font-semibold text-foreground">{transferTo.trim()}</span>{" "}
                ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse sm:flex-row-reverse sm:justify-start gap-2">
              {/* ขวา = ยกเลิก */}
              <AlertDialogCancel disabled={transferring} className="mt-0">
                ยกเลิก
              </AlertDialogCancel>
              {/* ซ้าย = โอน */}
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmTransfer();
                }}
                disabled={transferring}
              >
                {transferring && <Loader2 className="h-4 w-4 animate-spin" />}
                โอน
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <FavoritesSection />
      </motion.div>
      <Footer />
    </div>
  );
}


function FavoritesSection() {
  const { user } = useAuth();
  const [favIds, setFavIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});

  useEffect(() => {
    if (!user) return;
    const offFav = onValue(dbRef2(db, `favorites/${user.uid}`), (snap) => {
      setFavIds(snap.exists() ? Object.keys(snap.val()) : []);
    });
    const offProd = onValue(dbRef2(db, "products"), (snap) => {
      setProducts(snap.exists() ? snap.val() : {});
    });
    return () => { offFav(); offProd(); };
  }, [user?.uid]);

  const items = favIds.map((id) => products[id]).filter(Boolean) as Product[];

  return (
    <Card className="card-elegant mt-6 p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Heart className="h-5 w-5 text-rose-400" />
        </div>
        <div>
          <h3 className="font-display text-xl font-semibold">รายการโปรด</h3>
          <p className="text-xs text-white/50">{items.length} รายการ</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Package className="h-10 w-10 text-white/20" />
          <p className="text-sm text-white/50">ยังไม่มีสินค้าที่ชื่นชอบ — กดรูปหัวใจที่สินค้าเพื่อบันทึก</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {items.map((p) => (
            <Link to={`/product/${p.id}`} key={p.id}>
              <Card className="card-elegant group cursor-pointer overflow-hidden p-0">
                <div className="relative aspect-square overflow-hidden bg-white/[0.02]">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Package className="h-10 w-10 text-white/20" /></div>
                  )}
                  <FavoriteButton productId={p.id} stopPropagation className="absolute right-2 top-2" />
                </div>
                <div className="p-3">
                  <h4 className="line-clamp-1 text-sm font-semibold text-white">{p.name}</h4>
                  {p.price === 0 ? (
                    <span className="mt-1 inline-block rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                      ฟรี
                    </span>
                  ) : (
                    <div className="mt-1 flex items-center gap-1 text-warning">
                      <Coins className="h-3.5 w-3.5" />
                      <span className="text-sm font-bold">฿{p.price.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
