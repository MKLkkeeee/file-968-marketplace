import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Package } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, username);
      toast.success("สมัครสมาชิกสำเร็จ");
      navigate("/");
    } catch (err: any) {
      toast.error("สมัครไม่สำเร็จ", { description: err.message });
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
          <h1 className="mb-2 font-display text-3xl font-bold">สมัครสมาชิก</h1>
          <p className="mb-6 text-muted-foreground">สร้างบัญชีใหม่ฟรี</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">ชื่อผู้ใช้</Label>
              <Input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน (อย่างน้อย 6 ตัว)</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              สมัครสมาชิก
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            มีบัญชีแล้ว?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">เข้าสู่ระบบ</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
