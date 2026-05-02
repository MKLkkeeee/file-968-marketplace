import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { Announcement } from "@/lib/store";
import { Megaphone, AlertTriangle } from "lucide-react";

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

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const active = items.filter(
    (a) => a.active && (a.permanent || (a.expiresAt ?? 0) > now)
  );

  if (active.length === 0) return null;

  // Group by priority — high comes first as its own row
  const high = active
    .filter((a) => a.priority === "high")
    .sort((a, b) => b.createdAt - a.createdAt);
  const normal = active
    .filter((a) => a.priority !== "high")
    .sort((a, b) => b.createdAt - a.createdAt);

  const rows: { kind: "high" | "normal"; text: string }[] = [];
  if (high.length > 0) {
    rows.push({ kind: "high", text: high.map((a) => a.text).join("   •   ") });
  }
  if (normal.length > 0) {
    rows.push({ kind: "normal", text: normal.map((a) => a.text).join("   •   ") });
  }

  return (
    <div className="flex flex-col">
      {rows.map((row, idx) => {
        const isHigh = row.kind === "high";
        return (
          <div
            key={idx}
            className={
              isHigh
                ? "relative overflow-hidden border-b border-destructive/40 bg-gradient-to-r from-destructive/25 via-destructive/10 to-destructive/25 text-destructive"
                : "relative overflow-hidden border-b border-warning/30 bg-gradient-to-r from-warning/15 via-warning/5 to-warning/15 text-warning"
            }
          >
            <div className="flex items-center gap-2 py-2">
              <div
                className={
                  "z-10 flex shrink-0 items-center gap-1.5 border-r px-3 text-xs font-bold uppercase tracking-[0.2em] " +
                  (isHigh ? "border-destructive/40" : "border-warning/30")
                }
              >
                {isHigh ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : (
                  <Megaphone className="h-3.5 w-3.5" />
                )}
                {isHigh ? "ประกาศ" : "ประกาศ"}
              </div>
              <div className="relative flex-1 overflow-hidden">
                <div
                  className={
                    "marquee-track flex whitespace-nowrap text-sm " +
                    (isHigh ? "font-bold" : "font-medium")
                  }
                >
                  <span className="px-8">{row.text}</span>
                  <span className="px-8" aria-hidden="true">{row.text}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
