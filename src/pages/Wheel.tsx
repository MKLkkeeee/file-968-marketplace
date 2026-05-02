import { useEffect, useMemo, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import {
  WheelSlice, WheelConfig, getWheelConfig,
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
import { Coins, Sparkles, Gift } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Wheel() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<WheelConfig>({ enabled: false, spinCost: 0, updatedAt: 0 });
  const [slices, setSlices] = useState<WheelSlice[]>([]);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ slice: WheelSlice; reward: string } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => setConfig(await getWheelConfig()))();
    const off = onValue(ref(db, "wheel/slices"), (s) => {
      const list = s.exists() ? Object.values(s.val() as Record<string, WheelSlice>) : [];
      setSlices(list);
    });
    return () => off();
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
    try {
      // Deduct cost first
      if (config.spinCost > 0) await adjustPoints(user.uid, -config.spinCost);

      const idx = pickWeighted();
      const chosen = activeSlices[idx];

      // For item type, try to pop stock — if empty, fall back to "เสียดาย"
      let reward = "";
      let finalSlice = chosen;
      if (chosen.type === "item") {
        const popped = await popWheelStock(chosen.id);
        if (popped) {
          reward = popped;
        } else {
          // Of out stock: convert to nothing
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

      // Animate: spin to land pointer (top, 0deg) at the middle of slice idx
      const sliceMid = idx * sliceAngle + sliceAngle / 2;
      const turns = 6 + Math.floor(Math.random() * 3); // 6-8 full turns
      const target = turns * 360 + (360 - sliceMid); // pointer at top
      const newAngle = angle + (target - (angle % 360));
      setAngle(newAngle);

      // Wait for animation (must match CSS transition)
      await new Promise((r) => setTimeout(r, 5200));

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
    } catch (e: any) {
      toast.error("หมุนไม่สำเร็จ", { description: e?.message || String(e) });
    } finally {
      setSpinning(false);
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

  // Build conic-gradient background of the wheel
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
          <h1 className="font-display text-4xl font-bold">วงล้อนำโชค</h1>
          <p className="mt-2 text-muted-foreground">
            หมุน 1 ครั้ง ใช้{" "}
            <span className="font-bold text-warning">{config.spinCost.toLocaleString()} Point</span>
          </p>
          {profile && (
            <p className="mt-1 text-sm text-white/50">
              Point ของคุณ: <span className="font-semibold text-white">{profile.points.toLocaleString()}</span>
            </p>
          )}
        </div>

        <div className="mx-auto flex max-w-md flex-col items-center">
          <div className="relative aspect-square w-full max-w-[360px]">
            {/* Pointer */}
            <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1">
              <div className="h-0 w-0 border-x-[14px] border-t-[26px] border-x-transparent border-t-warning drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" />
            </div>

            {/* Wheel ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-warning/40 via-primary/20 to-transparent p-2 shadow-[0_0_60px_-10px_hsl(var(--primary)/0.6)]">
              <div
                ref={wheelRef}
                className="relative h-full w-full rounded-full border-4 border-white/10"
                style={{
                  background: conic,
                  transform: `rotate(${angle}deg)`,
                  transition: spinning ? "transform 5s cubic-bezier(0.17, 0.67, 0.21, 0.99)" : "none",
                }}
              >
                {/* Slice labels */}
                {activeSlices.map((s, i) => {
                  const rot = i * sliceAngle + sliceAngle / 2;
                  return (
                    <div
                      key={s.id}
                      className="absolute left-1/2 top-1/2 origin-left"
                      style={{
                        transform: `rotate(${rot}deg) translate(0, -50%)`,
                        width: "50%",
                      }}
                    >
                      <div
                        className="flex justify-end pr-6 text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                        style={{ transform: "rotate(0deg)" }}
                      >
                        <span className="max-w-[110px] truncate">{s.label}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Center hub */}
                <div className="absolute left-1/2 top-1/2 z-10 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/20 bg-gradient-to-br from-warning to-warning/60 shadow-lg" />
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

          {N < 2 && (
            <p className="mt-3 text-sm text-white/40">วงล้อยังไม่มีช่องเพียงพอ</p>
          )}
        </div>

        {/* Slice list / legend */}
        {activeSlices.length > 0 && (
          <Card className="card-elegant mx-auto mt-8 max-w-xl p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <Gift className="h-4 w-4" /> ของรางวัลในวงล้อ
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {activeSlices.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-sm">
                  <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.label}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
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
            <AlertDialogAction onClick={() => { setShowResult(false); }}>หมุนอีก</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
