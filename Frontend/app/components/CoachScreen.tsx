"use client"

import { useState, useEffect } from "react";
import { Sparkles, AlertTriangle, AlertCircle, Info, Tag } from "lucide-react";
import { AppHeader } from "./ui/AppHeader";
import { COLORS, FONTS } from "@/app/lib/constants";
import { coachApi } from "@/app/lib/api";
import type { CoachTipOut } from "@/app/lib/api";

const SEVERITY_STYLE: Record<CoachTipOut["severity"], { icon: typeof Info; color: string; bg: string; border: string }> = {
  critical: { icon: AlertTriangle, color: COLORS.danger, bg: COLORS.dangerLight, border: "#F0B8AC" },
  warning: { icon: AlertCircle, color: COLORS.warning, bg: COLORS.warningLight, border: "#FBDB94" },
  info: { icon: Info, color: COLORS.blue, bg: "#EFF4FB", border: COLORS.glassBorder },
};

function TipCard({ tip }: { tip: CoachTipOut }) {
  const style = SEVERITY_STYLE[tip.severity];
  const Icon = style.icon;

  return (
    <div className="mx-5 mb-4 rounded-2xl overflow-hidden glass-panel">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: style.bg, border: `1px solid ${style.border}` }}
          >
            <Icon size={16} color={style.color} />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="text-[13px] font-bold leading-tight mb-1"
              style={{ color: COLORS.blueDark, fontFamily: FONTS.body }}
            >
              {tip.title}
            </h3>
            <p className="text-[12px] leading-snug" style={{ color: COLORS.grayDark, fontFamily: FONTS.body }}>
              {tip.message}
            </p>
          </div>
        </div>

        {tip.cta_label && (
          <div
            className="mt-3 flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
          >
            <div className="flex items-center gap-1.5">
              <Tag size={11} color="#B45309" />
              <span className="text-[11px] font-semibold" style={{ color: "#78350F", fontFamily: FONTS.body }}>
                {tip.discount_pct ? `-${tip.discount_pct}% avec ${tip.discount_code}` : tip.cta_label}
              </span>
            </div>
            <button
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-opacity hover:opacity-80"
              style={{ background: COLORS.yellow, color: COLORS.blueDark, fontFamily: FONTS.title }}
            >
              {tip.cta_label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CoachScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [tips, setTips] = useState<CoachTipOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    coachApi
      .getTips()
      .then((r) => setTips(r.tips))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ background: COLORS.bgGradient }}>
      <AppHeader onPartnersClick={() => onNavigate("partners")} />

      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={12} color={COLORS.blue} />
            <p className="text-[10px] uppercase tracking-widest" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
              MICHELIN
            </p>
          </div>
          <h1
            className="uppercase leading-none"
            style={{
              fontFamily: FONTS.title,
              fontSize: "26px",
              fontWeight: 800,
              letterSpacing: "0.04em",
              color: COLORS.blue,
            }}
          >
            COACH PERSONNEL
          </h1>
          <p className="text-[11px] mt-1.5" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
            Vos sorties croisées avec l&apos;état réel de vos pneus.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: COLORS.blue, borderTopColor: "transparent" }} />
          </div>
        ) : (
          <div className="pt-2">
            {tips.map((tip) => (
              <TipCard key={tip.id} tip={tip} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
