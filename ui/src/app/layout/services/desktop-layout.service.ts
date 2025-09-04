import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface DesktopConfig {
    theme: 'light' | 'dark' | 'system';
    darkTheme: boolean;
    accentColor: string;
    compactMode: boolean;
    sidebarCollapsed: boolean;
    showStatusBar: boolean;
    fontSize: 'small' | 'medium' | 'large';
}

export interface ApiUsageStats {
    tokensUsed: number;
    tokensPerMinute: number;
    apiCost: number;
    costPerHour: number;
    contextRemaining: number;
    resetTime: Date;
    sessionStartTime: Date;
}

export interface AppView {
    id: string;
    label: string;
    icon: string;
    route: string;
    badge?: number;
}

@Injectable({
    providedIn: 'root',
})
export class DesktopLayoutService {
    private readonly router = inject(Router);
    
    private readonly _config = signal<DesktopConfig>({
        theme: 'system',
        darkTheme: false,
        accentColor: 'emerald',
        compactMode: true,
        sidebarCollapsed: false,
        showStatusBar: true,
        fontSize: 'medium'
    });

    private readonly _activeView = signal<string>('dashboard');
    private readonly _isFullscreen = signal<boolean>(false);
    private readonly _notifications = signal<number>(0);

    // API Usage Tracking
    private readonly _apiUsage = signal<ApiUsageStats>({
        tokensUsed: 0,
        tokensPerMinute: 0,
        apiCost: 0,
        costPerHour: 0,
        contextRemaining: 100,
        resetTime: this.getNextResetTime(),
        sessionStartTime: new Date()
    });

    config = this._config.asReadonly();
    activeView = this._activeView.asReadonly();
    isFullscreen = this._isFullscreen.asReadonly();
    notifications = this._notifications.asReadonly();
    apiUsage = this._apiUsage.asReadonly();

    // Computed values for display
    timeUntilReset = computed(() => {
        return this.formatTimeUntilReset(this._apiUsage().resetTime);
    });

    contextRemainingColor = computed(() => {
        const remaining = this._apiUsage().contextRemaining;
        if (remaining > 50) return 'text-green-500';
        if (remaining > 20) return 'text-yellow-500';
        return 'text-red-500';
    });

    // Theme computed properties
    isDarkTheme = computed(() => this._config().darkTheme);

    views: AppView[] = [
        { 
            id: 'dashboard', 
            label: 'Dashboard', 
            icon: 'pi pi-home', 
            route: '/dashboard'
        },
        { 
            id: 'interview', 
            label: 'Practice', 
            icon: 'pi pi-microphone', 
            route: '/interview',
            badge: 0
        },
        { 
            id: 'evaluator', 
            label: 'AI Review', 
            icon: 'pi pi-sparkles', 
            route: '/evaluator'
        },
        { 
            id: 'progress', 
            label: 'Progress', 
            icon: 'pi pi-chart-line', 
            route: '/progress'
        },
        { 
            id: 'spaced-repetition', 
            label: 'Spaced Rep.', 
            icon: 'pi pi-refresh', 
            route: '/spaced-repetition'
        },
        { 
            id: 'settings', 
            label: 'Settings', 
            icon: 'pi pi-cog', 
            route: '/settings'
        }
    ];

