'use client';

import { ChevronLeft } from 'lucide-react';

import { COLORS, FONTS } from '@/app/lib/constants';

interface AppHeaderProps {
	showLiveEvent?: boolean;
	rightSlot?: React.ReactNode;
	/** Affiche un bouton retour en haut à gauche à la place du logo (ex: page Partenaires). */
	onBack?: () => void;
}

function MichelinLogo() {
	return (
		<div
			className="flex flex-shrink-0 items-center rounded-lg px-2 py-1"
			style={{ background: 'var(--logo-bg)' }}
		>
			<img src="/racelab-icon.svg" alt="RaceLab" className="w-35 flex-shrink-0" />
		</div>
	);
}

export function AppHeader({ showLiveEvent = false, rightSlot, onBack }: AppHeaderProps) {
	return (
		<div
			className="glass-bar flex flex-shrink-0 items-center justify-between px-5 pt-5 pb-4 lg:pt-4 lg:pb-3"
			style={{ borderBottom: `1px solid ${COLORS.glassBorder}` }}
		>
			{onBack ? (
				<button
					onClick={onBack}
					aria-label="Retour"
					className="-ml-1 flex items-center gap-1 rounded-lg py-1 pr-2 transition-opacity hover:opacity-70"
				>
					<ChevronLeft size={20} color={COLORS.blue} />
					<span
						className="text-[12px] font-bold tracking-wider uppercase"
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
						className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
						style={{ background: 'rgba(255,184,0,0.12)', border: '1px solid #FDE68A' }}
					>
						<div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#B45309]" />
						<span
							className="text-[10px] font-semibold tracking-wider uppercase"
							style={{ color: '#FFC861', fontFamily: FONTS.title }}
						>
							LIVE EVENT
						</span>
					</div>
				)}
				{rightSlot}
			</div>
		</div>
	);
}
