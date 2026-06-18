'use client';

import { useEffect } from 'react';

import { Loader } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/app/lib/auth-context';
import { COLORS, FONTS } from '@/app/lib/constants';
import { NAV_ITEMS } from '@/app/lib/nav-items';
import type { Screen } from '@/app/lib/types';

function screenFromPath(pathname: string): Screen {
	const seg = pathname.split('/').filter(Boolean)[0];
	return (seg as Screen) || 'telemetry';
}

function AppShellInner({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const activeScreen = screenFromPath(pathname);

	const bgOuter = 'var(--background)';
	const bgPhone = COLORS.bgGradient;
	const navBg = 'var(--glass-bar-bg)';
	const navBorder = COLORS.glassBorder;

	return (
		<div className="size-full" style={{ fontFamily: FONTS.body }}>
			{/* ── Mobile : plein écran, responsive (< lg) ──────────────────────── */}
			<div className="flex w-full flex-col lg:hidden" style={{ minHeight: '100dvh', background: bgPhone }}>
				<div className="flex-1 overflow-hidden">{children}</div>

				{/* Bottom navigation */}
				<nav
					aria-label="Navigation principale"
					className="sticky bottom-0 z-50 flex flex-shrink-0 items-center px-1 pt-2 pb-[max(env(safe-area-inset-bottom),1rem)]"
					style={{
						borderTop: `1px solid ${navBorder}`,
						background: navBg,
						backdropFilter: 'blur(16px) saturate(140%)',
						WebkitBackdropFilter: 'blur(16px) saturate(140%)',
					}}
				>
					{NAV_ITEMS.map((item) => {
						const active = activeScreen === item.id;
						return (
							<button
								key={item.id}
								onClick={() => router.push(`/${item.id}`)}
								className="flex flex-1 flex-col items-center gap-0.5 transition-all"
								aria-label={item.label}
								aria-current={active ? 'page' : undefined}
							>
								<div
									className="flex h-8 w-8 items-center justify-center rounded-xl transition-all"
									style={
										active
											? { background: COLORS.yellow }
											: { background: 'transparent' }
									}
								>
									{item.icon(active)}
								</div>
								<span
									className="text-[8px] tracking-widest uppercase transition-colors"
									style={{
										fontFamily: FONTS.title,
										color: active ? COLORS.blue : COLORS.gray40,
										fontWeight: active ? 700 : 400,
									}}
								>
									{item.label}
								</span>
							</button>
						);
					})}
				</nav>
			</div>

			{/* ── Desktop : sidebar + contenu large (≥ lg) ────────────────────── */}
			<div className="hidden lg:flex" style={{ minHeight: '100vh', background: bgOuter }}>
				<aside
					className="sticky top-0 z-50 flex flex-shrink-0 flex-col self-start px-3 py-6"
					style={{
						width: '232px',
						height: '100vh',
						background: navBg,
						borderRight: `1px solid ${navBorder}`,
						backdropFilter: 'blur(16px) saturate(140%)',
						WebkitBackdropFilter: 'blur(16px) saturate(140%)',
						zoom: 1.18,
					}}
				>
					<div className="mb-8 flex items-center gap-2 px-2">
						<div
							className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm"
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
						<div>
							<div
								className="text-[9px] leading-none tracking-widest uppercase"
								style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
							>
								MICHELIN
							</div>
							<div
								className="text-[13px] leading-none font-black tracking-wider uppercase"
								style={{ color: COLORS.blue, fontFamily: FONTS.title }}
							>
								RaceLab
							</div>
						</div>
					</div>

					<nav aria-label="Navigation principale" className="flex flex-col gap-1">
						{NAV_ITEMS.map((item) => {
							const active = activeScreen === item.id;
							return (
								<button
									key={item.id}
									onClick={() => router.push(`/${item.id}`)}
									className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
									style={active ? { background: COLORS.yellow } : { background: 'transparent' }}
									aria-current={active ? 'page' : undefined}
								>
									{item.icon(active)}
									<span
										className="text-[12px] tracking-widest uppercase"
										style={{
											fontFamily: FONTS.title,
											color: active ? COLORS.onGold : COLORS.gray50,
											fontWeight: active ? 700 : 500,
										}}
									>
										{item.label}
									</span>
								</button>
							);
						})}
					</nav>
				</aside>

				<div
					className="flex-1 overflow-y-auto"
					style={{
						background: bgPhone,
						zoom: 1.18,
					}}
				>
					<div className="mx-auto min-h-full max-w-[900px]">{children}</div>
				</div>
			</div>
		</div>
	);
}

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const { user, loading } = useAuth();

	useEffect(() => {
		if (loading) return;
		if (!user) {
			router.replace('/login');
		} else if (!user.onboarding_completed) {
			router.replace('/onboarding');
		}
	}, [loading, user, router]);

	if (loading || !user || !user.onboarding_completed) {
		return (
			<div className="flex min-h-screen w-full items-center justify-center" style={{ background: COLORS.bgGradient }}>
				<Loader size={20} color={COLORS.blue} className="animate-spin" />
			</div>
		);
	}

	return <AppShellInner>{children}</AppShellInner>;
}
