import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  adjustPoints,
  createOrder,
  findDiscountByCode,
  popStockItem,
  stockCount,
  updateDiscount,
} from "@/lib/store";
import { sendOrderWebhook } from "@/lib/discord";
import { toast } from "sonner";
import { Coins, Loader2, Minus, Package, Plus, ShoppingBag, Tag, Trash2 } from "lucide-react";

export default function Cart() {
  const navigate = useNavigate();
  const { items, remove, setQty, clear, subtotal } = useCart();
  const { user, profile, refreshProfile } = useAuth();

  const [discountCode, setDiscountCode] = useState("");
  const [discountInfo, setDiscountInfo] = useState<{ pct: number; code: string; id: string } | null>(null);
  const [buying, setBuying] = useState(false);

  const finalPrice = Math.max(0, Math.round(subtotal * (1 - (discountInfo?.pct || 0) / 100)));

  const applyDiscount = async () => {
    const code = discountCode.trim();
    if (!code) return;
    const d = await findDiscountByCode(code);
    if (!d) return toast.error("ไม่พบโค้ดนี้");
    if (d.type !== "discount") {
      return toast.error("โค้ดนี้ใช้ที่หน้าเติมเงิน (Special Code)", {
        description: "โค้ดส่วนลดในตะกร้าต้องเป็นประเภท ส่วนลด % เท่านั้น",
      });
    }
    if (d.usedCount >= d.maxUses) return toast.error("โค้ดถูกใช้ครบจำนวนแล้ว");
    setDiscountInfo({ pct: d.value, code: d.code, id: d.id });
    toast.success(`ใช้โค้ดส่วนลด ${d.value}% สำเร็จ`);
  };

  const checkout = async () => {
    if (!user || !profile) return navigate("/login");
    if (items.length === 0) return;
    if (profile.points < finalPrice) return toast.error("Point ไม่พอ", { description: "กรุณาเติมเงินก่อน" });

    // Validate stock
    for (const it of items) {
      if (stockCount(it.product.stockItems) < it.qty) {
        return toast.error(`สินค้า ${it.product.name} เหลือไม่พอ`);
      }
    }

    setBuying(true);
    try {
      const delivered: { productId: string; productName: string; price: number; deliveredItem: string }[] = [];
      // Pop stock items atomically
      for (const it of items) {
        for (let i = 0; i < it.qty; i++) {
          const item = await popStockItem(it.product.id);
          if (!item) throw new Error(`สินค้า ${it.product.name} หมดสต๊อกระหว่างการซื้อ`);
          delivered.push({
            productId: it.product.id,
            productName: it.product.name,
            price: it.product.price,
            deliveredItem: item,
          });
        }
      }

      await adjustPoints(user.uid, -finalPrice);
      await createOrder({
        userId: user.uid,
        username: profile.username,
        items: delivered,
        subtotal,
        discountCode: discountInfo?.code || "",
        discountPct: discountInfo?.pct || 0,
        finalPrice,
      });

      if (discountInfo) {
        const d = await findDiscountByCode(discountInfo.code);
        if (d) await updateDiscount(d.id, { usedCount: d.usedCount + 1 });
      }

      // ส่งแจ้งเตือนการสั่งซื้อไปยัง Discord Webhook
      const webhookUrl = "https://discord.com/api/webhooks/1499929823257038929/9VyFxT798O9mw_QEsJ7PK6V-yH02oAwTzTXritnpfY4dQQWylO0wfHM1-LVAeZlFWmSk";
      
      const orderItems = items.map(it => ({
        name: it.product.name,
        category: it.product.categoryId || "ไม่ระบุหมวดหมู่",
        price: it.product.price,
        quantity: it.qty
      }));

      await sendOrderWebhook(
        profile.username,
        orderItems,
        finalPrice,
        webhookUrl
      );

      toast.success("ซื้อสำเร็จ", { description: `ใช้ไป ${finalPrice} point — ดูประวัติได้ในหน้า "ประวัติการซื้อ"` });
      clear();
      setDiscountInfo(null);
      setDiscountCode("");
      await refreshProfile();
      navigate("/orders");
    } catch (e: any) {
      toast.error("ซื้อไม่สำเร็จ", { description: e.message });
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-5xl py-10">
        <h1 className="font-display text-4xl font-bold flex items-center gap-3">
          <ShoppingBag className="h-8 w-8" /> ตะกร้าสินค้า
        </h1>
        <p className="mt-1 text-muted-foreground">{items.length} รายการในตะกร้า</p>

        {items.length === 0 ? (
          <Card className="card-elegant mt-8 flex flex-col items-center gap-4 p-16 text-center">
            <Package className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground">ยังไม่มีสินค้าในตะกร้า</p>
            <Button onClick={() => navigate("/")} className="bg-gradient-primary text-primary-foreground">
              ไปเลือกสินค้า
            </Button>
          </Card>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="space-y-3 md:col-span-2">
              {items.map((it) => {
                const stk = stockCount(it.product.stockItems);
                return (
                  <Card key={it.product.id} className="card-elegant flex gap-4 p-4">
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-secondary/30">
                      {it.product.image ? (
                        <img src={it.product.image} alt={it.product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><Package className="h-8 w-8 text-muted-foreground" /></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{it.product.name}</h3>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{it.product.description}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Coins className="h-4 w-4 text-warning" />
                        <span className="font-bold">{it.product.price.toLocaleString()}</span>
                        <Badge variant="outline" className="text-xs">stock {stk}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(it.product.id, it.qty - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">{it.qty}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" disabled={it.qty >= stk || it.qty >= 5} onClick={() => { if (it.qty >= 5) { toast.error("ซื้อได้สูงสุด 5 ชิ้นต่อสินค้า");return;}setQty(it.product.id, it.qty + 1);}}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={() => remove(it.product.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div>
              <Card className="card-elegant sticky top-20 p-5">
                <h3 className="font-display text-lg font-semibold">สรุปคำสั่งซื้อ</h3>

                <div className="mt-4 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="โค้ดส่วนลด"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                  />
                  <Button variant="outline" size="sm" onClick={applyDiscount}>ใช้</Button>
                </div>

                <div className="mt-5 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">รวมสินค้า</span>
                    <span>{subtotal.toLocaleString()}</span>
                  </div>
                  {discountInfo && (
                    <div className="flex justify-between text-success">
                      <span>ส่วนลด {discountInfo.pct}% ({discountInfo.code})</span>
                      <span>-{(subtotal - finalPrice).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="font-semibold">ยอดสุทธิ</span>
                    <span className="font-display text-2xl font-bold gradient-text">{finalPrice.toLocaleString()}</span>
                  </div>
                </div>

                {profile && (
                  <p className="mt-3 text-right text-xs text-muted-foreground">
                    Point ของคุณ: {profile.points.toLocaleString()}
                  </p>
                )}

                <Button
                  className="mt-5 w-full bg-gradient-primary text-primary-foreground"
                  onClick={checkout}
                  disabled={buying}
                >
                  {buying && <Loader2 className="h-4 w-4 animate-spin" />}
                  {user ? "ชำระเงิน (หัก Point)" : "เข้าสู่ระบบเพื่อซื้อ"}
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
