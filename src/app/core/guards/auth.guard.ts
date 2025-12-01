// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = await authService.isAuthenticated();

  if (!isAuthenticated) {
    // Permetti l'accesso a change-password se c'è il parametro expired=true
    // (caso di password scaduta dove l'utente non è ancora autenticato)
    if (state.url.includes('/change-password') && state.url.includes('expired=true')) {
      return true;
    }

    // Reindirizza al login salvando l'URL richiesto
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  return true;
};

