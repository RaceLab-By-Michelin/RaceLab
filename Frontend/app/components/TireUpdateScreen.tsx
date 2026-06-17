"use client"

import { useState, useEffect } from "react";
import { ChevronRight, CheckCircle, Filter, Wrench, RefreshCw, RotateCcw, PenLine, AlertTriangle, Gift, ArrowLeft } from "lucide-react";
import { AppHeader } from "./ui/AppHeader";
import { AppFooter } from "./ui/AppFooter";
import { COLORS, FONTS } from "@/app/lib/constants";
import { tiresApi } from "@/app/lib/api";
import type { TireSetOut, TireOut, TireCatalogOut, WheelPosition, RecommendationsOut } from "@/app/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type TireType = "Tous" | "Route" | "Gravel" | "VTT" | "Piste";
type Mode = "idle" | "replace-same" | "replace-new" | "other";
type WheelTarget = "rear" | "front" | "both";

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_FILTERS: TireType[] = ["Tous", "Route", "Gravel", "VTT", "Piste"];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Route: { bg: "#EFF6FF", text: COLORS.blue },
  Gravel: { bg: "#FEF3C7", text: "#92400E" },
  VTT: { bg: "#F0FDF4", text: "#166534" },
  Piste: { bg: "#FDF4FF", text: "#7E22CE" },
};

const WHEEL_LABELS: Record<WheelTarget, string> = {
  rear: "Roue arrière",
  front: "Roue avant",
  both: "Les deux roues",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function TireTypeTag({ type }: { type: string }) {
  const colors = TYPE_COLORS[type] ?? { bg: COLORS.gray05, text: COLORS.grayDark };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
      style={{ background: colors.bg, color: colors.text, fontFamily: FONTS.title }}
    >
      {type}
    </span>
  );
}

