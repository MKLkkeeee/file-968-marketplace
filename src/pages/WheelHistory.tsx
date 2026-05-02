import { useEffect, useMemo, useState } from "react";
import { onValue, query, ref, orderByChild, equalTo } from "firebase/database";
import { db } from "@/lib/firebase";
import { WheelSpin } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Gift, Sparkles, Search, History, ArrowLeft, Copy } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Paginator, usePaged } from "@/components/Paginator";

export default function WheelHistory() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [spins, setSpins] = useState<WheelSpin[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "win" | "lose">("all");

  useEffect(() => {
    if (!user) return;
    // Try indexed query; if rules don't allow, fall back to client-side filter
    const q = query(ref(db, "wheel/spins"), orderByChild("userId"), equalTo(user.uid));
    const off = onValue(
      q,
      (snap) => {
        const list = snap.exists() ? Object.values(snap.val() as Record<string, WheelSpin>) : [];
        setSpins(list.sort((a, b) => b.createdAt - a.createdAt));
      },
      () => {
        // Fallback: read all and filter (may also fail if rules restrict)
        const off2 = onValue(ref(db, "wheel/spins"), (s) => {
          const all = s.exists() ? Object.values(s.val() as Record<string, WheelSpin>) : [];
          setSpins(all.filter((x) => x.userId === user.uid).sort((a, b) => b.createdAt - a.createdAt));
        });
        return off2;
      }
    );
    return () => off();
  }, [user]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return spins.filter((x) => {
      if (filter === "win" && x.type === "nothing") return false;
      if (filter === "lose" && x.type !== "nothing") return false;
      if (!s) return true;
      return (
        (x.sliceLabel || "").toLowerCase().includes(s) ||
        (x.reward || "").toLowerCase().includes(s)
      );
    });
  }, [spins, search, filter]);

  const { slice: paged, totalPages } = usePaged(filtered, page, 10);

  const stats = useMemo(() => {
    const wins = spins.filter((x) => x.type !== "nothing").length;
    const totalCost = spins.reduce((a, b) => a + (b.cost || 0), 0);
    const totalPoints = spins.reduce((a, b) => a + (b.type === "point" ? Number(b.reward.replace(/[^\d-]/g, "")) || 0 : 0), 0);
    return { count: spins.length, wins, totalCost, totalPoints };
  }, [spins]);

  if (!loading && !user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 text-center">
          <History className="mx-auto h-12 w-12 text-warning" />
          <h1 className="mt-4 font-display text-3xl font-bold">เข้าสู่ระบบเพื่อดูประวัติ</h1>
          <Button className="mt-4" onClick={() => navigate("/login")}>เข้าสู่ระบบ</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="container py-10"
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <Link to="/wheel" className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> กลับไปวงล้อ
            </Link>
            <h1 className="mt-2 font-display text-3xl font-bold">ประวัติการหมุนวงล้อ</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile?.username && <>ของ <span className="font-semibold text-white">{profile.username}</span></>}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="หมุนทั้งหมด" value={stats.count.toLocaleString()} icon={<Sparkles className="h-4 w-4" />} />
          <StatCard label="ครั้งที่ได้รางวัล" value={stats.wins.toLocaleString()} icon={<Gift className="h-4 w-4 text-warning" />} />
          <StatCard label="Point ที่ใช้ไป" value={stats.totalCost.toLocaleString()} icon={<Coins className="h-4 w-4 text-destructive" />} />
          <StatCard label="Point ที่ได้คืน" value={stats.totalPoints.toLocaleString()} icon={<Coins className="h-4 w-4 text-emerald-400" />} />
        </div>

        <Card className="card-elegant p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <Input
                placeholder="ค้นหาชื่อรางวัล / โค้ด"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "win", "lose"] as const).map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={filter === k ? "default" : "outline"}
                  onClick={() => { setFilter(k); setPage(1); }}
                >
                  {k === "all" ? "ทั้งหมด" : k === "win" ? "ได้รางวัล" : "เสียดาย"}
                </Button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/40">
              {spins.length === 0 ? "ยังไม่มีประวัติการหมุน" : "ไม่มีรายการตรงกับตัวกรอง"}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {paged.map((s) => <SpinRow key={s.id} spin={s} />)}
              </div>
              <div className="mt-4">
                <Paginator page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs text-white/50">{icon} {label}</div>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function SpinRow({ spin }: { spin: WheelSpin }) {
  const isWin = spin.type !== "nothing";
  const isItem = spin.type === "item" && spin.reward && spin.reward !== "-";
  const date = new Date(spin.createdAt);
  const dateStr = date.toLocaleString("th-TH", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(spin.reward);
      toast.success("คัดลอกแล้ว");
    } catch { toast.error("คัดลอกไม่สำเร็จ"); }
  };

  return (
    <div
      className={
        "flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center " +
        (isWin ? "border-warning/30 bg-warning/5" : "border-white/10 bg-white/[0.02]")
      }
    >
      <div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-full " + (isWin ? "bg-warning/20 text-warning" : "bg-white/10 text-white/40")}>
        {spin.type === "point" ? <Coins className="h-5 w-5" /> : isWin ? <Gift className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{spin.sliceLabel}</span>
          <Badge variant={isWin ? "default" : "outline"} className="text-[10px]">
            {spin.type === "point" ? "Point" : spin.type === "item" ? "ของ" : "เสียดาย"}
          </Badge>
        </div>
        {isItem && (
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-black/40 p-2 text-xs">
            <code className="break-all flex-1 font-mono">{spin.reward}</code>
            <button onClick={copy} className="shrink-0 rounded p-1 text-white/50 hover:bg-white/10 hover:text-white" title="คัดลอก">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {spin.type === "point" && (
          <p className="mt-0.5 text-sm font-bold text-warning">{spin.reward}</p>
        )}
        <p className="mt-1 text-[11px] text-white/40">
          {dateStr} · ใช้ {spin.cost} Point
        </p>
      </div>
    </div>
  );
}
