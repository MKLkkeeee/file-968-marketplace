import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import boxLogo from "@/assets/box-logo.png";
import { LetterReveal, Reveal } from "@/components/Reveal";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="orb-drift-1 absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.18),transparent_70%)] blur-3xl" />
        <div className="orb-drift-2 absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.15),transparent_70%)] blur-3xl" />
        <div className="cine-vignette absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
        <div className="absolute inset-0 cine-grid opacity-60" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
        <div className="mb-10 flex flex-col items-center gap-4 cine-scale-in">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse-glow rounded-2xl bg-white/10 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl tilt-hover">
              <img src={boxLogo} alt="logo" className="h-9 w-9 object-contain" />
            </div>
          </div>

          <div className="cine-sheen inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-widest text-white/60 backdrop-blur-md">
            <Sparkles className="h-3 w-3" /> ONLINE
          </div>
        </div>

        <h1 className="text-center font-display text-6xl font-extrabold leading-[0.95] tracking-tight md:text-8xl [perspective:1000px]">
          <span className="block text-white drop-shadow-lg">
            <LetterReveal text="FILE 968" perLetter={45} />
          </span>
          <span className="mt-2 block text-white/70 drop-shadow-lg">
            <LetterReveal text="SHOP" perLetter={55} delayStart={420} />
          </span>
        </h1>

        <Reveal delay={900}>
          <p className="mt-8 max-w-md text-center text-base text-white/50 md:text-lg">
            ประสบการณ์ช้อปปิ้งดิจิทัลระดับพรีเมี่ยม
            <br />
            เติมเงินง่าย ใช้เงินซื้อสินค้าได้ทันที
          </p>
        </Reveal>

        <Reveal delay={1100}>
          <div className="mt-12 flex w-full max-w-md items-center justify-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="cine-sheen group relative flex-1 overflow-hidden rounded-full bg-white px-8 py-4 text-sm font-semibold tracking-wide text-black shadow-[0_8px_30px_rgba(255,255,255,0.15)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(255,255,255,0.28)]"
            >
              <span className="relative z-10">เข้าสู่ระบบ</span>
            </button>

            <button
              onClick={() => navigate("/register")}
              className="group relative flex-1 overflow-hidden rounded-full border border-white/15 bg-white/[0.08] px-8 py-4 text-sm font-semibold tracking-wide text-white/90 backdrop-blur-md transition-all duration-500 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.14]"
            >
              <span className="relative z-10">สมัครสมาชิก</span>
            </button>
          </div>
        </Reveal>

        <Reveal delay={1300}>
          <div className="mt-16 flex items-center gap-6 text-xs uppercase tracking-[0.3em] text-white/30">
            <span>TrueWallet</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>PromptPay</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>Instant Delivery</span>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
