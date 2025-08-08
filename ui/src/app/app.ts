import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Button } from 'primeng/button';
import { Toolbar } from 'primeng/toolbar';
import { Sidebar } from 'primeng/sidebar';
import { Menu } from 'primeng/menu';
import { LayoutService } from './core/services/layout.service';
import { EnvironmentService } from './core/services/environment.service';
import { DebugService } from './core/services/debug.service';

@Component({
  imports: [
    CommonModule,
    RouterModule,
    Button,
    Toolbar,
    Sidebar,
    Menu
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
      label: 'Interview',
      icon: 'pi pi-microphone',
      routerLink: '/interview'
    },
    {
      label: 'Practice',
      icon: 'pi pi-book',
      routerLink: '/practice'
    },
    {
      label: 'Evaluator',
      icon: 'pi pi-chart-line',
      routerLink: '/evaluator'
    },
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      routerLink: '/settings'
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
