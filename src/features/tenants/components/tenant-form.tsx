"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SaveIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import { createTenant, updateTenant } from "@/features/tenants/actions";
import { toDateInputValue } from "@/lib/format";
import type { Profile } from "@/types";

export function TenantForm({ tenant }: { tenant?: Profile }) {
  const action = tenant ? updateTenant.bind(null, tenant.id) : createTenant;
  const [state, formAction] = useActionState(action, null);
  const errors = fieldErrorsOf(state);

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />

      <Card>
        <CardHeader>
          <CardTitle>Thông tin cá nhân</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-4 sm:grid-cols-2">
          <Field name="fullName" label="Họ và tên" required errors={errors}>
            <Input defaultValue={tenant?.fullName} placeholder="Nguyễn Văn An" required />
          </Field>

          <Field
            name="phone"
            label="Số điện thoại"
            hint="10 số, bắt đầu bằng 0."
            errors={errors}
          >
            <Input
              type="tel"
              inputMode="tel"
              defaultValue={tenant?.phone ?? ""}
              placeholder="0912345678"
            />
          </Field>

          <Field name="dateOfBirth" label="Ngày sinh" errors={errors}>
            <Input type="date" defaultValue={toDateInputValue(tenant?.dateOfBirth)} />
          </Field>

          <Field name="hometown" label="Quê quán" errors={errors}>
            <Input defaultValue={tenant?.hometown ?? ""} placeholder="Thanh Hóa" />
          </Field>

          <Field
            name="note"
            label="Ghi chú riêng"
            hint="Chỉ chủ trọ đọc được. Người thuê không thấy."
            errors={errors}
            className="sm:col-span-2"
          >
            <Textarea rows={2} defaultValue={tenant?.note ?? ""} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tài khoản đăng nhập</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-4 sm:grid-cols-2">
          <Field
            name="email"
            label="Email"
            hint="Dùng để đăng nhập. Nếu người thuê không có email, tạo giúp họ một cái."
            required
            errors={errors}
            className="sm:col-span-2"
          >
            <Input
              type="email"
              inputMode="email"
              defaultValue={tenant?.email}
              placeholder="an@example.com"
              required
            />
          </Field>

          {!tenant && (
            <Field
              name="password"
              label="Mật khẩu tạm"
              hint="Đưa cho người thuê và nhắc họ đổi ngay sau lần đăng nhập đầu."
              required
              errors={errors}
              className="sm:col-span-2"
            >
              <Input
                type="text"
                autoComplete="off"
                defaultValue=""
                placeholder="Ít nhất 6 ký tự"
                required
              />
            </Field>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild>
          <Link href={tenant ? `/admin/tenants/${tenant.id}` : "/admin/tenants"}>Huỷ</Link>
        </Button>
        <SubmitButton>
          <SaveIcon />
          {tenant ? "Lưu thay đổi" : "Tạo tài khoản"}
        </SubmitButton>
      </div>
    </form>
  );
}
