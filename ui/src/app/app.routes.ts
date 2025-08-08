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
    path: '**',
    redirectTo: '/dashboard'
  }
];
