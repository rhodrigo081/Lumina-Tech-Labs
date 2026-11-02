import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const KEY = 'ecm.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.read());

  readonly isDark = computed(() => this.mode() === 'dark');

  constructor() {
    effect(() => {
      document.documentElement.classList.toggle('dark', this.isDark());
    });
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);

    try {
      localStorage.setItem(KEY, mode);
    } catch {
    }
  }

  cycle(): void {
    this.set(this.mode() === 'dark' ? 'light' : 'dark');
  }

  private read(): ThemeMode {
    try {
      const value = localStorage.getItem(KEY);

      if (value === 'light' || value === 'dark') {
        return value;
      }
    } catch {
    }

    return 'light';
  }
}
