"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader } from "lucide-react";
import { COLORS, FONTS } from "@/app/lib/constants";
import { useAuth } from "@/app/lib/auth-context";
import { NAV_ITEMS } from "@/app/lib/nav-items";
import type { Screen } from "@/app/lib/types";

function screenFromPath(pathname: string): Screen {
  const seg = pathname.split("/").filter(Boolean)[0];
  return (seg as Screen) || "telemetry";
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const activeScreen = screenFromPath(pathname);

  const bgOuter = COLORS.gray10;
  const bgPhone = COLORS.bgGradient;
  const navBg = "rgba(255,255,255,0.78)";
  const navBorder = COLORS.glassBorder;

  return (
    <div className="size-full" style={{ fontFamily: FONTS.body }}>
      {/* ── Mobile : plein écran, responsive (< lg) ──────────────────────── */}
      <div
        className="flex flex-col w-full lg:hidden"
        style={{ minHeight: "100dvh", background: bgPhone }}
      >
        <div className="flex-1 overflow-hidden">
          {children}
        </div>

        {/* Bottom navigation */}
        <nav
          className="flex-shrink-0 flex items-center pb-[max(env(safe-area-inset-bottom),1rem)] pt-2 px-1"
          style={{
            borderTop: `1px solid ${navBorder}`,
            background: navBg,
            backdropFilter: "blur(16px) saturate(140%)",
            WebkitBackdropFilter: "blur(16px) saturate(140%)",
            boxShadow: `0 -2px 12px rgba(0,32,91,0.04)`,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/${item.id}`)}
                className="flex-1 flex flex-col items-center gap-0.5 transition-all"
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <div
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                  style={
                    active
                      ? { background: COLORS.yellow, boxShadow: `0 0 0 6px ${COLORS.glowYellow}` }
                      : { background: "transparent" }
                  }
                >
                  {item.icon(active)}
                </div>
                <span
                  className="text-[8px] uppercase tracking-widest transition-colors"
                  style={{
                    fontFamily: FONTS.title,
                    color: active ? COLORS.blue : COLORS.gray40,
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Desktop : sidebar + contenu large (≥ lg) ────────────────────── */}
      <div className="hidden lg:flex" style={{ minHeight: "100vh", background: bgOuter }}>
        <aside
          className="flex-shrink-0 flex flex-col py-6 px-3"
          style={{
            width: "232px",
            background: navBg,
            borderRight: `1px solid ${navBorder}`,
            backdropFilter: "blur(16px) saturate(140%)",
            WebkitBackdropFilter: "blur(16px) saturate(140%)",
            zoom: 1.18,
          }}
        >
          <div className="flex items-center gap-2 px-2 mb-8">
            <div className="w-8 h-8 flex items-center justify-center rounded-sm flex-shrink-0" style={{ background: COLORS.blue }}>
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                <path d="M1 13V1L5 9L9 1L13 9L17 1V13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest leading-none" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
                MICHELIN
              </div>
              <div className="text-[13px] font-black uppercase tracking-wider leading-none" style={{ color: COLORS.blue, fontFamily: FONTS.title }}>
                RaceLab
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(`/${item.id}`)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                  style={active ? { background: COLORS.yellow } : { background: "transparent" }}
                  aria-current={active ? "page" : undefined}
                >
                  {item.icon(active)}
                  <span
                    className="text-[12px] uppercase tracking-widest"
                    style={{
                      fontFamily: FONTS.title,
                      color: active ? COLORS.blueDark : COLORS.gray50,
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div
          className="flex-1 overflow-y-auto"
          style={{
            background: bgPhone,
            zoom: 1.18,
          }}
        >
          <div className="max-w-[900px] mx-auto min-h-full">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (!user.onboarding_completed) {
      router.replace("/onboarding");
    }
  }, [loading, user, router]);

  if (loading || !user || !user.onboarding_completed) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: COLORS.bgGradient }}>
        <Loader size={20} color={COLORS.blue} className="animate-spin" />
      </div>
    );
  }

  return <AppShellInner>{children}</AppShellInner>;
}
