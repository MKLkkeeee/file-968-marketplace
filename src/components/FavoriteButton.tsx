import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toggleFavorite } from "@/lib/store";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  productId: string;
  variant?: "icon" | "full";
  className?: string;
  stopPropagation?: boolean;
}

export function FavoriteButton({ productId, variant = "icon", className, stopPropagation }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fav, setFav] = useState(false);

  useEffect(() => {
    if (!user) { setFav(false); return; }
    const off = onValue(ref(db, `favorites/${user.uid}/${productId}`), (snap) => {
      setFav(snap.exists());
    });
    return () => off();
  }, [user, productId]);

  const onClick = async (e: React.MouseEvent) => {
    if (stopPropagation) { e.preventDefault(); e.stopPropagation(); }
    if (!user) { toast.error("กรุณาเข้าสู่ระบบ"); navigate("/login"); return; }
    try {
      const now = await toggleFavorite(user.uid, productId);
      toast.success(now ? "เพิ่มในรายการโปรดแล้ว" : "ลบจากรายการโปรดแล้ว");
    } catch (err: any) {
      toast.error("ไม่สำเร็จ", { description: err?.message });
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md transition-all hover:border-white/30 ${className || ""}`}
        aria-label="favorite"
      >
        <Heart className={`h-4 w-4 ${fav ? "fill-rose-500 text-rose-500" : "text-white/70"}`} />
      </button>
    );
  }

  return (
    <Button variant={fav ? "default" : "outline"} onClick={onClick} className={className}>
      <Heart className={`h-4 w-4 ${fav ? "fill-current" : ""}`} />
      {fav ? "อยู่ในรายการโปรด" : "เพิ่มในรายการโปรด"}
    </Button>
  );
}
