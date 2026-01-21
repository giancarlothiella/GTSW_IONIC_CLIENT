// src/app/app.config.ts
// Configura l'interceptor nell'app config
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { IonicModule } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage-angular';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { provideQuillConfig } from 'ngx-quill';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false  // Disabilita dark mode per coerenza con DevExtreme
        }
      }
    }),
    provideQuillConfig({
      modules: {
        syntax: false,
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'size': ['small', false, 'large', 'huge'] }],
          [{ 'font': [] }],
          [{ 'align': [] }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'color': [] }, { 'background': [] }],
          ['link', 'image'],
          ['clean']
        ]
      }
    }),
    importProvidersFrom(
      IonicModule.forRoot(),
      IonicStorageModule.forRoot()
    )
  ]
};