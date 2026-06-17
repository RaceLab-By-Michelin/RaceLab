'use client';

import { Loader } from 'lucide-react';
import Link from 'next/link';

import { COLORS, FONTS } from '@/app/lib/constants';

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
			className="flex min-h-screen w-full items-center justify-center px-4 py-10"
			style={{ background: COLORS.bgGradient, fontFamily: FONTS.body }}
		>
			<div className="glass-panel-strong w-full max-w-[420px] rounded-3xl p-8">
				<div className="mb-1 flex items-center gap-2">
					<div
						className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm"
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
							className="text-[10px] leading-none tracking-widest uppercase"
							style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
						>
							MICHELIN
						</div>
						<div
							className="text-[15px] leading-none font-black tracking-wider uppercase"
							style={{ color: COLORS.blue, fontFamily: FONTS.title }}
						>
							RaceLab
						</div>
					</div>
				</div>
				<h1
					className="mt-6 leading-none uppercase"
					style={{
						fontFamily: FONTS.title,
						fontSize: '26px',
						fontWeight: 800,
						letterSpacing: '0.04em',
						color: COLORS.heading,
					}}
				>
					{title}
				</h1>
				<p className="mt-1 mb-6 text-[12px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
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
				className="mb-1 block text-[9px] font-bold tracking-widest uppercase"
				style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
			>
				{label}
			</label>
			<input
				type={type}
				required
				aria-label={label}
				value={value}
				placeholder={placeholder}
				autoComplete={autoComplete}
				onChange={(e) => onChange(e.target.value)}
				className="w-full rounded-xl px-3 py-2.5 text-[13px] transition-all outline-none"
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
			className="rounded-xl px-3 py-2 text-[11px]"
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
	loadingLabel = 'Veuillez patienter…',
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
			className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[12px] font-bold tracking-wider uppercase transition-all"
			style={{ background: COLORS.blue, color: 'white', fontFamily: FONTS.title, opacity: loading ? 0.7 : 1 }}
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
			className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-bold tracking-wider uppercase transition-all"
			style={{
				background: '#FC4C02',
				color: 'white',
				fontFamily: FONTS.title,
				opacity: loading ? 0.7 : 1,
			}}
		>
			{loading ? (
				<Loader size={14} className="animate-spin" />
			) : (
				<div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white">
					<div className="h-2 w-2 rounded-full" style={{ background: '#FC4C02' }} />
				</div>
			)}
			{loading ? 'Redirection…' : 'Continuer avec Strava'}
		</button>
	);
}

export function AuthDivider() {
	return (
		<div className="my-4 flex items-center gap-3">
			<div className="h-px flex-1" style={{ background: COLORS.gray20 }} />
			<span className="text-[10px] tracking-widest uppercase" style={{ color: COLORS.gray40, fontFamily: FONTS.title }}>
				ou
			</span>
			<div className="h-px flex-1" style={{ background: COLORS.gray20 }} />
		</div>
	);
}

export function AuthSwitchLink({ question, linkLabel, href }: { question: string; linkLabel: string; href: string }) {
	return (
		<p className="mt-5 text-center text-[12px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
			{question}{' '}
			<Link href={href} className="font-bold" style={{ color: COLORS.blue }}>
				{linkLabel}
			</Link>
		</p>
	);
}
