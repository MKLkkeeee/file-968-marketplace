import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Package } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("เข้าสู่ระบบสำเร็จ");
      navigate("/");
    } catch (err: any) {
      toast.error("เข้าสู่ระบบไม่สำเร็จ", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-elegant">
            <Package className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="font-display text-2xl font-bold">
            FILE <span className="gradient-text">968</span> SHOP
          </div>
        </Link>
        <Card className="card-elegant p-8">
          <h1 className="mb-2 font-display text-3xl font-bold">ยินดีต้อนรับกลับ</h1>
          <p className="mb-6 text-muted-foreground">เข้าสู่ระบบเพื่อช้อปสินค้า</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              เข้าสู่ระบบ
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            ยังไม่มีบัญชี?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">สมัครสมาชิก</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
