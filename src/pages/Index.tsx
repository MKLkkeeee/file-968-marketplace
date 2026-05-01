import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Category, Product, adjustPoints, createOrder, findDiscountByCode, updateDiscount } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Coins, Package, ShoppingCart, Sparkles, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [selected, setSelected] = useState<Product | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountInfo, setDiscountInfo] = useState<{ pct: number; code: string } | null>(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    const unsubC = onValue(ref(db, "categories"), (snap) => {
      setCategories(snap.exists() ? Object.values(snap.val()) : []);
    });
    const unsubP = onValue(ref(db, "products"), (snap) => {
      setProducts(snap.exists() ? Object.values(snap.val()) : []);
    });
    return () => { unsubC(); unsubP(); };
  }, []);

  const filtered = activeCat === "all" ? products : products.filter((p) => p.categoryId === activeCat);

  const finalPrice = selected
    ? Math.max(0, Math.round(selected.price * (1 - (discountInfo?.pct || 0) / 100)))
    : 0;

  const applyCode = async () => {
    if (!discountCode.trim()) return;
    const d = await findDiscountByCode(discountCode.trim());
    if (!d) return toast.error("ไม่พบโค้ดนี้ หรือถูกปิดใช้งาน");
    if (d.usedCount >= d.maxUses) return toast.error("โค้ดนี้ถูกใช้ครบจำนวนแล้ว");
    if (d.type === "point") {
      if (!user) return toast.error("กรุณาเข้าสู่ระบบ");
      await adjustPoints(user.uid, d.value);
      await updateDiscount(d.id, { usedCount: d.usedCount + 1 });
      toast.success(`เติม ${d.value} point สำเร็จ!`);
      setDiscountCode("");
      await refreshProfile();
    } else {
      setDiscountInfo({ pct: d.value, code: d.code });
      toast.success(`ใช้โค้ดส่วนลด ${d.value}% สำเร็จ`);
    }
  };

  const handleBuy = async () => {
    if (!user || !profile || !selected) return;
    if (profile.points < finalPrice) return toast.error("Point ไม่พอ", { description: "กรุณาเติมเงินก่อน" });
    setBuying(true);
    try {
      await adjustPoints(user.uid, -finalPrice);
      await createOrder({
        userId: user.uid,
        username: profile.username,
        productId: selected.id,
        productName: selected.name,
        price: selected.price,
        discountCode: discountInfo?.code,
        finalPrice,
      });
      if (discountInfo) {
        const d = await findDiscountByCode(discountInfo.code);
        if (d) await updateDiscount(d.id, { usedCount: d.usedCount + 1 });
      }
      toast.success("ซื้อสำเร็จ!", { description: `ใช้ไป ${finalPrice} point` });
      setSelected(null);
      setDiscountInfo(null);
      setDiscountCode("");
      await refreshProfile();
    } catch (e: any) {
      toast.error("ซื้อไม่สำเร็จ", { description: e.message });
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-glow" />
        <div className="container relative py-20 md:py-28">
          <Badge className="mb-6 bg-primary/15 text-primary border-primary/30">
            <Sparkles className="h-3 w-3" /> ร้านขายไฟล์อันดับ 1
          </Badge>
          <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-tight">
            FILE <span className="gradient-text">968</span> <br />
            <span className="text-foreground/90">SHOP</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            ร้านค้าออนไลน์พรีเมี่ยม — เติมเงินทันที ใช้ Point ซื้อสินค้าได้เลย รองรับ TrueWallet และโอนผ่านธนาคาร
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {!user ? (
              <>
                <Button size="lg" className="bg-gradient-primary text-primary-foreground glow-primary" onClick={() => navigate("/register")}>
                  เริ่มต้นใช้งาน
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/login")}>เข้าสู่ระบบ</Button>
              </>
            ) : (
              <Button size="lg" className="bg-gradient-primary text-primary-foreground glow-primary" onClick={() => navigate("/topup")}>
                เติมเงินเลย
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-12">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-3xl font-bold">สินค้าทั้งหมด</h2>
        </div>
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCat("all")}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-smooth ${
              activeCat === "all" ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "bg-secondary text-foreground hover:bg-secondary/70"
            }`}
          >
            ทั้งหมด
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-smooth ${
                activeCat === c.id ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "bg-secondary text-foreground hover:bg-secondary/70"
              }`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card className="card-elegant flex flex-col items-center gap-3 p-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">ยังไม่มีสินค้าในหมวดนี้</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <Card
                key={p.id}
                className="card-elegant group cursor-pointer overflow-hidden p-0 transition-smooth hover:-translate-y-1 hover:shadow-elegant"
                onClick={() => { setSelected(p); setDiscountInfo(null); setDiscountCode(""); }}
              >
                <div className="aspect-square overflow-hidden bg-secondary/30">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-smooth group-hover:scale-110" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Package className="h-12 w-12 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-1 font-semibold">{p.name}</h3>
                  <p className="line-clamp-2 mt-1 text-xs text-muted-foreground">{p.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-warning">
                      <Coins className="h-4 w-4" />
                      <span className="font-bold">{p.price.toLocaleString()}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">stock {p.stock}</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Buy dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selected.name}</DialogTitle>
                <DialogDescription>{selected.description}</DialogDescription>
              </DialogHeader>
              {selected.image && (
                <img src={selected.image} alt={selected.name} className="aspect-video w-full rounded-lg object-cover" />
              )}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="ใส่โค้ดส่วนลด / โค้ดเติม point" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} />
                  <Button variant="outline" onClick={applyCode}>ใช้</Button>
                </div>
                <div className="rounded-xl bg-secondary/50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ราคา</span>
                    <span>{selected.price.toLocaleString()} point</span>
                  </div>
                  {discountInfo && (
                    <div className="mt-1 flex justify-between text-sm text-success">
                      <span>ส่วนลด {discountInfo.pct}%</span>
                      <span>-{(selected.price - finalPrice).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="font-semibold">รวม</span>
                    <span className="font-display text-2xl font-bold gradient-text">{finalPrice.toLocaleString()}</span>
                  </div>
                </div>
                {profile && (
                  <div className="text-right text-xs text-muted-foreground">
                    point ของคุณ: {profile.points.toLocaleString()}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>ยกเลิก</Button>
                {!user ? (
                  <Button onClick={() => navigate("/login")} className="bg-gradient-primary text-primary-foreground">เข้าสู่ระบบเพื่อซื้อ</Button>
                ) : (
                  <Button onClick={handleBuy} disabled={buying} className="bg-gradient-primary text-primary-foreground">
                    <ShoppingCart className="h-4 w-4" />ซื้อเลย
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
