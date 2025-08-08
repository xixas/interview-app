import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DrawerModule } from 'primeng/drawer';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { LayoutService } from './core/services/layout.service';
import { EnvironmentService } from './core/services/environment.service';
import { DebugService } from './core/services/debug.service';

@Component({
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    ToolbarModule,
    DrawerModule,
    MenuModule,
    TooltipModule
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected layoutService = inject(LayoutService);
  protected env = inject(EnvironmentService);
  private debug = inject(DebugService); // Initialize debug service
  protected title = this.env.appName;
  protected sidebarVisible = false;
  
  protected menuItems = [
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      routerLink: '/dashboard'
    },
    {
      label: 'Practice Interview',
      icon: 'pi pi-microphone',
      routerLink: '/interview'
    },
    {
      label: 'AI Evaluator',
      icon: 'pi pi-chart-line',
      routerLink: '/evaluator'
    }
  ];
  
  ngOnInit(): void {
    // Initialize theme on app start
  }
  
  toggleDarkMode(): void {
    this.layoutService.toggleDarkMode();
  }
  
  toggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }
}
