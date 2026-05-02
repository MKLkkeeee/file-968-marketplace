import { useEffect, useState } from "react";
import { onValue, ref, runTransaction } from "firebase/database";
import { db } from "@/lib/firebase";
import { ShoppingBag, Users, Eye } from "lucide-react";

export function Footer() {
  const [orders, setOrders] = useState(0);
  const [users, setUsers] = useState(0);
  const [views, setViews] = useState(0);

  useEffect(() => {
    // Increment view count once per browser session
    try {
      if (!sessionStorage.getItem("site_view_counted")) {
        sessionStorage.setItem("site_view_counted", "1");
        runTransaction(ref(db, "siteStats/views"), (cur) => (cur || 0) + 1);
      }
    } catch {}

    const off1 = onValue(ref(db, "orders"), (s) =>
      setOrders(s.exists() ? Object.keys(s.val()).length : 0)
    );
    const off2 = onValue(ref(db, "users"), (s) =>
      setUsers(s.exists() ? Object.keys(s.val()).length : 0)
    );
    const off3 = onValue(ref(db, "siteStats/views"), (s) =>
      setViews(s.exists() ? Number(s.val()) || 0 : 0)
    );
    return () => {
      off1();
      off2();
      off3();
    };
  }, []);

  const fmt = (n: number) => n.toLocaleString("en-US");

  const stats = [
    { icon: ShoppingBag, label: "ยอดซื้อทั้งหมด", value: fmt(orders) },
    { icon: Users, label: "ผู้ใช้ทั้งหมด", value: fmt(users) },
    { icon: Eye, label: "ยอดเข้าชมเว็บ", value: fmt(views) },
  ];

  return (
    <footer className="mt-20 border-t border-white/[0.06]">
      <div className="container py-8">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          {stats.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4 text-center"
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white/50" />
              <div className="text-base sm:text-2xl font-semibold text-white">
                {value}
              </div>
              <div className="text-[10px] sm:text-xs text-white/40 leading-tight">
                {label}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-2 text-xs text-white/40">
          <a
            href="https://discord.gg/xPcm7SghYT"
            target="_blank"
            rel="noopener noreferrer"
            className="lux-link transition-colors hover:text-white"
          >
            FILE 968 SHOP
          </a>
        </div>
      </div>
    </footer>
  );
}
