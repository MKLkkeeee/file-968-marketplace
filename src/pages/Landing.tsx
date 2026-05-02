import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import boxLogo from "@/assets/box-logo.png";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      {/* Ambient luxury background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.18),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.15),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse-glow rounded-2xl bg-white/10 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl">
              <img src={boxLogo} alt="logo" className="h-9 w-9 object-contain" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-widest text-white/60 backdrop-blur-md">
            <Sparkles className="h-3 w-3" /> ONLINE
          </div>
        </div>

        {/* Title */}
        <h1 className="text-center font-display text-6xl font-extrabold leading-[0.95] tracking-tight md:text-8xl">
          <span className="block bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
            FILE 968
          </span>
          <span className="mt-2 block bg-gradient-to-b from-white/80 to-white/20 bg-clip-text text-transparent">
            SHOP
          </span>
        </h1>

        <p className="mt-8 max-w-md text-center text-base text-white/50 md:text-lg">
          ประสบการณ์ช้อปปิ้งดิจิทัลระดับพรีเมี่ยม
          <br />
          เติมเงินง่าย ใช้เงินซื้อสินค้าได้ทันที
        </p>

        {/* CTA buttons */}
        <div className="mt-12 flex w-full max-w-md items-center justify-center gap-4">
          <button
            onClick={() => navigate("/login")}
            className="group relative flex-1 overflow-hidden rounded-full bg-white px-8 py-4 text-sm font-semibold tracking-wide text-black shadow-[0_8px_30px_rgba(255,255,255,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(255,255,255,0.25)]"
          >
            <span className="relative z-10">เข้าสู่ระบบ</span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </button>

          <button
            onClick={() => navigate("/register")}
            className="group relative flex-1 overflow-hidden rounded-full border border-white/15 bg-white/[0.08] px-8 py-4 text-sm font-semibold tracking-wide text-white/90 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.12]"
          >
            <span className="relative z-10">สมัครสมาชิก</span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-16 flex items-center gap-6 text-xs uppercase tracking-[0.3em] text-white/30">
          <span>TrueWallet</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>PromptPay</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>Instant Delivery</span>
        </div>
      </div>
    </div>
  );
}
