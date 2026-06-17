"use client";

import Link from "next/link";
import { Loader } from "lucide-react";
import { COLORS, FONTS } from "@/app/lib/constants";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10"
      style={{ background: COLORS.bgGradient, fontFamily: FONTS.body }}
    >
      <div className="w-full max-w-[420px] rounded-3xl p-8 glass-panel-strong">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-9 h-9 flex items-center justify-center rounded-sm flex-shrink-0"
            style={{ background: COLORS.blue }}
          >
            <svg width="20" height="16" viewBox="0 0 18 14" fill="none">
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
              className="text-[15px] font-black uppercase tracking-wider leading-none"
              style={{ color: COLORS.blue, fontFamily: FONTS.title }}
            >
              RaceLab
            </div>
          </div>
        </div>
        <h1
          className="mt-6 uppercase leading-none"
          style={{
            fontFamily: FONTS.title,
            fontSize: "26px",
            fontWeight: 800,
            letterSpacing: "0.04em",
            color: COLORS.heading,
          }}
        >
          {title}
        </h1>
        <p className="text-[12px] mt-1 mb-6" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
          {subtitle}
        </p>
        {children}
      </div>
    </div>
  );
}

export function AuthField({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        className="text-[9px] uppercase tracking-widest font-bold block mb-1"
        style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
      >
        {label}
      </label>
      <input
        type={type}
        required
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none transition-all"
        style={{
          border: `1px solid ${COLORS.gray20}`,
          fontFamily: FONTS.body,
          background: COLORS.surface,
          color: COLORS.heading,
          caretColor: COLORS.blue,
        }}
      />
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="text-[11px] px-3 py-2 rounded-xl"
      style={{ background: COLORS.dangerLight, color: COLORS.danger, fontFamily: FONTS.body }}
    >
      {message}
    </div>
  );
}

export function SubmitButton({
  loading,
  icon,
  label,
  loadingLabel = "Veuillez patienter…",
}: {
  loading: boolean;
  icon: React.ReactNode;
  label: string;
  loadingLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all mt-1"
      style={{ background: COLORS.blue, color: "white", fontFamily: FONTS.title, opacity: loading ? 0.7 : 1 }}
    >
      {loading ? <Loader size={14} className="animate-spin" /> : icon}
      {loading ? loadingLabel : label}
    </button>
  );
}

export function StravaAuthButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all"
      style={{
        background: "#FC4C02",
        color: "white",
        fontFamily: FONTS.title,
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? <Loader size={14} className="animate-spin" /> : (
        <div className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
          <div className="w-2 h-2 rounded-full" style={{ background: "#FC4C02" }} />
        </div>
      )}
      {loading ? "Redirection…" : "Continuer avec Strava"}
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: COLORS.gray20 }} />
      <span className="text-[10px] uppercase tracking-widest" style={{ color: COLORS.gray40, fontFamily: FONTS.title }}>
        ou
      </span>
      <div className="flex-1 h-px" style={{ background: COLORS.gray20 }} />
    </div>
  );
}

export function AuthSwitchLink({
  question,
  linkLabel,
  href,
}: {
  question: string;
  linkLabel: string;
  href: string;
}) {
  return (
    <p className="text-[12px] text-center mt-5" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
      {question}{" "}
      <Link href={href} className="font-bold" style={{ color: COLORS.blue }}>
        {linkLabel}
      </Link>
    </p>
  );
}
