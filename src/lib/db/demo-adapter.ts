import "server-only";

import { demoDb, nextId } from "./demo-store";
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

/** Callers get copies, so a page mutating a result cannot corrupt the store. */
function clone<T>(value: T): T {
  return structuredClone(value);
}

function nowIso() {
  return new Date().toISOString();
}

function isActive(t: Tenancy) {
  return t.status === "active" && t.endDate === null;
}

/**
 * Occupancy is derived, never stored.
 *
 * `room.status` only carries the landlord's manual intent — "maintenance" or
 * "reserved". Whether a room is occupied comes from whether an active tenancy
 * exists, so the two can never disagree.
 */
function effectiveStatus(room: Room, activeCount: number): RoomStatus {
  if (room.status === "maintenance" || room.status === "reserved") {
    return room.status;
  }
  return activeCount > 0 ? "occupied" : "vacant";
}

function buildRoom(room: Room): RoomWithOccupancy {
  const db = demoDb();
  const occupants = db.tenancies
    .filter((t) => t.roomId === room.id && isActive(t))
    .map((tenancy) => ({
      tenancy: clone(tenancy),
      tenant: clone(db.profiles.find((p) => p.id === tenancy.tenantId)!),
    }))
    .filter((o) => Boolean(o.tenant))
    .sort((a, b) => Number(b.tenancy.isPrimary) - Number(a.tenancy.isPrimary));

  return {
    ...clone(room),
    status: effectiveStatus(room, occupants.length),
    occupants,
  };
}

