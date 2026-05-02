import { useEffect, useRef, useState } from "react";
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
import { ChevronLeft, ChevronRight, Coins, Eye, Package, Search, ShoppingCart, Sparkles } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import Landing from "./Landing";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Footer } from "@/components/Footer";
import { FavoriteButton } from "@/components/FavoriteButton";

export default function Index() {
  const { user, loading } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("default");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollByCard = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-product-card]");
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  useEffect(() => {
    const unsubC = onValue(ref(db, "categories"), (snap) => {
      setCategories(snap.exists() ? Object.values(snap.val()) : []);
    });
    const unsubP = onValue(ref(db, "products"), (snap) => {
      setProducts(snap.exists() ? Object.values(snap.val()) : []);
    });
    return () => { unsubC(); unsubP(); };
  }, []);

  const byCat = activeCat === "all" ? products : products.filter((p) => p.categoryId === activeCat);
  const q = search.trim().toLowerCase();
  const searched = q
    ? byCat.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(q))
    : byCat;
  const sorted = [...searched].sort((a, b) => {
    switch (sortBy) {
      case "price-asc": return a.price - b.price;
      case "price-desc": return b.price - a.price;
      case "name-asc": return a.name.localeCompare(b.name);
      case "name-desc": return b.name.localeCompare(a.name);
      case "stock-desc": return stockCount(b.stockItems) - stockCount(a.stockItems);
      default: return 0;
    }
  });
  const filteredAll = sorted;
  const filtered = filteredAll.slice(0, 6);

  const handleAdd = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    e.preventDefault();
    if (stockCount(p.stockItems) <= 0) return toast.error("สินค้าหมดสต๊อก");
    add(p);
    toast.success(`เพิ่ม "${p.name}" ลงตะกร้าแล้ว`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!user) return <Landing />;

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.15),transparent_70%)] blur-3xl" />
          <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.12),transparent_70%)] blur-3xl" />
        </div>
        <div className="container relative py-20 md:py-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium tracking-[0.2em] text-white/60 backdrop-blur-md">
            <Sparkles className="h-3 w-3" /> PREMIUM DIGITAL STORE
          </div>
          <h1 className="mt-6 font-display text-5xl md:text-7xl font-extrabold leading-[0.95] tracking-tight">
            <span className="block bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">FILE 968</span>
            <span className="mt-1 block bg-gradient-to-b from-white/80 to-white/20 bg-clip-text text-transparent">SHOP</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/50">
            ประสบการณ์ช้อปดิจิทัลระดับพรีเมี่ยม — เติมเงินทันที ใช้ Point ซื้อสินค้าได้เลย รองรับ TrueWallet และพร้อมเพย์
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate("/topup")}>
              เติมเงินเลย
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/orders")}>
              ประวัติการซื้อ
            </Button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-12">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="font-display text-3xl font-bold">สินค้าทั้งหมด</h2>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:max-w-xl">
            <div className="relative w-full sm:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อสินค้า..."
                className="pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="เรียงลำดับ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">ค่าเริ่มต้น</SelectItem>
                <SelectItem value="price-asc">ราคา: น้อย → มาก</SelectItem>
                <SelectItem value="price-desc">ราคา: มาก → น้อย</SelectItem>
                <SelectItem value="name-asc">ชื่อ: A → Z</SelectItem>
                <SelectItem value="name-desc">ชื่อ: Z → A</SelectItem>
                <SelectItem value="stock-desc">สต๊อกคงเหลือมากสุด</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCat("all")}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition-all duration-300 ${
              activeCat === "all"
                ? "border-transparent bg-white text-black shadow-[0_8px_30px_rgba(255,255,255,0.15)]"
                : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            ทั้งหมด
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`rounded-full border px-5 py-2 text-sm font-medium transition-all duration-300 ${
                activeCat === c.id
                  ? "border-transparent bg-white text-black shadow-[0_8px_30px_rgba(255,255,255,0.15)]"
                  : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card className="card-elegant flex flex-col items-center gap-3 p-16 text-center">
            <Package className="h-12 w-12 text-white/30" />
            <p className="text-white/50">ยังไม่มีสินค้าในหมวดนี้</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => {
              const stk = stockCount(p.stockItems);
              return (
                <Link to={`/product/${p.id}`} key={p.id}>
                  <Card className="card-elegant group cursor-pointer overflow-hidden p-0">
                    <div className="relative aspect-square overflow-hidden bg-white/[0.02]">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><Package className="h-12 w-12 text-white/20" /></div>
                      )}
                      <FavoriteButton productId={p.id} stopPropagation className="absolute right-2 top-2" />
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-1 font-semibold text-white">{p.name}</h3>
                      <p className="line-clamp-2 mt-1 text-xs text-white/50">{p.description || "-"}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-warning">
                          <Coins className="h-4 w-4" />
                          <span className="font-bold">{p.price.toLocaleString()}</span>
                        </div>
                        <Badge variant={stk > 0 ? "outline" : "destructive"} className="text-xs">
                          {stk > 0 ? `stock ${stk}` : "หมด"}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/product/${p.id}`); }}
                        >
                          <Eye className="h-4 w-4" /> ดูรายละเอียด
                        </Button>
                        <Button
                          size="sm"
                          disabled={stk <= 0}
                          onClick={(e) => handleAdd(e, p)}
                        >
                          <ShoppingCart className="h-4 w-4" /> ใส่ตะกร้า
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
        {filteredAll.length > 6 && (
          <p className="mt-6 text-center text-xs text-white/40">
            แสดง 6 จาก {filteredAll.length} รายการ — ใช้ช่องค้นหาเพื่อหารายการเพิ่มเติม
          </p>
        )}
      </section>
      <Footer />
    </div>
  );
}
