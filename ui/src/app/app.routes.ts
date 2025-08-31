import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard - Interview App'
  },
  {
    path: 'interview',
    loadComponent: () => import('./features/interview/interview.component').then(m => m.InterviewComponent),
    title: 'Practice Interview - Interview App'
  },
  {
    path: 'evaluator',
    loadComponent: () => import('./features/evaluator/evaluator.component').then(m => m.EvaluatorComponent),
    title: 'AI Evaluator - Interview App'
  },
  {
    path: 'progress',
    loadComponent: () => import('./features/progress/progress.component').then(m => m.ProgressComponent),
    title: 'Progress Analytics - Interview App'
  },
  {
    path: 'spaced-repetition',
    loadComponent: () => import('./features/spaced-repetition/spaced-repetition.component').then(m => m.SpacedRepetitionComponent),
    title: 'Spaced Repetition - Interview App'
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
    title: 'Settings - Interview App'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
