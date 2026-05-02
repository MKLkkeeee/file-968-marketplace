import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { WelcomePopupConfig } from "@/lib/store";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const SNOOZE_KEY = "welcomePopup:snoozeUntil";
const SEEN_KEY = "welcomePopup:seenVersion";

export function WelcomePopup() {
  const [cfg, setCfg] = useState<WelcomePopupConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [hideOneHour, setHideOneHour] = useState(false);

  useEffect(() => {
    const off = onValue(ref(db, "welcomePopup"), (snap) => {
      const v = snap.exists() ? (snap.val() as WelcomePopupConfig) : null;
      setCfg(v);

      if (!v || !v.enabled) {
        setOpen(false);
        return;
      }
      if (!v.imageUrl && !v.text) {
        setOpen(false);
        return;
      }

      // Snooze check
      const snoozeUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      if (snoozeUntil && Date.now() < snoozeUntil) {
        setOpen(false);
        return;
      }

      // Show once per session unless content updated since last seen
      const seenVersion = Number(sessionStorage.getItem(SEEN_KEY) || 0);
      if (seenVersion >= v.updatedAt) {
        setOpen(false);
        return;
      }

      setOpen(true);
    });
    return () => off();
  }, []);

  const handleClose = () => {
    if (cfg) {
      sessionStorage.setItem(SEEN_KEY, String(cfg.updatedAt));
      if (hideOneHour) {
        localStorage.setItem(SNOOZE_KEY, String(Date.now() + 60 * 60 * 1000));
      }
    }
    setOpen(false);
  };

  if (!cfg) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        {cfg.imageUrl && (
          <div className="w-full overflow-hidden bg-black/40">
            <img
              src={cfg.imageUrl}
              alt="Welcome"
              className="max-h-[320px] w-full object-cover"
              onError={(e) => ((e.currentTarget.style.display = "none"))}
            />
          </div>
        )}

        <div className="space-y-4 p-5">
          {cfg.text && (
            <p className="whitespace-pre-wrap text-center text-sm leading-relaxed">
              {cfg.text}
            </p>
          )}

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
            <Checkbox
              checked={hideOneHour}
              onCheckedChange={(v) => setHideOneHour(v === true)}
            />
            <span>ไม่แสดงเป็นเวลา 1 ชั่วโมง</span>
          </label>

          <Button className="w-full" onClick={handleClose}>
            ปิด
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
