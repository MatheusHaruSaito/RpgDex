import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'rpgdex-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly router = inject(Router);
  private readonly _mode = signal<ThemeMode>(this.readInitialMode());

  readonly mode = this._mode.asReadonly();
  readonly isDark = computed(() => this._mode() === 'dark');

  constructor() {
    this.apply(this._mode());

    // Garante consistência caso algum componente legado altere classes ao trocar de rota
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.apply(this._mode()));

    // Mantém abas sincronizadas
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === THEME_KEY && (event.newValue === 'dark' || event.newValue === 'light')) {
        this._mode.set(event.newValue);
        this.apply(event.newValue);
      }
    });
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
    const isDark = mode === 'dark';
    const root = document.documentElement;

    root.classList.toggle('dark-theme', isDark);
    root.classList.toggle('light-theme', !isDark);
    root.style.colorScheme = mode;

    // Remove eventuais classes residuais deixadas por componentes antigos no <body>
    if (document.body) {
      document.body.classList.remove('dark-theme', 'light-theme', 'dark-mode');
    }
  }

  private readInitialMode(): ThemeMode {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      /* ignora */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}