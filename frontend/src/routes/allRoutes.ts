import { publicRoutes } from './publicRoutes';
import { protectedRoutes } from './protectedRoutes';
import { onboardingRoutes } from './onboardingRoutes';
import type { RouteConfig } from './types';

export const allRoutes: RouteConfig[] = [
  ...publicRoutes,
  ...onboardingRoutes,
  ...protectedRoutes,
];
