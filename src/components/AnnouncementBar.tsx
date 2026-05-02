import { useEffect, useMemo, useState } from "react";
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

  const rows = useMemo(() => {
    const active = items.filter(
      (a) => a.active && (a.permanent || (a.expiresAt ?? 0) > now)
    );
    const high = active
      .filter((a) => a.priority === "high")
      .sort((a, b) => b.createdAt - a.createdAt);
    const normal = active
      .filter((a) => a.priority !== "high")
      .sort((a, b) => b.createdAt - a.createdAt);

    const out: { kind: "high" | "normal"; text: string }[] = [];
    if (high.length > 0) out.push({ kind: "high", text: high.map((a) => a.text).join("   •   ") });
    if (normal.length > 0) out.push({ kind: "normal", text: normal.map((a) => a.text).join("   •   ") });
    return out;
  }, [items, now]);

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col">
      {rows.map((row, idx) => {
        const isHigh = row.kind === "high";
        // Speed: faster — ~90px/sec
        const duration = Math.min(30, Math.max(8, Math.round(row.text.length * 0.08)));

        return (
          <div
            key={idx}
            className={
              "relative overflow-hidden border-b backdrop-blur-sm " +
              (isHigh
                ? "border-destructive/40 bg-gradient-to-r from-destructive/20 via-destructive/10 to-destructive/20 text-destructive"
                : "border-warning/30 bg-gradient-to-r from-warning/15 via-warning/5 to-warning/15 text-warning")
            }
          >
            {/* Marquee fills the entire bar — text travels edge to edge */}
            <div className="relative overflow-hidden py-2">
              <div
                className={
                  "marquee-track flex whitespace-nowrap text-sm " +
                  (isHigh ? "font-bold" : "font-medium")
                }
                style={{ animationDuration: `${duration}s` }}
              >
                <span className="inline-flex items-center gap-1.5 px-8">
                  {isHigh ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <Megaphone className="h-3.5 w-3.5" />
                  )}
                  {row.text}
                </span>
                <span className="inline-flex items-center gap-1.5 px-8" aria-hidden="true">
                  {isHigh ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <Megaphone className="h-3.5 w-3.5" />
                  )}
                  {row.text}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
