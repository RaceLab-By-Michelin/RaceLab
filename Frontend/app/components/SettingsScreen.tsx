"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Settings, Shield, Info, Loader, LogOut } from "lucide-react";
import { AppHeader } from "./ui/AppHeader";
import { AppFooter } from "./ui/AppFooter";
import { COLORS, FONTS } from "@/app/lib/constants";
import { settingsApi, authApi } from "@/app/lib/api";
import type { StravaOut } from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth-context";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SettingsScreenProps {
  onNavigate: (screen: string) => void;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-5 pt-4 pb-2">
      <span
        className="text-[10px] uppercase tracking-widest font-bold"
        style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
      >
        {label}
      </span>
    </div>
  );
}

function SettingRow({
  icon,
  label,
  description,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  right: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center px-4 py-3.5 gap-3 bg-white"
      style={{ borderBottom: `1px solid ${COLORS.gray05}` }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: COLORS.gray05 }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[13px] font-semibold"
          style={{ color: COLORS.blueDark, fontFamily: FONTS.body }}
        >
          {label}
        </div>
        {description && (
          <div
            className="text-[10px] mt-0.5 leading-relaxed"
            style={{ color: COLORS.gray50, fontFamily: FONTS.body }}
          >
            {description}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}

// ─── Strava section ──────────────────────────────────────────────────────────

function StravaSection() {
  const [strava, setStrava] = useState<StravaOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    settingsApi.getStrava().then(setStrava).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    setActing(true);
    try {
      const { authorize_url } = await settingsApi.getStravaAuthorizeUrl();
      window.location.href = authorize_url;
    } catch {
      setActing(false);
    }
  };

  const handleSync = async () => {
    setActing(true);
    setSyncMessage(null);
    try {
      const result = await settingsApi.syncStrava();
      setStrava(await settingsApi.getStrava());
      setSyncMessage(`${result.imported} nouvelle(s) sortie(s) importée(s)`);
    } catch {
      setSyncMessage("Synchronisation impossible pour le moment.");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-5 mb-4 rounded-2xl p-4 flex items-center justify-center glass-panel">
        <Loader size={16} color={COLORS.gray40} className="animate-spin" />
      </div>
    );
  }

  const connected = strava?.connected ?? false;

  return (
    <div
      className="mx-5 mb-4 rounded-2xl overflow-hidden glass-panel"
    >
      <SettingRow
        icon={<div className="w-4 h-4 rounded-full" style={{ background: "#FC4C02" }} />}
        label="Strava"
        description={
          connected
            ? strava?.athlete_name
              ? `Connecté en tant que ${strava.athlete_name}`
              : "Synchronisation automatique activée"
            : "Non connecté"
        }
        right={
          connected ? (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              <span className="text-[10px] font-semibold" style={{ color: "#16A34A", fontFamily: FONTS.title }}>
                Connecté
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-semibold" style={{ color: COLORS.gray40, fontFamily: FONTS.title }}>
              Déconnecté
            </span>
          )
        }
      />
      <div className="px-4 py-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${COLORS.gray05}` }}>
        {connected ? (
          <button
            onClick={handleSync}
            disabled={acting}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: "#EFF4FB",
              color: COLORS.blue,
              fontFamily: FONTS.title,
              border: `1px solid ${COLORS.glassBorder}`,
              opacity: acting ? 0.6 : 1,
            }}
          >
            {acting && <Loader size={12} className="animate-spin" />}
            Synchroniser mes sorties vélo
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={acting}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: COLORS.yellow,
              color: COLORS.blueDark,
              fontFamily: FONTS.title,
              border: "1px solid transparent",
              opacity: acting ? 0.6 : 1,
            }}
          >
            {acting && <Loader size={12} className="animate-spin" />}
            Connecter avec Strava
          </button>
        )}
        {syncMessage && (
          <p className="text-[10px] text-center" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
            {syncMessage}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Déconnexion ──────────────────────────────────────────────────────────────

function LogoutSection() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } finally {
      // Le jeton est effacé côté client/serveur, mais le contexte gardait
      // encore l'utilisateur en mémoire : sans ça, /login le voit toujours
      // "connecté" et nous renvoie aussitôt dans l'appli.
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <div className="mx-5 mb-4">
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[12px] font-bold uppercase tracking-wider transition-all"
        style={{
          background: COLORS.dangerLight,
          color: COLORS.danger,
          fontFamily: FONTS.title,
          border: `1px solid ${COLORS.dangerDark}`,
          opacity: loggingOut ? 0.6 : 1,
        }}
      >
        {loggingOut ? <Loader size={14} className="animate-spin" /> : <LogOut size={14} />}
        {loggingOut ? "Déconnexion…" : "Se déconnecter"}
      </button>
    </div>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function SettingsScreen({ onNavigate }: SettingsScreenProps) {
  return (
    <div className="flex flex-col h-full" style={{ background: COLORS.bgGradient }}>
      <AppHeader onPartnersClick={() => onNavigate("partners")} />

      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Settings size={12} color={COLORS.warning} />
            <p
              className="text-[10px] uppercase tracking-widest"
              style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
            >
              Application
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
            Paramètres
          </h1>
        </div>

        {/* Strava */}
        <SectionHeader label="Intégrations" />
        <StravaSection />

        {/* À propos */}
        <SectionHeader label="À propos" />
        <div
          className="mx-5 mb-4 rounded-2xl overflow-hidden glass-panel"
        >
          <SettingRow
            icon={<Info size={15} color={COLORS.gray50} />}
            label="Version"
            right={
              <span className="text-[11px]" style={{ color: COLORS.gray40, fontFamily: FONTS.mono }}>
                v1.0.0
              </span>
            }
          />
          <SettingRow
            icon={<Shield size={15} color={COLORS.gray50} />}
            label="Confidentialité & CGU"
            right={<ChevronRight size={14} color={COLORS.gray40} />}
          />
        </div>

        {/* Compte */}
        <SectionHeader label="Compte" />
        <LogoutSection />

        {/* Michelin branding */}
        <div className="px-5 pb-2 flex items-center gap-2">
          <div
            className="w-5 h-5 flex items-center justify-center rounded-sm flex-shrink-0"
            style={{ background: COLORS.blue }}
          >
            <svg width="11" height="9" viewBox="0 0 18 14" fill="none">
              <path d="M1 13V1L5 9L9 1L13 9L17 1V13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[10px]" style={{ color: COLORS.gray40, fontFamily: FONTS.title }}>
            MICHELIN RaceLab © 2026
          </span>
        </div>

        <AppFooter />
      </div>
    </div>
  );
}
