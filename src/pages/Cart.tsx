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
import { Coins, Loader2, Minus, Package, Plus, Search, ShoppingBag, Tag, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Cart() {
  const navigate = useNavigate();
  const { items, remove, setQty, clear, subtotal } = useCart();
  const { user, profile, refreshProfile } = useAuth();

  const [discountCode, setDiscountCode] = useState("");
  const [discountInfo, setDiscountInfo] = useState<{
    pct: number;
    code: string;
    id: string;
    productIds?: string[];
    categoryIds?: string[];
  } | null>(null);
  const [buying, setBuying] = useState(false);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const visibleItems = q
    ? items.filter((it) => `${it.product.name} ${it.product.description}`.toLowerCase().includes(q))
    : items;

  // คำนวณยอดที่เข้าเงื่อนไขส่วนลด (ตามสินค้า/หมวดหมู่)
  const isItemEligible = (productId: string, categoryId: string) => {
    if (!discountInfo) return false;
    const hasProductFilter = (discountInfo.productIds?.length ?? 0) > 0;
    const hasCategoryFilter = (discountInfo.categoryIds?.length ?? 0) > 0;
    if (!hasProductFilter && !hasCategoryFilter) return true; // ใช้ได้กับทุกอย่าง
    if (hasProductFilter && discountInfo.productIds!.includes(productId)) return true;
    if (hasCategoryFilter && discountInfo.categoryIds!.includes(categoryId)) return true;
    return false;
  };

  const eligibleSubtotal = items.reduce(
    (s, x) => s + (isItemEligible(x.product.id, x.product.categoryId) ? x.product.price * x.qty : 0),
    0,
  );
  const discountAmount = discountInfo
    ? Math.round(eligibleSubtotal * (discountInfo.pct / 100))
    : 0;
  const finalPrice = Math.max(0, subtotal - discountAmount);
  const isRestricted = !!discountInfo && (
    (discountInfo.productIds?.length ?? 0) > 0 ||
    (discountInfo.categoryIds?.length ?? 0) > 0
  );

  const applyDiscount = async () => {
    const code = discountCode.trim();
    if (!code) return toast.error("กรุณากรอกโค้ด");
    if (discountInfo) return toast.error("ใช้โค้ดอยู่แล้ว", { description: "ลบโค้ดเดิมก่อนใช้โค้ดใหม่" });
    const d = await findDiscountByCode(code);
    if (!d) return toast.error("ไม่พบโค้ดนี้");
    if (!d.active) return toast.error("โค้ดนี้ถูกปิดใช้งาน");
    if (d.type !== "discount") {
      return toast.error("โค้ดนี้ใช้ที่หน้าเติมเงิน (Special Code)", {
        description: "โค้ดส่วนลดในตะกร้าต้องเป็นประเภท ส่วนลด % เท่านั้น",
      });
    }
    if (d.usedCount >= d.maxUses) return toast.error("โค้ดถูกใช้ครบจำนวนแล้ว");
    if (user && d.usedBy?.[user.uid]) return toast.error("คุณใช้โค้ดนี้ไปแล้ว");

    // เช็คว่ามีสินค้าที่เข้าเงื่อนไขในตะกร้าไหม
    const hasProductFilter = (d.productIds?.length ?? 0) > 0;
    const hasCategoryFilter = (d.categoryIds?.length ?? 0) > 0;
    if (hasProductFilter || hasCategoryFilter) {
      const eligibleCount = items.filter((it) => {
        if (hasProductFilter && d.productIds!.includes(it.product.id)) return true;
        if (hasCategoryFilter && d.categoryIds!.includes(it.product.categoryId)) return true;
        return false;
      }).length;
      if (eligibleCount === 0) {
        return toast.error("โค้ดนี้ใช้ไม่ได้กับสินค้าในตะกร้า", {
          description: "โค้ดจำกัดเฉพาะสินค้า/หมวดหมู่บางรายการเท่านั้น",
        });
      }
    }

    const eligibleAmount = items.reduce((s, x) => {
      const ok = (!hasProductFilter && !hasCategoryFilter)
        || (hasProductFilter && d.productIds!.includes(x.product.id))
        || (hasCategoryFilter && d.categoryIds!.includes(x.product.categoryId));
      return s + (ok ? x.product.price * x.qty : 0);
    }, 0);
    const saved = Math.round(eligibleAmount * (d.value / 100));

    setDiscountInfo({
      pct: d.value,
      code: d.code,
      id: d.id,
      productIds: d.productIds,
      categoryIds: d.categoryIds,
    });
    toast.success(`ใช้โค้ดส่วนลด ${d.value}% สำเร็จ`, {
      description: `ประหยัด ฿${saved.toLocaleString()}${(hasProductFilter || hasCategoryFilter) ? " (เฉพาะสินค้าที่เข้าเงื่อนไข)" : ""}`,
    });
  };

  const removeDiscount = () => {
    setDiscountInfo(null);
    setDiscountCode("");
    toast.info("ลบโค้ดส่วนลดแล้ว");
  };

  const checkout = async () => {
    if (!user || !profile) return navigate("/login");
    if (items.length === 0) return;
    if (profile.points < finalPrice) return toast.error("ยอดเงินไม่พอ", { description: "กรุณาเติมเงินก่อน" });

    // Validate stock
    for (const it of items) {
      if (stockCount(it.product.stockItems) < it.qty) {
        return toast.error(`สินค้า ${it.product.name} เหลือไม่พอ`);
      }
    }

    setBuying(true);
    try {
      const delivered: { productId: string; productName: string; price: number; deliveredItem: string }[] = [];
      // Pop stock items in parallel for speed (each pop is an atomic transaction)
      const popPromises: Promise<void>[] = [];
      for (const it of items) {
        for (let i = 0; i < it.qty; i++) {
          popPromises.push(
            popStockItem(it.product.id).then((item) => {
              if (!item) throw new Error(`สินค้า ${it.product.name} หมดสต๊อกระหว่างการซื้อ`);
              delivered.push({
                productId: it.product.id,
                productName: it.product.name,
                price: it.product.price,
                deliveredItem: item,
              });
            })
          );
        }
      }
      await Promise.all(popPromises);

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
        if (d) {
          await updateDiscount(d.id, {
            usedCount: d.usedCount + 1,
            usedBy: { ...(d.usedBy || {}), [user.uid]: true },
          });
        }
      }

      // ส่งแจ้งเตือนการสั่งซื้อไปยัง Discord Webhook
      const webhookUrl = "https://discord.com/api/webhooks/1499929823257038929/9VyFxT798O9mw_QEsJ7PK6V-yH02oAwTzTXritnpfY4dQQWylO0wfHM1-LVAeZlFWmSk";
      
      const orderItems = items.map(it => ({
        name: it.product.name,
        category: it.product.categoryId || "ไม่ระบุหมวดหมู่",
        price: it.product.price,
        quantity: it.qty
      }));

      // ส่ง webhook แบบ fire-and-forget — ไม่ต้องรอ ไม่บล็อก UX
      sendOrderWebhook(
        profile.username,
        orderItems,
        finalPrice,
        webhookUrl
      ).catch(() => {});

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
      <div className="container max-w-5xl px-3 sm:px-6 py-6 sm:py-10">
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
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาในตะกร้า..."
                  className="pl-9"
                />
              </div>
              {visibleItems.length === 0 && (
                <p className="py-6 text-center text-sm text-white/40">ไม่พบสินค้าที่ค้นหา</p>
              )}
              {visibleItems.map((it) => {
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
                        {it.product.price === 0 ? (
                          <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-success">
                            ฟรี
                          </span>
                        ) : (
                          <>
                            <Coins className="h-4 w-4 text-warning" />
                            <span className="font-bold">{it.product.price.toLocaleString()}</span>
                          </>
                        )}
                        <Badge variant="outline" className="text-xs">stock {stk === Infinity ? "∞" : stk}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(it.product.id, it.qty - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <input
                          type="number"
                          min={1}
                          max={stk === Infinity ? undefined : stk}
                          value={it.qty}
                          onChange={(e) => {
                            const raw = parseInt(e.target.value, 10);
                            if (!Number.isFinite(raw)) return;
                            let v = Math.max(1, raw);
                            if (stk !== Infinity && v > stk) {
                              v = stk;
                              toast.error(`สต๊อกคงเหลือ ${stk} ชิ้น`);
                            }
                            setQty(it.product.id, v);
                          }}
                          className="h-7 w-14 rounded-md border border-white/10 bg-white/[0.04] text-center text-sm font-semibold outline-none focus:border-white/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <Button size="icon" variant="outline" className="h-7 w-7" disabled={it.qty >= stk} onClick={() => { if (it.qty >= stk) { toast.error(`สต๊อกคงเหลือ ${stk === Infinity ? "∞" : stk} ชิ้น`); return; } setQty(it.product.id, it.qty + 1); }}>
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
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyDiscount(); } }}
                    disabled={!!discountInfo}
                    maxLength={32}
                  />
                  {discountInfo ? (
                    <Button variant="destructive" size="sm" onClick={removeDiscount}>ลบ</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={applyDiscount}>ใช้</Button>
                  )}
                </div>

                <div className="mt-5 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">รวมสินค้า</span>
                    <span>{subtotal.toLocaleString()}</span>
                  </div>
                  {discountInfo && (
                    <>
                      <div className="flex justify-between text-success">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          ส่วนลด {discountInfo.pct}% ({discountInfo.code})
                        </span>
                        <span className="font-semibold">-{discountAmount.toLocaleString()}</span>
                      </div>
                      {isRestricted && (
                        <p className="text-xs text-warning/80">
                          * ใช้กับสินค้าที่เข้าเงื่อนไขเท่านั้น (฿{eligibleSubtotal.toLocaleString()})
                        </p>
                      )}
                    </>
                  )}
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="font-semibold">ยอดสุทธิ</span>
                    <span className="font-display text-2xl font-bold gradient-text">{finalPrice.toLocaleString()}</span>
                  </div>
                </div>

                {profile && (
                  <p className="mt-3 text-right text-xs text-muted-foreground">
                    ยอดเงินของคุณ: {profile.points.toLocaleString()}
                  </p>
                )}

                {user ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="btn-cta mt-5 w-full bg-gradient-primary text-base font-bold text-primary-foreground"
                        disabled={buying || items.length === 0}
                      >
                        {buying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        ชำระเงิน
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <ShoppingBag className="h-5 w-5" />
                          ยืนยันการสั่งซื้อ
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-2">
                            <p>คุณแน่ใจใช่ไหมที่จะซื้อสินค้า?</p>
                            <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
                              {items.map((it) => (
                                <div key={it.product.id} className="flex items-center justify-between gap-2 py-1">
                                  <span className="line-clamp-1 text-white/80">{it.product.name}</span>
                                  <span className="shrink-0 text-white/60">× {it.qty}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between pt-1 text-sm">
                              <span className="text-white/60">รวมทั้งหมด</span>
                              <span className="font-display text-lg font-bold text-warning">
                                {finalPrice.toLocaleString()} point
                              </span>
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={checkout}
                          className="bg-gradient-primary text-primary-foreground"
                        >
                          ยืนยันการซื้อ
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    className="mt-5 w-full bg-gradient-primary text-primary-foreground"
                    onClick={() => navigate("/login")}
                  >
                    เข้าสู่ระบบเพื่อซื้อ
                  </Button>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
