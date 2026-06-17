"use client"

import { useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Zap, Globe, Shield } from "lucide-react";
import { AppHeader } from "./ui/AppHeader";
import { COLORS, FONTS } from "@/app/lib/constants";

// ─── Données statiques ────────────────────────────────────────────────────────

const TEAM_PHOTOS = [
  { src: "/TeamPicnicPostNL-bike.jpg",   alt: "Team Picnic PostNL en course" },
  { src: "/TeamPicnicPostNL-bike-2.jpg", alt: "Peloton Team Picnic PostNL" },
  { src: "/TeamPicnicPostNL-bike-3.jpg", alt: "Team Picnic PostNL sprint" },
  { src: "/TeamPicnicPostNL-bike-4.jpg", alt: "Team Picnic PostNL team" },
];

const MICHELIN_EXPERTISE = [
  {
    emoji: "🛣️",
    title: "Route",
    subtitle: "Performance & endurance",
    description:
      "Les pneus MICHELIN Power offrent une adhérence maximale sur bitume sec ou mouillé. Technologie Protek+ pour une résistance aux crevaisons sans compromis sur le roulement.",
    specs: ["700×23C à 32C", "6–8 bar", "175–230 g"],
    color: COLORS.blue,
  },
  {
    emoji: "🌿",
    title: "Gravel",
    subtitle: "Polyvalence tout-terrain",
    description:
      "La gamme Power Gravel combine crampons mixtes et carcasse renforcée pour enchainer routes et chemins. Grip exceptionnel sur graviers, terres et rocailles.",
    specs: ["700×35C à 45C", "3–5 bar", "380–460 g"],
    color: "#34D399",
  },
  {
    emoji: "🏆",
    title: "Piste",
    subtitle: "Technologie compétition",
    description:
      "Utilisés en compétition UCI, les pneus MICHELIN Lithion offrent le minimum de résistance au roulement et une enveloppe ultrafine pour les pistards et triathlètes.",
    specs: ["700×23C", "10–12 bar", "155–180 g"],
    color: "#C084FC",
  },
  {
    emoji: "⛰️",
    title: "VTT / MTB",
    subtitle: "Domination en trail",
    description:
      "La gamme Force XC/AM couvre du cross-country au all-mountain. Compound Dual Compound avec flancs souples et centre durci pour vitesse et grip.",
    specs: ["27.5\" / 29\"", "1.5–2.5 bar", "650–900 g"],
    color: "#FFC861",
  },
];

// ─── Composants ───────────────────────────────────────────────────────────────

