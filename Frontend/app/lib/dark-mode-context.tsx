'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'racelab-theme';

interface ThemeContextValue {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(theme: Theme) {
	document.documentElement.setAttribute('data-theme', theme);
	document.documentElement.classList.toggle('dark', theme === 'dark');
	document.documentElement.style.colorScheme = theme;
}

/**
 * Script à exécuter avant le premier rendu (voir <head> dans layout.tsx) pour
 * éviter un flash du mauvais thème : lit la préférence stockée (ou celle du
 * système) et pose data-theme sur <html> avant que React n'hydrate.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='dark'&&t!=='light'){t='dark';}document.documentElement.setAttribute('data-theme',t);document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	// Le thème par défaut côté serveur est 'dark' (cohérent avec themeInitScript
	// et le data-theme="dark" posé dans <html> par layout.tsx) pour éviter un
	// mismatch d'hydratation ; la vraie préférence est appliquée juste après.
	const [theme, setThemeState] = useState<Theme>('dark');

	useEffect(() => {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		const initial: Theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
		setThemeState(initial);
		applyTheme(initial);
	}, []);

	const setTheme = (next: Theme) => {
		setThemeState(next);
		applyTheme(next);
		window.localStorage.setItem(STORAGE_KEY, next);
	};

	const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

	return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return ctx;
}
