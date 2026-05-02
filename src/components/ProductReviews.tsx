import { useEffect, useState } from "react";
import { onValue, ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Review, submitReview, deleteReview } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star, Trash2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const DISCORD_REVIEW_WEBHOOK =
  "https://discord.com/api/webhooks/1499956168464928998/nDjElR7KYs4fyl2AJe6UmqNbfmhe9LbfaiN1xqtb7wRCFcXPos66M8MWITipISztrW3J";

async function notifyDiscordReview(opts: {
  productName: string;
  productId: string;
  username: string;
  avatarUrl?: string;
  rating: number;
  comment: string;
  isUpdate: boolean;
}) {
  const stars = "★".repeat(opts.rating) + "☆".repeat(5 - opts.rating);
  const payload = {
    username: "FILE 968 SHOP",
    embeds: [
      {
        title: `${opts.isUpdate ? "✏️ อัปเดตรีวิว" : "📝 รีวิวใหม่"} — ${opts.productName}`,
        description: opts.comment,
        color: opts.rating >= 4 ? 0x22c55e : opts.rating >= 3 ? 0xf59e0b : 0xef4444,
        fields: [
          { name: "คะแนน", value: `${stars}  (${opts.rating}/5)`, inline: true },
          { name: "ผู้รีวิว", value: opts.username, inline: true },
        ],
        thumbnail:
          opts.avatarUrl && /^https?:\/\//.test(opts.avatarUrl)
            ? { url: opts.avatarUrl }
            : undefined,
        timestamp: new Date().toISOString(),
        footer: { text: `Product ID: ${opts.productId}` },
      },
    ],
  };
  try {
    await fetch(DISCORD_REVIEW_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn("Discord webhook failed", e);
  }
}

interface Props {
  productId: string;
}

export function ProductReviews({ productId }: Props) {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const off = onValue(ref(db, `reviews/${productId}`), (snap) => {
      const list: Review[] = snap.exists() ? Object.values(snap.val()) : [];
      list.sort((a, b) => b.createdAt - a.createdAt);
      setReviews(list);
    });
    return () => off();
  }, [productId]);

  const myReview = user ? reviews.find((r) => r.userId === user.uid) : null;
  const avg =
    reviews.length === 0
      ? 0
      : reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;

  // Pre-fill if editing existing
  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment);
    }
  }, [myReview?.userId]);

  const handleSubmit = async () => {
    if (!user || !profile) return toast.error("กรุณาเข้าสู่ระบบ");
    const trimmed = comment.trim();
    if (trimmed.length === 0) return toast.error("กรุณาเขียนความคิดเห็น");
    if (trimmed.length > 500) return toast.error("ความคิดเห็นยาวเกิน 500 ตัวอักษร");
    if (rating < 1 || rating > 5) return toast.error("คะแนนไม่ถูกต้อง");
    setBusy(true);
    try {
      await submitReview({
        productId,
        userId: user.uid,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        rating,
        comment: trimmed,
      });
      toast.success(myReview ? "อัปเดตรีวิวแล้ว" : "เพิ่มรีวิวสำเร็จ");
      // Fire-and-forget Discord notification
      try {
        const snap = await get(ref(db, `products/${productId}/name`));
        const productName = snap.exists() ? String(snap.val()) : productId;
        notifyDiscordReview({
          productName,
          productId,
          username: profile.username,
          avatarUrl: profile.avatarUrl,
          rating,
          comment: trimmed,
          isUpdate: !!myReview,
        });
      } catch {}
    } catch (e: any) {
      toast.error("บันทึกไม่สำเร็จ", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteReview(productId, user.uid);
      setComment("");
      setRating(5);
      toast.success("ลบรีวิวแล้ว");
    } catch (e: any) {
      toast.error("ลบไม่สำเร็จ", { description: e?.message });
    }
  };

  return (
    <div className="space-y-5">
      {/* Average */}
      <Card className="card-elegant flex items-center justify-between p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">คะแนนเฉลี่ย</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold text-white">
              {avg.toFixed(1)}
            </span>
            <span className="text-sm text-white/50">/ 5.0</span>
          </div>
          <p className="mt-1 text-xs text-white/50">{reviews.length} รีวิว</p>
        </div>
        <StarsDisplay value={avg} size={5} />
      </Card>

      {/* Form */}
      {user && profile ? (
        <Card className="card-elegant p-5">
          <h4 className="font-semibold">{myReview ? "แก้ไขรีวิวของคุณ" : "เขียนรีวิว"}</h4>
          <div className="mt-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-7 w-7 ${
                    (hoverRating || rating) >= n
                      ? "fill-warning text-warning"
                      : "text-white/20"
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-white/60">{rating}/5</span>
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="แชร์ประสบการณ์การใช้งานของคุณ..."
            className="mt-3"
          />
          <p className="mt-1 text-right text-xs text-white/40">{comment.length}/500</p>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleSubmit} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {myReview ? "อัปเดตรีวิว" : "ส่งรีวิว"}
            </Button>
            {myReview && (
              <Button variant="outline" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" /> ลบรีวิว
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="card-elegant p-5 text-center text-sm text-white/50">
          <Link to="/login" className="text-white underline">เข้าสู่ระบบ</Link>{" "}
          เพื่อรีวิวสินค้า
        </Card>
      )}

      {/* List */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/40">ยังไม่มีรีวิว — เป็นคนแรก!</p>
        ) : (
          reviews.map((r) => (
            <Card key={r.id} className="card-elegant p-4">
              <div className="flex items-start gap-3">
                {r.avatarUrl ? (
                  <img src={r.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                    <UserIcon className="h-5 w-5 text-white/60" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-white">{r.username}</p>
                    <span className="text-xs text-white/40">
                      {new Date(r.createdAt).toLocaleDateString("th-TH")}
                    </span>
                  </div>
                  <StarsDisplay value={r.rating} size={4} />
                  <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">{r.comment}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function StarsDisplay({ value, size = 4 }: { value: number; size?: number }) {
  const cls = size >= 5 ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${cls} ${
            value >= n - 0.25 ? "fill-warning text-warning" : "text-white/15"
          }`}
        />
      ))}
    </div>
  );
}
