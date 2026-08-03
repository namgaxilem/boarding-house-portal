import { create } from "zustand";

import type { RoomStatus } from "@/types";

/**
 * Filters for the admin room list.
 *
 * Filtering happens client-side over the already-rendered ten rooms — a round
 * trip per keystroke would be slower and buys nothing at this size.
 */
interface RoomFilterState {
  status: RoomStatus | "all";
  floor: number | "all";
  query: string;
  setStatus: (status: RoomStatus | "all") => void;
  setFloor: (floor: number | "all") => void;
  setQuery: (query: string) => void;
  reset: () => void;
}

export const useRoomFilterStore = create<RoomFilterState>((set) => ({
  status: "all",
  floor: "all",
  query: "",
  setStatus: (status) => set({ status }),
  setFloor: (floor) => set({ floor }),
  setQuery: (query) => set({ query }),
  reset: () => set({ status: "all", floor: "all", query: "" }),
}));
