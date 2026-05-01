import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { adjustPoints, isReceiverNameMatch, recordTopup, verifyBankSlip, verifyTruewalletGift } from "@/lib/store";
import { toast } from "sonner";
import { Building2, Loader2, Upload, Wallet } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

export default function Topup() {
  const { user, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState("truewallet");

  // TrueWallet
  const [phone, setPhone] = useState("");
  const [giftLink, setGiftLink] = useState("");
  const [twLoading, setTwLoading] = useState(false);

  // Bank slip
  const [bankLoading, setBankLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

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

        <Tabs value={tab} onValueChange={setTab} className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="truewallet"><Wallet className="h-4 w-4" />TrueMoney</TabsTrigger>
            <TabsTrigger value="bank"><Building2 className="h-4 w-4" />ธนาคาร</TabsTrigger>
          </TabsList>

          <TabsContent value="truewallet">
            <Card className="card-elegant p-6">
              <h3 className="font-display text-xl font-semibold">เติมผ่านซองอั่งเปา TrueMoney</h3>
              <p className="mb-5 mt-1 text-sm text-muted-foreground">วางลิงก์ซองของขวัญและเบอร์ที่จะรับเงิน</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>เบอร์รับเงิน</Label>
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
              <h3 className="font-display text-xl font-semibold">โอนเงินผ่านธนาคาร</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                โอนให้ <span className="font-semibold text-foreground">ด.ช. ธวัชชัย ค</span> แล้วอัปโหลดสลิป
              </p>
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
