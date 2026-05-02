import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Category, Product, stockCount } from "@/lib/store";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { ArrowLeft, Coins, Package, ShoppingCart } from "lucide-react";

import { FavoriteButton } from "@/components/FavoriteButton";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (!id) return;
    const off = onValue(ref(db, `products/${id}`), (snap) => {
      const p = snap.val() as Product | null;
      setProduct(p);
      if (p?.categoryId) {
        onValue(ref(db, `categories/${p.categoryId}`), (cs) => setCategory(cs.val() ?? null), { onlyOnce: true });
      }
    });
    return () => off();
  }, [id]);

  if (!product) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 text-center text-muted-foreground">กำลังโหลด...</div>
      </div>
    );
  }

  const stk = stockCount(product.stockItems);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-5xl py-10">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4" /> กลับ
        </Button>

        <div className="grid gap-8 md:grid-cols-2">
          <Card className="card-elegant overflow-hidden p-0">
            <div className="aspect-square bg-secondary/30">
              {product.image ? (
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center"><Package className="h-20 w-20 text-muted-foreground" /></div>
              )}
            </div>
          </Card>

          <div>
            {category && (
              <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
                {category.icon} {category.name}
              </Link>
            )}
            <h1 className="mt-2 font-display text-4xl font-bold">{product.name}</h1>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-2 text-warning">
                <Coins className="h-6 w-6" />
                <span className="font-display text-3xl font-bold">{product.price.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">point</span>
              </div>
              <Badge variant={stk > 0 ? "outline" : "destructive"}>
                {stk > 0 ? `เหลือ ${stk} ชิ้น` : "หมดสต๊อก"}
              </Badge>
            </div>

            <Card className="card-elegant mt-6 p-5">
              <h3 className="mb-2 font-semibold">รายละเอียดสินค้า</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {product.description || "ไม่มีรายละเอียด"}
              </p>
            </Card>

            <div className="mt-6 flex gap-3">
              <Button
                size="lg"
                className="flex-1 bg-gradient-primary text-primary-foreground"
                disabled={stk <= 0}
                onClick={() => {
                  add(product);
                  toast.success("เพิ่มลงตะกร้าแล้ว");
                }}
              >
                <ShoppingCart className="h-5 w-5" /> ใส่ตะกร้า
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={stk <= 0}
                onClick={() => {
                  add(product);
                  navigate("/cart");
                }}
              >
                ซื้อเลย
              </Button>
            </div>
            <div className="mt-3">
              <FavoriteButton productId={product.id} variant="full" className="w-full" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
