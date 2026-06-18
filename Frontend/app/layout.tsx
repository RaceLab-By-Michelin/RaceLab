import type { Metadata, Viewport } from 'next';

import { Noto_Sans, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'sonner';

import './globals.css';
import { StravaToastListener } from './components/StravaToastListener';
import { AuthProvider } from './lib/auth-context';
import { ThemeProvider, themeInitScript } from './lib/dark-mode-context';

const notoSans = Noto_Sans({
	subsets: ['latin'],
	weight: ['400', '500', '600', '700', '900'],
	variable: '--font-noto',
	display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
	subsets: ['latin'],
	weight: ['400', '500', '600', '700'],
	variable: '--font-space-grotesk',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Michelin RaceLab',
	description: "Suivi prédictif de l'usure de vos gommes",
};

export const viewport: Viewport = {
	colorScheme: 'dark light',
	themeColor: '#0B0D17',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html
			lang="fr"
			data-theme="dark"
			suppressHydrationWarning
			className={`dark ${notoSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
		>
			<head>
				{/* Space Grotesk for titling fallback, JetBrains Mono for metrics */}
				<link
					rel="stylesheet"
					href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap"
				/>
				{/* Applique le thème stocké avant l'hydratation pour éviter un flash. */}
				<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
			</head>
			<body suppressHydrationWarning className="flex min-h-full flex-col" style={{ background: 'var(--background)' }}>
				<ThemeProvider>
					<AuthProvider>
						{children}
						<StravaToastListener />
						<Toaster position="top-center" richColors closeButton />
					</AuthProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
