import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Category, Product, stockCount } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Coins, Package, ShoppingCart, Sparkles } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import Landing from "./Landing";

export default function Index() {
  const { user, loading } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");

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

  const handleAdd = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    e.preventDefault();
    if (stockCount(p.stockItems) <= 0) return toast.error("สินค้าหมดสต๊อก");
    add(p);
    toast.success(`เพิ่ม "${p.name}" ลงตะกร้าแล้ว`);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-glow" />
        <div className="container relative py-20 md:py-28">
          <Badge className="mb-6 bg-primary/15 text-primary border-primary/30">
            <Sparkles className="h-3 w-3" /> ONLINE
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
            {filtered.map((p) => {
              const stk = stockCount(p.stockItems);
              return (
                <Link to={`/product/${p.id}`} key={p.id}>
                  <Card className="card-elegant group cursor-pointer overflow-hidden p-0 transition-smooth hover:-translate-y-1 hover:shadow-elegant">
                    <div className="aspect-square overflow-hidden bg-secondary/30">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-smooth group-hover:scale-110" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><Package className="h-12 w-12 text-muted-foreground" /></div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-1 font-semibold">{p.name}</h3>
                      <p className="line-clamp-2 mt-1 text-xs text-muted-foreground">{p.description || "-"}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-warning">
                          <Coins className="h-4 w-4" />
                          <span className="font-bold">{p.price.toLocaleString()}</span>
                        </div>
                        <Badge variant={stk > 0 ? "outline" : "destructive"} className="text-xs">
                          {stk > 0 ? `stock ${stk}` : "หมด"}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        className="mt-3 w-full bg-gradient-primary text-primary-foreground"
                        disabled={stk <= 0}
                        onClick={(e) => handleAdd(e, p)}
                      >
                        <ShoppingCart className="h-4 w-4" /> ใส่ตะกร้า
                      </Button>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
