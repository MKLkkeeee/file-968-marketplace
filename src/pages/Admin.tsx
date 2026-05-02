import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { onValue, ref } from "firebase/database";
import { sendPasswordResetEmail } from "firebase/auth";
import { adjustPoints } from "@/lib/store";
import { db, ADMIN_SECRET, auth } from "@/lib/firebase";
import {
  Category, DiscountCode, Product, Topup, Order, WelcomePopupConfig, stockCount,
  createCategory, createDiscount, createProduct, deleteCategory,
  deleteDiscount, deleteProduct, setUserRole, updateCategory,
  updateDiscount, updateProduct,
  getWelcomePopup, saveWelcomePopup,
} from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Lock, Megaphone, Pencil, Plus, Shield, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendRestockWebhook } from "@/lib/discord";
import { motion } from "framer-motion";
import { Paginator, usePaged } from "@/components/Paginator";
import { Search, Eye } from "lucide-react";

export default function Admin() {
  const { profile } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [secret, setSecret] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  // welcome popup is loaded inside its own manager
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const [topupSearch, setTopupSearch] = useState("");
  const [topupPage, setTopupPage] = useState(1);
  const [pointInputs, setPointInputs] = useState<Record<string, string>>({});

  const handleAdjustPoint = async (uid: string, mode: "add" | "remove") => {
    const amount = Number(pointInputs[uid]);
    
    if (!amount || amount <= 0) {
      toast.error("กรุณาระบุจำนวน Point");
      return;
    }

    if (mode === "remove") {
      const target = users.find((u) => u.uid === uid);
      const current = target?.points ?? 0;
      if (amount > current) {
        toast.error("ลบไม่สำเร็จ", {
          description: `ผู้ใช้มีเพียง ${current.toLocaleString()} Point ไม่สามารถลบ ${amount.toLocaleString()} ได้`,
        });
        return;
      }
    }
    
    try {
      const delta = mode === "add" ? amount : -amount;
      await adjustPoints(uid, delta);
      toast.success(mode === "add" ? `เพิ่ม ${amount} Point สำเร็จ` : `ลบ ${amount} Point สำเร็จ`);
      setPointInputs((prev) => ({
        ...prev,
        [uid]: "",
      }));
    } catch {
      toast.error("ดำเนินการไม่สำเร็จ");
    }
  };

  useEffect(() => {
    const off1 = onValue(ref(db, "categories"), (s) => setCategories(s.exists() ? Object.values(s.val()) : []));
    const off2 = onValue(ref(db, "products"), (s) => setProducts(s.exists() ? Object.values(s.val()) : []));
    const off3 = onValue(ref(db, "discounts"), (s) => setDiscounts(s.exists() ? Object.values(s.val()) : []));
    const off4 = onValue(ref(db, "users"), (s) => setUsers(s.exists() ? Object.values(s.val()) : []));
    const off5 = onValue(ref(db, "orders"), (s) => setOrders(s.exists() ? Object.values(s.val()) : []));
    const off6 = onValue(ref(db, "topups"), (s) => setTopups(s.exists() ? Object.values(s.val()) : []));
    return () => { off1(); off2(); off3(); off4(); off5(); off6(); };
  }, []);

  if (!unlocked) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="container flex min-h-[calc(100vh-4rem)] max-w-md items-center"
        >
          <Card className="card-elegant w-full p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold">หน้าผู้ดูแลระบบ</h1>
                <p className="text-sm text-muted-foreground">กรุณายืนยันรหัสลับ</p>
              </div>
            </div>
            <Label>รหัสลับแอดมิน</Label>
            <div className="mt-2 flex gap-2">
              <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="••••••••" />
              <Button
                onClick={() => {
                  if (secret === ADMIN_SECRET) {
                    setUnlocked(true);
                    toast.success("ปลดล็อกสำเร็จ");
                  } else toast.error("รหัสไม่ถูกต้อง");
                }}
              >
                <Lock className="h-4 w-4" />ปลดล็อก
              </Button>
            </div>
            {!profile || profile.role !== "admin" ? (
              <p className="mt-4 text-xs text-muted-foreground">
                บัญชีคุณต้องมีสิทธิ์ admin
              </p>
            ) : null}
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="container px-3 sm:px-6 py-6 sm:py-10"
      >
        <h1 className="font-display text-2xl sm:text-4xl font-bold">หน้าผู้ดูแลระบบ</h1>
        <p className="mt-1 text-sm sm:text-base text-muted-foreground">จัดการข้อมูลระบบ</p>

        <Tabs defaultValue="products" className="mt-5 sm:mt-8">
          <div className="-mx-3 sm:mx-0 overflow-x-auto scrollbar-hide">
            <TabsList className="inline-flex w-max min-w-full px-3 sm:px-0 sm:flex sm:flex-wrap">
              <TabsTrigger value="products">สินค้า</TabsTrigger>
              <TabsTrigger value="categories">หมวดหมู่</TabsTrigger>
              <TabsTrigger value="discounts">โค้ด</TabsTrigger>
              <TabsTrigger value="users">ผู้ใช้</TabsTrigger>
              <TabsTrigger value="orders">คำสั่งซื้อ</TabsTrigger>
              <TabsTrigger value="topups">เติมเงิน</TabsTrigger>
              <TabsTrigger value="popup">ป๊อปอัพ</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="products">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Card className="card-elegant p-3 sm:p-6">
                <ProductManager categories={categories} products={products} />
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="categories">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Card className="card-elegant p-3 sm:p-6">
                <CategoryManager categories={categories} />
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="discounts">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Card className="card-elegant p-3 sm:p-6">
                <DiscountManager discounts={discounts} products={products} categories={categories} users={users} />
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="users">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Card className="card-elegant p-3 sm:p-6">
                <div className="mb-4 relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    placeholder="ค้นหา username / email / uid"
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                    className="pl-9"
                  />
                </div>
                <UserTable
                  users={users}
                  search={userSearch}
                  page={userPage}
                  setPage={setUserPage}
                  pointInputs={pointInputs}
                  setPointInputs={setPointInputs}
                  handleAdjustPoint={handleAdjustPoint}
                />
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="orders">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Card className="card-elegant p-3 sm:p-6">
                <div className="mb-4 relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    placeholder="ค้นหา ผู้ซื้อ / โค้ด / สินค้า"
                    value={orderSearch}
                    onChange={(e) => { setOrderSearch(e.target.value); setOrderPage(1); }}
                    className="pl-9"
                  />
                </div>
                <OrderTable orders={orders} search={orderSearch} page={orderPage} setPage={setOrderPage} />
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="topups">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Card className="card-elegant p-3 sm:p-6">
                <div className="mb-4 relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    placeholder="ค้นหา ผู้ใช้ / Ref / วิธี"
                    value={topupSearch}
                    onChange={(e) => { setTopupSearch(e.target.value); setTopupPage(1); }}
                    className="pl-9"
                  />
                </div>
                <TopupTable topups={topups} search={topupSearch} page={topupPage} setPage={setTopupPage} />
              </Card>
            </motion.div>
          </TabsContent>
          <TabsContent value="popup">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Card className="card-elegant p-3 sm:p-6">
                <WelcomePopupManager />
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

function CategoryManager({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const submit = async () => {
    if (!name.trim()) return;
    if (edit) await updateCategory(edit.id, { name, icon });
    else await createCategory({ name, icon });
    toast.success("บันทึกข้อมูลสำเร็จ");
    setOpen(false); setName(""); setIcon(""); setEdit(null);
  };

  const filtered = categories.filter((c) =>
    `${c.name} ${c.icon}`.toLowerCase().includes(search.toLowerCase())
  );
  const { slice, totalPages, page: p } = usePaged(filtered, page, 10);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-display text-xl font-semibold">หมวดหมู่ ({categories.length})</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEdit(null); setName(""); setIcon(""); }} className="bg-gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4" />เพิ่มหมวดหมู่
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{edit ? "แก้ไข" : "เพิ่ม"}หมวดหมู่</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>ไอคอน</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} /></div>
              <div><Label>ชื่อ</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="ค้นหาหมวดหมู่..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {slice.map((c) => (
          <Card key={c.id} className="flex items-center justify-between bg-secondary/40 p-4">
            <span className="font-medium">{c.icon} {c.name}</span>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => { setEdit(c); setName(c.name); setIcon(c.icon); setOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => deleteCategory(c.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Paginator page={p} totalPages={totalPages} onChange={setPage} />
    </>
  );
}

function ProductManager({ categories, products }: { categories: Category[]; products: Product[] }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: 0, image: "", categoryId: "", stockItems: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const reset = () => setForm({ name: "", description: "", price: 0, image: "", categoryId: "", stockItems: "" });

  const submit = async () => {
    if (!form.name || !form.categoryId) {
      toast.error("กรุณากรอกชื่อและหมวดหมู่");
      return;
    }

    const oldStock = edit ? stockCount(edit.stockItems || "") : 0;
    const newStock = stockCount(form.stockItems || "");
    const cat = categories.find(c => c.id === form.categoryId);
    const categoryName = cat ? cat.name : form.categoryId;

    if (edit) {
      await updateProduct(edit.id, form);
    } else {
      await createProduct(form);
    }

    if (newStock > oldStock) {
      const webhookUrl = "https://discord.com/api/webhooks/1499925619058675782/bIqRUbnJqaVtmU1-Fh0q1dcSc3zOd-VpHDO_fPVAT5cK_tHYdS2RYbwaXiPDbZIiHhLz";
      await sendRestockWebhook(
        form.name,
        oldStock,
        newStock,
        categoryName,
        form.image || "",
        webhookUrl
      );
    }

    toast.success("บันทึกข้อมูลสำเร็จ");
    setOpen(false); 
    reset(); 
    setEdit(null);
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-display text-xl font-semibold">สินค้า ({products.length})</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEdit(null); reset(); }} className="bg-gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4" />เพิ่มสินค้า
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{edit ? "แก้ไข" : "เพิ่ม"}สินค้า</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>ชื่อสินค้า</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>รายละเอียดสินค้า</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>ราคา</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
                <div>
                  <Label>หมวดหมู่</Label>
                  <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                    <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>URL รูปภาพ</Label><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></div>
              <div>
                <Label>สต๊อกสินค้า</Label>
                <Textarea
                  value={form.stockItems}
                  onChange={(e) => setForm({ ...form, stockItems: e.target.value })}
                  rows={6}
                  className="font-mono text-sm"
                  placeholder={`1 บรรทัด = 1 ชิ้น เช่น license key หรือลิงก์\n\nหรือพิมพ์รูปแบบ "ค่า = inf" เพื่อทำสต๊อกไม่จำกัด เช่น\nhttps://lovable.dev = inf`}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  จำนวนปัจจุบัน: {stockCount(form.stockItems) === Infinity ? "∞ (ไม่จำกัด)" : stockCount(form.stockItems)}
                </p>
              </div>
            </div>
            <DialogFooter><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="ค้นหาสินค้า..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>
      {(() => {
        const filtered = products.filter((p) =>
          `${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase())
        );
        const { slice, totalPages, page: pg } = usePaged(filtered, page, 10);
        return (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader><TableRow>
                  <TableHead></TableHead><TableHead>ชื่อ</TableHead><TableHead>หมวด</TableHead><TableHead>ราคา</TableHead><TableHead>Stock</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {slice.map((p) => {
                    const cat = categories.find((c) => c.id === p.categoryId);
                    const stk = stockCount(p.stockItems);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{p.image && <img src={p.image} className="h-10 w-10 rounded object-cover" />}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{cat ? `${cat.icon} ${cat.name}` : "-"}</TableCell>
                        <TableCell>{p.price}</TableCell>
                        <TableCell>
                          <Badge variant={stk > 0 ? "outline" : "destructive"}>{stk === Infinity ? "∞" : stk}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button asChild size="icon" variant="ghost" title="ดูรายละเอียด">
                            <a href={`/product/${p.id}`} target="_blank" rel="noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setEdit(p); setForm({ name: p.name, description: p.description, price: p.price, image: p.image, categoryId: p.categoryId, stockItems: p.stockItems || "" }); setOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteProduct(p.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {slice.map((p) => {
                const cat = categories.find((c) => c.id === p.categoryId);
                const stk = stockCount(p.stockItems);
                return (
                  <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 flex gap-3">
                    {p.image ? (
                      <img src={p.image} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-white/5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{cat ? `${cat.icon} ${cat.name}` : "-"}</div>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <span className="font-semibold">{p.price}</span>
                        <Badge variant={stk > 0 ? "outline" : "destructive"} className="text-xs">{stk === Infinity ? "∞" : stk}</Badge>
                      </div>
                      <div className="mt-2 flex gap-1">
                        <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                          <a href={`/product/${p.id}`} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8"
                          onClick={() => { setEdit(p); setForm({ name: p.name, description: p.description, price: p.price, image: p.image, categoryId: p.categoryId, stockItems: p.stockItems || "" }); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteProduct(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Paginator page={pg} totalPages={totalPages} onChange={setPage} />
          </>
        );
      })()}
    </>
  );
}

function DiscountManager({
  discounts, products, categories, users,
}: {
  discounts: DiscountCode[]; products: Product[]; categories: Category[]; users: UserProfile[];
}) {
  const [open, setOpen] = useState(false);
  type Scope = "all" | "categories" | "products";
  type UserScope = "all" | "new" | "specific";
  const [form, setForm] = useState<{
    code: string; type: "discount" | "point"; value: number; maxUses: number; active: boolean;
    scope: Scope; productIds: string[]; categoryIds: string[];
    userScope: UserScope; newUserDays: number; userIds: string[];
  }>({
    code: "", type: "discount", value: 10, maxUses: 100, active: true,
    scope: "all", productIds: [], categoryIds: [],
    userScope: "all", newUserDays: 2, userIds: [],
  });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");

  const submit = async () => {
    if (!form.code.trim()) {
      toast.error("กรุณาระบุโค้ด");
      return;
    }
    if (form.type === "discount") {
      if (form.scope === "categories" && form.categoryIds.length === 0) {
        return toast.error("กรุณาเลือกอย่างน้อย 1 หมวดหมู่");
      }
      if (form.scope === "products" && form.productIds.length === 0) {
        return toast.error("กรุณาเลือกอย่างน้อย 1 สินค้า");
      }
    }
    if (form.type === "point" && form.userScope === "specific" && form.userIds.length === 0) {
      return toast.error("กรุณาเลือกอย่างน้อย 1 ผู้ใช้");
    }
    const payload: any = {
      code: form.code, type: form.type, value: form.value,
      maxUses: form.maxUses, active: form.active,
    };
    if (form.type === "discount") {
      if (form.scope === "categories") payload.categoryIds = form.categoryIds;
      else if (form.scope === "products") payload.productIds = form.productIds;
      // scope === "all" → ไม่ต้องส่ง productIds/categoryIds (= ทุกสินค้า)
    }
    if (form.type === "point") {
      payload.userScope = form.userScope;
      if (form.userScope === "new") payload.newUserDays = form.newUserDays;
      if (form.userScope === "specific") payload.userIds = form.userIds;
    }
    await createDiscount(payload);
    toast.success("บันทึกข้อมูลสำเร็จ");
    setOpen(false); 
    setForm({ code: "", type: "discount", value: 10, maxUses: 100, active: true, scope: "all", productIds: [], categoryIds: [], userScope: "all", newUserDays: 2, userIds: [] });
  };

  const toggleProduct = (id: string) => {
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id) ? f.productIds.filter((x) => x !== id) : [...f.productIds, id],
    }));
  };
  const toggleCategory = (id: string) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id) ? f.categoryIds.filter((x) => x !== id) : [...f.categoryIds, id],
    }));
  };
  const toggleUser = (id: string) => {
    setForm((f) => ({
      ...f,
      userIds: f.userIds.includes(id) ? f.userIds.filter((x) => x !== id) : [...f.userIds, id],
    }));
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-display text-xl font-semibold">จัดการโค้ด</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4" />เพิ่มโค้ด</Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>เพิ่มโค้ดใหม่</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>โค้ด</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
              <div>
                <Label>ประเภท</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">ส่วนลด</SelectItem>
                    <SelectItem value="point">เพิ่ม Point</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>จำนวน</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
                <div><Label>จำกัดสิทธิ์</Label><Input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })} /></div>
              </div>

              {form.type === "discount" && (
                <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div>
                    <Label className="text-sm">เงื่อนไขการใช้งาน</Label>
                    <p className="mt-0.5 text-xs text-white/50">
                      เลือกขอบเขตที่โค้ดนี้สามารถใช้งานได้
                    </p>
                  </div>

                  <div className="grid gap-2">
                    {([
                      { v: "all", label: "ใช้ได้กับทุกสินค้า", desc: "ลดราคาให้ทุกรายการในตะกร้า" },
                      { v: "categories", label: "เฉพาะหมวดหมู่", desc: "เลือกได้หลายหมวดหมู่" },
                      { v: "products", label: "เฉพาะสินค้า", desc: "เลือกสินค้ารายตัว" },
                    ] as { v: Scope; label: string; desc: string }[]).map((opt) => (
                      <label
                        key={opt.v}
                        className={
                          "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors " +
                          (form.scope === opt.v
                            ? "border-primary/60 bg-primary/10"
                            : "border-white/10 hover:bg-white/5")
                        }
                      >
                        <input
                          type="radio"
                          name="discount-scope"
                          checked={form.scope === opt.v}
                          onChange={() => setForm({ ...form, scope: opt.v })}
                          className="mt-1 accent-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-white/50">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {form.scope === "categories" && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <Label className="text-xs text-white/70">เลือกหมวดหมู่ ({form.categoryIds.length})</Label>
                        {form.categoryIds.length > 0 && (
                          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs"
                            onClick={() => setForm((f) => ({ ...f, categoryIds: [] }))}>
                            <X className="h-3 w-3" /> ล้าง
                          </Button>
                        )}
                      </div>
                      <ScrollArea className="h-32 rounded-md border border-white/10 p-2">
                        {categories.length === 0 ? (
                          <p className="py-3 text-center text-xs text-white/40">ยังไม่มีหมวดหมู่</p>
                        ) : (
                          <div className="space-y-1.5">
                            {categories.map((c) => (
                              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5">
                                <Checkbox
                                  checked={form.categoryIds.includes(c.id)}
                                  onCheckedChange={() => toggleCategory(c.id)}
                                />
                                <span className="text-sm">{c.icon} {c.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  )}

                  {form.scope === "products" && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <Label className="text-xs text-white/70">เลือกสินค้า ({form.productIds.length})</Label>
                        {form.productIds.length > 0 && (
                          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs"
                            onClick={() => setForm((f) => ({ ...f, productIds: [] }))}>
                            <X className="h-3 w-3" /> ล้าง
                          </Button>
                        )}
                      </div>
                      <ScrollArea className="h-44 rounded-md border border-white/10 p-2">
                        {products.length === 0 ? (
                          <p className="py-3 text-center text-xs text-white/40">ยังไม่มีสินค้า</p>
                        ) : (
                          <div className="space-y-1.5">
                            {products.map((p) => (
                              <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5">
                                <Checkbox
                                  checked={form.productIds.includes(p.id)}
                                  onCheckedChange={() => toggleProduct(p.id)}
                                />
                                <span className="line-clamp-1 text-sm">{p.name}</span>
                                <span className="ml-auto shrink-0 text-xs text-white/40">{p.price}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}

              {form.type === "point" && (
                <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div>
                    <Label className="text-sm">เงื่อนไขผู้ใช้</Label>
                    <p className="mt-0.5 text-xs text-white/50">
                      เลือกว่าใครใช้โค้ดนี้ได้บ้าง
                    </p>
                  </div>

                  <div className="grid gap-2">
                    {([
                      { v: "all", label: "ใช้ได้ทุกคน", desc: "ผู้ใช้ทุกคนสามารถใช้โค้ดนี้ได้" },
                      { v: "new", label: "ผู้ใช้ใหม่เท่านั้น", desc: "บัญชีที่สร้างไม่เกินจำนวนวันที่กำหนด" },
                      { v: "specific", label: "เฉพาะผู้ใช้ที่เลือก", desc: "ใช้ได้เฉพาะผู้ใช้ที่ระบุ" },
                    ] as { v: UserScope; label: string; desc: string }[]).map((opt) => (
                      <label
                        key={opt.v}
                        className={
                          "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors " +
                          (form.userScope === opt.v
                            ? "border-primary/60 bg-primary/10"
                            : "border-white/10 hover:bg-white/5")
                        }
                      >
                        <input
                          type="radio"
                          name="point-userscope"
                          checked={form.userScope === opt.v}
                          onChange={() => setForm({ ...form, userScope: opt.v })}
                          className="mt-1 accent-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-white/50">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {form.userScope === "new" && (
                    <div>
                      <Label className="text-xs text-white/70">จำนวนวัน (อายุบัญชีไม่เกิน)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.newUserDays}
                        onChange={(e) => setForm({ ...form, newUserDays: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </div>
                  )}

                  {form.userScope === "specific" && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <Label className="text-xs text-white/70">เลือกผู้ใช้ ({form.userIds.length})</Label>
                        {form.userIds.length > 0 && (
                          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs"
                            onClick={() => setForm((f) => ({ ...f, userIds: [] }))}>
                            <X className="h-3 w-3" /> ล้าง
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="ค้นหา username / email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="mb-2 h-8 text-sm"
                      />
                      <ScrollArea className="h-44 rounded-md border border-white/10 p-2">
                        {users.length === 0 ? (
                          <p className="py-3 text-center text-xs text-white/40">ยังไม่มีผู้ใช้</p>
                        ) : (
                          <div className="space-y-1.5">
                            {users
                              .filter((u) => {
                                const q = userSearch.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  (u.username || "").toLowerCase().includes(q) ||
                                  (u.email || "").toLowerCase().includes(q)
                                );
                              })
                              .map((u) => (
                                <label key={u.uid} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-white/5">
                                  <Checkbox
                                    checked={form.userIds.includes(u.uid)}
                                    onCheckedChange={() => toggleUser(u.uid)}
                                  />
                                  <span className="line-clamp-1 text-sm">{u.username}</span>
                                  <span className="ml-auto shrink-0 text-xs text-white/40 line-clamp-1 max-w-[40%]">{u.email}</span>
                                </label>
                              ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="ค้นหาโค้ด / ประเภท..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>
      {(() => {
        const filtered = discounts.filter((d) =>
          `${d.code} ${d.type}`.toLowerCase().includes(search.toLowerCase())
        );
        const { slice, totalPages, page: pg } = usePaged(filtered, page, 10);
        return (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>โค้ด</TableHead><TableHead>ประเภท</TableHead><TableHead>ค่า</TableHead><TableHead>การใช้งาน</TableHead><TableHead>สถานะ</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {slice.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono font-bold">{d.code}</TableCell>
                      <TableCell><Badge variant="outline">{d.type}</Badge></TableCell>
                      <TableCell>{d.value}</TableCell>
                      <TableCell>{d.usedCount}/{d.maxUses}</TableCell>
                      <TableCell><Switch checked={d.active} onCheckedChange={(v) => updateDiscount(d.id, { active: v })} /></TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => deleteDiscount(d.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {slice.map((d) => (
                <div key={d.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono font-bold truncate">{d.code}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">{d.type}</Badge>
                        <span className="text-xs text-muted-foreground">ค่า {d.value}</span>
                        <span className="text-xs text-muted-foreground">• {d.usedCount}/{d.maxUses}</span>
                      </div>
                    </div>
                    <Switch checked={d.active} onCheckedChange={(v) => updateDiscount(d.id, { active: v })} />
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" onClick={() => deleteDiscount(d.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" /> ลบ
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Paginator page={pg} totalPages={totalPages} onChange={setPage} />
          </>
        );
      })()}
    </>
  );
}

function UserTable({
  users, search, page, setPage, pointInputs, setPointInputs, handleAdjustPoint,
}: {
  users: UserProfile[]; search: string; page: number; setPage: (n: number) => void;
  pointInputs: Record<string, string>;
  setPointInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleAdjustPoint: (uid: string, mode: "add" | "remove") => void;
}) {
  const filtered = users.filter((u) =>
    `${u.username} ${u.email} ${u.uid}`.toLowerCase().includes(search.toLowerCase())
  );
  const { slice, totalPages, page: p } = usePaged(filtered, page, 10);

  const handleResetPassword = async (email: string, username: string) => {
    if (!email) {
      toast.error("ผู้ใช้นี้ไม่มีอีเมล");
      return;
    }
    if (!confirm(`ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลของ ${username} (${email}) ?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("ส่งลิงก์รีเซ็ตรหัสผ่านสำเร็จ", {
        description: `ผู้ใช้ ${username} จะได้รับอีเมลที่ ${email}`,
      });
    } catch (e: any) {
      const code = e?.code || "";
      const msg =
        code === "auth/user-not-found"
          ? "ไม่พบบัญชีนี้ใน Firebase Auth"
          : code === "auth/invalid-email"
          ? "อีเมลไม่ถูกต้อง"
          : code === "auth/too-many-requests"
          ? "ส่งคำขอถี่เกินไป กรุณารอสักครู่"
          : e?.message || "เกิดข้อผิดพลาด";
      toast.error("ส่งลิงก์ไม่สำเร็จ", { description: msg });
    }
  };

  return (
    <>
      {/* Desktop / Tablet table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead>Point</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>ปรับ Point</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((u) => (
              <TableRow key={u.uid}>
                <TableCell>
                  <div className="font-medium">{u.username}</div>
                  <div className="text-xs text-muted-foreground lg:hidden truncate max-w-[180px]">{u.email}</div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">{u.email}</TableCell>
                <TableCell>{u.points?.toLocaleString() ?? 0}</TableCell>
                <TableCell><Badge variant={u.role === "admin" ? "default" : "outline"}>{u.role}</Badge></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Input type="number" placeholder="100" className="w-20"
                      value={pointInputs[u.uid] || ""}
                      onChange={(e) => setPointInputs((prev) => ({ ...prev, [u.uid]: e.target.value }))}
                    />
                    <Button size="sm" className="bg-gradient-primary text-primary-foreground"
                      onClick={() => handleAdjustPoint(u.uid, "add")}>เพิ่ม</Button>
                    <Button size="sm" variant="destructive"
                      onClick={() => handleAdjustPoint(u.uid, "remove")}>ลบ</Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline"
                      onClick={() => setUserRole(u.uid, u.role === "admin" ? "user" : "admin")}>
                      {u.role === "admin" ? "ลดเป็น user" : "เลื่อนเป็น admin"}
                    </Button>
                    <Button size="sm" variant="secondary"
                      onClick={() => handleResetPassword(u.email, u.username)}>
                      รีเซ็ตรหัสผ่าน
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {slice.map((u) => (
          <div key={u.uid} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{u.username}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                <div className="mt-1 text-xs text-muted-foreground/70 truncate">UID: {u.uid}</div>
              </div>
              <Badge variant={u.role === "admin" ? "default" : "outline"}>{u.role}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Point</span>
              <span className="font-medium">{u.points?.toLocaleString() ?? 0}</span>
            </div>
            <div className="flex gap-2">
              <Input type="number" placeholder="100" className="flex-1"
                value={pointInputs[u.uid] || ""}
                onChange={(e) => setPointInputs((prev) => ({ ...prev, [u.uid]: e.target.value }))}
              />
              <Button size="sm" className="bg-gradient-primary text-primary-foreground"
                onClick={() => handleAdjustPoint(u.uid, "add")}>เพิ่ม</Button>
              <Button size="sm" variant="destructive"
                onClick={() => handleAdjustPoint(u.uid, "remove")}>ลบ</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="w-full"
                onClick={() => setUserRole(u.uid, u.role === "admin" ? "user" : "admin")}>
                {u.role === "admin" ? "ลดเป็น user" : "ขึ้น admin"}
              </Button>
              <Button size="sm" variant="secondary" className="w-full"
                onClick={() => handleResetPassword(u.email, u.username)}>
                รีเซ็ตรหัสผ่าน
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Paginator page={p} totalPages={totalPages} onChange={setPage} />
    </>
  );
}

function OrderTable({ orders, search, page, setPage }: {
  orders: Order[]; search: string; page: number; setPage: (n: number) => void;
}) {
  const q = search.toLowerCase();
  const filtered = orders
    .filter((o) => {
      if (!q) return true;
      const items = (o.items || []).map((i: any) => i.productName).join(" ");
      return `${o.username} ${o.discountCode} ${items}`.toLowerCase().includes(q);
    })
    .sort((a, b) => b.createdAt - a.createdAt);
  const { slice, totalPages, page: p } = usePaged(filtered, page, 10);
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เวลา</TableHead><TableHead>ผู้ซื้อ</TableHead>
              <TableHead>สินค้า</TableHead><TableHead>โค้ด</TableHead>
              <TableHead>จ่ายจริง</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="text-xs">{new Date(o.createdAt).toLocaleString("th-TH")}</TableCell>
                <TableCell>{o.username}</TableCell>
                <TableCell className="text-xs">
                  {Object.entries(
                    (o.items || []).reduce((acc: any, item: any) => {
                      acc[item.productName] = (acc[item.productName] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([name, qty]: any) => (<div key={name}>{name} x{qty}</div>))}
                </TableCell>
                <TableCell>{o.discountCode || "-"}</TableCell>
                <TableCell className="font-semibold gradient-text">{o.finalPrice}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {slice.map((o) => {
          const itemMap = (o.items || []).reduce((acc: any, item: any) => {
            acc[item.productName] = (acc[item.productName] || 0) + 1;
            return acc;
          }, {});
          return (
            <div key={o.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{o.username}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString("th-TH")}</div>
                </div>
                <div className="font-semibold gradient-text">฿{o.finalPrice}</div>
              </div>
              <div className="text-xs space-y-0.5">
                {Object.entries(itemMap).map(([name, qty]: any) => (
                  <div key={name} className="truncate">• {name} x{qty}</div>
                ))}
              </div>
              {o.discountCode && (
                <Badge variant="outline" className="text-xs">โค้ด {o.discountCode}</Badge>
              )}
            </div>
          );
        })}
      </div>

      <Paginator page={p} totalPages={totalPages} onChange={setPage} />
    </>
  );
}

function TopupTable({ topups, search, page, setPage }: {
  topups: Topup[]; search: string; page: number; setPage: (n: number) => void;
}) {
  const q = search.toLowerCase();
  const filtered = topups
    .filter((t) => !q || `${t.username} ${t.ref} ${t.method}`.toLowerCase().includes(q))
    .sort((a, b) => b.createdAt - a.createdAt);
  const { slice, totalPages, page: p } = usePaged(filtered, page, 10);
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เวลา</TableHead><TableHead>ผู้ใช้</TableHead>
              <TableHead>วิธี</TableHead><TableHead>จำนวน</TableHead><TableHead>Ref</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-xs">{new Date(t.createdAt).toLocaleString("th-TH")}</TableCell>
                <TableCell>{t.username}</TableCell>
                <TableCell><Badge variant="outline">{t.method}</Badge></TableCell>
                <TableCell className="font-semibold">{t.amount}</TableCell>
                <TableCell className="max-w-[200px] truncate text-xs">{t.ref}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {slice.map((t) => (
          <div key={t.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{t.username}</div>
                <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString("th-TH")}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">+{t.amount}</div>
                <Badge variant="outline" className="text-[10px] mt-0.5">{t.method}</Badge>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground/70 break-all line-clamp-2">{t.ref}</div>
          </div>
        ))}
      </div>

      <Paginator page={p} totalPages={totalPages} onChange={setPage} />
    </>
  );
}

function WelcomePopupManager() {
  const [enabled, setEnabled] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const cfg = await getWelcomePopup();
      if (cfg) {
        setEnabled(!!cfg.enabled);
        setImageUrl(cfg.imageUrl || "");
        setText(cfg.text || "");
      }
      setLoading(false);
    })();
  }, []);

  const submit = async () => {
    if (enabled && !imageUrl.trim() && !text.trim()) {
      return toast.error("กรุณากรอกรูปหรือข้อความอย่างน้อย 1 อย่าง");
    }
    setSaving(true);
    try {
      await saveWelcomePopup({ enabled, imageUrl: imageUrl.trim(), text: text.trim() });
      toast.success("บันทึกแล้ว");
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="py-8 text-center text-sm text-white/40">กำลังโหลด...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-warning" />
        <h2 className="font-display text-xl font-semibold">ป๊อปอัพต้อนรับ</h2>
      </div>
      <p className="text-sm text-white/50">
        แสดงป๊อปอัพให้ผู้เข้าชมเห็นเมื่อเปิดเว็บครั้งแรก ผู้ใช้สามารถติ๊ก "ไม่แสดงเป็นเวลา 1 ชั่วโมง" ได้
      </p>

      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <div>
          <p className="text-sm font-medium">เปิดใช้งานป๊อปอัพ</p>
          <p className="text-xs text-white/40">ปิดเพื่อหยุดแสดงป๊อปอัพ</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div>
        <Label>URL รูปภาพ (ด้านบน)</Label>
        <Input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/banner.jpg"
          className="mt-1"
        />
        <p className="mt-1 text-xs text-white/40">วาง URL รูปจากที่อื่น เช่น Imgur, Discord CDN, ฯลฯ</p>
      </div>

      <div>
        <Label>ข้อความ (ด้านล่างรูป)</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="เช่น ยินดีต้อนรับสู่ร้านของเรา! โปรโมชันพิเศษวันนี้..."
          rows={4}
          maxLength={500}
          className="mt-1"
        />
        <p className="mt-1 text-right text-xs text-white/40">{text.length}/500</p>
      </div>

      {(imageUrl || text) && (
        <div>
          <Label>ตัวอย่าง</Label>
          <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="ตัวอย่าง"
                className="max-h-64 w-full object-cover"
                onError={(e) => ((e.currentTarget.style.display = "none"))}
              />
            )}
            {text && <p className="whitespace-pre-wrap p-4 text-sm">{text}</p>}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </div>
  );
}

