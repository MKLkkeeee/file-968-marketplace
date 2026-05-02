import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { SHOP_TRUEWALLET_PHONE, SHOP_PROMPTPAY, BANK_RECEIVER_NAME, db } from "@/lib/firebase";
import { onValue, ref as dbRef } from "firebase/database";
import { Paginator, usePaged } from "@/components/Paginator";
import { Topup as TopupType } from "@/lib/store";
import { toast } from "sonner";
import { Building2, Copy, Gift, History, Loader2, Upload, Wallet, Banknote, KeyRound } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import {
  adjustPoints,
  findDiscountByCode,
  isReceiverNameMatch,
  recordTopup,
  updateDiscount,
  verifyBankSlip,
  verifyTruewalletGift,
  hasUserUsedCode,
  markUserUsedCode
} from "@/lib/store";

export default function Topup() {
  const { user, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState("truewallet");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState<"all" | "success" | "failed">("all");
  const [history, setHistory] = useState<TopupType[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const prevTopIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const off = onValue(dbRef(db, "topups"), (snap) => {
      const all: TopupType[] = snap.exists() ? Object.values(snap.val()) : [];
      const mine = all
        .filter((t) => t.userId === user.uid)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      setHistory(mine);
      setLastUpdated(Date.now());
      const newTopId = mine[0]?.id ?? null;
      if (prevTopIdRef.current && newTopId && newTopId !== prevTopIdRef.current) {
        setHistoryPage(1);
      }
      prevTopIdRef.current = newTopId;
    });
    return () => off();
  }, [user]);

  useEffect(() => { setHistoryPage(1); }, [historyFilter]);

  const filteredHistory = useMemo(() => {
    const base = historyFilter === "all"
      ? history
      : history.filter((t) => (t.status ?? "success") === historyFilter);
    return [...base].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [history, historyFilter]);

  const paged = usePaged(filteredHistory, historyPage, 10);

  // TrueWallet
  const [phone, setPhone] = useState(SHOP_TRUEWALLET_PHONE);
  const [giftLink, setGiftLink] = useState("");
  const [twLoading, setTwLoading] = useState(false);

  // Bank slip
  const [bankLoading, setBankLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // Special code (point top-up code)
  const [specialCode, setSpecialCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  const handleSpecialCode = async () => {
  if (!user || !profile) return;

  const code = specialCode.trim();
  if (!code) return toast.error("กรุณาใส่โค้ด");

  setCodeLoading(true);

  try {
    const d = await findDiscountByCode(code);

    if (!d) {
      return toast.error("ไม่พบโค้ดนี้ หรือถูกปิดใช้งาน");
    }

    if (d.type !== "point") {
      return toast.error("โค้ดนี้ไม่ใช่ Special Code", {
        description:
          "Special Code ต้องเป็นโค้ดประเภทเพิ่ม Point เท่านั้น",
      });
    }

    if (d.usedCount >= d.maxUses) {
      return toast.error("โค้ดนี้ถูกใช้ครบจำนวนแล้ว");
    }

    // ✅ เช็คเคยใช้ยัง
    const alreadyUsed = await hasUserUsedCode(d.id, user.uid);

    if (alreadyUsed) {
      return toast.error("บัญชีนี้ใช้โค้ดนี้ไปแล้ว");
    }

    // ✅ เติมพ้อย
    await adjustPoints(user.uid, d.value);

    // ✅ เพิ่มจำนวนใช้
    await updateDiscount(d.id, {
      usedCount: d.usedCount + 1,
    });

    // ✅ บันทึกว่า user นี้ใช้แล้ว
    await markUserUsedCode(d.id, user.uid);

    // ✅ บันทึกประวัติ
    await recordTopup({
      userId: user.uid,
      username: profile.username,
      method: "code",
      amount: d.value,
      ref: `SPECIAL:${d.code}`,
      status: "success",
    });

    toast.success(`เติม ${d.value} point สำเร็จ!`);

    setSpecialCode("");

    await refreshProfile();

  } catch (e: any) {
    toast.error("เกิดข้อผิดพลาด", {
      description: e.message,
    });
  } finally {
    setCodeLoading(false);
  }
};

  const handleTrueWallet = async () => {
    if (!user || !profile) return;
    if (!phone || !giftLink) return toast.error("กรุณากรอกข้อมูลให้ครบ");
    setTwLoading(true);
    try {
      const data = await verifyTruewalletGift(phone, giftLink);
      if (data.status === "success") {
        const amount = parseFloat(data.amount);
        await adjustPoints(user.uid, amount);
        await recordTopup({
          userId: user.uid,
          username: profile.username,
          method: "truewallet",
          amount,
          ref: giftLink,
          status: "success",
        });
        toast.success(`เติมเงินสำเร็จ +${amount} บาท`);
        setPhone(""); setGiftLink("");
        await refreshProfile();
      } else {
        await recordTopup({
          userId: user.uid,
          username: profile.username,
          method: "truewallet",
          amount: 0,
          ref: giftLink,
          status: "failed",
          error: typeof data.message === "string" ? data.message : "verify failed",
        });
        toast.error("เติมเงินไม่สำเร็จ", { description: data.message });
      }
    } catch (e: any) {
      toast.error("เกิดข้อผิดพลาด", { description: e.message });
    } finally {
      setTwLoading(false);
    }
  };

  const handleSlipFile = async (file: File) => {
    if (!user || !profile) return;
    setBankLoading(true);
    setPreviewImg(URL.createObjectURL(file));

    // Decode QR from image
    const tempDivId = "qr-temp-reader";
    let qrText = "";
    try {
      const html5QrCode = new Html5Qrcode(tempDivId, { verbose: false } as any);
      qrText = (await html5QrCode.scanFile(file, false)) as string;
    } catch (err) {
      // Try with showImage=true scan
      try {
        const html5QrCode = new Html5Qrcode(tempDivId, { verbose: false } as any);
        qrText = (await html5QrCode.scanFile(file, true)) as string;
      } catch (err2) {
        toast.error("อ่าน QR Code จากสลิปไม่สำเร็จ", { description: "กรุณาลองใหม่ด้วยรูปที่ชัดกว่า" });
        setBankLoading(false);
        return;
      }
    }

    try {
      const data = await verifyBankSlip(qrText);
      if (data.status !== "success") {
        const msg = typeof data.message === "string" ? data.message : data.message?.massage_th || "ตรวจสอบไม่สำเร็จ";
        await recordTopup({
          userId: user.uid,
          username: profile.username,
          method: "bank",
          amount: 0,
          ref: qrText.slice(0, 60),
          status: "failed",
          error: msg,
        });
        toast.error("สลิปไม่ถูกต้อง", { description: msg });
        setBankLoading(false);
        return;
      }
      const receiverName = data.receiver?.name || "";
      if (!isReceiverNameMatch(receiverName)) {
        await recordTopup({
          userId: user.uid,
          username: profile.username,
          method: "bank",
          amount: 0,
          ref: data.transactionId || qrText.slice(0, 60),
          status: "failed",
          error: `ผู้รับไม่ตรงกับร้าน: ${receiverName}`,
        });
        toast.error("ชื่อผู้รับไม่ตรงกับร้าน", {
          description: `ผู้รับในสลิป: ${receiverName}`,
        });
        setBankLoading(false);
        return;
      }
      const amount = Number(data.amount);
      // Prevent duplicate by transactionId
      const ref = data.transactionId;
      await adjustPoints(user.uid, amount);
      await recordTopup({
        userId: user.uid,
        username: profile.username,
        method: "bank",
        amount,
        ref,
        status: "success",
      });
      toast.success(`เติมเงินสำเร็จ! +${amount} point`);
      await refreshProfile();
      setPreviewImg(null);
    } catch (e: any) {
      toast.error("เกิดข้อผิดพลาด", { description: e.message });
    } finally {
      setBankLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-2xl py-12">
        <h1 className="font-display text-4xl font-bold">เติมเงินเข้า Wallet</h1>
        <p className="mt-2 text-muted-foreground">เลือกวิธีการเติมเงินที่ต้องการ</p>

        {profile && (
          <Card className="card-elegant mt-6 flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Point ปัจจุบัน</p>
              <p className="font-display text-3xl font-bold gradient-text">{profile.points.toLocaleString()}</p>
            </div>
            <Wallet className="h-10 w-10 text-primary" />
          </Card>
        )}

        {/* Special Code (point) */}
        <Card className="card-elegant mt-6 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
              <Gift className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Special Code</h3>
              <p className="text-xs text-muted-foreground">โค้ดพิเศษสำหรับเพิ่ม Point เท่านั้น</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              value={specialCode}
              onChange={(e) => setSpecialCode(e.target.value.toUpperCase())}
              placeholder="ใส่โค้ดของคุณ เช่น GIFT100"
              className="font-mono"
            />
            <Button
              onClick={handleSpecialCode}
              disabled={codeLoading}
              className="bg-gradient-primary text-primary-foreground"
            >
              {codeLoading && <Loader2 className="h-4 w-4 animate-spin" />} ใช้โค้ด
            </Button>
          </div>
        </Card>

        <Tabs value={tab} onValueChange={setTab} className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="truewallet"><Wallet className="h-4 w-4" />TrueMoney</TabsTrigger>
            <TabsTrigger value="bank"><Building2 className="h-4 w-4" />ธนาคาร</TabsTrigger>
          </TabsList>

          <TabsContent value="truewallet">
            <Card className="card-elegant p-6">
              <h3 className="font-display text-xl font-semibold">เติมผ่านซองอั่งเปา TrueMoney</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">วางลิงก์ซองด้านล่าง</p>

              <div className="mb-4"></div>

              <div className="space-y-4">
              <div className="space-y-2">
              <Label>ลิงก์ซองของขวัญ</Label>
              <Input
               value={giftLink}
               onChange={(e) => setGiftLink(e.target.value)}
               placeholder="https://gift.truemoney.com/campaign/?v=..."/>
              </div>

              <Button
               onClick={handleTrueWallet}
               disabled={twLoading}
               className="w-full bg-gradient-primary text-primary-foreground">{twLoading && <Loader2 className="h-4 w-4 animate-spin" />}เติมเงิน</Button>
            </div>
          </Card>
          </TabsContent>
          <TabsContent value="bank">
            <Card className="card-elegant p-6">
              <h3 className="font-display text-xl font-semibold">โอนเงินผ่านพร้อมเพย์</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                สแกนคิวอาโค๊ด แล้วอัพโหลดสลิป ในช่องด้านล่าง
              </p>

              <div className="mt-4 space-y-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">พร้อมเพย์</p>
                  <div className="flex justify-center">
                    <img src="https://cdn.discordapp.com/attachments/1499030047783260282/1499919795682803872/IMG_2472.png?ex=69f68caa&is=69f53b2a&hm=6e21d28a8df44ee0c6088a7166c17202d7080742de2490a7bc1c3e8df58fa7ea&" alt="PromptPay QR" className="w-72 rounded-xl border shadow-md"/>
                </div>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary/40 p-10 text-center transition-smooth hover:border-primary hover:bg-secondary/60"
                >
                  {previewImg ? (
                    <img src={previewImg} alt="slip" className="max-h-48 rounded-lg" />
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <p className="font-medium">คลิกเพื่ออัปโหลดสลิป</p>
                        <p className="text-xs text-muted-foreground">รองรับ JPG, PNG (ต้องเห็น QR ในสลิปชัดเจน)</p>
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSlipFile(f); e.target.value = ""; }}
                />
                {bankLoading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> กำลังตรวจสอบสลิป...
                  </div>
                )}
                <div id="qr-temp-reader" className="hidden" />
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Topup history */}
        <Card className="card-elegant mt-8 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <History className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold">ประวัติการเติมเงิน</h3>
              <p className="text-xs text-white/50">รายการเติมเงินทั้งหมดของคุณ</p>
            </div>
          </div>

          {/* Filter chips */}
          <div className="mb-4 flex flex-wrap gap-2">
            {([
              { key: "all", label: `ทั้งหมด (${history.length})` },
              { key: "success", label: `สำเร็จ (${history.filter(t => (t.status ?? "success") === "success").length})` },
              { key: "failed", label: `ไม่ผ่าน (${history.filter(t => t.status === "failed").length})` },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setHistoryFilter(opt.key)}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                  historyFilter === opt.key
                    ? "border-transparent bg-white text-black"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {filteredHistory.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              {history.length === 0 ? "ยังไม่มีรายการเติมเงิน" : "ไม่มีรายการตรงกับตัวกรอง"}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {paged.slice.map((t) => {
                  const Icon = t.method === "truewallet" ? Wallet : t.method === "bank" ? Banknote : KeyRound;
                  const label = t.method === "truewallet" ? "TrueMoney" : t.method === "bank" ? "ธนาคาร" : "Special Code";
                  const status = t.status ?? "success";
                  const isFailed = status === "failed";
                  return (
                    <div key={t.id} className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${
                      isFailed ? "border-destructive/30 bg-destructive/5" : "border-white/10 bg-white/[0.03]"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                          <Icon className="h-4 w-4 text-white/80" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{label}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isFailed ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success"
                            }`}>
                              {isFailed ? "ไม่ผ่าน" : "สำเร็จ"}
                            </span>
                          </div>
                          <p className="truncate text-xs text-white/40" title={isFailed ? t.error : t.ref}>
                            {isFailed ? (t.error || "ไม่ผ่านการตรวจสอบ") : (t.ref || "-")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-display text-lg font-bold ${isFailed ? "text-white/30 line-through" : "text-success"}`}>
                          {isFailed ? "—" : `+${t.amount.toLocaleString()}`}
                        </p>
                        <p className="text-[11px] text-white/40">{new Date(t.createdAt).toLocaleString("th-TH")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Paginator page={paged.page} totalPages={paged.totalPages} onChange={setHistoryPage} />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
