import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type {
  AdminStats,
  Profile,
  Room,
  RoomEvent,
  RoomPhoto,
  RoomStatus,
  RoomWithOccupancy,
  RoomWithPhotos,
  Tenancy,
  TenancyDetail,
  TenantWithCurrentRoom,
  WifiNetwork,
} from "@/types";

import type {
  EndTenancyInput,
  RecentEvent,
  Repository,
  RoomEventInput,
  RoomFilter,
  RoomInput,
  TenancyInput,
  TenantInput,
  WifiInput,
} from "./repository";

/* -------------------------------------------------------------------------- */
/*  Row shapes (snake_case, as Postgres returns them)                         */
/* -------------------------------------------------------------------------- */

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: "admin" | "tenant";
  id_number: string | null;
  date_of_birth: string | null;
  hometown: string | null;
  note: string | null;
  zalo_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface RoomRow {
  id: string;
  code: string;
  floor: number;
  area_m2: number | string;
  base_price: number | string;
  electric_price: number | string;
  water_price: number | string;
  service_price: number | string;
  max_occupants: number;
  status: RoomStatus;
  description: string | null;
  created_at: string;
}

interface TenancyRow {
  id: string;
  room_id: string;
  tenant_id: string;
  is_primary: boolean;
  start_date: string;
  end_date: string | null;
  deposit: number | string;
  monthly_price: number | string;
  status: Tenancy["status"];
  end_reason: string | null;
  created_at: string;
}

interface RoomEventRow {
  id: string;
  room_id: string;
  type: RoomEvent["type"];
  title: string;
  content: string | null;
  cost: number | string | null;
  occurred_at: string;
  created_by: string | null;
}

