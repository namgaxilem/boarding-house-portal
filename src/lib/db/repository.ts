import type {
  AdminStats,
  Profile,
  Room,
  RoomEvent,
  RoomStatus,
  RoomWithOccupancy,
  Tenancy,
  TenancyDetail,
  TenantWithCurrentRoom,
  WifiNetwork,
} from "@/types";

/**
 * The single contract every storage backend implements.
 *
 * Pages and Server Actions depend on this interface, never on supabase-js or on
 * the demo store directly. Swapping the backend is one line in `db/index.ts`.
 */

export interface RoomInput {
  code: string;
  floor: number;
  areaM2: number;
  basePrice: number;
  electricPrice: number;
  waterPrice: number;
  servicePrice: number;
  maxOccupants: number;
  status: RoomStatus;
  description: string | null;
}

export interface TenantInput {
  email: string;
  fullName: string;
  phone: string | null;
  /** CCCD/CMND — chỉ admin nhập và sửa. */
  idNumber: string | null;
  dateOfBirth: string | null;
  hometown: string | null;
  note: string | null;
}

export interface TenancyInput {
  roomId: string;
  tenantId: string;
  isPrimary: boolean;
  startDate: string;
  deposit: number;
  monthlyPrice: number;
}

export interface EndTenancyInput {
  endDate: string;
  endReason: string;
  terminated: boolean;
}

export interface RoomEventInput {
  roomId: string;
  type: RoomEvent["type"];
  title: string;
  content: string | null;
  cost: number | null;
  occurredAt: string;
}

export interface WifiInput {
  ssid: string;
  password: string;
  scope: WifiNetwork["scope"];
  roomId: string | null;
  floor: number | null;
  note: string | null;
}

export interface RoomFilter {
  status?: RoomStatus | "all";
  floor?: number | "all";
  query?: string;
}

export interface RecentEvent extends RoomEvent {
  room: Room;
}

/**
 * Deliberately narrow. A tenant may see who shares their room, but not that
 * person's phone number or the landlord's private note about them.
 */
export interface Roommate {
  id: string;
  fullName: string;
  startDate: string;
}

export interface Repository {
  /* rooms */
  listRooms(filter?: RoomFilter): Promise<RoomWithOccupancy[]>;
  getRoom(id: string): Promise<RoomWithOccupancy | null>;
  getRoomByCode(code: string): Promise<Room | null>;
  createRoom(input: RoomInput): Promise<Room>;
  updateRoom(id: string, input: RoomInput): Promise<Room>;
  deleteRoom(id: string): Promise<void>;
  listVacantRooms(): Promise<Room[]>;

  /* tenants */
  listTenants(): Promise<TenantWithCurrentRoom[]>;
  getProfile(id: string): Promise<Profile | null>;
  getProfileByEmail(email: string): Promise<Profile | null>;
  getTenant(id: string): Promise<TenantWithCurrentRoom | null>;
  createTenant(input: TenantInput, password: string): Promise<Profile>;
  updateTenant(id: string, input: TenantInput): Promise<Profile>;
  setTenantActive(id: string, isActive: boolean): Promise<void>;
  deleteTenant(id: string): Promise<void>;
  updateOwnProfile(
    id: string,
    input: Pick<TenantInput, "fullName" | "phone" | "dateOfBirth" | "hometown">,
  ): Promise<Profile>;

  /* tenancies */
  listTenanciesByRoom(roomId: string): Promise<TenancyDetail[]>;
  listTenanciesByTenant(tenantId: string): Promise<TenancyDetail[]>;
  getActiveTenancyForTenant(tenantId: string): Promise<TenancyDetail | null>;
  getTenancy(id: string): Promise<TenancyDetail | null>;
  createTenancy(input: TenancyInput): Promise<Tenancy>;
  endTenancy(id: string, input: EndTenancyInput): Promise<void>;
  /** Others currently living in the signed-in tenant's room. */
  listMyRoommates(userId: string): Promise<Roommate[]>;

  /* room events */
  listRoomEvents(roomId: string): Promise<RoomEvent[]>;
  createRoomEvent(input: RoomEventInput): Promise<RoomEvent>;
  deleteRoomEvent(id: string): Promise<void>;
  listRecentEvents(limit: number): Promise<RecentEvent[]>;

  /* wifi */
  listWifi(): Promise<WifiNetwork[]>;
  getWifiForRoom(roomId: string): Promise<WifiNetwork[]>;
  createWifi(input: WifiInput): Promise<WifiNetwork>;
  updateWifi(id: string, input: WifiInput): Promise<WifiNetwork>;
  deleteWifi(id: string): Promise<void>;

  /* dashboard */
  getAdminStats(): Promise<AdminStats>;
}
