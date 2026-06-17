"use client"

import { useState, useEffect } from "react";
import { ChevronRight, Bike, Trophy, CheckCircle, AlertCircle } from "lucide-react";
import { AppHeader } from "./ui/AppHeader";
import { TireGauge } from "./ui/TireGauge";
import { COLORS, FONTS, getTireAlert } from "@/app/lib/constants";
import { userApi, tiresApi } from "@/app/lib/api";
import type { StatsOut, TireSetOut, RecommendationsOut } from "@/app/lib/api";

// ─── Sub-components ────────────────────────────────────────────────────────

function KmHero({ stats, tires }: { stats: StatsOut | null; tires: TireSetOut | null }) {
  const totalKm = stats?.total_km ?? 0;
  const front = tires?.front;
  const rear = tires?.rear;
  const sameTire = front && rear && front.name === rear.name && front.size === rear.size;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div
      className="mx-5 mb-4 rounded-2xl p-5"
      style={{
        background: `linear-gradient(135deg, ${COLORS.blueDark} 0%, ${COLORS.blue} 100%)`,
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: `0 12px 32px rgba(0,32,91,0.28), 0 1px 0 rgba(255,255,255,0.15) inset`,
      }}
    >
      <div
        className="text-[10px] uppercase tracking-widest mb-1 font-semibold"
        style={{ color: "rgba(255,255,255,0.6)", fontFamily: FONTS.title }}
      >
        Kilométrage Total Actuel
      </div>
      <div className="flex items-end gap-2 mb-3">
        <span
          className="font-black leading-none"
          style={{ fontFamily: FONTS.mono, fontSize: "52px", color: COLORS.yellow, letterSpacing: "-0.02em" }}
        >
          {totalKm.toLocaleString("fr-FR")}
        </span>
        <span className="text-white/70 text-xl font-semibold mb-2" style={{ fontFamily: FONTS.title }}>
          km
        </span>
      </div>

      <div className="flex gap-3">
        {sameTire ? (
          /* Même pneu AV + AR → une seule pill */
          <MetricPill
            icon={<Bike size={12} color={COLORS.yellow} />}
            value={front!.name}
            label={`Monté le ${fmtDate(front!.installed_date)}`}
          />
        ) : front && rear ? (
          /* Pneus différents → deux pills */
          <>
            <MetricPill
              icon={<Bike size={12} color={COLORS.yellow} />}
              value={front.name}
              label="Avant"
            />
            <MetricPill
              icon={<Bike size={12} color={COLORS.yellow} />}
              value={rear.name}
              label="Arrière"
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function MetricPill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div
      className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl"
      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
    >
      {icon}
      <span className="font-bold text-white text-center text-[12px]" style={{ fontFamily: FONTS.mono }}>
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)", fontFamily: FONTS.body }}>
        {label}
      </span>
    </div>
  );
}

function TireCard({ animated, stats }: { animated: boolean; stats: StatsOut | null }) {
  const frontWear = stats?.front_wear ?? 0;
  const rearWear = stats?.rear_wear ?? 0;

  return (
    <div
      className="mx-5 rounded-2xl p-5 mb-4 glass-panel"
    >
      {/* Bike wireframe — roue avant à droite (cx=270), arrière à gauche (cx=70) */}
      <svg viewBox="0 0 340 110" className="w-full h-16 mb-4 opacity-15" fill="none" stroke={COLORS.black} strokeWidth="5">
        <circle cx="70" cy="70" r="35" strokeDasharray="4 3" />
        <circle cx="70" cy="70" r="26" />
        <circle cx="70" cy="70" r="3.5" fill={COLORS.blue} />
        <circle cx="270" cy="70" r="35" strokeDasharray="4 3" />
        <circle cx="270" cy="70" r="26" />
        <circle cx="270" cy="70" r="3.5" fill={COLORS.blue} />
        <line x1="70" y1="70" x2="150" y2="30" />
        <line x1="150" y1="30" x2="230" y2="70" />
        <line x1="150" y1="30" x2="175" y2="70" />
        <line x1="175" y1="70" x2="230" y2="70" />
        <line x1="175" y1="70" x2="270" y2="70" />
        <line x1="230" y1="35" x2="255" y2="35" />
        <line x1="230" y1="35" x2="230" y2="70" />
        <line x1="150" y1="30" x2="160" y2="23" />
        <line x1="145" y1="23" x2="170" y2="23" />
      </svg>

      {/* Avant à gauche, Arrière à droite */}
      <div className="flex justify-around items-center">
        <TireGauge label="Roue Avant" wearPct={animated ? frontWear : 0} />
        <div className="h-20 w-px" style={{ background: COLORS.gray10 }} />
        <TireGauge label="Roue Arrière" wearPct={animated ? rearWear : 0} />
      </div>
    </div>
  );
}

