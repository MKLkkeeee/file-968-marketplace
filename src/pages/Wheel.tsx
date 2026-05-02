import { useEffect, useMemo, useRef, useState } from "react";
import { onValue, ref, query, limitToLast } from "firebase/database";
import { db } from "@/lib/firebase";
import {
  WheelSlice, WheelConfig, WheelSpin, getWheelConfig,
  popWheelStock, recordWheelSpin, adjustPoints,
} from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Coins, Sparkles, Gift, Trophy, Clock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

const BULB_COUNT = 24;

function fireConfetti() {
  const duration = 2000;
  const end = Date.now() + duration;
  const colors = ["#fbbf24", "#f59e0b", "#ef4444", "#22d3ee", "#a78bfa", "#34d399"];
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  // big burst
  confetti({
    particleCount: 120,
    spread: 90,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.5 },
    colors,
  });
}

function timeAgo(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s} วิ`;
  if (s < 3600) return `${Math.floor(s / 60)} นาที`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชม`;
  return `${Math.floor(s / 86400)} วัน`;
}

export default function Wheel() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<WheelConfig>({ enabled: false, spinCost: 0, updatedAt: 0 });
  const [slices, setSlices] = useState<WheelSlice[]>([]);
  const [recent, setRecent] = useState<WheelSpin[]>([]);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [shake, setShake] = useState(false);
  const [pointerTicking, setPointerTicking] = useState(false);
  const [result, setResult] = useState<{ slice: WheelSlice; reward: string } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [lastSummary, setLastSummary] = useState<{
    cost: number; gainedPoints: number; sliceLabel: string; type: WheelSlice["type"]; at: number;
  } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => setConfig(await getWheelConfig()))();
    const off1 = onValue(ref(db, "wheel/slices"), (s) => {
      const list = s.exists() ? Object.values(s.val() as Record<string, WheelSlice>) : [];
      setSlices(list);
    });
    const off2 = onValue(query(ref(db, "wheel/spins"), limitToLast(20)), (s) => {
      const list = s.exists() ? Object.values(s.val() as Record<string, WheelSpin>) : [];
      setRecent(list.sort((a, b) => b.createdAt - a.createdAt));
    });
    return () => { off1(); off2(); };
  }, []);

  const activeSlices = useMemo(
    () => slices.filter((s) => s.active).sort((a, b) => a.createdAt - b.createdAt),
    [slices]
  );
  const N = activeSlices.length;
  const sliceAngle = N > 0 ? 360 / N : 0;
  const totalWeight = activeSlices.reduce((sum, s) => sum + (s.weight || 0), 0);

  const pickWeighted = (): number => {
    if (totalWeight <= 0) return Math.floor(Math.random() * N);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < activeSlices.length; i++) {
      r -= activeSlices[i].weight || 0;
      if (r <= 0) return i;
    }
    return activeSlices.length - 1;
  };

  const spin = async () => {
    if (!user || !profile) return navigate("/login");
    if (spinning) return;
    if (N < 2) return toast.error("วงล้อยังไม่พร้อม");
    if (profile.points < config.spinCost) {
      return toast.error("Point ไม่พอ", { description: `ต้องการ ${config.spinCost} Point` });
    }

    setSpinning(true);
    setPointerTicking(true);
    try {
      if (config.spinCost > 0) await adjustPoints(user.uid, -config.spinCost);

      const idx = pickWeighted();
      const chosen = activeSlices[idx];

      let reward = "";
      let finalSlice = chosen;
      if (chosen.type === "item") {
        const popped = await popWheelStock(chosen.id);
        if (popped) {
          reward = popped;
        } else {
          finalSlice = { ...chosen, type: "nothing", label: chosen.label + " (หมด)" };
          reward = "-";
        }
      } else if (chosen.type === "point") {
        const v = chosen.pointValue || 0;
        await adjustPoints(user.uid, v);
        reward = `+${v} Point`;
      } else {
        reward = "-";
      }

      // Conic gradient starts at -sliceAngle/2, so the CENTER of slice i
      // sits at angle (i * sliceAngle) on the wheel (0deg = top, clockwise).
      // To bring that center under the top pointer after rotating the wheel
      // by R degrees clockwise, we need: (sliceMid + R) mod 360 === 0
      // => R mod 360 === (360 - sliceMid) mod 360
      const sliceMid = idx * sliceAngle;
      const turns = 6 + Math.floor(Math.random() * 3);
      // Add a tiny random jitter inside the slice so it doesn't always land dead-center
      const jitter = (Math.random() - 0.5) * (sliceAngle * 0.6);
      const currentMod = ((angle % 360) + 360) % 360;
      const desiredMod = ((360 - sliceMid) % 360 + 360) % 360;
      let delta = desiredMod - currentMod;
      if (delta < 0) delta += 360;
      const newAngle = angle + turns * 360 + delta + jitter;
      setAngle(newAngle);

      await new Promise((r) => setTimeout(r, 5200));
      setPointerTicking(false);

      await recordWheelSpin({
        userId: user.uid,
        username: profile.username,
        sliceId: chosen.id,
        sliceLabel: chosen.label,
        type: finalSlice.type,
        reward,
        cost: config.spinCost,
      });

      await refreshProfile();
      setResult({ slice: finalSlice, reward });
      setShowResult(true);

      // Summary bar + toast
      const gainedPoints = finalSlice.type === "point" ? (chosen.pointValue || 0) : 0;
      setLastSummary({
        cost: config.spinCost,
        gainedPoints,
        sliceLabel: finalSlice.label,
        type: finalSlice.type,
        at: Date.now(),
      });

      const net = gainedPoints - config.spinCost;
      const netStr = net >= 0 ? `+${net}` : `${net}`;
      if (finalSlice.type === "nothing") {
        toast.error("เสียดาย! ไม่ได้รางวัล", {
          description: `หัก ${config.spinCost} Point · สุทธิ ${netStr}`,
        });
      } else if (finalSlice.type === "point") {
        toast.success(`ได้รับ +${gainedPoints} Point!`, {
          description: `หัก ${config.spinCost} Point · สุทธิ ${netStr}`,
        });
      } else {
        toast.success(`ได้รางวัล: ${finalSlice.label}`, {
          description: `หัก ${config.spinCost} Point`,
        });
      }

      if (finalSlice.type !== "nothing") {
        fireConfetti();
        setShake(true);
        setTimeout(() => setShake(false), 650);
      }
    } catch (e: any) {
      toast.error("หมุนไม่สำเร็จ", { description: e?.message || String(e) });
    } finally {
      setSpinning(false);
      setPointerTicking(false);
    }
  };

  if (!config.enabled) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-warning" />
          <h1 className="mt-4 font-display text-3xl font-bold">วงล้อยังไม่เปิดใช้งาน</h1>
          <p className="mt-2 text-muted-foreground">กรุณากลับมาใหม่อีกครั้ง</p>
        </div>
      </div>
    );
  }

  // Conic gradient with subtle alternating brightness for 3D feel
  const conic = N > 0
    ? `conic-gradient(from -${sliceAngle / 2}deg, ${activeSlices
        .map((s, i) => {
          const start = (i * sliceAngle).toFixed(3);
          const end = ((i + 1) * sliceAngle).toFixed(3);
          return `${s.color} ${start}deg ${end}deg`;
        })
        .join(", ")})`
    : "conic-gradient(#222, #333)";

  return (
    <div className="min-h-screen">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container py-10"
      >
        <div className="mb-6 text-center">
          <h1 className="font-display text-4xl font-bold">
            <span className="bg-gradient-to-r from-warning via-amber-300 to-warning bg-clip-text text-transparent">
              วงล้อนำโชค
            </span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            หมุน 1 ครั้ง ใช้ <span className="font-bold text-warning">{config.spinCost.toLocaleString()} Point</span>
          </p>
          {profile && (
            <p className="mt-1 text-sm text-white/50">
              Point ของคุณ: <span className="font-semibold text-white">{profile.points.toLocaleString()}</span>
            </p>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr,320px]">
          {/* Wheel column */}
          <div ref={wrapRef} className={"flex flex-col items-center " + (shake ? "screen-shake" : "")}>
            <div className="relative aspect-square w-full max-w-[420px]">
              {/* Outer bulb ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-200/30 via-yellow-500/10 to-transparent p-3">
                {/* Bulbs */}
                {Array.from({ length: BULB_COUNT }).map((_, i) => {
                  const a = (i / BULB_COUNT) * 360;
                  return (
                    <span
                      key={i}
                      className="wheel-bulb absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-amber-300"
                      style={{
                        transform: `translate(-50%, -50%) rotate(${a}deg) translateY(calc(-50% + 6px))`,
                        animationDelay: `${(i % 8) * 0.1}s`,
                      }}
                    />
                  );
                })}

                {/* Pointer */}
                <div className={"wheel-pointer absolute left-1/2 top-0 z-30 -translate-x-1/2 " + (pointerTicking ? "wheel-pointer-ticking" : "")}>
                  <div className="relative">
                    <div className="h-0 w-0 border-x-[16px] border-t-[30px] border-x-transparent border-t-amber-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]" />
                    <div className="absolute left-1/2 top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-white/80" />
                  </div>
                </div>

                {/* Wheel disk with glow */}
                <div className="wheel-glow relative h-full w-full rounded-full p-2">
                  <div
                    className="relative h-full w-full overflow-hidden rounded-full border-[6px] border-amber-400/80"
                    style={{
                      background: conic,
                      transform: `rotate(${angle}deg)`,
                      transition: spinning
                        ? "transform 5s cubic-bezier(0.17, 0.67, 0.21, 0.99)"
                        : "none",
                      boxShadow:
                        "inset 0 0 40px rgba(0,0,0,0.45), inset 0 0 80px rgba(255,255,255,0.06)",
                    }}
                  >
                    {/* Slice separators (white lines) */}
                    {activeSlices.map((_, i) => {
                      const rot = i * sliceAngle;
                      return (
                        <div
                          key={i}
                          className="absolute left-1/2 top-0 h-1/2 w-px origin-bottom bg-white/30"
                          style={{ transform: `rotate(${rot - sliceAngle / 2}deg)` }}
                        />
                      );
                    })}

                    {/* Slice labels */}
                    {activeSlices.map((s, i) => {
                      const rot = i * sliceAngle + sliceAngle / 2;
                      return (
                        <div
                          key={s.id}
                          className="pointer-events-none absolute left-1/2 top-1/2 origin-left"
                          style={{
                            transform: `rotate(${rot}deg) translate(0, -50%)`,
                            width: "50%",
                          }}
                        >
                          <div className="flex justify-end pr-5 text-xs font-extrabold uppercase tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                            <span className="max-w-[120px] truncate">{s.label}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Inner radial sheen for 3D */}
                    <div
                      className="pointer-events-none absolute inset-0 rounded-full"
                      style={{
                        background:
                          "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18), transparent 45%), radial-gradient(circle at 70% 80%, rgba(0,0,0,0.35), transparent 50%)",
                      }}
                    />
                  </div>

                  {/* Center hub */}
                  <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-16 w-16 -translate-x-1/2 -translate-y-1/2">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-[0_8px_20px_rgba(0,0,0,0.5),inset_0_2px_6px_rgba(255,255,255,0.6)]" />
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-zinc-800 to-black shadow-inner" />
                    <Sparkles className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-amber-300" />
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={spin}
              disabled={spinning || N < 2 || !user}
              className="btn-cta mt-8 h-14 w-full max-w-xs bg-gradient-primary text-lg font-bold text-primary-foreground"
            >
              {spinning ? "กำลังหมุน..." : !user ? "เข้าสู่ระบบเพื่อหมุน" : `หมุน — ${config.spinCost} Point`}
            </Button>

            {/* Last spin summary bar */}
            {lastSummary && (() => {
              const net = lastSummary.gainedPoints - lastSummary.cost;
              const isWin = lastSummary.type !== "nothing";
              return (
                <motion.div
                  key={lastSummary.at}
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className={
                    "mt-4 w-full max-w-md rounded-xl border p-3 " +
                    (isWin ? "border-warning/40 bg-warning/10" : "border-white/15 bg-white/[0.03]")
                  }
                >
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-white/50">หัก</p>
                      <p className="mt-0.5 flex items-center justify-center gap-1 font-bold text-destructive">
                        <Coins className="h-4 w-4" /> -{lastSummary.cost.toLocaleString()}
                      </p>
                    </div>
                    <div className="border-x border-white/10">
                      <p className="text-[11px] uppercase tracking-wide text-white/50">ได้รับ</p>
                      <p className={"mt-0.5 flex items-center justify-center gap-1 font-bold " + (lastSummary.gainedPoints > 0 ? "text-emerald-400" : "text-white/40")}>
                        <Coins className="h-4 w-4" />
                        {lastSummary.gainedPoints > 0
                          ? `+${lastSummary.gainedPoints.toLocaleString()}`
                          : lastSummary.type === "item" ? "ของ" : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-white/50">สุทธิ</p>
                      <p className={"mt-0.5 font-bold " + (net > 0 ? "text-emerald-400" : net < 0 ? "text-destructive" : "text-white/60")}>
                        {net > 0 ? `+${net.toLocaleString()}` : net.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 truncate text-center text-xs text-white/60">
                    รางวัลล่าสุด: <span className="font-semibold text-white">{lastSummary.sliceLabel}</span>
                  </p>
                </motion.div>
              );
            })()}

            {N < 2 && <p className="mt-3 text-sm text-white/40">วงล้อยังไม่มีช่องเพียงพอ</p>}

            {user && (
              <Button
                variant="outline"
                className="mt-3 w-full max-w-xs"
                onClick={() => navigate("/wheel/history")}
              >
                ประวัติการหมุนของฉัน
              </Button>
            )}

            {/* Legend */}
            {activeSlices.length > 0 && (
              <Card className="card-elegant mt-8 w-full max-w-xl p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                  <Gift className="h-4 w-4" /> ของรางวัลในวงล้อ
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeSlices.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-sm">
                      <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="truncate flex-1">{s.label}</span>
                      <span className="text-xs text-white/40">
                        {totalWeight > 0 ? `${((s.weight / totalWeight) * 100).toFixed(0)}%` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Recent wins column */}
          <Card className="card-elegant h-fit p-5 lg:sticky lg:top-20">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <Trophy className="h-4 w-4 text-warning" />
              ผลล่าสุด
            </h3>
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/40">ยังไม่มีผู้หมุน</p>
            ) : (
              <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                {recent.map((r) => {
                  const isWin = r.type !== "nothing";
                  return (
                    <div
                      key={r.id}
                      className={
                        "flex items-center gap-3 rounded-lg border p-2.5 text-sm transition-colors " +
                        (isWin
                          ? "border-warning/30 bg-warning/5"
                          : "border-white/10 bg-white/[0.02]")
                      }
                    >
                      <div className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-full " + (isWin ? "bg-warning/20 text-warning" : "bg-white/10 text-white/40")}>
                        {r.type === "point" ? <Coins className="h-4 w-4" /> : isWin ? <Gift className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
                          <span className="font-semibold text-white">{r.username}</span>{" "}
                          <span className="text-white/50">ได้</span>{" "}
                          <span className={"font-medium " + (isWin ? "text-warning" : "text-white/40")}>{r.sliceLabel}</span>
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/40">
                          <Clock className="h-3 w-3" /> {timeAgo(r.createdAt)} ที่แล้ว
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </motion.div>

      {/* Result dialog */}
      <AlertDialog open={showResult} onOpenChange={setShowResult}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-warning" />
              ผลการหมุน
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-center">
                {result?.slice.type === "nothing" ? (
                  <>
                    <p className="text-xl font-bold">เสียดาย!</p>
                    <p className="text-sm text-white/60">โชคไม่เข้าข้างรอบนี้ ลองใหม่อีกครั้งนะ</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-white/60">คุณได้รับ</p>
                    <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                      <p className="font-display text-2xl font-bold text-warning">{result?.slice.label}</p>
                      {result?.slice.type === "item" && result.reward && result.reward !== "-" && (
                        <div className="mt-3 break-all rounded-lg bg-black/40 p-3 text-left text-xs font-mono">
                          {result.reward}
                        </div>
                      )}
                      {result?.slice.type === "point" && (
                        <div className="mt-2 flex items-center justify-center gap-2 text-warning">
                          <Coins className="h-5 w-5" />
                          <span className="text-lg font-bold">{result.reward}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ปิด</AlertDialogCancel>
            <AlertDialogAction onClick={() => setShowResult(false)}>หมุนอีก</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
