import { computed, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'rpgdex-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _mode = signal<ThemeMode>(this.readInitialMode());

  readonly mode = this._mode.asReadonly();
  readonly isDark = computed(() => this._mode() === 'dark');

  constructor() {
    this.apply(this._mode());
  }

  toggle(): void {
    this.set(this._mode() === 'dark' ? 'light' : 'dark');
  }

  set(mode: ThemeMode): void {
    this._mode.set(mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      /* storage indisponível (modo privado): ignora */
    }
    this.apply(mode);
  }

  private apply(mode: ThemeMode): void {
    document.documentElement.classList.toggle('dark-theme', mode === 'dark');
  }

  private readInitialMode(): ThemeMode {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      /* ignora */
    }
    // Primeira visita: segue o tema do sistema. Para começar sempre no claro, troque por: return 'light';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}