function WearBar({ pct, label }: { pct: number; label: string }) {
  const color = pct >= 80 ? COLORS.achieved : pct >= 60 ? COLORS.warning : COLORS.success;
  return (
    <div className="flex-1">
      <div className="flex justify-between mb-1">
        <span className="text-[9px] uppercase tracking-wider" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>{label}</span>
        <span className="text-[9px] font-bold" style={{ color, fontFamily: FONTS.mono }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: COLORS.gray10 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Wheel selector ──────────────────────────────────────────────────────────

function WheelSelector({
  value,
  onChange,
  rearWear,
  frontWear,
}: {
  value: WheelTarget;
  onChange: (v: WheelTarget) => void;
  rearWear: number;
  frontWear: number;
}) {
  const options: { key: WheelTarget; desc: string; wear?: string }[] = [
    { key: "rear", desc: "Roue arrière", wear: `${rearWear}% d'usure` },
    { key: "front", desc: "Roue avant", wear: `${frontWear}% d'usure` },
    { key: "both", desc: "Les deux roues", wear: "arrière + avant" },
  ];

  return (
    <div className="mb-4">
      <div
        className="text-[9px] uppercase tracking-widest font-bold mb-2"
        style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
      >
        Quelle roue remplacer ?
      </div>
      <div className="flex flex-col gap-1.5">
        {options.map(({ key, desc, wear }) => {
          const active = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
              style={{
                background: active ? COLORS.blue : COLORS.gray05,
                border: `1.5px solid ${active ? COLORS.blue : COLORS.gray10}`,
              }}
            >
              <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
                <circle cx="10" cy="10" r="8" stroke={active ? COLORS.yellow : COLORS.gray40} strokeWidth="1.5" />
                <circle cx="10" cy="10" r="4" stroke={active ? COLORS.yellow : COLORS.gray40} strokeWidth="1.5" />
                <circle cx="10" cy="10" r="1.5" fill={active ? COLORS.yellow : COLORS.gray40} />
                {key === "both" && (
                  <>
                    <line x1="2" y1="10" x2="6" y2="10" stroke={active ? COLORS.yellow : COLORS.gray40} strokeWidth="1.5" />
                    <line x1="14" y1="10" x2="18" y2="10" stroke={active ? COLORS.yellow : COLORS.gray40} strokeWidth="1.5" />
                  </>
                )}
              </svg>
              <div className="flex-1">
                <div
                  className="text-[12px] font-bold"
                  style={{ color: active ? COLORS.white : COLORS.blueDark, fontFamily: FONTS.title }}
                >
                  {desc}
                </div>
                {wear && (
                  <div
                    className="text-[9px] mt-0.5"
                    style={{ color: active ? "rgba(255,255,255,0.65)" : COLORS.gray50, fontFamily: FONTS.mono }}
                  >
                    {wear}
                  </div>
                )}
              </div>
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: active ? COLORS.yellow : COLORS.gray10 }}
              >
                {active && <CheckCircle size={11} color={COLORS.blueDark} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Current state card ───────────────────────────────────────────────────────

function CurrentTireCard({
  tires,
  recommendations,
  onAction,
}: {
  tires: TireSetOut;
  recommendations: RecommendationsOut | null;
  onAction: (mode: Mode) => void;
}) {
  const { front, rear } = tires;
  const sameTire = rear.name === front.name && rear.size === front.size;
  const worstWheel: WheelPosition = front.wear_pct >= rear.wear_pct ? "front" : "rear";
  const offer = recommendations ? recommendations[worstWheel] : null;
  const hasOffer = !!offer && offer.discount_pct > 0;

  return (
    <div
      className="mx-5 mb-4 rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.78)",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        border: `2px solid ${COLORS.blue}`,
        boxShadow: `0 8px 24px rgba(39,80,155,0.15)`,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ background: `linear-gradient(90deg, ${COLORS.blueDark} 0%, ${COLORS.blue} 100%)` }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white" style={{ fontFamily: FONTS.title }}>
          Pneus actuellement montés
        </span>
      </div>

      <div className="p-4">
        {sameTire ? (
          <div className="mb-3">
            {rear.brand === "michelin" && (
              <div className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: COLORS.blue, fontFamily: FONTS.title }}>
                MICHELIN
              </div>
            )}
            <div className="text-[16px] font-black mb-1" style={{ color: COLORS.blueDark, fontFamily: FONTS.title }}>
              {rear.name}
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: COLORS.gray05, color: COLORS.grayDark, fontFamily: FONTS.mono }}>
                {rear.size}
              </span>
              <span className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
                Montés le {fmtDate(rear.installed_date)}
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-3 flex flex-col gap-2">
            {([rear, front] as const).map((t, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-xl" style={{ background: COLORS.gray05 }}>
                <span className="text-[9px] font-black uppercase tracking-wider w-12 flex-shrink-0" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
                  {i === 0 ? "Arrière" : "Avant"}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-bold truncate block" style={{ color: COLORS.blueDark, fontFamily: FONTS.title }}>
                    {t.brand === "michelin" ? `MICHELIN ${t.name}` : t.name}
                  </span>
                </div>
                <span className="text-[9px] flex-shrink-0" style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}>{t.size}</span>
              </div>
            ))}
          </div>
        )}

        {/* Wear bars */}
        <div className="flex gap-4 mb-4">
          <WearBar pct={rear.wear_pct} label="Arrière" />
          <WearBar pct={front.wear_pct} label="Avant" />
        </div>

        {/* Offre personnalisée */}
        {hasOffer && (
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-4"
            style={{ background: "#FFFBEA", border: `1px solid ${COLORS.yellow}` }}
          >
            <Gift size={14} color={COLORS.blueDark} className="flex-shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] font-bold" style={{ color: COLORS.blueDark, fontFamily: FONTS.body }}>
                <span className="font-black">-{offer!.discount_pct}%</span>
                {offer!.recommended ? ` sur le ${offer!.recommended.name} — ` : " — "}
                {offer!.match_reason}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onAction("replace-same")}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: COLORS.yellow }}
          >
            <RefreshCw size={15} color={COLORS.blueDark} />
            <div className="text-left flex-1">
              <div className="text-[12px] font-black uppercase tracking-wider" style={{ fontFamily: FONTS.title, color: COLORS.blueDark }}>
                Remplacer par des neufs
              </div>
              <div className="text-[9px] opacity-70" style={{ fontFamily: FONTS.body, color: COLORS.blueDark }}>
                Même référence — remet le compteur à zéro
              </div>
            </div>
            <ChevronRight size={14} color={COLORS.blueDark} />
          </button>

          <button
            onClick={() => onAction("replace-new")}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
            style={{ background: COLORS.gray05, border: `1px solid ${COLORS.gray10}` }}
          >
            <Wrench size={15} color={COLORS.blue} />
            <div className="text-left flex-1">
              <div className="text-[12px] font-bold uppercase tracking-wider" style={{ fontFamily: FONTS.title, color: COLORS.blue }}>
                Changer de modèle Michelin
              </div>
              <div className="text-[9px]" style={{ fontFamily: FONTS.body, color: COLORS.gray50 }}>
                Choisir dans le catalogue
              </div>
            </div>
            <ChevronRight size={14} color={COLORS.gray40} />
          </button>

          <button
            onClick={() => onAction("other")}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
            style={{ background: COLORS.gray05, border: `1px solid ${COLORS.gray10}` }}
          >
            <PenLine size={15} color={COLORS.gray50} />
            <div className="text-left flex-1">
              <div className="text-[12px] font-bold uppercase tracking-wider" style={{ fontFamily: FONTS.title, color: COLORS.grayDark }}>
                Autre marque
              </div>
              <div className="text-[9px]" style={{ fontFamily: FONTS.body, color: COLORS.gray50 }}>
                Saisir manuellement (hors catalogue)
              </div>
            </div>
            <ChevronRight size={14} color={COLORS.gray40} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Replace same panel ──────────────────────────────────────────────────────

function ReplaceSamePanel({ tires, onConfirm, onCancel, saving }: {
  tires: TireSetOut;
  onConfirm: (wheel: WheelTarget) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [wheel, setWheel] = useState<WheelTarget>("both");
  const { front, rear } = tires;

  const wearBefore =
    wheel === "rear" ? `${rear.wear_pct}%` :
    wheel === "front" ? `${front.wear_pct}%` :
    `${rear.wear_pct}% / ${front.wear_pct}%`;

  const tireName = wheel === "front" ? front.name : rear.name;
  const tireSize = wheel === "front" ? front.size : rear.size;

  return (
    <div
      className="mx-5 mb-4 rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.78)",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        border: `2px solid ${COLORS.yellow}`,
        boxShadow: `0 8px 24px rgba(252,229,0,0.22)`,
      }}
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: COLORS.yellow }}>
            <RefreshCw size={18} color={COLORS.blueDark} />
          </div>
          <div>
            <div className="text-[14px] font-black" style={{ color: COLORS.blueDark, fontFamily: FONTS.title }}>
              Remplacer par des neufs
            </div>
            <div className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
              Même référence — sélectionnez quelle roue
            </div>
          </div>
        </div>

        <WheelSelector
          value={wheel}
          onChange={setWheel}
          rearWear={rear.wear_pct}
          frontWear={front.wear_pct}
        />

        {/* Summary */}
        <div className="rounded-xl p-3 mb-4" style={{ background: COLORS.gray05, border: `1px solid ${COLORS.gray10}` }}>
          <div className="text-[10px] font-bold mb-2" style={{ color: COLORS.blue, fontFamily: FONTS.title }}>
            {tireName} · {tireSize}
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>Usure actuelle</div>
              <div className="text-[13px] font-bold" style={{ color: COLORS.blueDark, fontFamily: FONTS.mono }}>{wearBefore}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>Après remplacement</div>
              <div className="text-[13px] font-bold" style={{ color: COLORS.success, fontFamily: FONTS.mono }}>
                {wheel === "both" ? "0% / 0%" : "0%"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider"
            style={{ background: COLORS.gray05, color: COLORS.grayDark, fontFamily: FONTS.title, border: `1px solid ${COLORS.gray10}` }}
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(wheel)}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider hover:opacity-90"
            style={{ background: saving ? COLORS.gray10 : COLORS.yellow, color: saving ? COLORS.gray40 : COLORS.blueDark, fontFamily: FONTS.title }}
          >
            {saving ? (
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: COLORS.gray40, borderTopColor: "transparent" }} />
            ) : (
              <CheckCircle size={13} />
            )}
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Michelin catalog picker ─────────────────────────────────────────────────

