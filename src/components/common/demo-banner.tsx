import { InfoIcon } from "lucide-react";

import { isDemoMode } from "@/lib/env";

/**
 * Makes it obvious that data is in-memory and will vanish on restart. Renders
 * nothing once Supabase is configured.
 */
export function DemoBanner() {
  if (!isDemoMode) return null;

  return (
    <div className="flex items-start gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs text-warning-foreground dark:text-warning">
      <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
      <p>
        <strong className="font-semibold">Chế độ demo</strong> — dữ liệu nằm trong bộ
        nhớ và mất khi khởi động lại server. Điền biến môi trường Supabase để dùng
        database thật.
      </p>
    </div>
  );
}
