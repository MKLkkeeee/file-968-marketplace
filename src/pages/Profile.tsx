import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { ref as dbRef, update } from "firebase/database";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { toast } from "sonner";
import { Camera, Coins, History, KeyRound, Loader2, Mail, Shield, User as UserIcon, Wallet } from "lucide-react";
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

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      return toast.error("กรุณากรอกข้อมูลให้ครบ");
    }
    if (newPwd.length < 6) return toast.error("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
    if (newPwd !== confirmPwd) return toast.error("รหัสผ่านใหม่ไม่ตรงกัน");
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

  return (
    <div className="min-h-screen">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="container max-w-4xl py-10"
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
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">ยอด Point ของคุณ</p>
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
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="mt-1"
              />
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

          <Button onClick={handleChangePassword} disabled={saving} className="mt-5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            บันทึกรหัสผ่านใหม่
          </Button>
        </Card>
      </motion.div>
      <Footer />
    </div>
  );
}
