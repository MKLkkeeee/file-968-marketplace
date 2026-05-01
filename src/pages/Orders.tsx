import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Order } from "@/lib/store";
import { Coins, History, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const off = onValue(ref(db, "orders"), (snap) => {
      if (!snap.exists()) return setOrders([]);
      const all = Object.values(snap.val()) as Order[];
      setOrders(all.filter((o) => o.userId === user?.uid).sort((a, b) => b.createdAt - a.createdAt));
    });
    return () => off();
  }, [user]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("คัดลอกแล้ว");
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-4xl py-10">
        <h1 className="font-display text-4xl font-bold flex items-center gap-3">
          <History className="h-8 w-8" /> ประวัติการซื้อ
        </h1>
        <p className="mt-1 text-muted-foreground">รายการที่คุณเคยซื้อทั้งหมด</p>

        {orders.length === 0 ? (
          <Card className="card-elegant mt-8 flex flex-col items-center gap-3 p-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">ยังไม่มีคำสั่งซื้อ</p>
          </Card>
        ) : (
          <div className="mt-8 space-y-4">
            {orders.map((o) => (
              <Card key={o.id} className="card-elegant p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Order #{o.id.slice(-8)}</p>
                    <p className="text-sm">{new Date(o.createdAt).toLocaleString("th-TH")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">ยอดสุทธิ</p>
                    <p className="font-display text-xl font-bold gradient-text flex items-center gap-1 justify-end">
                      <Coins className="h-4 w-4" />{o.finalPrice.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {(o.items || []).map((it, i) => (
                    <div key={i} className="rounded-lg bg-secondary/40 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{it.productName}</span>
                        <Badge variant="outline">{it.price} point</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <code className="flex-1 break-all rounded bg-background/60 px-3 py-2 text-xs">
                          {it.deliveredItem}
                        </code>
                        <Button size="sm" variant="outline" onClick={() => copy(it.deliveredItem)}>
                          คัดลอก
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {o.discountCode && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    ใช้โค้ด: <span className="font-mono font-semibold">{o.discountCode}</span> ({o.discountPct}% off)
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
