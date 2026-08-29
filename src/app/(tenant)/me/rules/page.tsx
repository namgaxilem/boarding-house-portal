import type { Metadata } from "next";
import { PhoneIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { houseConfig, telHref } from "@/config/site";

export const metadata: Metadata = { title: "Nội quy" };

// Nội quy nằm trong config, không đọc DB — trang này tĩnh hoàn toàn.
export const instant = true;

export default function MyRulesPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Nội quy của {houseConfig.name}. Có gì chưa rõ, hỏi chủ trọ.
      </p>

      <Card>
        <CardContent className="p-0">
          <ol className="divide-y divide-border">
            {houseConfig.rules.map((rule, index) => (
              <li key={rule} className="flex gap-3 p-4">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium tabular-nums text-muted-foreground"
                >
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed">{rule}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Button variant="outline" asChild className="w-full">
        <a href={telHref(houseConfig.contact.phone)}>
          <PhoneIcon />
          Hỏi chủ trọ
        </a>
      </Button>
    </div>
  );
}