function TireAlert({ onNavigate, stats }: { onNavigate: (s: string) => void; stats: StatsOut | null }) {
  const frontWear = stats?.front_wear ?? 0;
  const rearWear = stats?.rear_wear ?? 0;
  const adherencePct = stats?.adherence_pct ?? 100;
  const alert = getTireAlert(frontWear, rearWear, adherencePct);
  const [reco, setReco] = useState<RecommendationsOut | null>(null);

  useEffect(() => {
    // L'offre/réduction n'a de sens que si le cycliste use déjà ses pneus —
    // pas avant la première sortie ("start") ni quand tout va bien ("ok").
    if (alert.severity !== "critical" && alert.severity !== "warning") return;
    tiresApi.getRecommendations().then(setReco).catch(console.error);
  }, [alert.severity]);

  const worstWheel: "front" | "rear" = frontWear >= rearWear ? "front" : "rear";
  const offer = reco ? reco[worstWheel] : null;

  const styles = {
    start: {
      border: COLORS.start, iconBg: COLORS.startLight,
      icon: <Bike size={18} color={COLORS.start} />, titleColor: COLORS.start,
    },
    critical: {
      border: COLORS.achieved, iconBg: COLORS.achievedLight,
      icon: <Trophy size={18} color={COLORS.achieved} />, titleColor: COLORS.achieved,
    },
    warning: {
      border: "#FCD286", iconBg: "#FFFBEB",
      icon: <AlertCircle size={18} color={COLORS.warning} />, titleColor: "#7C5C0A",
    },
    ok: {
      border: COLORS.successDark, iconBg: "#F0FDF4",
      icon: <CheckCircle size={18} color={COLORS.success} />, titleColor: COLORS.success,
    },
  }[alert.severity];

  return (
    <div
      className="mx-5 rounded-2xl p-4 mb-4"
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        border: `1px solid ${styles.border}`,
        boxShadow: `0 8px 20px ${styles.border}25, 0 1px 0 rgba(255,255,255,0.6) inset`,
      }}
    >
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: styles.iconBg }}>
          {styles.icon}
        </div>
        <div className="flex-1">
          <p className="uppercase tracking-widest text-[10px] font-black mb-1" style={{ color: styles.titleColor, fontFamily: FONTS.title }}>
            {alert.title}
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: COLORS.grayDark, fontFamily: FONTS.body }}>
            {alert.message}
          </p>

          {offer && offer.discount_pct > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-black"
                style={{ background: COLORS.yellow, color: COLORS.blueDark, fontFamily: FONTS.mono }}
              >
                -{offer.discount_pct}%
              </span>
              {offer.recommended && (
                <span className="text-[11px] font-semibold" style={{ color: COLORS.blue, fontFamily: FONTS.body }}>
                  sur {offer.recommended.name}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {alert.severity === "start" && (
        <button
          onClick={() => onNavigate("challenges")}
          className="w-full mt-3 flex items-center justify-between px-4 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: COLORS.start, color: COLORS.white, fontFamily: FONTS.title, letterSpacing: "0.1em" }}
        >
          Découvrir les défis
          <ChevronRight size={14} />
        </button>
      )}

      {(alert.severity === "critical" || alert.severity === "warning") && (
        <button
          onClick={() => onNavigate("tires")}
          className="w-full mt-3 flex items-center justify-between px-4 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: COLORS.yellow, color: COLORS.blueDark, fontFamily: FONTS.title, letterSpacing: "0.1em" }}
        >
          {offer && offer.discount_pct > 0 ? `Profiter de -${offer.discount_pct}%` : "Voir les pneus recommandés"}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function TelemetryScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [animated, setAnimated] = useState(false);
  const [stats, setStats] = useState<StatsOut | null>(null);
  const [tires, setTires] = useState<TireSetOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    Promise.all([userApi.getStats(), tiresApi.getTires()])
      .then(([s, t]) => { setStats(s); setTires(t); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ background: COLORS.bgGradient, scrollbarWidth: "none" }}>
      <AppHeader onPartnersClick={() => onNavigate("partners")} />

      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
        <div className="px-5 pt-5 pb-4">
          <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
            Dashboard Télémétrie
          </p>
          <h1 className="uppercase leading-none" style={{ fontFamily: FONTS.title, fontSize: "26px", fontWeight: 800, letterSpacing: "0.04em", color: COLORS.blue }}>
            Usure Prédictive
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: COLORS.blue, borderTopColor: "transparent" }} />
          </div>
        ) : (
          <>
            <KmHero stats={stats} tires={tires} />
            <TireCard animated={animated} stats={stats} />
            <TireAlert onNavigate={onNavigate} stats={stats} />
          </>
        )}
      </div>
    </div>
  );
}