interface RoomPhotoRow {
  id: string;
  room_id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

interface WifiRow {
  id: string;
  ssid: string;
  password: string;
  scope: WifiNetwork["scope"];
  room_id: string | null;
  floor: number | null;
  note: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Mappers                                                                   */
/* -------------------------------------------------------------------------- */

/** PostgREST can hand back `numeric` as a string once values get large. */
function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    idNumber: row.id_number,
    dateOfBirth: row.date_of_birth,
    hometown: row.hometown,
    note: row.note,
    zaloId: row.zalo_id,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function toRoom(row: RoomRow): Room {
  return {
    id: row.id,
    code: row.code,
    floor: row.floor,
    areaM2: num(row.area_m2),
    basePrice: num(row.base_price),
    electricPrice: num(row.electric_price),
    waterPrice: num(row.water_price),
    servicePrice: num(row.service_price),
    maxOccupants: row.max_occupants,
    status: row.status,
    description: row.description,
    createdAt: row.created_at,
  };
}

function toTenancy(row: TenancyRow): Tenancy {
  return {
    id: row.id,
    roomId: row.room_id,
    tenantId: row.tenant_id,
    isPrimary: row.is_primary,
    startDate: row.start_date,
    endDate: row.end_date,
    deposit: num(row.deposit),
    monthlyPrice: num(row.monthly_price),
    status: row.status,
    endReason: row.end_reason,
    createdAt: row.created_at,
  };
}

function toRoomEvent(row: RoomEventRow): RoomEvent {
  return {
    id: row.id,
    roomId: row.room_id,
    type: row.type,
    title: row.title,
    content: row.content,
    cost: row.cost === null ? null : num(row.cost),
    occurredAt: row.occurred_at,
    createdBy: row.created_by,
  };
}

export const ROOM_PHOTO_BUCKET = "room-photos";

/**
 * Bucket là public nên URL dựng được bằng chuỗi thuần, không cần ký và không
 * hết hạn — đúng thứ `next/image` và thẻ og:image cần.
 */
function publicPhotoUrl(storagePath: string) {
  return `${env.supabaseUrl}/storage/v1/object/public/${ROOM_PHOTO_BUCKET}/${storagePath}`;
}

function toRoomPhoto(row: RoomPhotoRow): RoomPhoto {
  return {
    id: row.id,
    roomId: row.room_id,
    storagePath: row.storage_path,
    url: publicPhotoUrl(row.storage_path),
    caption: row.caption,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function toWifi(row: WifiRow): WifiNetwork {
  return {
    id: row.id,
    ssid: row.ssid,
    password: row.password,
    scope: row.scope,
    roomId: row.room_id,
    floor: row.floor,
    note: row.note,
  };
}

function roomToRow(input: RoomInput) {
  return {
    code: input.code,
    floor: input.floor,
    area_m2: input.areaM2,
    base_price: input.basePrice,
    electric_price: input.electricPrice,
    water_price: input.waterPrice,
    service_price: input.servicePrice,
    max_occupants: input.maxOccupants,
    status: input.status,
    description: input.description,
  };
}

function wifiToRow(input: WifiInput) {
  return {
    ssid: input.ssid,
    password: input.password,
    scope: input.scope,
    room_id: input.roomId,
    floor: input.floor,
    note: input.note,
  };
}

/**
 * Translate Postgres errors into the codes the Server Actions already handle,
 * so the same user-facing message appears in demo mode and Supabase mode.
 */
function rethrow(error: PostgrestError | null, fallback: string): never {
  if (error?.code === "23505") {
    if (error.message.includes("rooms_code")) throw new Error("DUPLICATE_ROOM_CODE");
    if (error.message.includes("one_active_per_tenant")) {
      throw new Error("TENANT_ALREADY_RENTING");
    }
    if (error.message.includes("email")) throw new Error("DUPLICATE_EMAIL");
  }
  if (error?.code === "23505") {
    if (error.message.includes("id_number")) throw new Error("DUPLICATE_ID_NUMBER");
    if (error.message.includes("phone")) throw new Error("DUPLICATE_PHONE");
  }
  if (error?.code === "23514") {
    if (error.message.includes("id_number_format")) throw new Error("INVALID_ID_NUMBER");
    if (error.message.includes("phone_format")) throw new Error("INVALID_PHONE");
  }
  if (error?.code === "23503") throw new Error("ROOM_NOT_FOUND");
  throw new Error(error?.message ?? fallback);
}

/* -------------------------------------------------------------------------- */
/*  Shared read helpers                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Occupancy is derived, never stored.
 *
 * `rooms.status` only carries the landlord's manual intent — "maintenance" or
 * "reserved". Whether a room is occupied comes from whether an active tenancy
 * exists, so the two can never disagree.
 */
function effectiveStatus(room: Room, activeCount: number): RoomStatus {
  if (room.status === "maintenance" || room.status === "reserved") return room.status;
  return activeCount > 0 ? "occupied" : "vacant";
}

/**
 * Rooms + their current occupants.
 *
 * Deliberately two round-trips instead of one embedded select: filtering an
 * embedded resource in PostgREST turns the join inner, which would silently drop
 * every empty room — exactly the rows a landlord most wants to see.
 */
async function loadRoomsWithOccupancy(roomIds?: string[]) {
  const supabase = await createClient();

  let roomQuery = supabase.from("rooms").select("*").order("code");
  if (roomIds) roomQuery = roomQuery.in("id", roomIds);

  const { data: roomRows, error: roomError } = await roomQuery;
  if (roomError) rethrow(roomError, "Không đọc được danh sách phòng");

  const rooms = (roomRows as RoomRow[]).map(toRoom);
  if (rooms.length === 0) return [];

  const { data: tenancyRows, error: tenancyError } = await supabase
    .from("tenancies")
    .select("*, profiles(*)")
    .is("end_date", null)
    .in(
      "room_id",
      rooms.map((r) => r.id),
    );
  if (tenancyError) rethrow(tenancyError, "Không đọc được hợp đồng đang hiệu lực");

  const byRoom = new Map<string, RoomWithOccupancy["occupants"]>();
  for (const row of (tenancyRows ?? []) as (TenancyRow & {
    profiles: ProfileRow | null;
  })[]) {
    if (!row.profiles) continue;
    const list = byRoom.get(row.room_id) ?? [];
    list.push({ tenancy: toTenancy(row), tenant: toProfile(row.profiles) });
    byRoom.set(row.room_id, list);
  }

  return rooms.map<RoomWithOccupancy>((room) => {
    const occupants = (byRoom.get(room.id) ?? []).sort(
      (a, b) => Number(b.tenancy.isPrimary) - Number(a.tenancy.isPrimary),
    );
    return { ...room, status: effectiveStatus(room, occupants.length), occupants };
  });
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

/* -------------------------------------------------------------------------- */
/*  Adapter                                                                   */
/* -------------------------------------------------------------------------- */

export const supabaseAdapter: Repository = {
  /* ---------------------------------------------------------------- rooms */

  async listRooms(filter: RoomFilter = {}) {
    let rooms = await loadRoomsWithOccupancy();

    if (filter.status && filter.status !== "all") {
      rooms = rooms.filter((r) => r.status === filter.status);
    }
    if (filter.floor !== undefined && filter.floor !== "all") {
      rooms = rooms.filter((r) => r.floor === filter.floor);
    }
    if (filter.query?.trim()) {
      const q = normalize(filter.query.trim());
      rooms = rooms.filter(
        (r) =>
          normalize(r.code).includes(q) ||
          normalize(r.description ?? "").includes(q) ||
          r.occupants.some((o) => normalize(o.tenant.fullName).includes(q)),
      );
    }
    return rooms;
  },

  async getRoom(id) {
    const rooms = await loadRoomsWithOccupancy([id]);
    return rooms[0] ?? null;
  },

  async getRoomByCode(code) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .ilike("code", code)
      .maybeSingle();
    if (error) rethrow(error, "Không tìm được phòng");
    return data ? toRoom(data as RoomRow) : null;
  },

  async createRoom(input) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rooms")
      .insert(roomToRow(input))
      .select("*")
      .single();
    if (error) rethrow(error, "Không tạo được phòng");
    return toRoom(data as RoomRow);
  },

  async updateRoom(id, input) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rooms")
      .update(roomToRow(input))
      .eq("id", id)
      .select("*")
      .single();
    if (error) rethrow(error, "Không cập nhật được phòng");
    return toRoom(data as RoomRow);
  },

  async deleteRoom(id) {
    const supabase = await createClient();

    const { count, error: countError } = await supabase
      .from("tenancies")
      .select("id", { count: "exact", head: true })
      .eq("room_id", id)
      .is("end_date", null);
    if (countError) rethrow(countError, "Không kiểm tra được hợp đồng của phòng");
    if ((count ?? 0) > 0) throw new Error("ROOM_OCCUPIED");

    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) rethrow(error, "Không xoá được phòng");
  },

