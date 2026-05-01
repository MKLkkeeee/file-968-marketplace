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
        <div className="container flex min-h-[calc(100vh-4rem)] max-w-md items-center">
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
                    toast.success("ปลดล็อกหน้าแอดมินสำเร็จ");
                  } else toast.error("รหัสไม่ถูกต้อง");
                }}
              >
                <Lock className="h-4 w-4" />ปลดล็อก
              </Button>
            </div>
            {!profile || profile.role !== "admin" ? (
              <p className="mt-4 text-xs text-muted-foreground">
                * บัญชีคุณต้องมีสิทธิ์ admin ด้วย (ผู้ใช้คนแรกที่สมัครจะเป็น admin อัตโนมัติ)
              </p>
            ) : null}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10">
        <h1 className="font-display text-4xl font-bold">หน้าผู้ดูแลระบบ</h1>
        <p className="mt-1 text-muted-foreground">จัดการสินค้า หมวดหมู่ โค้ด และผู้ใช้งาน</p>

        <Tabs defaultValue="products" className="mt-8">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="products">สินค้า</TabsTrigger>
            <TabsTrigger value="categories">หมวดหมู่</TabsTrigger>
            <TabsTrigger value="discounts">โค้ด</TabsTrigger>
            <TabsTrigger value="users">ผู้ใช้</TabsTrigger>
            <TabsTrigger value="orders">คำสั่งซื้อ</TabsTrigger>
            <TabsTrigger value="topups">เติมเงิน</TabsTrigger>
          </TabsList>

          {/* ============ Products ============ */}
          <TabsContent value="products">
            <Card className="card-elegant p-6">
              <ProductManager categories={categories} products={products} />
            </Card>
          </TabsContent>

          {/* ============ Categories ============ */}
          <TabsContent value="categories">
            <Card className="card-elegant p-6">
              <CategoryManager categories={categories} />
            </Card>
          </TabsContent>

          {/* ============ Discounts ============ */}
          <TabsContent value="discounts">
            <Card className="card-elegant p-6">
              <DiscountManager discounts={discounts} />
            </Card>
          </TabsContent>

          {/* ============ Users ============ */}
          <TabsContent value="users">
            <Card className="card-elegant p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Point</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.uid}>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.points?.toLocaleString() ?? 0}</TableCell>
                      <TableCell><Badge variant={u.role === "admin" ? "default" : "outline"}>{u.role}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setUserRole(u.uid, u.role === "admin" ? "user" : "admin")}>
                          {u.role === "admin" ? "ลด เป็น user" : "เลื่อน เป็น admin"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ============ Orders ============ */}
          <TabsContent value="orders">
            <Card className="card-elegant p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เวลา</TableHead>
                    <TableHead>ผู้ซื้อ</TableHead>
                    <TableHead>สินค้า</TableHead>
                    <TableHead>โค้ด</TableHead>
                    <TableHead>จ่ายจริง</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.sort((a, b) => b.createdAt - a.createdAt).map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs">{new Date(o.createdAt).toLocaleString("th-TH")}</TableCell>
                      <TableCell>{o.username}</TableCell>
                      <TableCell className="text-xs">
                        {(o.items || []).map((it, i) => (
                          <div key={i}>{it.productName} ({it.price})</div>
                        ))}
                      </TableCell>
                      <TableCell>{o.discountCode || "-"}</TableCell>
                      <TableCell className="font-semibold gradient-text">{o.finalPrice}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ============ Topups ============ */}
          <TabsContent value="topups">
            <Card className="card-elegant p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เวลา</TableHead>
                    <TableHead>ผู้ใช้</TableHead>
                    <TableHead>วิธี</TableHead>
                    <TableHead>จำนวน</TableHead>
                    <TableHead>Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topups.sort((a, b) => b.createdAt - a.createdAt).map((t) => (
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
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ====================== Sub managers ======================

function CategoryManager({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");

  const submit = async () => {
    if (!name.trim()) return;
    if (edit) await updateCategory(edit.id, { name, icon });
    else await createCategory({ name, icon });
    toast.success("บันทึกแล้ว");
    setOpen(false); setName(""); setIcon("📁"); setEdit(null);
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold">หมวดหมู่ ({categories.length})</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEdit(null); setName(""); setIcon("📁"); }} className="bg-gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4" />เพิ่มหมวดหมู่
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit ? "แก้ไข" : "เพิ่ม"}หมวดหมู่</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>ไอคอน (emoji)</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} /></div>
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
    if (!form.name || !form.categoryId) return toast.error("กรอกชื่อและหมวดหมู่");
    if (edit) await updateProduct(edit.id, form);
    else await createProduct(form);
    toast.success("บันทึกแล้ว");
    setOpen(false); reset(); setEdit(null);
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
              <div><Label>รายละเอียดสินค้า</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="ข้อมูลสินค้า รายละเอียดที่ลูกค้าจะเห็น" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>ราคา (point)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
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
              <div><Label>URL รูปภาพ</Label><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." /></div>
              <div>
                <Label>Stock (1 บรรทัด = 1 ชิ้น)</Label>
                <Textarea
                  value={form.stockItems}
                  onChange={(e) => setForm({ ...form, stockItems: e.target.value })}
                  placeholder={"เช่น:\nlicense-key-001\nhttps://drive.google.com/file/xxx\nuser:pass:server"}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  จำนวน stock = จำนวนบรรทัดที่ไม่ว่าง — เมื่อมีคนซื้อ ระบบจะส่งบรรทัดบนสุดให้ลูกค้าและตัดออก
                  ({stockCount(form.stockItems)} ชิ้น)
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
    if (!form.code.trim()) return toast.error("ใส่โค้ด");
    await createDiscount(form);
    toast.success("สร้างโค้ดแล้ว");
    setOpen(false); setForm({ code: "", type: "discount", value: 10, maxUses: 100, active: true });
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold">โค้ดส่วนลด / โค้ดเติม Point</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4" />เพิ่มโค้ด</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>เพิ่มโค้ดใหม่</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>โค้ด</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER25" /></div>
              <div>
                <Label>ประเภท</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">ส่วนลด (%)</SelectItem>
                    <SelectItem value="point">เพิ่ม Point</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{form.type === "discount" ? "ลด (%)" : "Point"}</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
                <div><Label>จำกัดใช้</Label><Input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={submit} className="bg-gradient-primary text-primary-foreground">บันทึก</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>โค้ด</TableHead><TableHead>ประเภท</TableHead><TableHead>ค่า</TableHead><TableHead>ใช้แล้ว/จำกัด</TableHead><TableHead>เปิด</TableHead><TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {discounts.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-mono font-bold">{d.code}</TableCell>
              <TableCell><Badge variant="outline">{d.type === "discount" ? "ส่วนลด %" : "เพิ่ม Point"}</Badge></TableCell>
              <TableCell>{d.value}{d.type === "discount" ? "%" : ""}</TableCell>
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
