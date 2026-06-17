"use client"

import { COLORS, FONTS, TIRE_LIFESPAN_KM } from "@/app/lib/constants";

interface TireGaugeProps {
  label: string;
  wearPct: number;
}

function getWearColor(pct: number): string {
  if (pct < 20) return COLORS.start;   // pas encore roulé — incite à prendre le vélo
  if (pct < 50) return COLORS.succesMedim;
  if (pct < 75) return COLORS.success;
  return COLORS.achieved;             // forte usure = objectif atteint, pas une alerte
}

export function TireGauge({ label, wearPct }: TireGaugeProps) {
  const color = getWearColor(wearPct);
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - wearPct / 100);
  const remaining = Math.round(TIRE_LIFESPAN_KM * (1 - wearPct / 100));

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke={COLORS.gray10} strokeWidth="8" />
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 1s ease, stroke 0.5s ease",
              filter: `drop-shadow(0 0 4px ${color}66)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-base font-bold"
            style={{ color, fontFamily: FONTS.mono }}
          >
            {wearPct}%
          </span>
          <span
            className="text-[9px] uppercase tracking-widest"
            style={{ color: COLORS.gray50, fontFamily: FONTS.body }}
          >
            usage
          </span>
        </div>
      </div>

      <div className="text-center">
        <div
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: COLORS.blue, fontFamily: FONTS.title }}
        >
          {label}
        </div>
        <div
          className="text-[10px]"
          style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}
        >
          {remaining} km restants
        </div>
      </div>
    </div>
  );
}
