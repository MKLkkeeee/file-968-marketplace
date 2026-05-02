import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Coins, History, LogOut, Shield, ShoppingCart, User as UserIcon, Wallet } from "lucide-react";
import boxLogo from "@/assets/box-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export const Navbar = () => {
  const { user, profile, isAdmin, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <>
    <header className="sticky top-0 z-50 glass">
      <div className="container px-3 sm:px-6 flex h-16 items-center justify-between gap-2">
        <Link to="/" className="group flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl transition-all group-hover:border-white/25">
            <img src={boxLogo} alt="logo" className="h-6 w-6 sm:h-7 sm:w-7 object-contain" />
          </div>
          <div className="font-display text-sm sm:text-lg font-bold tracking-tight truncate">
            FILE 968 <span className="text-white/40 hidden xs:inline">SHOP</span>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/cart")} className="relative">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">ตะกร้า</span>
            {count > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full bg-white p-0 px-1 text-xs text-black border-transparent">
                {count}
              </Badge>
            )}
          </Button>

          {user && profile ? (
            <>
              <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm backdrop-blur-md">
                <Coins className="h-4 w-4 text-warning" />
                <span className="font-semibold text-white">{profile.points.toLocaleString()}</span>
                <span className="text-white/50 text-xs uppercase tracking-wider">point</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/topup")}>
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">เติมเงิน</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full pl-1">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <UserIcon className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{profile.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{profile.username}</span>
                      <span className="text-xs font-normal text-muted-foreground">{profile.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserIcon className="h-4 w-4" />โปรไฟล์
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/topup")}>
                    <Wallet className="h-4 w-4" />เติมเงิน
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/orders")}>
                    <History className="h-4 w-4" />ประวัติการซื้อ
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admins")}>
                      <Shield className="h-4 w-4" />หน้าแอดมิน
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => { e.preventDefault(); setLogoutOpen(true); }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />ออกจากระบบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>เข้าสู่ระบบ</Button>
              <Button variant="default" size="sm" onClick={() => navigate("/register")} className="bg-gradient-primary">
                สมัครสมาชิก
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>

    <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-destructive" />
            ออกจากระบบ
          </AlertDialogTitle>
          <AlertDialogDescription>
            คุณแน่ใจใช่ไหมว่าต้องการออกจากระบบ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              await logout();
              setLogoutOpen(false);
              navigate("/");
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            ยืนยันออกจากระบบ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