  async listVacantRooms(): Promise<RoomWithPhotos[]> {
    const supabase = await createClient();

    // An RPC, not a table read: this powers the public landing page, where the
    // caller is `anon`. Anon has no grant on `tenancies` — and granting one
    // would be worse, since RLS would return zero rows and every occupied room
    // would look available. The SECURITY DEFINER function computes vacancy
    // server-side and returns only room columns.
    const { data, error } = await supabase.rpc("vacant_rooms");
    if (error) rethrow(error, "Không đọc được danh sách phòng trống");

    const rooms = (data as RoomRow[]).map(toRoom);
    if (rooms.length === 0) return [];

    const { data: photoRows, error: photoError } = await supabase
      .from("room_photos")
      .select("*")
      .in("room_id", rooms.map((room) => room.id))
      .order("sort_order");
    if (photoError) rethrow(photoError, "Không đọc được ảnh phòng");

    const byRoom = new Map<string, RoomPhoto[]>();
    for (const row of (photoRows ?? []) as RoomPhotoRow[]) {
      const list = byRoom.get(row.room_id) ?? [];
      list.push(toRoomPhoto(row));
      byRoom.set(row.room_id, list);
    }

    return rooms.map((room) => ({ ...room, photos: byRoom.get(room.id) ?? [] }));
  },

  /* ---------------------------------------------------------- ảnh phòng --- */

  async listRoomPhotos(roomId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("room_photos")
      .select("*")
      .eq("room_id", roomId)
      .order("sort_order");
    if (error) rethrow(error, "Không đọc được ảnh phòng");
    return (data as RoomPhotoRow[]).map(toRoomPhoto);
  },

