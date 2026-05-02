import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import boxLogo from "@/assets/box-logo.png";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "รหัสผ่านต้องอย่างน้อย 8 ตัวอักษร";
    if (!/[a-z]/.test(pwd)) return "รหัสผ่านต้องมีตัวพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว";
    if (!/[A-Z]/.test(pwd)) return "รหัสผ่านต้องมีตัวพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว";
    if (!/[0-9]/.test(pwd)) return "รหัสผ่านต้องมีตัวเลข (0-9) อย่างน้อย 1 ตัว";
    if (!/[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(pwd)) {
      return "รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว เช่น @ # $ % - _ !";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("กรุณากรอกชื่อผู้ใช้");
      return;
    }
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      toast.error("รหัสผ่านไม่ปลอดภัย", { description: pwdErr });
      return;
    }
    setLoading(true);
    try {
      await register(email, password, username);
      toast.success("สมัครสมาชิกสำเร็จ");
      navigate("/");
    } catch (err: any) {
      const code = err?.code || "";
      let msg = err?.message || "เกิดข้อผิดพลาด";
      if (code === "auth/email-already-in-use") msg = "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น";
      else if (code === "auth/invalid-email") msg = "รูปแบบอีเมลไม่ถูกต้อง";
      else if (code === "auth/weak-password") msg = "รหัสผ่านไม่ปลอดภัย ต้องอย่างน้อย 6 ตัว";
      toast.error("สมัครไม่สำเร็จ", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  // ตัวบ่งชี้ความแข็งแรงของรหัสผ่าน (real-time)
  const checks = [
    { label: "อย่างน้อย 8 ตัวอักษร", ok: password.length >= 8 },
    { label: "มีตัวพิมพ์เล็ก (a-z)", ok: /[a-z]/.test(password) },
    { label: "มีตัวพิมพ์ใหญ่ (A-Z)", ok: /[A-Z]/.test(password) },
    { label: "มีตัวเลข (0-9)", ok: /[0-9]/.test(password) },
    { label: "มีอักขระพิเศษ (@ # $ % - _ !)", ok: /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(password) },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-4 py-12 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-20 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.15),transparent_70%)] blur-3xl" />
        <div className="absolute -right-40 bottom-20 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.18),transparent_70%)] blur-3xl" />
      </div>

      <Link
        to="/"
        className="absolute left-6 top-6 flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> กลับหน้าแรก
      </Link>

      <div className="relative w-full max-w-md">
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl">
            <img src={boxLogo} alt="logo" className="h-8 w-8 object-contain" />
          </div>
          <div className="font-display text-xl font-bold tracking-wide">
            FILE 968 <span className="text-white/40">SHOP</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          <h1 className="font-display text-3xl font-bold">สร้างบัญชีใหม่</h1>
          <p className="mb-8 mt-1 text-sm text-white/50">เริ่มต้นช้อปปิ้งฟรี ไม่มีค่าใช้จ่าย</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/60">ชื่อผู้ใช้</label>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:bg-white/[0.06]"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/60">อีเมล</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:bg-white/[0.06]"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/60">รหัสผ่าน</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/30 focus:bg-white/[0.06]"
              />
              {password.length > 0 && (
                <ul className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                  {checks.map((c) => (
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
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.08] py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.12] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              สมัครสมาชิก
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/50">
            มีบัญชีแล้ว?{" "}
            <Link to="/login" className="font-semibold text-white hover:underline">เข้าสู่ระบบ</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
