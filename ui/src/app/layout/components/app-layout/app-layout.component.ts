import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { RippleModule } from 'primeng/ripple';
import { AvatarModule } from 'primeng/avatar';
import { DesktopLayoutService } from '../../services/desktop-layout.service';
import { GlobalToastComponent } from '../../../shared/components/global-toast.component';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ButtonModule,
        TooltipModule,
        BadgeModule,
        RippleModule,
        AvatarModule,
        GlobalToastComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './app-layout.component.html',
    styleUrls: ['./app-layout.component.scss']
})
export class AppLayoutComponent {
    protected readonly layoutService = inject(DesktopLayoutService);
    currentTime = new Date().toLocaleTimeString();

    constructor() {
        // Update time every second
        setInterval(() => {
            this.currentTime = new Date().toLocaleTimeString();
        }, 1000);
    }

    toggleTheme() {
        // Simple 2-state toggle based on current visual appearance
        if (this.layoutService.isDarkTheme()) {
            this.layoutService.updateTheme('light');
        } else {
            this.layoutService.updateTheme('dark');
        }
    }
}