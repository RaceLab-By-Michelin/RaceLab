"use client"

// ─── RaceKit ─────────────────────────────────────────────────────────────────
// Composants partagés repris fidèlement de la maquette de référence
// (michelin-race-lab-app/components/ui-kit.tsx, instruments.tsx, sparkline.tsx)
// mais réécrits avec le système COLORS/FONTS de Frontend (styles inline)
// plutôt que les classes Tailwind + variables CSS de la référence.

import { COLORS, FONTS } from "@/app/lib/constants";

// ─── Panel (satin-card) ──────────────────────────────────────────────────────

export function Panel({
  children,
  className = "",
  style,
  borderColor,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  borderColor?: string;
}) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "rgba(23,26,40,0.78)",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        border: `1px solid ${borderColor ?? COLORS.glassBorder}`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.05) inset",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── SectionLabel ────────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] uppercase font-bold"
      style={{ color: COLORS.gray50, fontFamily: FONTS.mono, letterSpacing: "0.25em" }}
    >
      {children}
    </span>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────

export type BadgeTone = "default" | "gold" | "success" | "danger";

const BADGE_TONE_STYLE: Record<BadgeTone, { bg: string; color: string; border: string }> = {
  default: { bg: "rgba(255,255,255,0.06)", color: COLORS.gray60, border: COLORS.glassBorder },
  gold: { bg: "rgba(255,200,0,0.14)", color: COLORS.yellow, border: "rgba(255,200,0,0.35)" },
  success: { bg: COLORS.successLight, color: COLORS.success, border: "rgba(52,211,153,0.35)" },
  danger: { bg: COLORS.dangerLight, color: COLORS.danger, border: "rgba(242,101,92,0.35)" },
};

export function Badge({
  tone = "default",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  const s = BADGE_TONE_STYLE[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${className}`}
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontFamily: FONTS.title }}
    >
      {children}
    </span>
  );
}

// ─── MeterBar ────────────────────────────────────────────────────────────────

export type MeterTone = "gold" | "success" | "danger" | "muted";

const METER_TONE_COLOR: Record<MeterTone, string> = {
  gold: COLORS.yellow,
  success: COLORS.success,
  danger: COLORS.danger,
  muted: COLORS.gray40,
};

export function MeterBar({
  value,
  tone = "gold",
  className = "",
}: {
  value: number;
  tone?: MeterTone;
  className?: string;
}) {
  return (
    <div
      className={`w-full h-1.5 rounded-full overflow-hidden ${className}`}
      style={{ background: COLORS.gray10 }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: METER_TONE_COLOR[tone] }}
      />
    </div>
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

export type SparkTone = "gold" | "success" | "danger";

const SPARK_TONE_COLOR: Record<SparkTone, string> = {
  gold: COLORS.yellow,
  success: COLORS.success,
  danger: COLORS.danger,
};

export function Sparkline({
  data,
  tone = "gold",
  className = "",
}: {
  data: number[];
  tone?: SparkTone;
  className?: string;
}) {
  if (data.length < 2) return null;
  const width = 120;
  const height = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((d, i) => {
    const x = i * step;
    const y = height - ((d - min) / range) * height;
    return [x, y];
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];
  const color = SPARK_TONE_COLOR[tone];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth={1} />
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
}

// ─── WearDial (compteur "vitesse" — segments en demi-cercle) ──────────────────

function r3(n: number) {
  return Math.round(n * 1000) / 1000;
}

export function WearDial({
  wear,
  label,
  size = 180,
}: {
  wear: number;
  label: string;
  size?: number;
}) {
  const segments = 40;
  const filled = Math.round((wear / 100) * segments);
  const startAngle = 135;
  const sweep = 270;
  const center = size / 2;
  const radius = size * 0.4;

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${wear}% d'usure`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {Array.from({ length: segments }).map((_, i) => {
          const angle = startAngle + (i / (segments - 1)) * sweep;
          const rad = (angle * Math.PI) / 180;
          const inner = radius - size * 0.05;
          const outer = radius;
          const x1 = r3(center + inner * Math.cos(rad));
          const y1 = r3(center + inner * Math.sin(rad));
          const x2 = r3(center + outer * Math.cos(rad));
          const y2 = r3(center + outer * Math.sin(rad));
          const isFilled = i < filled;
          const isCritical = wear >= 70 && isFilled && i >= filled - 6;
          const stroke = isCritical ? COLORS.danger : isFilled ? COLORS.yellow : COLORS.gray10;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth={size * 0.0125}
              strokeLinecap="round"
              stroke={stroke}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold leading-none"
          style={{ fontFamily: FONTS.title, fontSize: size * 0.16, color: COLORS.heading }}
        >
          {wear}
          <span style={{ fontSize: size * 0.08, color: COLORS.gray40 }}>%</span>
        </span>
        <span
          className="mt-1 uppercase"
          style={{ fontFamily: FONTS.mono, fontSize: size * 0.045, color: COLORS.gray50, letterSpacing: "0.25em" }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
