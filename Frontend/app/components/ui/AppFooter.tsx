'use client';

import { COLORS, FONTS } from '@/app/lib/constants';

export function AppFooter() {
	return (
		<div className="glass-bar flex-shrink-0 px-5 py-4" style={{ borderTop: `1px solid ${COLORS.glassBorder}` }}>
			<div className="flex items-center justify-between">
				<span className="text-[10px]" style={{ color: COLORS.gray40, fontFamily: FONTS.body }}>
					© 2026 MICHELIN Group. Tous droits réservés.
				</span>
				<div className="flex items-center gap-3">
					<span className="cursor-pointer text-[10px] hover:underline" style={{ color: COLORS.gray40 }}>
						Confidentialité
					</span>
					<span className="cursor-pointer text-[10px] hover:underline" style={{ color: COLORS.gray40 }}>
						CGU
					</span>
				</div>
			</div>
		</div>
	);
}
