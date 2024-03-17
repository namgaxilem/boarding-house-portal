"use client";

import { usePathname, useSearchParams } from "next/navigation";
import * as NProgress from "nprogress";
import { useEffect } from "react";
import toast, { Toaster, useToasterStore } from "react-hot-toast";
import AuthProvider from "./AuthContext";
import LangProvider from "./LangContext";

export function RootContext({ children, dict, locale }) {
  const { toasts } = useToasterStore();
  const TOAST_LIMIT = 1;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    toasts
      .filter((t) => t.visible) // Only consider visible toasts
      .filter((_, i) => i >= TOAST_LIMIT) // Is toast index over limit?
      .forEach((t) => toast.dismiss(t.id)); // Dismiss – Use toast.remove(t.id) for no exit animation
  }, [toasts]);

  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  return (
    <>
      <Toaster
        position="bottom-center"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Define default options
          className: "",
          // duration: 5000,
          style: {
            background: "rgba(0, 0, 0, 1)",
            color: "#fff",
            marginBottom: 120,
            borderRadius: "10rem",
          },

          // Default options for specific types
          success: {
            // duration: 3000,
            // theme: {
            //   primary: "green",
            //   secondary: "black",
            // },
          },
        }}
      />
      <LangProvider dict={dict} locale={locale}>
        <AuthProvider>{children}</AuthProvider>
      </LangProvider>
    </>
  );
}
