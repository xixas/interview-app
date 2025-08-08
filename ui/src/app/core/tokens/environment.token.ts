import { InjectionToken } from '@angular/core';
import { AppEnvironment } from '../services/environment.service';

export const ENVIRONMENT = new InjectionToken<AppEnvironment>('app.environment');