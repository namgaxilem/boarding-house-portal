import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: React.ReactNode;
  href?: string;
  accent?: "default" | "success" | "warning" | "info";
}

const accentStyles = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning-foreground dark:text-warning",
  info: "bg-info/12 text-info",
} as const;

export function StatCard({
  label,
  value,
  sublabel,
  icon,
  href,
  accent = "default",
}: StatCardProps) {
  const content = (
    <Card
      className={cn(
        "flex items-center gap-4 p-4 transition-colors",
        href && "hover:border-primary/40 hover:bg-accent/40",
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5",
            accentStyles[accent],
          )}
          aria-hidden
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums tracking-tight">{value}</p>
        {sublabel && (
          <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
        )}
      </div>
    </Card>
  );

  return href ? (
    <Link href={href} className="rounded-xl">
      {content}
    </Link>
  ) : (
    content
  );
}
