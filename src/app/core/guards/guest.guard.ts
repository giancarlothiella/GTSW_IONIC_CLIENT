
// src/app/core/guards/guest.guard.ts
// Guard per impedire accesso a login se già autenticato
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = await authService.isAuthenticated();

  if (isAuthenticated) {
    // Se già autenticato, vai alla home
    router.navigate(['/home']);
    return false;
  }

  return true;
};