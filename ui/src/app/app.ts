import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AppLayoutComponent } from './layout/components/app-layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AppLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-layout></app-layout>`,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }
  `]
})
export class App {}
