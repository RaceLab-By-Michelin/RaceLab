"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bike, CircleDot, Loader } from "lucide-react";
import { COLORS, FONTS, MICHELIN_TIRES } from "@/app/lib/constants";
import { userApi } from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth-context";
import type { OnboardingTireIn, TireBrand } from "@/app/lib/api";

interface TireFormState {
  brand: TireBrand;
  catalogId: string;
  name: string;
  size: string;
}

const DEFAULT_TIRE: TireFormState = {
  brand: "michelin",
  catalogId: MICHELIN_TIRES[0].id,
  name: "",
  size: MICHELIN_TIRES[0].sizes[0],
};

function toOnboardingTire(t: TireFormState): OnboardingTireIn {
  if (t.brand === "michelin") {
    const catalog = MICHELIN_TIRES.find((m) => m.id === t.catalogId);
    return { brand: "michelin", catalog_id: t.catalogId, size: t.size || catalog?.sizes[0] || "" };
  }
  return { brand: "other", name: t.name, size: t.size };
}

const inputStyle: React.CSSProperties = {
  border: `1px solid ${COLORS.gray20}`,
  fontFamily: FONTS.body,
  background: COLORS.surface,
  color: COLORS.heading,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="text-[9px] uppercase tracking-widest font-bold block mb-1"
        style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function TireFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TireFormState;
  onChange: (t: TireFormState) => void;
}) {
  const catalog = MICHELIN_TIRES.find((m) => m.id === value.catalogId);
  return (
    <div className="rounded-2xl p-3.5 glass-panel">
      <div className="flex items-center gap-2 mb-2.5">
        <CircleDot size={13} color={COLORS.blue} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: COLORS.blue, fontFamily: FONTS.title }}>
          {label}
        </span>
      </div>
      <div className="flex gap-1.5 mb-2.5">
        {(["michelin", "other"] as TireBrand[]).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onChange({ ...value, brand: b })}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{
              background: value.brand === b ? COLORS.blue : COLORS.gray05,
              color: value.brand === b ? "white" : COLORS.gray50,
              fontFamily: FONTS.title,
            }}
          >
            {b === "michelin" ? "Michelin" : "Autre marque"}
          </button>
        ))}
      </div>
      {value.brand === "michelin" ? (
        <div className="flex flex-col gap-2">
          <Field label="Modèle">
            <select
              className="w-full px-3 py-2 rounded-xl text-[12px] outline-none"
              style={inputStyle}
              value={value.catalogId}
              onChange={(e) => {
                const c = MICHELIN_TIRES.find((m) => m.id === e.target.value);
                onChange({ ...value, catalogId: e.target.value, size: c?.sizes[0] ?? "" });
              }}
            >
              {MICHELIN_TIRES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Taille">
            <select
              className="w-full px-3 py-2 rounded-xl text-[12px] outline-none"
              style={inputStyle}
              value={value.size}
              onChange={(e) => onChange({ ...value, size: e.target.value })}
            >
              {(catalog?.sizes ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Field label="Nom du pneu">
            <input
              required
              className="w-full px-3 py-2 rounded-xl text-[12px] outline-none"
              style={inputStyle}
              placeholder="Continental GP5000…"
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
            />
          </Field>
          <Field label="Taille">
            <input
              required
              className="w-full px-3 py-2 rounded-xl text-[12px] outline-none"
              style={inputStyle}
              placeholder="700x25C"
              value={value.size}
              onChange={(e) => onChange({ ...value, size: e.target.value })}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const [city, setCity] = useState("");
  const [bikeBrand, setBikeBrand] = useState("");
  const [bikeModel, setBikeModel] = useState("");
  const [bikeYear, setBikeYear] = useState(String(new Date().getFullYear()));
  const [front, setFront] = useState<TireFormState>(DEFAULT_TIRE);
  const [rear, setRear] = useState<TireFormState>(DEFAULT_TIRE);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pas connecté → l'onboarding n'a pas de sens sans compte.
  // Déjà onboardé → pas besoin de repasser par ici.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.onboarding_completed) {
      router.replace("/telemetry");
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await userApi.submitOnboarding({
        city: city || undefined,
        bike_brand: bikeBrand,
        bike_model: bikeModel,
        bike_year: Number(bikeYear),
        front_tire: toOnboardingTire(front),
        rear_tire: toOnboardingTire(rear),
      });
      await refresh();
      router.replace("/telemetry");
    } catch {
      setError("Impossible d'enregistrer ces informations. Vérifiez les champs et réessayez.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || user.onboarding_completed) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: COLORS.bgGradient }}>
        <Loader size={20} color={COLORS.blue} className="animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10"
      style={{ background: COLORS.bgGradient, fontFamily: FONTS.body }}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-[480px] rounded-3xl p-7 glass-panel-strong flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bike size={13} color={COLORS.warning} />
            <p className="text-[10px] uppercase tracking-widest" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
              Bienvenue
            </p>
          </div>
          <h1
            className="uppercase leading-none"
            style={{ fontFamily: FONTS.title, fontSize: "24px", fontWeight: 800, letterSpacing: "0.04em", color: COLORS.heading }}
          >
            Configurez votre profil
          </h1>
          <p className="text-[12px] mt-1.5" style={{ color: COLORS.gray50 }}>
            Renseignez votre vélo et vos pneus pour démarrer le suivi d&apos;usure.
          </p>
        </div>

        <Field label="Ville (optionnel)">
          <input
            className="w-full px-3 py-2 rounded-xl text-[12px] outline-none"
            style={inputStyle}
            placeholder="Lyon, France"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Marque du vélo">
            <input
              required
              className="w-full px-3 py-2 rounded-xl text-[12px] outline-none"
              style={inputStyle}
              placeholder="Trek, Canyon…"
              value={bikeBrand}
              onChange={(e) => setBikeBrand(e.target.value)}
            />
          </Field>
          <Field label="Modèle">
            <input
              required
              className="w-full px-3 py-2 rounded-xl text-[12px] outline-none"
              style={inputStyle}
              placeholder="Domane, CF SL…"
              value={bikeModel}
              onChange={(e) => setBikeModel(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Année">
          <input
            required
            type="number"
            className="w-full px-3 py-2 rounded-xl text-[12px] outline-none"
            style={inputStyle}
            value={bikeYear}
            onChange={(e) => setBikeYear(e.target.value)}
          />
        </Field>

        <TireFields label="Pneu avant" value={front} onChange={setFront} />
        <TireFields label="Pneu arrière" value={rear} onChange={setRear} />

        {error && (
          <div className="text-[11px] px-3 py-2 rounded-xl" style={{ background: COLORS.dangerLight, color: COLORS.danger }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all"
          style={{ background: COLORS.blue, color: "white", fontFamily: FONTS.title, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <Loader size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          {saving ? "Enregistrement…" : "Terminer"}
        </button>
      </form>
    </div>
  );
}