  async addRoomPhoto(roomId, file) {
    const supabase = await createClient();

    const extension =
      { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" }[file.type] ??
      "jpg";
    const storagePath = `${roomId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(ROOM_PHOTO_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      throw new Error(
        /row-level security|Unauthorized/i.test(uploadError.message)
          ? "PHOTO_UPLOAD_FORBIDDEN"
          : `Không tải được ảnh lên: ${uploadError.message}`,
      );
    }

    // Ảnh mới xuống cuối danh sách, không tự cướp chỗ ảnh bìa đang có.
    const { data: last } = await supabase
      .from("room_photos")
      .select("sort_order")
      .eq("room_id", roomId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("room_photos")
      .insert({
        room_id: roomId,
        storage_path: storagePath,
        sort_order: ((last?.sort_order as number | undefined) ?? -1) + 1,
      })
      .select("*")
      .single();

    if (error) {
      // Ghi bảng hỏng thì file vừa lên thành rác vĩnh viễn — dọn ngay.
      await supabase.storage.from(ROOM_PHOTO_BUCKET).remove([storagePath]);
      rethrow(error, "Không lưu được ảnh");
    }

    return toRoomPhoto(data as RoomPhotoRow);
  },

  async deleteRoomPhoto(photoId) {
    const supabase = await createClient();

    const { data: photo, error: findError } = await supabase
      .from("room_photos")
      .select("storage_path")
      .eq("id", photoId)
      .maybeSingle();
    if (findError) rethrow(findError, "Không tìm được ảnh");
    if (!photo) return;

    const { error } = await supabase.from("room_photos").delete().eq("id", photoId);
    if (error) rethrow(error, "Không xoá được ảnh");

    // Xoá file SAU khi xoá dòng: nếu làm ngược lại mà xoá dòng lỗi thì giao diện
    // còn ảnh nhưng file đã mất, hiện ra ảnh vỡ.
    await supabase.storage
      .from(ROOM_PHOTO_BUCKET)
      .remove([photo.storage_path as string]);
  },

  async setRoomCoverPhoto(photoId) {
    const supabase = await createClient();

    const { data: photo, error: findError } = await supabase
      .from("room_photos")
      .select("id, room_id")
      .eq("id", photoId)
      .maybeSingle();
    if (findError) rethrow(findError, "Không tìm được ảnh");
    if (!photo) return;

    const { data: siblings, error: listError } = await supabase
      .from("room_photos")
      .select("id")
      .eq("room_id", photo.room_id as string)
      .order("sort_order");
    if (listError) rethrow(listError, "Không đọc được danh sách ảnh");

    // Đánh số lại toàn bộ với ảnh được chọn ở vị trí 0. Rẻ hơn nghĩ cách khéo —
    // một phòng chỉ có vài ảnh.
    const ordered = [
      photoId,
      ...(siblings as { id: string }[]).map((s) => s.id).filter((id) => id !== photoId),
    ];

    for (const [index, id] of ordered.entries()) {
      const { error } = await supabase
        .from("room_photos")
        .update({ sort_order: index })
        .eq("id", id);
      if (error) rethrow(error, "Không đặt được ảnh bìa");
    }
  },

  async moveRoomPhoto(photoId, direction) {
    const supabase = await createClient();

    const { data: photo, error: findError } = await supabase
      .from("room_photos")
      .select("id, room_id")
      .eq("id", photoId)
      .maybeSingle();
    if (findError) rethrow(findError, "Không tìm được ảnh");
    if (!photo) return;

    const { data: siblings, error: listError } = await supabase
      .from("room_photos")
      .select("id")
      .eq("room_id", photo.room_id as string)
      .order("sort_order");
    if (listError) rethrow(listError, "Không đọc được danh sách ảnh");

    const ids = (siblings as { id: string }[]).map((s) => s.id);
    const from = ids.indexOf(photoId);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= ids.length) return;

    [ids[from], ids[to]] = [ids[to], ids[from]];

    for (const [index, id] of ids.entries()) {
      const { error } = await supabase
        .from("room_photos")
        .update({ sort_order: index })
        .eq("id", id);
      if (error) rethrow(error, "Không đổi được thứ tự ảnh");
    }
  },

  /* -------------------------------------------------------------- tenants */

  async listTenants() {
    const supabase = await createClient();

    const { data: profileRows, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "tenant")
      .order("full_name");
    if (error) rethrow(error, "Không đọc được danh sách người thuê");

    const profiles = (profileRows as ProfileRow[]).map(toProfile);
    if (profiles.length === 0) return [];

    const { data: tenancyRows, error: tenancyError } = await supabase
      .from("tenancies")
      .select("*, rooms(*)")
      .is("end_date", null)
      .in(
        "tenant_id",
        profiles.map((p) => p.id),
      );
    if (tenancyError) rethrow(tenancyError, "Không đọc được hợp đồng");

    const byTenant = new Map<string, { tenancy: Tenancy; room: Room | null }>();
    for (const row of (tenancyRows ?? []) as (TenancyRow & { rooms: RoomRow | null })[]) {
      byTenant.set(row.tenant_id, {
        tenancy: toTenancy(row),
        room: row.rooms ? toRoom(row.rooms) : null,
      });
    }

    return profiles
      .map<TenantWithCurrentRoom>((profile) => {
        const current = byTenant.get(profile.id);
        return {
          ...profile,
          currentTenancy: current?.tenancy ?? null,
          currentRoom: current?.room ?? null,
        };
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return Number(b.isActive) - Number(a.isActive);
        return a.fullName.localeCompare(b.fullName, "vi");
      });
  },

  async getProfile(id) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được hồ sơ");
    return data ? toProfile(data as ProfileRow) : null;
  },

  async getProfileByEmail(email) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("email", email)
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được hồ sơ");
    return data ? toProfile(data as ProfileRow) : null;
  },

  async getTenant(id) {
    const supabase = await createClient();

    const { data: profileRow, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .eq("role", "tenant")
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được hồ sơ người thuê");
    if (!profileRow) return null;

    const { data: tenancyRow, error: tenancyError } = await supabase
      .from("tenancies")
      .select("*, rooms(*)")
      .eq("tenant_id", id)
      .is("end_date", null)
      .maybeSingle();
    if (tenancyError) rethrow(tenancyError, "Không đọc được hợp đồng");

    const typed = tenancyRow as (TenancyRow & { rooms: RoomRow | null }) | null;
    return {
      ...toProfile(profileRow as ProfileRow),
      currentTenancy: typed ? toTenancy(typed) : null,
      currentRoom: typed?.rooms ? toRoom(typed.rooms) : null,
    };
  },

  async createTenant(input: TenantInput, password: string) {
    // Creating an auth user requires the service role; the anon key cannot.
    const admin = createAdminClient();

    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        phone: input.phone,
        role: "tenant",
      },
    });
    if (authError || !created.user) {
      if (authError?.message.toLowerCase().includes("already")) {
        throw new Error("DUPLICATE_EMAIL");
      }
      throw new Error(authError?.message ?? "Không tạo được tài khoản");
    }

    // The `on_auth_user_created` trigger inserted the base profile; fill the rest.
    const { data, error } = await admin
      .from("profiles")
      .update({
        full_name: input.fullName,
        phone: input.phone,
        id_number: input.idNumber,
        date_of_birth: input.dateOfBirth,
        hometown: input.hometown,
        note: input.note,
      })
      .eq("id", created.user.id)
      .select("*")
      .single();

    if (error) {
      // Do not leave an auth user with no usable profile behind.
      await admin.auth.admin.deleteUser(created.user.id);
      rethrow(error, "Không lưu được hồ sơ người thuê");
    }
    return toProfile(data as ProfileRow);
  },

  async updateTenant(id, input: TenantInput) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        email: input.email,
        full_name: input.fullName,
        phone: input.phone,
        id_number: input.idNumber,
        date_of_birth: input.dateOfBirth,
        hometown: input.hometown,
        note: input.note,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) rethrow(error, "Không cập nhật được hồ sơ");

    // Keep the auth record's email in step with the profile.
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(id, { email: input.email });

    return toProfile(data as ProfileRow);
  },

  async setTenantActive(id, isActive) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) rethrow(error, "Không đổi được trạng thái tài khoản");

    // Also block sign-in at the auth layer, not just in the app's own check.
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(id, {
      ban_duration: isActive ? "none" : "876000h",
    });
  },

  async deleteTenant(id) {
    const supabase = await createClient();

    const { count, error: countError } = await supabase
      .from("tenancies")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", id)
      .is("end_date", null);
    if (countError) rethrow(countError, "Không kiểm tra được hợp đồng");
    if ((count ?? 0) > 0) throw new Error("TENANT_HAS_ACTIVE_TENANCY");

    // Deleting the auth user cascades to `profiles` and `tenancies`.
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
  },

  async updateOwnProfile(id, input) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: input.fullName,
        phone: input.phone,
        date_of_birth: input.dateOfBirth,
        hometown: input.hometown,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) rethrow(error, "Không cập nhật được thông tin");
    return toProfile(data as ProfileRow);
  },

  /* ------------------------------------------------------------ tenancies */

  async listTenanciesByRoom(roomId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenancies")
      .select("*, rooms(*), profiles(*)")
      .eq("room_id", roomId)
      .order("start_date", { ascending: false });
    if (error) rethrow(error, "Không đọc được lịch sử phòng");
    return mapTenancyDetails(data);
  },

  async listTenanciesByTenant(tenantId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenancies")
      .select("*, rooms(*), profiles(*)")
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: false });
    if (error) rethrow(error, "Không đọc được lịch sử thuê");
    return mapTenancyDetails(data);
  },

  async getActiveTenancyForTenant(tenantId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenancies")
      .select("*, rooms(*), profiles(*)")
      .eq("tenant_id", tenantId)
      .is("end_date", null)
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được hợp đồng hiện tại");
    return data ? (mapTenancyDetails([data])[0] ?? null) : null;
  },

  async getTenancy(id) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenancies")
      .select("*, rooms(*), profiles(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được hợp đồng");
    return data ? (mapTenancyDetails([data])[0] ?? null) : null;
  },

  async createTenancy(input: TenancyInput) {
    const supabase = await createClient();

    const room = await supabaseAdapter.getRoom(input.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.occupants.length >= room.maxOccupants) throw new Error("ROOM_FULL");

    const { data, error } = await supabase
      .from("tenancies")
      .insert({
        room_id: input.roomId,
        tenant_id: input.tenantId,
        is_primary: input.isPrimary,
        start_date: input.startDate,
        deposit: input.deposit,
        monthly_price: input.monthlyPrice,
        status: "active",
      })
      .select("*")
      .single();
    if (error) rethrow(error, "Không tạo được hợp đồng");

    if (room.status === "reserved") {
      await supabase.from("rooms").update({ status: "occupied" }).eq("id", room.id);
    }

    const tenant = await supabaseAdapter.getProfile(input.tenantId);
    await supabase.from("room_events").insert({
      room_id: input.roomId,
      type: "checkin",
      title: `${tenant?.fullName ?? "Người thuê"} nhận phòng`,
      occurred_at: new Date(input.startDate).toISOString(),
    });

    return toTenancy(data as TenancyRow);
  },

  async endTenancy(id, input: EndTenancyInput) {
    const supabase = await createClient();

    const tenancy = await supabaseAdapter.getTenancy(id);
    if (!tenancy) throw new Error("TENANCY_NOT_FOUND");
    if (tenancy.endDate !== null) throw new Error("TENANCY_ALREADY_ENDED");
    if (input.endDate < tenancy.startDate) throw new Error("END_BEFORE_START");

    const { error } = await supabase
      .from("tenancies")
      .update({
        end_date: input.endDate,
        end_reason: input.endReason,
        status: input.terminated ? "terminated" : "ended",
      })
      .eq("id", id);
    if (error) rethrow(error, "Không kết thúc được hợp đồng");

    await supabase.from("room_events").insert({
      room_id: tenancy.roomId,
      type: "checkout",
      title: `${tenancy.tenant.fullName} trả phòng`,
      content: input.endReason,
      occurred_at: new Date(input.endDate).toISOString(),
    });
  },

  async listMyRoommates() {
    const supabase = await createClient();

    // A SECURITY DEFINER function rather than a table read: RLS filters rows, not
    // columns, so selecting `profiles` directly would expose the landlord's
    // private note and the roommate's phone number alongside the name.
    const { data, error } = await supabase.rpc("my_roommates");
    if (error) rethrow(error, "Không đọc được danh sách người ở cùng");

    return ((data ?? []) as { id: string; full_name: string; start_date: string }[]).map(
      (row) => ({ id: row.id, fullName: row.full_name, startDate: row.start_date }),
    );
  },

  /* ---------------------------------------------------------- room events */

  async listRoomEvents(roomId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("room_events")
      .select("*")
      .eq("room_id", roomId)
      .order("occurred_at", { ascending: false });
    if (error) rethrow(error, "Không đọc được nhật ký phòng");
    return (data as RoomEventRow[]).map(toRoomEvent);
  },

  async createRoomEvent(input: RoomEventInput) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("room_events")
      .insert({
        room_id: input.roomId,
        type: input.type,
        title: input.title,
        content: input.content,
        cost: input.cost,
        occurred_at: input.occurredAt,
      })
      .select("*")
      .single();
    if (error) rethrow(error, "Không ghi được nhật ký");
    return toRoomEvent(data as RoomEventRow);
  },

  async deleteRoomEvent(id) {
    const supabase = await createClient();
    const { error } = await supabase.from("room_events").delete().eq("id", id);
    if (error) rethrow(error, "Không xoá được ghi chú");
  },

  async listRecentEvents(limit) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("room_events")
      .select("*, rooms(*)")
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) rethrow(error, "Không đọc được hoạt động gần đây");

    return ((data ?? []) as (RoomEventRow & { rooms: RoomRow | null })[])
      .filter((row) => row.rooms !== null)
      .map<RecentEvent>((row) => ({ ...toRoomEvent(row), room: toRoom(row.rooms!) }));
  },

  /* ----------------------------------------------------------------- wifi */

  async listWifi() {
    const supabase = await createClient();
    const { data, error } = await supabase.from("wifi_networks").select("*").order("ssid");
    if (error) rethrow(error, "Không đọc được danh sách wifi");

    const rank = { global: 0, floor: 1, room: 2 };
    return (data as WifiRow[])
      .map(toWifi)
      .sort((a, b) => rank[a.scope] - rank[b.scope] || a.ssid.localeCompare(b.ssid));
  },

  async getWifiForRoom(roomId) {
    const supabase = await createClient();

    const { data: roomRow } = await supabase
      .from("rooms")
      .select("id, floor")
      .eq("id", roomId)
      .maybeSingle();
    if (!roomRow) return [];

    // RLS already limits a tenant to their own scopes; this filter keeps an
    // admin (who can see everything) from getting other rooms' networks here.
    const { data, error } = await supabase
      .from("wifi_networks")
      .select("*")
      .or(`scope.eq.global,room_id.eq.${roomId},and(scope.eq.floor,floor.eq.${roomRow.floor})`);
    if (error) rethrow(error, "Không đọc được wifi của phòng");

    const rank = { room: 0, floor: 1, global: 2 };
    return (data as WifiRow[]).map(toWifi).sort((a, b) => rank[a.scope] - rank[b.scope]);
  },

  async createWifi(input) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wifi_networks")
      .insert(wifiToRow(input))
      .select("*")
      .single();
    if (error) rethrow(error, "Không thêm được wifi");
    return toWifi(data as WifiRow);
  },

  async updateWifi(id, input) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wifi_networks")
      .update(wifiToRow(input))
      .eq("id", id)
      .select("*")
      .single();
    if (error) rethrow(error, "Không cập nhật được wifi");
    return toWifi(data as WifiRow);
  },

  async deleteWifi(id) {
    const supabase = await createClient();
    const { error } = await supabase.from("wifi_networks").delete().eq("id", id);
    if (error) rethrow(error, "Không xoá được wifi");
  },

  /* ------------------------------------------------------------ dashboard */

  async getAdminStats(): Promise<AdminStats> {
    const rooms = await loadRoomsWithOccupancy();

    const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
    const activeTenancies = rooms.flatMap((r) => r.occupants.map((o) => o.tenancy));

    return {
      totalRooms: rooms.length,
      occupiedRooms,
      vacantRooms: rooms.filter((r) => r.status === "vacant").length,
      maintenanceRooms: rooms.filter((r) => r.status === "maintenance").length,
      activeTenants: new Set(activeTenancies.map((t) => t.tenantId)).size,
      monthlyRevenue: activeTenancies.reduce((sum, t) => sum + t.monthlyPrice, 0),
      occupancyRate: rooms.length === 0 ? 0 : occupiedRooms / rooms.length,
    };
  },
};

function mapTenancyDetails(rows: unknown): TenancyDetail[] {
  const typed = (rows ?? []) as (TenancyRow & {
    rooms: RoomRow | null;
    profiles: ProfileRow | null;
  })[];

  return typed
    .filter((row) => row.rooms !== null && row.profiles !== null)
    .map<TenancyDetail>((row) => ({
      ...toTenancy(row),
      room: toRoom(row.rooms!),
      tenant: toProfile(row.profiles!),
    }));
}
