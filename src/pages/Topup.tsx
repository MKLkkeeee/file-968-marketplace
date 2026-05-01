import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { adjustPoints, findDiscountByCode, isReceiverNameMatch, recordTopup, updateDiscount, verifyBankSlip, verifyTruewalletGift } from "@/lib/store";
import { SHOP_TRUEWALLET_PHONE, SHOP_PROMPTPAY, BANK_RECEIVER_NAME } from "@/lib/firebase";
import { toast } from "sonner";
import { Building2, Copy, Gift, Loader2, Upload, Wallet } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

export default function Topup() {
  const { user, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState("truewallet");

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

  if (!code) {
    toast.error("กรุณาใส่โค้ด");
    return;
  }

  setCodeLoading(true);

  try {
    const d = await findDiscountByCode(code);

    if (!d) {
      toast.error("ไม่พบโค้ดนี้ หรือถูกปิดใช้งาน");
      return;
    }

    // ต้องเป็นโค้ด point เท่านั้น
    if (d.type !== "point") {
      toast.error("โค้ดนี้ไม่ใช่ Special Code", {
        description: "ใช้ได้เฉพาะโค้ดเพิ่ม Point เท่านั้น",
      });
      return;
    }

    // เช็กว่า user นี้เคยใช้แล้วไหม
    if (d.usedBy && d.usedBy[user.uid]) {
      toast.error("คุณใช้โค้ดนี้ไปแล้ว");
      return;
    }

    // ใช้ครบจำนวนหรือยัง
    if (d.usedCount >= d.maxUses) {
      toast.error("โค้ดนี้ถูกใช้ครบจำนวนแล้ว");
      return;
    }

    // เพิ่ม point
    await adjustPoints(user.uid, d.value);

    // อัปเดต firebase
    await updateDiscount(d.id, {
      usedCount: d.usedCount + 1,
      usedBy: {
        ...(d.usedBy || {}),
        [user.uid]: true,
      },
    });

    // บันทึกประวัติ
    await recordTopup({
      userId: user.uid,
      username: profile.username,
      method: "code",
      amount: d.value,
      ref: `SPECIAL:${d.code}`,
    });

    toast.success(`เติม ${d.value} Point สำเร็จ!`);

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
        });
        toast.success(`เติมเงินสำเร็จ! +${amount} point`);
        setPhone(""); setGiftLink("");
        await refreshProfile();
      } else {
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
        toast.error("สลิปไม่ถูกต้อง", { description: msg });
        setBankLoading(false);
        return;
      }
      const receiverName = data.receiver?.name || "";
      if (!isReceiverNameMatch(receiverName)) {
        toast.error("ชื่อผู้รับไม่ตรงกับร้าน", {
          description: `ผู้รับในสลิป: ${receiverName} (ต้องเป็น ด.ช. ธวัชชัย ค)`,
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
              <p className="mb-4 mt-1 text-sm text-muted-foreground">
                ส่งซองของขวัญมาที่เบอร์ของร้าน แล้ววางลิงก์ซองด้านล่าง
              </p>

              <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-4">
                <p className="text-xs text-muted-foreground">เบอร์รับเงินของร้าน</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-2xl font-bold gradient-text">{SHOP_TRUEWALLET_PHONE}</p>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(SHOP_TRUEWALLET_PHONE); toast.success("คัดลอกเบอร์แล้ว"); }}>
                    <Copy className="h-4 w-4" /> คัดลอก
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>เบอร์ผู้รับ (เบอร์ร้าน)</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0XXXXXXXXX" />
                </div>
                <div className="space-y-2">
                  <Label>ลิงก์ซองของขวัญ</Label>
                  <Input value={giftLink} onChange={(e) => setGiftLink(e.target.value)} placeholder="https://gift.truemoney.com/campaign/?v=..." />
                </div>
                <Button onClick={handleTrueWallet} disabled={twLoading} className="w-full bg-gradient-primary text-primary-foreground">
                  {twLoading && <Loader2 className="h-4 w-4 animate-spin" />}เติมเงิน
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bank">
            <Card className="card-elegant p-6">
              <h3 className="font-display text-xl font-semibold">โอนเงินผ่านพร้อมเพย์</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                โอนเงินมาที่บัญชีด้านล่าง แล้วอัปโหลดสลิปเพื่อเติม Point อัตโนมัติ
              </p>

              <div className="mt-4 space-y-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">พร้อมเพย์</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-2xl font-bold gradient-text">{SHOP_PROMPTPAY}</p>
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(SHOP_PROMPTPAY); toast.success("คัดลอกพร้อมเพย์แล้ว"); }}>
                      <Copy className="h-4 w-4" /> คัดลอก
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ชื่อผู้รับ</p>
                  <p className="font-semibold">{BANK_RECEIVER_NAME}</p>
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
      </div>
    </div>
  );
}