function MichelinPicker({ tires, catalog, recommendations, onConfirm, onCancel, saving }: {
  tires: TireSetOut;
  catalog: TireCatalogOut[];
  recommendations: RecommendationsOut | null;
  onConfirm: (tire: TireCatalogOut, size: string, wheel: WheelTarget) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [wheel, setWheel] = useState<WheelTarget>("both");
  const [filter, setFilter] = useState<TireType>("Tous");
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<Record<string, string>>({});

  const filtered = catalog.filter((t) => filter === "Tous" || t.type === filter);
  const picked = catalog.find((t) => t.id === selectedId);
  const pickedSize = selectedId ? (selectedSize[selectedId] ?? catalog.find((t) => t.id === selectedId)?.sizes[0] ?? "") : "";
  const currentId = wheel === "front" ? tires.front.catalog_id : tires.rear.catalog_id;
  const canInstall = !!picked && picked.id !== currentId && !saving;

  // Offre applicable à la roue sélectionnée (both → on prend la plus avantageuse)
  const offer =
    wheel === "both"
      ? [recommendations?.front, recommendations?.rear]
          .filter((o) => o && o.discount_pct > 0)
          .sort((a, b) => (b!.discount_pct ?? 0) - (a!.discount_pct ?? 0))[0]
      : recommendations?.[wheel];
  const discountByTireId: Record<string, number> =
    offer && offer.recommended ? { [offer.recommended.id]: offer.discount_pct } : {};

  return (
    <div className="mx-5 mb-4">
      {/* Wheel selector */}
      <div
        className="rounded-2xl p-4 mb-3 glass-panel"
      >
        <WheelSelector
          value={wheel}
          onChange={setWheel}
          rearWear={tires.rear.wear_pct}
          frontWear={tires.front.wear_pct}
        />
        <div className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
          {wheel === "both"
            ? "Le même pneu sera installé sur les deux roues."
            : `Seule la ${wheel === "rear" ? "roue arrière" : "roue avant"} sera remplacée.`}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: filter === f ? COLORS.blue : COLORS.white,
              color: filter === f ? COLORS.white : COLORS.gray50,
              border: filter === f ? "none" : `1px solid ${COLORS.gray10}`,
              fontFamily: FONTS.title,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Tire list */}
      <div className="flex flex-col gap-2 mb-3">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-[12px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
            Aucun pneu dans cette catégorie
          </div>
        ) : (
          filtered.map((tire) => {
            const sel = selectedId === tire.id;
            const size = selectedSize[tire.id] ?? tire.sizes[0];
            const isInstalled = tire.id === currentId;
            const discount = discountByTireId[tire.id];
            return (
              <div
                key={tire.id}
                className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(10px) saturate(140%)",
                  WebkitBackdropFilter: "blur(10px) saturate(140%)",
                  border: sel ? `2px solid ${COLORS.blue}` : `1px solid ${COLORS.glassBorder}`,
                  boxShadow: sel ? `0 6px 18px rgba(39,80,155,0.18)` : `0 2px 8px rgba(0,32,91,0.05)`,
                }}
              >
                <button
                  onClick={() => setSelectedId(tire.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: sel ? COLORS.blue : COLORS.gray05 }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                      <circle cx="12" cy="12" r="9" stroke={sel ? COLORS.yellow : COLORS.gray40} strokeWidth="2" />
                      <circle cx="12" cy="12" r="5" stroke={sel ? COLORS.yellow : COLORS.gray40} strokeWidth="1.5" />
                      <circle cx="12" cy="12" r="1.5" fill={sel ? COLORS.yellow : COLORS.gray40} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-black" style={{ color: COLORS.blueDark, fontFamily: FONTS.title }}>{tire.name}</span>
                      {discount > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center gap-0.5"
                          style={{ background: COLORS.yellow, color: COLORS.blueDark, fontFamily: FONTS.title }}
                        >
                          <Gift size={9} /> -{discount}%
                        </span>
                      )}
                      {tire.tag && (
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase"
                          style={{
                            background: isInstalled ? "#DCFCE7" : tire.tag === "Nouveau" ? COLORS.yellow : COLORS.gray05,
                            color: isInstalled ? "#16A34A" : tire.tag === "Nouveau" ? COLORS.blueDark : COLORS.grayDark,
                            fontFamily: FONTS.title,
                          }}
                        >
                          {isInstalled ? "Installé" : tire.tag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <TireTypeTag type={tire.type} />
                      <span className="text-[9px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>{tire.weight}</span>
                      {discount > 0 && (
                        <span className="text-[9px] font-semibold" style={{ color: COLORS.blue, fontFamily: FONTS.body }}>
                          Recommandé pour vous
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: sel ? COLORS.blue : COLORS.gray10 }}
                  >
                    {sel && <CheckCircle size={12} color={COLORS.white} />}
                  </div>
                </button>

                {sel && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5" style={{ borderTop: `1px solid ${COLORS.gray10}` }}>
                    <span className="w-full text-[9px] uppercase tracking-widest pt-2 mb-0.5" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>Taille</span>
                    {tire.sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize((prev) => ({ ...prev, [tire.id]: s }))}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                        style={{
                          background: size === s ? COLORS.blue : COLORS.gray05,
                          color: size === s ? COLORS.white : COLORS.grayDark,
                          fontFamily: FONTS.mono,
                          border: `1px solid ${size === s ? COLORS.blue : COLORS.gray10}`,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider"
          style={{ background: COLORS.white, color: COLORS.grayDark, fontFamily: FONTS.title, border: `1px solid ${COLORS.gray10}` }}
        >
          Annuler
        </button>
        <button
          onClick={() => picked && onConfirm(picked, pickedSize, wheel)}
          disabled={!canInstall}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all"
          style={{
            background: canInstall ? COLORS.yellow : COLORS.gray10,
            color: canInstall ? COLORS.blueDark : COLORS.gray40,
            fontFamily: FONTS.title,
            cursor: canInstall ? "pointer" : "not-allowed",
          }}
        >
          {saving ? (
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: COLORS.gray40, borderTopColor: "transparent" }} />
          ) : (
            <CheckCircle size={13} />
          )}
          Installer — {WHEEL_LABELS[wheel]}
        </button>
      </div>
    </div>
  );
}

// ─── Other brand panel ───────────────────────────────────────────────────────

const OTHER_TYPES = ["Route", "Gravel", "VTT", "Piste", "Cyclocross"] as const;
type OtherType = typeof OTHER_TYPES[number];

function OtherBrandPanel({ tires, onConfirm, onCancel, saving }: {
  tires: TireSetOut;
  onConfirm: (name: string, size: string, type: OtherType, wheel: WheelTarget) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [wheel, setWheel] = useState<WheelTarget>("both");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [size, setSize] = useState("");
  const [type, setType] = useState<OtherType>("Route");

  const fullName = [brand.trim(), model.trim()].filter(Boolean).join(" ");
  const canSubmit = fullName.length > 0 && size.trim().length > 0 && !saving;

  return (
    <div
      className="mx-5 mb-4 rounded-2xl overflow-hidden glass-panel"
    >
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${COLORS.gray10}` }}>
        <PenLine size={13} color={COLORS.grayDark} />
        <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: COLORS.grayDark, fontFamily: FONTS.title }}>
          Autre marque
        </span>
        <span
          className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
          style={{ background: COLORS.gray05, color: COLORS.gray50, fontFamily: FONTS.title }}
        >
          Hors catalogue
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <WheelSelector
          value={wheel}
          onChange={setWheel}
          rearWear={tires.rear.wear_pct}
          frontWear={tires.front.wear_pct}
        />

        <div>
          <label className="text-[9px] uppercase tracking-widest font-bold block mb-1.5" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
            Marque *
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="ex : Continental, Schwalbe, Pirelli…"
            className="w-full px-3 py-2.5 rounded-xl text-[12px] outline-none transition-all"
            style={{ border: `1px solid ${brand ? COLORS.blue : COLORS.gray10}`, fontFamily: FONTS.body, color: COLORS.blueDark }}
          />
        </div>

        <div>
          <label className="text-[9px] uppercase tracking-widest font-bold block mb-1.5" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
            Modèle
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="ex : Grand Prix 5000, Marathon Plus…"
            className="w-full px-3 py-2.5 rounded-xl text-[12px] outline-none transition-all"
            style={{ border: `1px solid ${model ? COLORS.blue : COLORS.gray10}`, fontFamily: FONTS.body, color: COLORS.blueDark }}
          />
        </div>

        <div>
          <label className="text-[9px] uppercase tracking-widest font-bold block mb-1.5" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
            Taille *
          </label>
          <input
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="ex : 700x28C, 29x2.2…"
            className="w-full px-3 py-2.5 rounded-xl text-[12px] outline-none transition-all"
            style={{ border: `1px solid ${size ? COLORS.blue : COLORS.gray10}`, fontFamily: FONTS.mono, color: COLORS.blueDark }}
          />
        </div>

        <div>
          <label className="text-[9px] uppercase tracking-widest font-bold block mb-1.5" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
            Catégorie
          </label>
          <div className="flex flex-wrap gap-1.5">
            {OTHER_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all"
                style={{
                  background: type === t ? COLORS.grayDark : COLORS.gray05,
                  color: type === t ? COLORS.white : COLORS.gray50,
                  fontFamily: FONTS.title,
                  border: `1px solid ${type === t ? COLORS.grayDark : COLORS.gray10}`,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: "#FEF9C3", border: "1px solid #FDE68A" }}>
          <AlertTriangle size={11} color="#B45309" className="mt-0.5 flex-shrink-0" />
          <p className="text-[10px] leading-relaxed" style={{ color: "#78350F", fontFamily: FONTS.body }}>
            Les pneus hors MICHELIN sont suivis dans la catégorie <strong>Autre</strong>. Le suivi d'usure est basé sur des estimations génériques.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider"
            style={{ background: COLORS.gray05, color: COLORS.grayDark, fontFamily: FONTS.title, border: `1px solid ${COLORS.gray10}` }}
          >
            Annuler
          </button>
          <button
            onClick={() => canSubmit && onConfirm(fullName, size.trim(), type, wheel)}
            disabled={!canSubmit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: canSubmit ? COLORS.blueDark : COLORS.gray10,
              color: canSubmit ? COLORS.white : COLORS.gray40,
              fontFamily: FONTS.title,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {saving ? (
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: COLORS.gray40, borderTopColor: "transparent" }} />
            ) : (
              <CheckCircle size={13} />
            )}
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Success banner ──────────────────────────────────────────────────────────

function SuccessBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="mx-5 mb-4 rounded-2xl p-4 flex items-center gap-3"
      style={{ background: COLORS.successLight, border: `1px solid ${COLORS.successDark}` }}
    >
      <CheckCircle size={20} color={COLORS.success} className="flex-shrink-0" />
      <div className="flex-1">
        <div className="text-[12px] font-bold" style={{ color: COLORS.success, fontFamily: FONTS.body }}>
          Mise à jour enregistrée
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: "#2E7D32", fontFamily: FONTS.body }}>
          {message}
        </div>
      </div>
      <button onClick={onDismiss} style={{ color: COLORS.gray40 }}>
        <RotateCcw size={13} />
      </button>
    </div>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function TireUpdateScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [tires, setTires] = useState<TireSetOut | null>(null);
  const [catalog, setCatalog] = useState<TireCatalogOut[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationsOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([tiresApi.getTires(), tiresApi.getCatalog(), tiresApi.getRecommendations()])
      .then(([t, c, r]) => {
        setTires(t);
        setCatalog(c);
        setRecommendations(r);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Mutations ──────────────────────────────────────────────────────────────

  async function patchWheel(wheel: WheelPosition, src: TireOut): Promise<TireOut> {
    return tiresApi.updateTire(wheel, {
      brand: src.brand,
      catalog_id: src.catalog_id ?? undefined,
      name: src.brand === "other" ? src.name : undefined,
      size: src.size,
      category: src.category ?? undefined,
      reset_wear: true,
    });
  }

  const handleReplaceSame = async (wheel: WheelTarget) => {
    if (!tires) return;
    setSaving(true);
    try {
      const [newRear, newFront] = await Promise.all([
        wheel !== "front" ? patchWheel("rear", tires.rear) : Promise.resolve(tires.rear),
        wheel !== "rear" ? patchWheel("front", tires.front) : Promise.resolve(tires.front),
      ]);
      setTires({ rear: newRear, front: newFront });
      const label = WHEEL_LABELS[wheel];
      setSuccessMsg(`${label} remplacée${wheel === "both" ? "s" : ""} par des neufs — compteur remis à zéro.`);
      setMode("idle");
    } catch {
      // silently — user sees no change, can retry
    } finally {
      setSaving(false);
    }
  };

  const handleNewMichelin = async (tire: TireCatalogOut, size: string, wheel: WheelTarget) => {
    setSaving(true);
    try {
      const patch = { brand: "michelin" as const, catalog_id: tire.id, size, reset_wear: true };
      const [newRear, newFront] = await Promise.all([
        wheel !== "front" ? tiresApi.updateTire("rear", patch) : Promise.resolve(tires!.rear),
        wheel !== "rear" ? tiresApi.updateTire("front", patch) : Promise.resolve(tires!.front),
      ]);
      setTires({ rear: newRear, front: newFront });
      setSuccessMsg(`MICHELIN ${tire.name} ${size} installé${wheel === "both" ? "s sur les deux roues" : ` sur la ${WHEEL_LABELS[wheel].toLowerCase()}`}.`);
      setMode("idle");
    } catch {
      // silently
    } finally {
      setSaving(false);
    }
  };

  const handleOther = async (name: string, size: string, type: string, wheel: WheelTarget) => {
    setSaving(true);
    try {
      const patch = { brand: "other" as const, name, size, category: type, reset_wear: true };
      const [newRear, newFront] = await Promise.all([
        wheel !== "front" ? tiresApi.updateTire("rear", patch) : Promise.resolve(tires!.rear),
        wheel !== "rear" ? tiresApi.updateTire("front", patch) : Promise.resolve(tires!.front),
      ]);
      setTires({ rear: newRear, front: newFront });
      setSuccessMsg(`${name} ${size} enregistré${wheel === "both" ? "s sur les deux roues" : ` sur la ${WHEEL_LABELS[wheel].toLowerCase()}`} (Autre).`);
      setMode("idle");
    } catch {
      // silently
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: COLORS.bgGradient }}>
      <AppHeader onPartnersClick={() => onNavigate("partners")} />

      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          {mode !== "idle" ? (
            <button
              onClick={() => setMode("idle")}
              className="flex items-center gap-1.5 mb-3 transition-opacity hover:opacity-70"
            >
              <ArrowLeft size={15} color={COLORS.blue} />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ fontFamily: FONTS.title, color: COLORS.blue }}>
                Retour
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <Wrench size={12} color={COLORS.warning} />
              <p className="text-[10px] uppercase tracking-widest" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
                Gestion
              </p>
            </div>
          )}
          <h1
            className="uppercase leading-none"
            style={{ fontFamily: FONTS.title, fontSize: "26px", fontWeight: 800, letterSpacing: "0.04em", color: COLORS.blue }}
          >
            {mode === "replace-new" ? "Choisir un modèle" : mode === "other" ? "Autre marque" : mode === "replace-same" ? "Remplacer" : "Mes Pneus"}
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: COLORS.blue, borderTopColor: "transparent" }} />
          </div>
        ) : !tires ? (
          <div className="mx-5 py-8 text-center text-[12px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
            Impossible de charger les données pneus.
          </div>
        ) : (
          <>
            {successMsg && mode === "idle" && (
              <SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg(null)} />
            )}

            {mode === "idle" && (
              <CurrentTireCard tires={tires} recommendations={recommendations} onAction={setMode} />
            )}

            {mode === "replace-same" && (
              <ReplaceSamePanel
                tires={tires}
                onConfirm={handleReplaceSame}
                onCancel={() => setMode("idle")}
                saving={saving}
              />
            )}

            {mode === "replace-new" && (
              <MichelinPicker
                tires={tires}
                catalog={catalog}
                recommendations={recommendations}
                onConfirm={handleNewMichelin}
                onCancel={() => setMode("idle")}
                saving={saving}
              />
            )}

            {mode === "other" && (
              <OtherBrandPanel
                tires={tires}
                onConfirm={handleOther}
                onCancel={() => setMode("idle")}
                saving={saving}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
