"use client"

import { COLORS, FONTS } from "@/app/lib/constants";

export function AppFooter() {
  return (
    <div
      className="flex-shrink-0 px-5 py-4 glass-bar"
      style={{ borderTop: `1px solid ${COLORS.glassBorder}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: COLORS.gray40, fontFamily: FONTS.body }}>
          © 2026 MICHELIN Group. Tous droits réservés.
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] cursor-pointer hover:underline" style={{ color: COLORS.gray40 }}>
            Confidentialité
          </span>
          <span className="text-[10px] cursor-pointer hover:underline" style={{ color: COLORS.gray40 }}>
            CGU
          </span>
        </div>
      </div>
    </div>
  );
}
