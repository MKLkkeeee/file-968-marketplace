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
import { adjustPoints } from "@/lib/store";
import { db, ADMIN_SECRET } from "@/lib/firebase";
import {
  Category, DiscountCode, Product, Topup, Order, stockCount,
  createCategory, createDiscount, createProduct, deleteCategory,
  deleteDiscount, deleteProduct, setUserRole, updateCategory,
  updateDiscount, updateProduct,
} from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Lock, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { sendRestockWebhook } from "@/lib/discord";
import { motion } from "framer-motion";
import { Paginator, usePaged } from "@/components/Paginator";
import { Search } from "lucide-react";

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
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const [topupSearch, setTopupSearch] = useState("");
  const [topupPage, setTopupPage] = useState(1);
  const [pointInputs, setPointInputs] = useState<Record<string, string>>({});

  const handleAddPoint = async (uid: string) => {
    const amount = Number(pointInputs[uid]);
    
    if (!amount || amount <= 0) {
      toast.error("กรุณาระบุจำนวน Point");
      return;
    }
    
    try {
      await adjustPoints(uid, amount);
      toast.success(`เพิ่ม ${amount} Point สำเร็จ`);
      setPointInputs((prev) => ({
        ...prev,
        [uid]: "",
      }));
    } catch {
      toast.error("เพิ่ม Point ไม่สำเร็จ");
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
        className="container py-10"
      >
        <h1 className="font-display text-4xl font-bold">หน้าผู้ดูแลระบบ</h1>
        <p className="mt-1 text-muted-foreground">จัดการข้อมูลระบบ</p>

        <Tabs defaultValue="products" className="mt-8">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="products">สินค้า</TabsTrigger>
            <TabsTrigger value="categories">หมวดหมู่</TabsTrigger>
            <TabsTrigger value="discounts">โค้ด</TabsTrigger>
            <TabsTrigger value="users">ผู้ใช้</TabsTrigger>
            <TabsTrigger value="orders">คำสั่งซื้อ</TabsTrigger>
            <TabsTrigger value="topups">เติมเงิน</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Card className="card-elegant p-6">
                <ProductManager categories={categories} products={products} />
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="categories">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Card className="card-elegant p-6">
                <CategoryManager categories={categories} />
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="discounts">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Card className="card-elegant p-6">
                <DiscountManager discounts={discounts} />
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="users">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Card className="card-elegant p-6">
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
                  handleAddPoint={handleAddPoint}
                />
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="orders">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Card className="card-elegant p-6">
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
              <Card className="card-elegant p-6">
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

  const submit = async () => {
    if (!name.trim()) return;
    if (edit) await updateCategory(edit.id, { name, icon });
    else await createCategory({ name, icon });
    toast.success("บันทึกข้อมูลสำเร็จ");
    setOpen(false); setName(""); setIcon(""); setEdit(null);
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold">หมวดหมู่ ({categories.length})</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEdit(null); setName(""); setIcon(""); }} className="bg-gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4" />เพิ่มหมวดหมู่
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit ? "แก้ไข" : "เพิ่ม"}หมวดหมู่</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>ไอคอน</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} /></div>
              <div><Label>ชื่อ</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {categories.map((c) => (
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
    </>
  );
}

function ProductManager({ categories, products }: { categories: Category[]; products: Product[] }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: 0, image: "", categoryId: "", stockItems: "" });

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
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold">สินค้า ({products.length})</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEdit(null); reset(); }} className="bg-gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4" />เพิ่มสินค้า
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
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
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  จำนวนปัจจุบัน: {stockCount(form.stockItems)}
                </p>
              </div>
            </div>
            <DialogFooter><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead></TableHead><TableHead>ชื่อ</TableHead><TableHead>หมวด</TableHead><TableHead>ราคา</TableHead><TableHead>Stock</TableHead><TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {products.map((p) => {
            const cat = categories.find((c) => c.id === p.categoryId);
            const stk = stockCount(p.stockItems);
            return (
              <TableRow key={p.id}>
                <TableCell>{p.image && <img src={p.image} className="h-10 w-10 rounded object-cover" />}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{cat ? `${cat.icon} ${cat.name}` : "-"}</TableCell>
                <TableCell>{p.price}</TableCell>
                <TableCell>
                  <Badge variant={stk > 0 ? "outline" : "destructive"}>{stk}</Badge>
                </TableCell>
                <TableCell>
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
    </>
  );
}

function DiscountManager({ discounts }: { discounts: DiscountCode[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", type: "discount" as "discount" | "point", value: 10, maxUses: 100, active: true });

  const submit = async () => {
    if (!form.code.trim()) {
      toast.error("กรุณาระบุโค้ด");
      return;
    }
    await createDiscount(form);
    toast.success("บันทึกข้อมูลสำเร็จ");
    setOpen(false); 
    setForm({ code: "", type: "discount", value: 10, maxUses: 100, active: true });
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold">จัดการโค้ด</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4" />เพิ่มโค้ด</Button>
          </DialogTrigger>
          <DialogContent>
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
            </div>
            <DialogFooter><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>โค้ด</TableHead><TableHead>ประเภท</TableHead><TableHead>ค่า</TableHead><TableHead>การใช้งาน</TableHead><TableHead>สถานะ</TableHead><TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {discounts.map((d) => (
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
    </>
  );
}
