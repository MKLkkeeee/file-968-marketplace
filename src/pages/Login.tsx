import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import boxLogo from "@/assets/box-logo.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("เข้าสู่ระบบสำเร็จ");
      navigate("/");
    } catch (err: any) {
      toast.error("เข้าสู่ระบบไม่สำเร็จ", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-4 py-12 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-20 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.18),transparent_70%)] blur-3xl" />
        <div className="absolute -right-40 bottom-20 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.15),transparent_70%)] blur-3xl" />
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
          <h1 className="font-display text-3xl font-bold">ยินดีต้อนรับกลับ</h1>
          <p className="mb-8 mt-1 text-sm text-white/50">เข้าสู่ระบบเพื่อช้อปสินค้าระดับพรีเมี่ยม</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/60">อีเมลหรือชื่อผู้ใช้</label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com หรือ username"
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
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-semibold text-black shadow-[0_8px_30px_rgba(255,255,255,0.15)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(255,255,255,0.25)] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              เข้าสู่ระบบ
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/50">
            ยังไม่มีบัญชี?{" "}
            <Link to="/register" className="font-semibold text-white hover:underline">สมัครสมาชิก</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
