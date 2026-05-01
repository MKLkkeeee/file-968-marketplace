import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Coins, LogOut, Package, Shield, User as UserIcon, Wallet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navbar = () => {
  const { user, profile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-elegant">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="font-display text-xl font-bold tracking-tight">
            FILE <span className="gradient-text">968</span> SHOP
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          {user && profile ? (
            <>
              <div className="hidden md:flex items-center gap-2 rounded-full bg-secondary/60 px-4 py-1.5 text-sm">
                <Coins className="h-4 w-4 text-warning" />
                <span className="font-semibold">{profile.points.toLocaleString()}</span>
                <span className="text-muted-foreground">point</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/topup")}>
                <Wallet className="h-4 w-4" />
                เติมเงิน
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full">
                    <UserIcon className="h-4 w-4" />
                    {profile.username}
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
                  <DropdownMenuItem onClick={() => navigate("/topup")}>
                    <Wallet className="h-4 w-4" />เติมเงิน
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admins")}>
                      <Shield className="h-4 w-4" />หน้าแอดมิน
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
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
  );
};
