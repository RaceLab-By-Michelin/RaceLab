"use client"

import { useState, useEffect, useCallback } from "react";
import { Users, ChevronRight, Loader, Share2, Check, MapPin } from "lucide-react";
import { AppHeader } from "./ui/AppHeader";
import { AppFooter } from "./ui/AppFooter";
import { COLORS, FONTS } from "@/app/lib/constants";
import { settingsApi } from "@/app/lib/api";
import type { StravaClubOut, StravaClubMemberOut } from "@/app/lib/api";

interface StravaClubsScreenProps {
  onBack: () => void;
}

// ─── Invitation par lien à partager (jamais d'envoi automatique) ──────────
//
// Conformément aux conditions d'utilisation de l'API Strava (interdiction de
// contacter des personnes n'ayant pas elles-mêmes autorisé l'application) et
// au choix produit retenu, l'invitation n'est jamais envoyée par le backend :
// c'est l'utilisateur connecté qui partage lui-même un lien, via le partage
// natif du système ou en copiant un message prérempli dans son presse-papiers.

function buildInviteMessage(firstname: string): string {
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `Salut ${firstname} ! Je suis sur MICHELIN RaceLab pour suivre mes sorties vélo et l'usure de mes pneus, connecté à Strava. Rejoins-moi : ${appUrl}`;
}

function InviteButton({ firstname }: { firstname: string }) {
  const [copied, setCopied] = useState(false);

  const handleInvite = useCallback(async () => {
    const message = buildInviteMessage(firstname);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch {
        // L'utilisateur a annulé le partage, ou l'API a échoué — on retombe
        // sur la copie presse-papiers ci-dessous.
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible (permissions navigateur) — rien d'autre
      // à faire côté client, l'utilisateur peut copier le message à la main.
    }
  }, [firstname]);

  return (
    <button
      onClick={handleInvite}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex-shrink-0"
      style={{
        background: copied ? COLORS.successLight : COLORS.yellow,
        color: copied ? COLORS.success : COLORS.onGold,
        fontFamily: FONTS.title,
      }}
    >
      {copied ? <Check size={12} /> : <Share2 size={12} />}
      {copied ? "Copié" : "Inviter"}
    </button>
  );
}

// ─── Liste des membres d'un club ───────────────────────────────────────────

function ClubMembersView({ club, onBack }: { club: StravaClubOut; onBack: () => void }) {
  const [members, setMembers] = useState<StravaClubMemberOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    settingsApi
      .getStravaClubMembers(club.id)
      .then(setMembers)
      .catch(() => setError("Impossible de récupérer les membres de ce club pour le moment."));
  }, [club.id]);

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 px-5 pt-4 pb-2 text-[11px] font-bold uppercase tracking-wider transition-opacity hover:opacity-70"
        style={{ color: COLORS.blue, fontFamily: FONTS.title }}
      >
        ← Tous les clubs
      </button>

      <div className="px-5 pb-3">
        <h2
          className="text-[17px] font-bold leading-tight"
          style={{ color: COLORS.heading, fontFamily: FONTS.title }}
        >
          {club.name}
        </h2>
        {club.member_count != null && (
          <p className="text-[11px] mt-0.5" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
            {club.member_count} membre{club.member_count > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {error && (
        <p className="px-5 pb-4 text-[12px]" style={{ color: COLORS.danger, fontFamily: FONTS.body }}>
          {error}
        </p>
      )}

      {!members && !error && (
        <div className="flex items-center justify-center py-10">
          <Loader size={18} color={COLORS.gray40} className="animate-spin" />
        </div>
      )}

      {members && members.length === 0 && (
        <p className="px-5 pb-6 text-[12px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
          Aucun membre visible pour ce club.
        </p>
      )}

      {members && members.length > 0 && (
        <div className="px-5 pb-6 flex flex-col gap-2">
          {/* Soi-même toujours en tête de liste, sans casser l'ordre du reste. */}
          {[...members]
            .sort((a, b) => Number(b.is_self) - Number(a.is_self))
            .map((m, idx) => (
            <div
              key={m.strava_id ?? `anon-${idx}`}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl glass-panel"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold"
                style={{ background: COLORS.gray05, color: COLORS.heading, fontFamily: FONTS.title }}
              >
                {(m.firstname?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[13px] font-semibold truncate"
                  style={{ color: COLORS.heading, fontFamily: FONTS.body }}
                >
                  {m.firstname} {m.lastname}
                  {m.is_self && (
                    <span className="ml-1.5 text-[10px]" style={{ color: COLORS.gray40 }}>
                      (vous)
                    </span>
                  )}
                </div>
                {m.city && (
                  <div
                    className="flex items-center gap-1 text-[10px] mt-0.5"
                    style={{ color: COLORS.gray50, fontFamily: FONTS.body }}
                  >
                    <MapPin size={10} />
                    {m.city}
                  </div>
                )}
              </div>

              {m.is_self ? null : m.is_app_user ? (
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0"
                  style={{ color: COLORS.success, fontFamily: FONTS.title }}
                >
                  Déjà inscrit
                </span>
              ) : (
                <InviteButton firstname={m.firstname || "toi"} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Liste des clubs de l'athlète ──────────────────────────────────────────

function ClubsListView({ clubs, onSelect }: { clubs: StravaClubOut[]; onSelect: (c: StravaClubOut) => void }) {
  if (clubs.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <Users size={28} color={COLORS.gray40} className="mx-auto mb-3" />
        <p className="text-[13px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
          Vous n&apos;appartenez à aucun club Strava pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-6 flex flex-col gap-2">
      {clubs.map((club) => (
        <button
          key={club.id}
          onClick={() => onSelect(club)}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-opacity hover:opacity-80 glass-panel"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: "rgba(252,76,2,0.14)" }}
          >
            {club.profile_medium ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={club.profile_medium} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users size={16} color="#FC4C02" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[13px] font-semibold truncate"
              style={{ color: COLORS.heading, fontFamily: FONTS.body }}
            >
              {club.name}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
              {club.member_count != null ? `${club.member_count} membres` : club.city || "Club Strava"}
            </div>
          </div>
          <ChevronRight size={16} color={COLORS.gray40} />
        </button>
      ))}
    </div>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function StravaClubsScreen({ onBack }: StravaClubsScreenProps) {
  const [clubs, setClubs] = useState<StravaClubOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StravaClubOut | null>(null);

  useEffect(() => {
    settingsApi
      .getStravaClubs()
      .then(setClubs)
      .catch(() => setError("Impossible de récupérer vos clubs Strava pour le moment."));
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ background: COLORS.bgGradient }}>
      <AppHeader onBack={onBack} />

      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
        {!selected && (
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Users size={12} color="#FC4C02" />
              <p
                className="text-[10px] uppercase tracking-widest"
                style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
              >
                Strava
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
              Mes clubs
            </h1>
            <p className="text-[11px] mt-2 leading-relaxed" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
              Retrouvez les membres de vos clubs Strava et invitez ceux qui ne sont pas encore sur RaceLab.
            </p>
          </div>
        )}

        {error && (
          <p className="px-5 pb-6 text-[12px]" style={{ color: COLORS.danger, fontFamily: FONTS.body }}>
            {error}
          </p>
        )}

        {!clubs && !error && (
          <div className="flex items-center justify-center py-10">
            <Loader size={18} color={COLORS.gray40} className="animate-spin" />
          </div>
        )}

        {clubs && !selected && <ClubsListView clubs={clubs} onSelect={setSelected} />}
        {selected && <ClubMembersView club={selected} onBack={() => setSelected(null)} />}

        <AppFooter />
      </div>
    </div>
  );
}
