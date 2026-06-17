'use client';

import { useEffect, useState } from 'react';

import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
	AuthLayout,
	AuthField,
	ErrorBanner,
	SubmitButton,
	AuthSwitchLink,
	StravaAuthButton,
	AuthDivider,
} from '@/app/components/auth/AuthShared';
import { authApi } from '@/app/lib/api';
import { useAuth } from '@/app/lib/auth-context';

export default function SignupPage() {
	const router = useRouter();
	const { user, loading: authLoading, refresh } = useAuth();
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
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

	useEffect(() => {
		if (!authLoading && user) {
			router.replace(user.onboarding_completed ? '/telemetry' : '/onboarding');
		}
	}, [authLoading, user, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			await authApi.register({ name, email, password });
			await refresh();
			router.replace('/onboarding');
		} catch (err: unknown) {
			const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
			setError(detail ?? 'Impossible de créer le compte. Vérifiez vos informations.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<AuthLayout title="Créer un compte" subtitle="Commencez le suivi de vos pneus en quelques secondes">
			<form onSubmit={handleSubmit} className="flex flex-col gap-3">
				<AuthField
					label="Nom"
					type="text"
					value={name}
					onChange={setName}
					placeholder="Alex Dupont"
					autoComplete="name"
				/>
				<AuthField
					label="Email"
					type="email"
					value={email}
					onChange={setEmail}
					placeholder="vous@exemple.com"
					autoComplete="email"
				/>
				<AuthField
					label="Mot de passe"
					type="password"
					value={password}
					onChange={setPassword}
					placeholder="8 caractères minimum"
					autoComplete="new-password"
				/>
				{error && <ErrorBanner message={error} />}
				<SubmitButton loading={loading} icon={<UserPlus size={14} />} label="Créer mon compte" />
			</form>
			<AuthDivider />
			<StravaAuthButton loading={stravaLoading} onClick={handleStravaClick} />
			<AuthSwitchLink question="Déjà un compte ?" linkLabel="Se connecter" href="/login" />
		</AuthLayout>
	);
}
