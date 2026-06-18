'use client';

import { useEffect, useRef, useState } from 'react';

import { Award, Download, Loader, Share2 } from 'lucide-react';

import { tiresApi } from '@/app/lib/api';
import type { PassportCardOut, PassportOut, WheelPosition } from '@/app/lib/api';
import { COLORS, FONTS } from '@/app/lib/constants';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WHEEL_LABEL: Record<WheelPosition, string> = { front: 'Avant', rear: 'Arrière' };

/**
 * Dessine la carte passeport sur un <canvas> hors-écran et déclenche le
 * téléchargement de l'image (PNG). Aucune dépendance npm supplémentaire —
 * Canvas 2D natif du navigateur, conformément au choix confirmé
 * ("Carte visuelle dans l'app + export image").
 */
function exportCardAsImage(card: PassportCardOut) {
	const width = 1080;
	const height = 1080;
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	// Fond — dégradé obsidian/midnight blue, cohérent avec l'app
	const bg = ctx.createLinearGradient(0, 0, width, height);
	bg.addColorStop(0, '#121420');
	bg.addColorStop(0.5, '#0F1B3D');
	bg.addColorStop(1, '#0B0D17');
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, width, height);

	// Halo doré discret
	const halo = ctx.createRadialGradient(width * 0.85, height * 0.1, 0, width * 0.85, height * 0.1, width * 0.6);
	halo.addColorStop(0, 'rgba(255,200,0,0.18)');
	halo.addColorStop(1, 'rgba(255,200,0,0)');
	ctx.fillStyle = halo;
	ctx.fillRect(0, 0, width, height);

	// Bordure satin gold
	ctx.strokeStyle = 'rgba(255,200,0,0.35)';
	ctx.lineWidth = 4;
	ctx.strokeRect(24, 24, width - 48, height - 48);

	// Eyebrow
	ctx.fillStyle = 'rgba(255,200,0,0.9)';
	ctx.font = "700 28px 'Space Grotesk', Arial, sans-serif";
	ctx.textBaseline = 'alphabetic';
	ctx.fillText('PASSEPORT PNEU · RACELAB BY MICHELIN', 80, 150);

	// Roue
	ctx.fillStyle = 'rgba(255,255,255,0.55)';
	ctx.font = "600 26px 'Space Grotesk', Arial, sans-serif";
	ctx.fillText(`Roue ${WHEEL_LABEL[card.wheel]}`, 80, 195);

	// Nom du pneu
	ctx.fillStyle = '#F4F6FC';
	ctx.font = "800 64px 'Space Grotesk', Arial, sans-serif";
	wrapText(ctx, card.tire_name, 80, 300, width - 160, 70);

	// Chiffre clé (km)
	const kmLabel = card.milestone_km ? `${card.milestone_km.toLocaleString('fr-FR')}` : `${Math.round(card.km_on_tire).toLocaleString('fr-FR')}`;
	ctx.fillStyle = COLORS.yellow;
	ctx.font = "900 220px 'Space Grotesk', Arial, sans-serif";
	ctx.fillText(kmLabel, 80, 620);
	ctx.fillStyle = 'rgba(255,255,255,0.6)';
	ctx.font = "700 40px 'Space Grotesk', Arial, sans-serif";
	ctx.fillText('KM SUR LE MÊME PNEU', 84, 670);

	// Headline / claim durabilité
	ctx.fillStyle = '#F4F6FC';
	ctx.font = "600 32px 'Noto Sans', Arial, sans-serif";
	wrapText(ctx, card.headline, 80, 760, width - 160, 44);

	// Sous-stat jours
	ctx.fillStyle = 'rgba(255,255,255,0.5)';
	ctx.font = "600 28px 'Noto Sans', Arial, sans-serif";
	ctx.fillText(`${card.days_installed} jours d'usage`, 80, 880);

	// Footer
	ctx.fillStyle = 'rgba(255,255,255,0.35)';
	ctx.font = "600 24px 'Space Grotesk', Arial, sans-serif";
	ctx.fillText('MICHELIN · RACELAB', 80, height - 70);

	const url = canvas.toDataURL('image/png');
	const a = document.createElement('a');
	a.href = url;
	a.download = `passeport-pneu-${card.wheel}.png`;
	a.click();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
	const words = text.split(' ');
	let line = '';
	let curY = y;
	for (const word of words) {
		const test = line ? `${line} ${word}` : word;
		if (ctx.measureText(test).width > maxWidth && line) {
			ctx.fillText(line, x, curY);
			line = word;
			curY += lineHeight;
		} else {
			line = test;
		}
	}
	if (line) ctx.fillText(line, x, curY);
}

// ─── PassportTile ────────────────────────────────────────────────────────────

function PassportTile({ card }: { card: PassportCardOut }) {
	const kmLabel = card.milestone_km
		? card.milestone_km.toLocaleString('fr-FR')
		: Math.round(card.km_on_tire).toLocaleString('fr-FR');

	return (
		<div
			className="relative overflow-hidden rounded-2xl p-5"
			style={{
				background: `linear-gradient(135deg, ${COLORS.blueDark} 0%, #0B0D17 100%)`,
				border: '1px solid rgba(255,200,0,0.25)',
				boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
			}}
		>
			<div
				className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full"
				style={{ background: 'rgba(255,200,0,0.12)', filter: 'blur(20px)' }}
			/>
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<Award size={12} color={COLORS.yellow} />
					<span
						className="text-[9px] font-bold tracking-widest uppercase"
						style={{ color: COLORS.yellow, fontFamily: FONTS.title }}
					>
						Roue {WHEEL_LABEL[card.wheel]}
					</span>
				</div>
				<button
					onClick={() => exportCardAsImage(card)}
					className="flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold"
					style={{ background: 'rgba(255,255,255,0.1)', color: 'white', fontFamily: FONTS.title }}
					title="Exporter en image"
				>
					<Download size={10} />
					Partager
				</button>
			</div>

			<div className="text-[13px] font-bold text-white" style={{ fontFamily: FONTS.title }}>
				{card.tire_name}
			</div>

			<div className="mt-2 flex items-baseline gap-1.5">
				<span className="text-[34px] leading-none font-black" style={{ color: COLORS.yellow, fontFamily: FONTS.mono }}>
					{kmLabel}
				</span>
				<span className="text-[11px] font-bold tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.title }}>
					km
				</span>
			</div>

			<div className="mt-2 text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.body }}>
				{card.headline}
			</div>

			<div className="mt-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.body }}>
				{card.days_installed} jours d&apos;usage
			</div>
		</div>
	);
}

// ─── PassportSection ─────────────────────────────────────────────────────────

export function PassportSection() {
	const [passport, setPassport] = useState<PassportOut | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		tiresApi
			.getPassport()
			.then(setPassport)
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div className="glass-panel mx-5 mb-4 flex items-center justify-center rounded-2xl p-6">
				<Loader size={16} className="animate-spin" color={COLORS.blue} />
			</div>
		);
	}

	if (!passport) return null;

	return (
		<div className="mx-5 mb-4">
			<div className="mb-2.5 flex items-center gap-2">
				<Share2 size={13} color={COLORS.yellow} />
				<span
					className="text-[12px] font-bold tracking-widest uppercase"
					style={{ color: COLORS.yellow, fontFamily: FONTS.title }}
				>
					Passeport Pneu
				</span>
			</div>
			<div className="grid grid-cols-1 gap-3">
				<PassportTile card={passport.front} />
				<PassportTile card={passport.rear} />
			</div>
		</div>
	);
}
