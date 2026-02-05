// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, catchError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';

// Flag to prevent multiple 401 alerts
let isShowingAuthAlert = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const alertController = inject(AlertController);

  // Se la richiesta è verso l'endpoint di login, non aggiungere il token
  if (req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
    return next(req);
  }

  // Ottiene il token in modo asincrono
  return from(authService.getToken()).pipe(
    switchMap(token => {
      // Clona la richiesta e aggiunge l'header Authorization
      const authReq = token
        ? req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          })
        : req;

      return next(authReq);
    }),
    catchError(async error => {
      // Se ricevi 401 Unauthorized, mostra messaggio e fai logout (una sola volta)
      if (error.status === 401 && !isShowingAuthAlert) {
        isShowingAuthAlert = true;
        const alert = await alertController.create({
          header: 'Sessione scaduta',
          message: 'La sessione è scaduta o non sei autorizzato. Effettua nuovamente il login.',
          buttons: [{
            text: 'OK',
            handler: () => {
              authService.logout();
              router.navigate(['/login']);
              isShowingAuthAlert = false;
            }
          }],
          backdropDismiss: false
        });
        await alert.present();
      }
      throw error;
    })
  );
};


