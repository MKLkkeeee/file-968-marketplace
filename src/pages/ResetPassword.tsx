import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { ArrowLeft, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import boxLogo from "@/assets/box-logo.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const oobCode = params.get("oobCode") || "";
  const mode = params.get("mode") || "";

  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!oobCode || mode !== "resetPassword") {
      setError("ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว");
      setVerifying(false);
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((mail) => {
        setEmail(mail);
        setVerifying(false);
      })
      .catch((e: any) => {
        const code = e?.code || "";
        setError(
          code === "auth/expired-action-code"
            ? "ลิงก์หมดอายุแล้ว กรุณาขอลิงก์ใหม่"
            : code === "auth/invalid-action-code"
            ? "ลิงก์ถูกใช้ไปแล้ว หรือไม่ถูกต้อง"
            : "ลิงก์ไม่สามารถใช้ได้"
        );
        setVerifying(false);
      });
  }, [oobCode, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร");
    if (pw !== pw2) return toast.error("รหัสผ่านไม่ตรงกัน");
    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, pw);
      setDone(true);
      toast.success("ตั้งรหัสผ่านใหม่สำเร็จ");
    } catch (e: any) {
      toast.error("ตั้งรหัสผ่านไม่สำเร็จ", { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-4 py-12 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl">
            <img src={boxLogo} alt="logo" className="h-8 w-8 object-contain" />
          </div>
          <h1 className="font-display text-2xl font-bold">รีเซ็ตรหัสผ่าน</h1>
          {email && !done && (
            <p className="text-sm text-white/50">ตั้งรหัสผ่านใหม่สำหรับ <span className="text-white">{email}</span></p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          {verifying ? (
            <div className="flex items-center justify-center gap-2 py-8 text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" /> กำลังตรวจสอบลิงก์...
            </div>
          ) : error ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button onClick={() => navigate("/login")} variant="outline" className="w-full">
                กลับไปหน้าเข้าสู่ระบบ
              </Button>
            </div>
          ) : done ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
              <p className="text-sm text-white/70">
                รหัสผ่านถูกเปลี่ยนเรียบร้อยแล้ว สามารถเข้าสู่ระบบด้วยรหัสใหม่ได้ทันที
              </p>
              <Button onClick={() => navigate("/login")} className="w-full bg-gradient-primary">
                เข้าสู่ระบบ
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw">รหัสผ่านใหม่</Label>
                <Input
                  id="pw"
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw2">ยืนยันรหัสผ่านใหม่</Label>
                <Input
                  id="pw2"
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                บันทึกรหัสผ่านใหม่
              </Button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
