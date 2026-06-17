"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { authApi } from "@/app/lib/api";
import { useAuth } from "@/app/lib/auth-context";
import {
  AuthLayout,
  AuthField,
  ErrorBanner,
  SubmitButton,
  AuthSwitchLink,
  StravaAuthButton,
  AuthDivider,
} from "@/app/components/auth/AuthShared";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stravaLoading, setStravaLoading] = useState(false);

  const handleStravaClick = async () => {
    setStravaLoading(true);
    try {
      const { authorize_url } = await authApi.getStravaLoginAuthorizeUrl();
      window.location.href = authorize_url;
    } catch {
      setStravaLoading(false);
    }
  };

  // Déjà connecté → on ne reste pas sur l'écran de connexion.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(user.onboarding_completed ? "/telemetry" : "/onboarding");
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user: loggedInUser } = await authApi.login({ email, password });
      await refresh();
      router.replace(loggedInUser.onboarding_completed ? "/telemetry" : "/onboarding");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Connexion" subtitle="Accédez à votre suivi de pneus Michelin">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="vous@exemple.com" autoComplete="email" />
        <AuthField label="Mot de passe" type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" />
        {error && <ErrorBanner message={error} />}
        <SubmitButton loading={loading} icon={<LogIn size={14} />} label="Se connecter" />
      </form>
      <AuthDivider />
      <StravaAuthButton loading={stravaLoading} onClick={handleStravaClick} />
      <AuthSwitchLink question="Pas encore de compte ?" linkLabel="Créer un compte" href="/signup" />
    </AuthLayout>
  );
}