function buildTenancyDetail(tenancy: Tenancy): TenancyDetail | null {
  const db = demoDb();
  const room = db.rooms.find((r) => r.id === tenancy.roomId);
  const tenant = db.profiles.find((p) => p.id === tenancy.tenantId);
  if (!room || !tenant) return null;
  return { ...clone(tenancy), room: clone(room), tenant: clone(tenant) };
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export const demoAdapter: Repository = {
  /* ---------------------------------------------------------------- rooms */

  async listRooms(filter: RoomFilter = {}) {
    const db = demoDb();
    let rooms = db.rooms.map(buildRoom);

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

    return rooms.sort((a, b) => a.code.localeCompare(b.code, "vi"));
  },

  async getRoom(id) {
    const room = demoDb().rooms.find((r) => r.id === id);
    return room ? buildRoom(room) : null;
  },

  async getRoomByCode(code) {
    const room = demoDb().rooms.find(
      (r) => r.code.toLowerCase() === code.toLowerCase(),
    );
    return room ? clone(room) : null;
  },

  async createRoom(input: RoomInput) {
    const db = demoDb();
    if (db.rooms.some((r) => r.code.toLowerCase() === input.code.toLowerCase())) {
      throw new Error("DUPLICATE_ROOM_CODE");
    }
    const room: Room = { id: nextId("room"), createdAt: nowIso(), ...input };
    db.rooms.push(room);
    return clone(room);
  },

  async updateRoom(id, input: RoomInput) {
    const db = demoDb();
    const index = db.rooms.findIndex((r) => r.id === id);
    if (index === -1) throw new Error("ROOM_NOT_FOUND");
    if (
      db.rooms.some(
        (r) => r.id !== id && r.code.toLowerCase() === input.code.toLowerCase(),
      )
    ) {
      throw new Error("DUPLICATE_ROOM_CODE");
    }
    db.rooms[index] = { ...db.rooms[index], ...input };
    return clone(db.rooms[index]);
  },

  async deleteRoom(id) {
    const db = demoDb();
    if (db.tenancies.some((t) => t.roomId === id && isActive(t))) {
      throw new Error("ROOM_OCCUPIED");
    }
    db.rooms = db.rooms.filter((r) => r.id !== id);
    db.tenancies = db.tenancies.filter((t) => t.roomId !== id);
    db.events = db.events.filter((e) => e.roomId !== id);
    db.wifi = db.wifi.filter((w) => w.roomId !== id);
  },

  async listVacantRooms() {
    // RoomWithOccupancy extends Room, so this already satisfies Room[].
    const rooms = await demoAdapter.listRooms();
    return rooms.filter((r) => r.status === "vacant");
  },

  /* -------------------------------------------------------------- tenants */

  async listTenants() {
    const db = demoDb();
    return db.profiles
      .filter((p) => p.role === "tenant")
      .map((profile) => withCurrentRoom(profile))
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return Number(b.isActive) - Number(a.isActive);
        return a.fullName.localeCompare(b.fullName, "vi");
      });
  },

  async getProfile(id) {
    const profile = demoDb().profiles.find((p) => p.id === id);
    return profile ? clone(profile) : null;
  },

  async getProfileByEmail(email) {
    const profile = demoDb().profiles.find(
      (p) => p.email.toLowerCase() === email.toLowerCase(),
    );
    return profile ? clone(profile) : null;
  },

  async getTenant(id) {
    const profile = demoDb().profiles.find((p) => p.id === id && p.role === "tenant");
    return profile ? withCurrentRoom(profile) : null;
  },

  async createTenant(input: TenantInput, password: string) {
    const db = demoDb();
    if (db.profiles.some((p) => p.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error("DUPLICATE_EMAIL");
    }
    const profile: Profile = {
      id: nextId("user"),
      role: "tenant",
      isActive: true,
      createdAt: nowIso(),
      ...input,
    };
    db.profiles.push(profile);
    db.passwords[profile.id] = password;
    return clone(profile);
  },

  async updateTenant(id, input: TenantInput) {
    const db = demoDb();
    const index = db.profiles.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("TENANT_NOT_FOUND");
    if (
      db.profiles.some(
        (p) => p.id !== id && p.email.toLowerCase() === input.email.toLowerCase(),
      )
    ) {
      throw new Error("DUPLICATE_EMAIL");
    }
    db.profiles[index] = { ...db.profiles[index], ...input };
    return clone(db.profiles[index]);
  },

  async setTenantActive(id, isActiveFlag) {
    const db = demoDb();
    const profile = db.profiles.find((p) => p.id === id);
    if (profile) profile.isActive = isActiveFlag;
  },

  async deleteTenant(id) {
    const db = demoDb();
    if (db.tenancies.some((t) => t.tenantId === id && isActive(t))) {
      throw new Error("TENANT_HAS_ACTIVE_TENANCY");
    }
    db.profiles = db.profiles.filter((p) => p.id !== id);
    db.tenancies = db.tenancies.filter((t) => t.tenantId !== id);
    delete db.passwords[id];
  },

  async updateOwnProfile(id, input) {
    const db = demoDb();
    const index = db.profiles.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("TENANT_NOT_FOUND");
    db.profiles[index] = { ...db.profiles[index], ...input };
    return clone(db.profiles[index]);
  },

  /* ------------------------------------------------------------ tenancies */

  async listTenanciesByRoom(roomId) {
    return demoDb()
      .tenancies.filter((t) => t.roomId === roomId)
      .map(buildTenancyDetail)
      .filter((t): t is TenancyDetail => t !== null)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  },

  async listTenanciesByTenant(tenantId) {
    return demoDb()
      .tenancies.filter((t) => t.tenantId === tenantId)
      .map(buildTenancyDetail)
      .filter((t): t is TenancyDetail => t !== null)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  },

  async getActiveTenancyForTenant(tenantId) {
    const tenancy = demoDb().tenancies.find(
      (t) => t.tenantId === tenantId && isActive(t),
    );
    return tenancy ? buildTenancyDetail(tenancy) : null;
  },

  async getTenancy(id) {
    const tenancy = demoDb().tenancies.find((t) => t.id === id);
    return tenancy ? buildTenancyDetail(tenancy) : null;
  },

  async createTenancy(input: TenancyInput) {
    const db = demoDb();

    const room = db.rooms.find((r) => r.id === input.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");

    if (db.tenancies.some((t) => t.tenantId === input.tenantId && isActive(t))) {
      throw new Error("TENANT_ALREADY_RENTING");
    }

    const activeCount = db.tenancies.filter(
      (t) => t.roomId === input.roomId && isActive(t),
    ).length;
    if (activeCount >= room.maxOccupants) {
      throw new Error("ROOM_FULL");
    }

    const tenancy: Tenancy = {
      id: nextId("tenancy"),
      status: "active",
      endDate: null,
      endReason: null,
      createdAt: nowIso(),
      ...input,
    };
    db.tenancies.push(tenancy);

    // Taking a reserved room off hold once someone actually moves in.
    if (room.status === "reserved") room.status = "occupied";

    const tenant = db.profiles.find((p) => p.id === input.tenantId);
    db.events.push({
      id: nextId("event"),
      roomId: input.roomId,
      type: "checkin",
      title: `${tenant?.fullName ?? "Người thuê"} nhận phòng`,
      content: null,
      cost: null,
      occurredAt: new Date(input.startDate).toISOString(),
      createdBy: null,
    });

    return clone(tenancy);
  },

  async endTenancy(id, input: EndTenancyInput) {
    const db = demoDb();
    const tenancy = db.tenancies.find((t) => t.id === id);
    if (!tenancy) throw new Error("TENANCY_NOT_FOUND");
    if (!isActive(tenancy)) throw new Error("TENANCY_ALREADY_ENDED");
    if (input.endDate < tenancy.startDate) throw new Error("END_BEFORE_START");

    tenancy.endDate = input.endDate;
    tenancy.endReason = input.endReason;
    tenancy.status = input.terminated ? "terminated" : "ended";

    const tenant = db.profiles.find((p) => p.id === tenancy.tenantId);
    db.events.push({
      id: nextId("event"),
      roomId: tenancy.roomId,
      type: "checkout",
      title: `${tenant?.fullName ?? "Người thuê"} trả phòng`,
      content: input.endReason,
      cost: null,
      occurredAt: new Date(input.endDate).toISOString(),
      createdBy: null,
    });
  },

  async listMyRoommates(userId) {
    const db = demoDb();
    const mine = db.tenancies.find((t) => t.tenantId === userId && isActive(t));
    if (!mine) return [];

    return db.tenancies
      .filter((t) => t.roomId === mine.roomId && isActive(t) && t.tenantId !== userId)
      .map((t) => {
        const profile = db.profiles.find((p) => p.id === t.tenantId);
        return profile
          ? { id: profile.id, fullName: profile.fullName, startDate: t.startDate }
          : null;
      })
      .filter((r): r is { id: string; fullName: string; startDate: string } => r !== null)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  },

  /* ---------------------------------------------------------- room events */

  async listRoomEvents(roomId) {
    return demoDb()
      .events.filter((e) => e.roomId === roomId)
      .map(clone)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  },

  async createRoomEvent(input: RoomEventInput) {
    const db = demoDb();
    const event: RoomEvent = { id: nextId("event"), createdBy: null, ...input };
    db.events.push(event);
    return clone(event);
  },

  async deleteRoomEvent(id) {
    const db = demoDb();
    db.events = db.events.filter((e) => e.id !== id);
  },

  async listRecentEvents(limit) {
    const db = demoDb();
    return db.events
      .map((event) => {
        const room = db.rooms.find((r) => r.id === event.roomId);
        return room ? ({ ...clone(event), room: clone(room) } as RecentEvent) : null;
      })
      .filter((e): e is RecentEvent => e !== null)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, limit);
  },

  /* ----------------------------------------------------------------- wifi */

  async listWifi() {
    const order = { global: 0, floor: 1, room: 2 };
    return demoDb()
      .wifi.map(clone)
      .sort((a, b) => order[a.scope] - order[b.scope] || a.ssid.localeCompare(b.ssid));
  },

  async getWifiForRoom(roomId) {
    const db = demoDb();
    const room = db.rooms.find((r) => r.id === roomId);
    if (!room) return [];
    return db.wifi
      .filter(
        (w) =>
          w.scope === "global" ||
          (w.scope === "floor" && w.floor === room.floor) ||
          (w.scope === "room" && w.roomId === room.id),
      )
      .map(clone)
      .sort((a, b) => {
        const rank = { room: 0, floor: 1, global: 2 };
        return rank[a.scope] - rank[b.scope];
      });
  },

  async createWifi(input: WifiInput) {
    const db = demoDb();
    const network: WifiNetwork = { id: nextId("wifi"), ...input };
    db.wifi.push(network);
    return clone(network);
  },

  async updateWifi(id, input: WifiInput) {
    const db = demoDb();
    const index = db.wifi.findIndex((w) => w.id === id);
    if (index === -1) throw new Error("WIFI_NOT_FOUND");
    db.wifi[index] = { ...db.wifi[index], ...input };
    return clone(db.wifi[index]);
  },

  async deleteWifi(id) {
    const db = demoDb();
    db.wifi = db.wifi.filter((w) => w.id !== id);
  },

  /* ------------------------------------------------------------ dashboard */

  async getAdminStats(): Promise<AdminStats> {
    const rooms = await demoAdapter.listRooms();
    const db = demoDb();
    const activeTenancies = db.tenancies.filter(isActive);

    const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
    const vacantRooms = rooms.filter((r) => r.status === "vacant").length;
    const maintenanceRooms = rooms.filter((r) => r.status === "maintenance").length;

    return {
      totalRooms: rooms.length,
      occupiedRooms,
      vacantRooms,
      maintenanceRooms,
      activeTenants: new Set(activeTenancies.map((t) => t.tenantId)).size,
      monthlyRevenue: activeTenancies.reduce((sum, t) => sum + t.monthlyPrice, 0),
      occupancyRate: rooms.length === 0 ? 0 : occupiedRooms / rooms.length,
    };
  },
};

function withCurrentRoom(profile: Profile): TenantWithCurrentRoom {
  const db = demoDb();
  const tenancy = db.tenancies.find((t) => t.tenantId === profile.id && isActive(t));
  const room = tenancy ? db.rooms.find((r) => r.id === tenancy.roomId) : undefined;
  return {
    ...clone(profile),
    currentTenancy: tenancy ? clone(tenancy) : null,
    currentRoom: room ? clone(room) : null,
  };
}
