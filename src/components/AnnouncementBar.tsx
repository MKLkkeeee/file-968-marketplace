import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { Announcement } from "@/lib/store";
import { Megaphone } from "lucide-react";

export function AnnouncementBar() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const off = onValue(ref(db, "announcements"), (snap) => {
      const all: Announcement[] = snap.exists() ? Object.values(snap.val()) : [];
      setItems(all);
    });
    return () => off();
  }, []);

  // Tick every 30s so expired entries auto-disappear
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const active = items
    .filter((a) => a.active && (a.permanent || (a.expiresAt ?? 0) > now))
    .sort((a, b) => b.createdAt - a.createdAt);

  if (active.length === 0) return null;

  // Combine all active messages into one stream
  const text = active.map((a) => a.text).join("   •   ");

  return (
    <div className="relative overflow-hidden border-b border-warning/30 bg-gradient-to-r from-warning/15 via-warning/5 to-warning/15 text-warning">
      <div className="flex items-center gap-2 py-2">
        <div className="z-10 flex shrink-0 items-center gap-1.5 border-r border-warning/30 px-3 text-xs font-bold uppercase tracking-[0.2em]">
          <Megaphone className="h-3.5 w-3.5" />
          ประกาศ
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="marquee-track flex whitespace-nowrap text-sm font-medium">
            <span className="px-8">{text}</span>
            <span className="px-8" aria-hidden="true">{text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
