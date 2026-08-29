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

  /**
   * Số `<Link>` đang chờ điều hướng. Thanh tiến trình ở đầu trang chỉ cần biết
   * "có > 0 hay không", nhưng phải đếm chứ không thể dùng boolean: bấm nhanh hai
   * link liên tiếp thì link đầu kết thúc sẽ tắt thanh trong khi link sau còn chạy.
   */
  navigationCount: number;
  /** Đánh dấu một điều hướng bắt đầu. Trả về hàm gọi lúc nó kết thúc. */
  trackNavigation: () => () => void;
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

  navigationCount: 0,
  trackNavigation: () => {
    set((state) => ({ navigationCount: state.navigationCount + 1 }));
    let released = false;
    return () => {
      // Chốt chặn: React Strict Mode chạy effect hai lần ở dev. Không có cờ này
      // thì bộ đếm tụt xuống âm và thanh tiến trình không bao giờ hiện lại.
      if (released) return;
      released = true;
      set((state) => ({ navigationCount: Math.max(0, state.navigationCount - 1) }));
    };
  },
}));