    constructor() {
        // Load saved configuration on initialization
        this.loadConfig();
        
        // Apply theme on initialization
        effect(() => {
            this.applyTheme();
        });

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                if (this._config().theme === 'system') {
                    this._config.update(config => ({
                        ...config,
                        darkTheme: this.calculateDarkTheme('system')
                    }));
                    this.applyTheme();
                }
            });
        }
    }

    toggleSidebar() {
        this._config.update(config => ({
            ...config,
            sidebarCollapsed: !config.sidebarCollapsed
        }));
    }

    setActiveView(viewId: string) {
        this._activeView.set(viewId);
        const view = this.views.find(v => v.id === viewId);
        if (view) {
            this.router.navigate([view.route]);
        }
    }

    toggleFullscreen() {
        this._isFullscreen.update(v => !v);
        // In real Electron app, this would communicate with main process
        if (this._isFullscreen()) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }

    updateConfig(config: Partial<DesktopConfig>) {
        this._config.update(current => ({
            ...current,
            ...config
        }));
        this.saveConfig();
    }

    addNotification() {
        this._notifications.update(n => n + 1);
    }

    clearNotifications() {
        this._notifications.set(0);
    }

    private applyTheme() {
        const config = this._config();
        let isDark = false;

        if (config.theme === 'system') {
            isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        } else {
            isDark = config.theme === 'dark';
        }

        if (isDark) {
            document.documentElement.classList.add('app-dark');
        } else {
            document.documentElement.classList.remove('app-dark');
        }

        // Apply accent color
        document.documentElement.style.setProperty('--primary-color', `var(--${config.accentColor}-500)`);
        document.documentElement.style.setProperty('--primary-color-text', `var(--${config.accentColor}-500)`);
        
        // Apply font size - update CSS custom properties
        const fontSizeMap = {
            small: '0.8125rem', // 13px
            medium: '0.9375rem', // 15px (improved from 14px)
            large: '1rem' // 16px
        };
        document.documentElement.style.setProperty('--font-size-base', fontSizeMap[config.fontSize]);
    }

    // Theme Management Methods
    updateTheme(theme: 'light' | 'dark' | 'system') {
        this._config.update(config => {
            const darkTheme = this.calculateDarkTheme(theme);
            return { ...config, theme, darkTheme };
        });
        
        this.saveConfig();
    }

    private calculateDarkTheme(theme: 'light' | 'dark' | 'system'): boolean {
        if (theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return theme === 'dark';
    }

    private saveConfig() {
        try {
            localStorage.setItem('desktop-layout-config', JSON.stringify(this._config()));
        } catch (error) {
            console.warn('Failed to save layout config:', error);
        }
    }

    private loadConfig() {
        try {
            const saved = localStorage.getItem('desktop-layout-config');
            if (saved) {
                const config = JSON.parse(saved) as Partial<DesktopConfig>;
                this._config.update(current => ({
                    ...current,
                    ...config,
                    // Ensure darkTheme is recalculated for system theme
                    darkTheme: this.calculateDarkTheme(config.theme || current.theme)
                }));
            }
        } catch (error) {
            console.warn('Failed to load layout config:', error);
        }
    }

    // API Usage Methods
    addTokenUsage(tokens: number, cost = 0) {
        this._apiUsage.update(current => {
            const now = new Date();
            const sessionMinutes = (now.getTime() - current.sessionStartTime.getTime()) / (1000 * 60);
            const newTokensUsed = current.tokensUsed + tokens;
            const tpm = sessionMinutes > 0 ? Math.round(newTokensUsed / sessionMinutes) : 0;
            const sessionHours = sessionMinutes / 60;
            const hourlyRate = sessionHours > 0 ? current.apiCost / sessionHours : 0;

            return {
                ...current,
                tokensUsed: newTokensUsed,
                tokensPerMinute: tpm,
                apiCost: current.apiCost + cost,
                costPerHour: hourlyRate
            };
        });
    }

    updateContextRemaining(percentage: number) {
        this._apiUsage.update(current => ({
            ...current,
            contextRemaining: Math.max(0, Math.min(100, percentage))
        }));
    }

    resetApiUsage() {
        this._apiUsage.update(current => ({
            tokensUsed: 0,
            tokensPerMinute: 0,
            apiCost: 0,
            costPerHour: 0,
            contextRemaining: 100,
            resetTime: this.getNextResetTime(),
            sessionStartTime: new Date()
        }));
    }

    private getNextResetTime(): Date {
        // Set reset time to next day at 1:00 AM (similar to Claude's reset)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(1, 0, 0, 0);
        return tomorrow;
    }

    private formatTimeUntilReset(resetTime: Date): string {
        const now = new Date();
        const diff = resetTime.getTime() - now.getTime();
        
        if (diff <= 0) return 'Reset now';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}h ${minutes}m until reset`;
    }

    formatTokens(tokens: number): string {
        if (tokens >= 1000000) {
            return `${(tokens / 1000000).toFixed(1)}M`;
        }
        if (tokens >= 1000) {
            return `${(tokens / 1000).toFixed(1)}k`;
        }
        return tokens.toString();
    }
}