function MichelinLogoMark() {
  return (
    <div
      className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
      style={{ background: COLORS.blue }}
    >
      <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
        <path
          d="M1 13V1L5 9L9 1L13 9L17 1V13"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function TeamCarousel() {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const go = (dir: 1 | -1) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent((c) => (c + dir + TEAM_PHOTOS.length) % TEAM_PHOTOS.length);
      setTransitioning(false);
    }, 150);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "16/9" }}>
      {/* Photo */}
      <img
        src={TEAM_PHOTOS[current].src}
        alt={TEAM_PHOTOS[current].alt}
        className="w-full h-full object-cover transition-opacity duration-150"
        style={{ opacity: transitioning ? 0 : 1 }}
      />

      {/* Overlay dégradé bas */}
      <div
        className="absolute inset-x-0 bottom-0 h-24"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)" }}
      />

      {/* Légende */}
      <div className="absolute bottom-3 left-4 right-16">
        <p className="text-white text-[11px] font-semibold" style={{ fontFamily: FONTS.body, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
          {TEAM_PHOTOS[current].alt}
        </p>
      </div>

      {/* Contrôles */}
      <button
        onClick={() => go(-1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      >
        <ChevronLeft size={16} color="white" />
      </button>
      <button
        onClick={() => go(1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      >
        <ChevronRight size={16} color="white" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {TEAM_PHOTOS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="rounded-full transition-all"
            style={{
              width: i === current ? "16px" : "6px",
              height: "6px",
              background: i === current ? COLORS.yellow : "rgba(255,255,255,0.5)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ExpertiseCard({ item }: { item: typeof MICHELIN_EXPERTISE[0] }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden glass-panel"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `${item.color}15` }}
        >
          {item.emoji}
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-black uppercase tracking-wide" style={{ color: COLORS.heading, fontFamily: FONTS.title }}>
            {item.title}
          </div>
          <div className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
            {item.subtitle}
          </div>
        </div>
        <ChevronRight
          size={14}
          color={COLORS.gray40}
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        />
      </button>

      {open && (
        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${COLORS.gray05}` }}>
          <p className="text-[12px] leading-relaxed mt-3 mb-3" style={{ color: COLORS.grayDark, fontFamily: FONTS.body }}>
            {item.description}
          </p>
          <div className="flex gap-2 flex-wrap">
            {item.specs.map((s) => (
              <span
                key={s}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
                style={{ background: `${item.color}12`, color: item.color, fontFamily: FONTS.mono }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function PartnersScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  return (
    <div className="flex flex-col h-full" style={{ background: COLORS.bgGradient }}>
      <AppHeader onBack={() => onNavigate("telemetry")} />

      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={12} color={COLORS.warning} />
            <p className="text-[10px] uppercase tracking-widest" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
              Michelin Cycling
            </p>
          </div>
          <h1
            className="uppercase leading-none"
            style={{ fontFamily: FONTS.title, fontSize: "26px", fontWeight: 800, letterSpacing: "0.04em", color: COLORS.blue }}
          >
            Partenaires &amp; Expertise
          </h1>
        </div>

        {/* ── Team Picnic PostNL ── */}
        <div
          className="mx-5 mb-4 rounded-2xl overflow-hidden glass-panel"
        >
          {/* En-tête team */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{
              background: `linear-gradient(90deg, #E8281E 0%, #F47B20 100%)`,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-white"
            >
              🚴
            </div>
            <div>
              <div className="text-white font-black text-[14px] uppercase tracking-wide" style={{ fontFamily: FONTS.title }}>
                Team Picnic PostNL
              </div>
              <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.75)", fontFamily: FONTS.body }}>
                Équipe WorldTeam masculine · Pays-Bas
              </div>
            </div>
          </div>

          {/* Galerie photo */}
          <div className="p-3 pb-0">
            <TeamCarousel />
          </div>

          {/* Description */}
          <div className="px-4 py-4">
            <p
              className="text-[12px] leading-relaxed mb-3"
              style={{ color: COLORS.grayDark, fontFamily: FONTS.body }}
            >
              La <strong>Team Picnic PostNL</strong> est une équipe professionnelle masculine de cyclisme sur route évoluant au niveau UCI WorldTeam.
              Basée aux Pays-Bas, elle s’inscrit dans la continuité des formations Skil-Shimano, Giant-Alpecin et DSM.
              L'équipe est reconnue pour son approche scientifique de la performance et le développement de jeunes talents,
              participant aux plus grandes courses du calendrier international comme les Grands Tours et les classiques.
            </p>

            {/* Stats équipe */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { value: "2005", label: "Fondation" },
                { value: "≈28", label: "Coureurs" },
                { value: "15+", label: "Nations" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-2.5 text-center"
                  style={{ background: COLORS.gray05, border: `1px solid ${COLORS.gray10}` }}
                >
                  <div className="font-black text-[15px]" style={{ color: COLORS.heading, fontFamily: FONTS.mono }}>
                    {s.value}
                  </div>
                  <div className="text-[9px] uppercase tracking-wide mt-0.5" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Palmarès */}
            <div
              className="rounded-xl p-3 mb-3"
              style={{ background: `${COLORS.yellow}15`, border: `1px solid ${COLORS.yellow}40` }}
            >
              <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: COLORS.onGold, fontFamily: FONTS.title }}>
                🏆 Palmarès récent
              </div>
              {[
                "Victoire d’étape sur le Tour de France",
                "Victoire d’étape sur le Giro d’Italia",
                "Victoire d’étape sur la Vuelta a España",
                "Classements généraux sur courses WorldTour",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 mb-1 last:mb-0">
                  <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: COLORS.blue }} />
                  <span className="text-[11px]" style={{ color: COLORS.grayDark, fontFamily: FONTS.body }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* Lien */}
            <a
              href="https://www.teampicnicpostnl.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all hover:opacity-80"
              style={{
                background: COLORS.gray05,
                color: COLORS.blue,
                fontFamily: FONTS.title,
                border: `1px solid ${COLORS.gray10}`,
              }}
            >
              <ExternalLink size={12} />
              Visiter le site officiel
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
