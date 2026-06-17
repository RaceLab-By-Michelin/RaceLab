"use client"

import { ChevronLeft, Globe } from "lucide-react";
import { COLORS, FONTS } from "@/app/lib/constants";

interface AppHeaderProps {
  showLiveEvent?: boolean;
  rightSlot?: React.ReactNode;
  /** Affiche un bouton retour en haut à gauche à la place du logo (ex: page Partenaires). */
  onBack?: () => void;
  /** Affiche un raccourci vers la page Partenaires en haut à droite. */
  onPartnersClick?: () => void;
}

function MichelinLogo() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 flex items-center justify-center rounded-sm flex-shrink-0"
        style={{ background: COLORS.blue }}
      >
        {/* Michelin "M" wordmark */}
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
      <div>
        <div
          className="text-[10px] uppercase tracking-widest leading-none"
          style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
        >
          MICHELIN
        </div>
        <div
          className="text-[13px] font-black uppercase tracking-wider leading-none"
          style={{ color: COLORS.blue, fontFamily: FONTS.title }}
        >
          RaceLab
        </div>
      </div>
    </div>
  );
}

export function StravaTag() {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{ background: "rgba(52,211,153,0.14)", border: "1px solid #BBF7D0" }}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "#34D399", fontFamily: FONTS.title }}
      >
        STRAVA SYNCED
      </span>
    </div>
  );
}

export function AppHeader({ showLiveEvent = false, rightSlot, onBack, onPartnersClick }: AppHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-5 pt-12 pb-4 lg:pt-4 lg:pb-3 glass-bar flex-shrink-0"
      style={{ borderBottom: `1px solid ${COLORS.glassBorder}` }}
    >
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Retour"
          className="flex items-center gap-1 -ml-1 pr-2 py-1 rounded-lg transition-opacity hover:opacity-70"
        >
          <ChevronLeft size={20} color={COLORS.blue} />
          <span
            className="text-[12px] font-bold uppercase tracking-wider"
            style={{ color: COLORS.blue, fontFamily: FONTS.title }}
          >
            Retour
          </span>
        </button>
      ) : (
        <MichelinLogo />
      )}

      <div className="flex items-center gap-2">
        {showLiveEvent && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(255,184,0,0.12)", border: "1px solid #FDE68A" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#B45309] animate-pulse" />
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "#FFC861", fontFamily: FONTS.title }}
            >
              LIVE EVENT
            </span>
          </div>
        )}
        {onPartnersClick && (
          <button
            onClick={onPartnersClick}
            aria-label="Partenaires"
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-opacity hover:opacity-70"
            style={{ background: COLORS.gray05 }}
          >
            <Globe size={16} color={COLORS.blue} />
          </button>
        )}
        {rightSlot}
      </div>
    </div>
  );
}
