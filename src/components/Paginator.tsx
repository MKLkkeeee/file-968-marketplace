import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}

export function Paginator({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <Button
        size="sm"
        variant="outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        ย้อนกลับ
      </Button>
      <span className="text-sm text-white/60 tabular-nums">
        {page}/{totalPages}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        หน้าถัดไป
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function usePaged<T>(arr: T[], page: number, perPage = 10) {
  const totalPages = Math.max(1, Math.ceil(arr.length / perPage));
  const safe = Math.min(page, totalPages);
  const slice = arr.slice((safe - 1) * perPage, safe * perPage);
  return { slice, totalPages, page: safe };
}
