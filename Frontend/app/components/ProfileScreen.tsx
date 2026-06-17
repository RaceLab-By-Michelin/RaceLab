"use client"

import { useState, useEffect } from "react";
import { User, MapPin, Bike, Activity, Calendar, Zap, Check, X, Pencil, Loader } from "lucide-react";
import { AppHeader } from "./ui/AppHeader";
import { COLORS, FONTS } from "@/app/lib/constants";
import { userApi, ridesApi } from "@/app/lib/api";
import type { UserOut, StatsOut, RideOut, BikeOut } from "@/app/lib/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}

function fmtDate(iso: string): string {
  if (typeof window === "undefined") return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function fmtMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

/** Génère 1 ou 2 initiales à partir d'un nom complet */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Inline input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "10px",
  border: `1px solid ${COLORS.gray20}`,
  fontSize: "13px",
  fontFamily: FONTS.body,
  color: COLORS.heading,
  background: COLORS.gray05,
  outline: "none",
};

// ─── ProfileHero ─────────────────────────────────────────────────────────────

function ProfileHero({
  user,
  onUpdateUser,
}: {
  user: UserOut | null;
  onUpdateUser: (u: UserOut) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", city: "" });

  const name = user?.name ?? "—";
  const username = user?.username ?? "";
  const city = user?.city ?? "";
  const levelProgress = user?.level_progress ?? 0;
  const memberSince = user?.member_since ? fmtMemberSince(user.member_since) : "—";
  const avatarUrl = user?.avatar_url;

  const openEdit = () => {
    setForm({ name: user?.name ?? "", username: user?.username ?? "", city: user?.city ?? "" });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await userApi.patchMe(form);
      onUpdateUser(updated);
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="mx-5 mb-4 rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${COLORS.blueDark} 0%, ${COLORS.blue} 100%)`,
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: `0 12px 32px rgba(0,32,91,0.28), 0 1px 0 rgba(255,255,255,0.15) inset`,
      }}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Photo Strava si disponible, sinon avatar générique avec initiales */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 select-none"
              style={{ border: "2px solid rgba(255,255,255,0.3)" }}
              onError={(e) => {
                // Photo Strava parfois temporairement inaccessible : on retombe
                // sur les initiales plutôt que de casser le layout.
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 select-none"
              style={{
                background: COLORS.yellow,
                border: "2px solid rgba(255,255,255,0.3)",
                fontSize: "22px",
                fontWeight: 900,
                color: COLORS.heading,
                fontFamily: FONTS.title,
                letterSpacing: "0.04em",
              }}
            >
              {initials(name)}
            </div>
          )}

          {/* Infos ou formulaire */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex flex-col gap-2">
                <input
                  style={{ ...inputStyle }}
                  placeholder="Nom complet"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  style={{ ...inputStyle }}
                  placeholder="Nom d'utilisateur"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                />
                <input
                  style={{ ...inputStyle }}
                  placeholder="Ville"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                    style={{ background: COLORS.yellow, color: COLORS.onGold, fontFamily: FONTS.title }}
                  >
                    {saving ? <Loader size={11} className="animate-spin" /> : <Check size={11} />}
                    Enregistrer
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                    style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)", fontFamily: FONTS.title }}
                  >
                    <X size={11} />
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-black text-[18px] leading-tight" style={{ fontFamily: FONTS.title }}>
                    {name}
                  </h2>
                  <button
                    onClick={openEdit}
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.15)" }}
                    title="Modifier mes infos"
                  >
                    <Pencil size={10} color="rgba(255,255,255,0.9)" />
                  </button>
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.6)", fontFamily: FONTS.body }}>
                  @{username}
                </div>
                {city && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin size={9} color="rgba(255,255,255,0.5)" />
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)", fontFamily: FONTS.body }}>
                      {city}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {!editing && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "rgba(255,255,255,0.6)", fontFamily: FONTS.title }}>
                Progression niveau
              </span>
              <span className="text-[11px] font-bold" style={{ color: COLORS.yellow, fontFamily: FONTS.mono }}>
                {levelProgress}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(0, Math.min(100, levelProgress))}%`, background: COLORS.yellow }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BikeCard ────────────────────────────────────────────────────────────────

function BikeCard({
  user,
  onUpdateBike,
}: {
  user: UserOut | null;
  onUpdateBike: (b: BikeOut) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const bike = user?.bike;
  const [form, setForm] = useState({
    brand: "",
    model: "",
    year: "",
  });

  const openEdit = () => {
    setForm({
      brand: bike?.brand ?? "",
      model: bike?.model ?? "",
      year: String(bike?.year ?? new Date().getFullYear()),
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await userApi.patchBike({
        brand: form.brand || undefined,
        model: form.model || undefined,
        year: form.year ? Number(form.year) : undefined,
      });
      onUpdateBike(updated);
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const bikeColor = COLORS.blue;

  return (
    <div
      className="mx-5 mb-4 rounded-2xl p-4 glass-panel"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bike size={13} color={COLORS.blue} />
          <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: COLORS.blue, fontFamily: FONTS.title }}>
            Mon Vélo
          </span>
        </div>
        {!editing && (
          <button
            onClick={openEdit}
            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg"
            style={{ background: COLORS.gray05, color: COLORS.blue, fontFamily: FONTS.title }}
          >
            <Pencil size={9} />
            Modifier
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] uppercase tracking-widest font-bold block mb-1" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
                Marque
              </label>
              <input
                style={inputStyle}
                placeholder="Trek, Canyon…"
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-widest font-bold block mb-1" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
                Modèle
              </label>
              <input
                style={inputStyle}
                placeholder="Domane, CF SL…"
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-widest font-bold block mb-1" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
              Année
            </label>
            <input
              style={inputStyle}
              type="number"
              placeholder="2023"
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 mt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold"
              style={{ background: COLORS.blue, color: "white", fontFamily: FONTS.title }}
            >
              {saving ? <Loader size={11} className="animate-spin" /> : <Check size={11} />}
              Enregistrer
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold"
              style={{ background: COLORS.gray10, color: COLORS.grayDark, fontFamily: FONTS.title }}
            >
              <X size={11} />
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {/* Icône vélo colorée */}
          <div className="w-16 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: COLORS.gray05 }}>
            <svg viewBox="0 0 60 40" width="52" height="36" fill="none" stroke={bikeColor} strokeWidth="2.5">
              <circle cx="12" cy="28" r="9" />
              <circle cx="12" cy="28" r="6" />
              <circle cx="12" cy="28" r="1.5" fill={bikeColor} />
              <circle cx="48" cy="28" r="9" />
              <circle cx="48" cy="28" r="6" />
              <circle cx="48" cy="28" r="1.5" fill={bikeColor} />
              <line x1="12" y1="28" x2="26" y2="12" />
              <line x1="26" y1="12" x2="40" y2="28" />
              <line x1="26" y1="12" x2="30" y2="28" />
              <line x1="30" y1="28" x2="40" y2="28" />
              <line x1="30" y1="28" x2="48" y2="28" />
              <line x1="40" y1="13" x2="44" y2="13" />
              <line x1="40" y1="13" x2="40" y2="28" />
            </svg>
          </div>

          <div>
            <div className="text-[15px] font-black" style={{ color: COLORS.heading, fontFamily: FONTS.title }}>
              {bike ? `${bike.brand} ${bike.model}` : "—"}
            </div>
            {bike && (
              <div className="text-[11px] mt-0.5" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
                Millésime {bike.year}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StatsGrid ────────────────────────────────────────────────────────────────

function StatsGrid({ stats }: { stats: StatsOut | null }) {
  const items = [
    { label: "Km totaux", value: stats ? Math.round(stats.total_km).toLocaleString("fr-FR") : "—", unit: "km", icon: <Activity size={14} color={COLORS.blue} />, accent: false },
    { label: "Sorties", value: stats ? String(stats.total_rides) : "—", unit: "rides", icon: <Calendar size={14} color={COLORS.blue} />, accent: false },
    { label: "Challenges", value: stats ? String(stats.completed_challenges) : "—", unit: "complétés", icon: <Zap size={14} color={COLORS.yellow} />, accent: true },
    { label: "Dénivelé", value: stats ? stats.total_elevation.toLocaleString("fr-FR") : "—", unit: "m D+", icon: <MapPin size={14} color={COLORS.blue} />, accent: false },
  ];

  return (
    <div className="mx-5 mb-4 grid grid-cols-2 gap-3">
      {items.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl p-3.5 glass-panel"
          style={stat.accent ? { border: "1px solid rgba(255,200,0,0.3)" } : undefined}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            {stat.icon}
            <span className="text-[9px] uppercase tracking-widest" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
              {stat.label}
            </span>
          </div>
          <div className="text-[18px] font-black leading-none" style={{ color: stat.accent ? COLORS.yellow : COLORS.heading, fontFamily: FONTS.mono }}>
            {stat.value}
          </div>
          <div className="text-[9px] mt-0.5" style={{ color: COLORS.gray40, fontFamily: FONTS.body }}>
            {stat.unit}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── RecentRides ─────────────────────────────────────────────────────────────

function RecentRides({ rides }: { rides: RideOut[] }) {
  return (
    <div
      className="mx-5 mb-4 rounded-2xl overflow-hidden glass-panel"
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.gray10}` }}>
        <div className="flex items-center gap-2">
          <Activity size={13} color={COLORS.blue} />
          <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: COLORS.blue, fontFamily: FONTS.title }}>
            Dernières sorties
          </span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "rgba(52,211,153,0.14)", color: "#34D399", fontFamily: FONTS.title }}>
          <div className="w-1 h-1 rounded-full bg-[#34D399]" />
          Strava
        </div>
      </div>

      {rides.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
          Aucune sortie récente
        </div>
      ) : (
        rides.map((ride, i) => (
          <div
            key={ride.id}
            className="px-4 py-3 flex items-center gap-3"
            style={{ borderBottom: i < rides.length - 1 ? `1px solid ${COLORS.gray05}` : "none" }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: COLORS.gray05 }}>
              <Bike size={14} color={COLORS.blue} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold truncate" style={{ color: COLORS.heading, fontFamily: FONTS.body }}>
                {ride.name}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
                {fmtDate(ride.date)} · {fmtDuration(ride.duration_seconds)} · {ride.avg_speed.toFixed(1)} km/h
              </div>
            </div>
            <div className="text-[13px] font-bold flex-shrink-0" style={{ color: COLORS.blue, fontFamily: FONTS.mono }}>
              {ride.distance_km.toFixed(1)} km
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function ProfileScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [stats, setStats] = useState<StatsOut | null>(null);
  const [rides, setRides] = useState<RideOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([userApi.getMe(), userApi.getStats(), ridesApi.getRides({ limit: 3 })])
      .then(([u, s, r]) => { setUser(u); setStats(s); setRides(r); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateUser = (u: UserOut) => setUser(u);

  const handleUpdateBike = (b: BikeOut) => {
    setUser((prev) => (prev ? { ...prev, bike: b } : prev));
  };

  return (
    <div className="flex flex-col h-full" style={{ background: COLORS.bgGradient }}>
      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <User size={12} color={COLORS.warning} />
            <p className="text-[10px] uppercase tracking-widest" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
              Mon Compte
            </p>
          </div>
          <h1
            className="uppercase leading-none"
            style={{ fontFamily: FONTS.title, fontSize: "26px", fontWeight: 800, letterSpacing: "0.04em", color: COLORS.blue }}
          >
            Mon Profil
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: COLORS.blue, borderTopColor: "transparent" }} />
          </div>
        ) : (
          <>
            <ProfileHero user={user} onUpdateUser={handleUpdateUser} />
            <StatsGrid stats={stats} />
            <BikeCard user={user} onUpdateBike={handleUpdateBike} />
            <RecentRides rides={rides} />
          </>
        )}
      </div>
    </div>
  );
}
