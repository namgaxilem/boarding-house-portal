import { create } from "zustand";

/**
 * Client-side UI state only.
 *
 * Deliberately holds no rooms, tenants or tenancies: that data lives on the
 * server and is re-fetched by Next.js after every mutation. Copying it into a
 * store would create a second source of truth that drifts the moment a Server
 * Action revalidates.
 */
interface UiState {
  /** Admin sidebar drawer on screens below `md`. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;

  /** Wifi passwords are masked until the user asks to see one. */
  revealedSecrets: Record<string, boolean>;
  toggleSecret: (id: string) => void;
  isSecretRevealed: (id: string) => boolean;
}

export const useUiStore = create<UiState>((set, get) => ({
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

  revealedSecrets: {},
  toggleSecret: (id) =>
    set((state) => ({
      revealedSecrets: { ...state.revealedSecrets, [id]: !state.revealedSecrets[id] },
    })),
  isSecretRevealed: (id) => Boolean(get().revealedSecrets[id]),
}));
