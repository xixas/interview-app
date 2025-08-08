import { Injectable, signal, computed, effect } from '@angular/core';

export interface LayoutConfig {
  preset?: string;
  primary?: string;
  surface?: string | null;
  darkTheme?: boolean;
  menuMode?: string;
}

interface LayoutState {
  staticMenuDesktopInactive?: boolean;
  overlayMenuActive?: boolean;
  configSidebarVisible?: boolean;
  staticMenuMobileActive?: boolean;
  menuHoverActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private _config: LayoutConfig = {
    preset: 'Aura',
    primary: 'emerald',
    surface: null,
    darkTheme: false,
    menuMode: 'static'
  };

  private _state: LayoutState = {
    staticMenuDesktopInactive: false,
    overlayMenuActive: false,
    configSidebarVisible: false,
    staticMenuMobileActive: false,
    menuHoverActive: false
  };

  layoutConfig = signal<LayoutConfig>(this._config);
  layoutState = signal<LayoutState>(this._state);

  theme = computed(() => (this.layoutConfig().darkTheme ? 'dark' : 'light'));
  isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().staticMenuMobileActive);
  isDarkTheme = computed(() => this.layoutConfig().darkTheme);
  isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');

  private initialized = false;

  constructor() {
    effect(() => {
      const config = this.layoutConfig();
      if (!this.initialized || !config) {
        this.initialized = true;
        return;
      }
      this.handleThemeTransition(config);
    });

    // Check system preference on init
    this.initializeTheme();
  }

  private initializeTheme() {
    const savedTheme = localStorage.getItem('theme-preference');
    if (savedTheme) {
      this.layoutConfig.update(config => ({ ...config, darkTheme: savedTheme === 'dark' }));
    } else {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.layoutConfig.update(config => ({ ...config, darkTheme: prefersDark }));
    }
    this.applyTheme(this.layoutConfig());
  }

  private handleThemeTransition(config: LayoutConfig): void {
    if ((document as any).startViewTransition) {
      this.startViewTransition(config);
    } else {
      this.applyTheme(config);
    }
  }

  private startViewTransition(config: LayoutConfig): void {
    const transition = (document as any).startViewTransition(() => {
      this.applyTheme(config);
    });
  }

  toggleDarkMode(): void {
    const newConfig = { ...this.layoutConfig(), darkTheme: !this.layoutConfig().darkTheme };
    this.layoutConfig.set(newConfig);
    localStorage.setItem('theme-preference', newConfig.darkTheme ? 'dark' : 'light');
  }

  private applyTheme(config: LayoutConfig): void {
    const element = document.documentElement;
    if (config.darkTheme) {
      element.classList.add('app-dark');
    } else {
      element.classList.remove('app-dark');
    }
  }

  onMenuToggle(): void {
    if (this.isOverlay()) {
      this.layoutState.update(prev => ({ 
        ...prev, 
        overlayMenuActive: !this.layoutState().overlayMenuActive 
      }));
    } else if (this.isDesktop()) {
      this.layoutState.update(prev => ({ 
        ...prev, 
        staticMenuDesktopInactive: !this.layoutState().staticMenuDesktopInactive 
      }));
    } else {
      this.layoutState.update(prev => ({ 
        ...prev, 
        staticMenuMobileActive: !this.layoutState().staticMenuMobileActive 
      }));
    }
  }

  isDesktop(): boolean {
    return window.innerWidth > 991;
  }

  isMobile(): boolean {
    return !this.isDesktop();
  }
}