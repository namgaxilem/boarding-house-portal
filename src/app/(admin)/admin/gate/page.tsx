import { Suspense } from "react";
import type { Metadata } from "next";
import {
  CircleCheckIcon,
  FingerprintIcon,
  KeyRoundIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/components/common/link";
import { PageHeader } from "@/components/common/page-header";
import { getGateOverview } from "@/features/gate/queries";
import { formatDate } from "@/lib/format";
import { isTTLockConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Cổng" };

export const instant = true;

export default function AdminGatePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cổng"
        description="Mã mở cổng, vân tay, và những việc còn tồn ở khoá cổng."
        breadcrumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Cổng" }]}
      />

      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <GateOverview />
      </Suspense>
    </div>
  );
}

async function GateOverview() {
  const { locks, primaryLock, toRevoke } = await getGateOverview();
  const configured = isTTLockConfigured();

  return (
    <div className="space-y-6">
      <RevokeQueue items={toRevoke} />

      {configured && primaryLock ? (
        <LockCard lock={primaryLock} lockCount={locks.length} />
      ) : (
        <SetupChecklist configured={configured} hasLock={Boolean(primaryLock)} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Việc còn tồn — phần đáng giá nhất của trang này                           */
/* -------------------------------------------------------------------------- */

/**
 * Người đã trả phòng mà mã cổng / ngăn vân tay vẫn còn trên thiết bị.
 *
 * Trước khi có bảng này, thứ duy nhất chặn họ khỏi cái cổng là chủ trọ tự nhớ
 * ra. App không xoá hộ được — mã và vân tay nằm trong bộ nhớ ổ khoá, không nằm
 * trong database — nên thứ làm được là không cho quên.
 */
function RevokeQueue({
  items,
}: {
  items: Awaited<ReturnType<typeof getGateOverview>>["toRevoke"];
}) {
  if (items.length === 0) {
    return (
      <Alert>
        <CircleCheckIcon />
        <AlertTitle>Không còn mã nào cần thu hồi</AlertTitle>
        <AlertDescription>
          Mọi ghi chép mã cổng trong app đều thuộc về người đang thuê.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <TriangleAlertIcon className="size-4 text-destructive" />
          Cần xoá khỏi thiết bị ở cổng
        </CardTitle>
        <Badge variant="destructive">{items.length}</Badge>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Những người dưới đây đã trả phòng nhưng mã cổng hoặc ngăn vân tay của họ
          vẫn còn trên thiết bị — tức là <strong>vẫn mở được cổng</strong>. App không
          xoá hộ được: mã nằm trong bộ nhớ ổ khoá, không nằm trong database. Ra cổng
          xoá trước, rồi mới xoá ghi chép trong app.
        </p>

        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li
              key={item.profileId}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{item.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.lastRoomCode ? `Phòng ${item.lastRoomCode}` : "Không rõ phòng"}
                  {item.lastEndDate ? ` · trả phòng ${formatDate(item.lastEndDate)}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {item.gateCode && (
                  <Badge variant="outline" className="font-mono">
                    <KeyRoundIcon />
                    {item.gateCode}
                  </Badge>
                )}
                {item.fingerprintSlot && (
                  <Badge variant="outline">
                    <FingerprintIcon />
                    {item.fingerprintSlot}
                  </Badge>
                )}
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/admin/tenants/${item.profileId}`}>Mở hồ sơ</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Khoá thông minh                                                           */
/* -------------------------------------------------------------------------- */

function LockCard({
  lock,
  lockCount,
}: {
  lock: NonNullable<Awaited<ReturnType<typeof getGateOverview>>["primaryLock"]>;
  lockCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRoundIcon className="size-4 text-muted-foreground" />
          {lock.label ?? lock.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-4 text-sm">
        <p>
          Pin: <strong>{lock.batteryPercent ?? "—"}%</strong> · Gateway:{" "}
          <strong>{lock.hasGateway ? "đã nối" : "chưa nối"}</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          {lock.lastSyncedAt
            ? `Đồng bộ lần cuối ${formatDate(lock.lastSyncedAt)}. Các số trên là ảnh chụp của lần đó, không phải thời gian thực.`
            : "Chưa đồng bộ lần nào."}
          {lockCount > 1 && ` Đang quản lý ${lockCount} khoá.`}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Trạng thái "cờ bật, env trống" — hợp lệ và hữu ích, không phải lỗi.
 *
 * Đăng ký tài khoản nhà phát triển TTLock mất 1–2 ngày chờ duyệt tay, tạo
 * application chờ thêm vài ngày nữa. Suốt quãng đó trang này là danh sách việc,
 * không phải một màn hình đỏ.
 */
function SetupChecklist({
  configured,
  hasLock,
}: {
  configured: boolean;
  hasLock: boolean;
}) {
  const steps: { done: boolean; title: string; detail: string }[] = [
    {
      done: false,
      title: "Mua Gateway G2 và cắm gần cổng",
      detail:
        "Khoảng 950.000đ, mua đứt, không thuê bao. Cần wifi 2.4GHz (không vào được băng 5GHz) và một ổ điện trong tầm Bluetooth của khoá. Không có gateway thì vẫn cấp được mã, nhưng không thu hồi sớm được, không đọc được nhật ký ra vào, không đồng bộ được vân tay.",
    },
    {
      done: false,
      title: "Đăng ký tài khoản nhà phát triển tại euopen.ttlock.com",
      detail:
        "TTLock duyệt tay, mất 1–2 ngày. Duyệt xong tạo application (chọn loại Web), chờ thêm vài ngày nữa mới có clientId và clientSecret.",
    },
    {
      done: configured,
      title: "Điền TTLOCK_* vào .env.local rồi khởi động lại",
      detail:
        "Bốn biến: TTLOCK_CLIENT_ID, TTLOCK_CLIENT_SECRET, TTLOCK_USERNAME, TTLOCK_PASSWORD. Hai cái sau là tài khoản chủ trọ trong app TTLock (tài khoản sở hữu khoá), không phải tài khoản nhà phát triển.",
    },
    {
      done: hasLock,
      title: "Quét khoá từ tài khoản TTLock",
      detail:
        "Sau khi điền env, nút quét xuất hiện ở đây và kéo danh sách khoá về. Ghép khoá với gateway trong app TTLock trên điện thoại trước.",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chưa bật khoá thông minh</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">
          Phần trên vẫn chạy bình thường mà không cần gì trong danh sách này — đó là
          ghi chép thủ công ở hồ sơ từng người thuê. Danh sách dưới đây là để mã cổng
          tự cấp lúc nhận phòng và tự thu lúc trả phòng.
        </p>

        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span
                className={
                  step.done
                    ? "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-xs font-semibold text-success"
                    : "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground"
                }
              >
                {step.done ? "✓" : index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
