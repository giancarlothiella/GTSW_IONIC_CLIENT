// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { COMPONENT_REGISTRY } from './core/config/component-registry';

// Crea route dinamiche da tutti i componenti registrati
function createDynamicRoutes(): Routes {
  const dynamicRoutes: Routes = [];

  for (const path in COMPONENT_REGISTRY) {
    dynamicRoutes.push({
      path: path,
      loadComponent: COMPONENT_REGISTRY[path]
    });
  }

  return dynamicRoutes;
}

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full'
  },
  {
    path: 'landing',
    loadComponent: () => import('./features/landing/landing-page.component').then(m => m.LandingPageComponent)
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.page').then(m => m.RegisterPage)
  },
  {
    path: 'register/:key',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.page').then(m => m.RegisterPage)
  },
  {
    path: 'account/activate/:key',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/activate/activate.page').then(m => m.ActivatePage)
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage)
  },
  {
    path: 'totp-verify',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/totp-verify/totp-verify.page').then(m => m.TotpVerifyPage)
  },
  {
    path: 'reset-2fa',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/reset-2fa/reset-2fa.page').then(m => m.Reset2FAPage)
  },
  // Shell layout con menu laterale (parent per tutte le route protette)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell.page').then(m => m.ShellPage),
    children: [
      // Route statiche (non dipendono dai progetti)
      {
        path: 'home',
        loadComponent: () => import('./features/home/home.page').then(m => m.HomePage)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.page').then(m => m.ProfilePage)
      },
      {
        path: 'change-password',
        loadComponent: () => import('./features/profile/change-password/change-password.page').then(m => m.ChangePasswordPage)
      },
      // Route dinamiche create dal component registry
      ...createDynamicRoutes()
    ]
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];

