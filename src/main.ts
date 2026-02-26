// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { importProvidersFrom, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { IonicStorageModule } from '@ionic/storage-angular';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { addIcons } from 'ionicons';
import {
  downloadOutline,
  mailOutline,
  createOutline,
  serverOutline,
  phonePortraitOutline,
  documentOutline,
  arrowDownOutline,
  globeOutline,
  close,
  checkmarkCircle,
  alertCircle,
  paperPlaneOutline,
  layersOutline,
  flashOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  documentTextOutline,
  printOutline
} from 'ionicons/icons';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { pdfDefaultOptions } from 'ngx-extended-pdf-viewer';
import { ConfigService } from './app/core/services/config.service';

// Silenzia i log di PDF.js
pdfDefaultOptions.verbosity = 0;

// Silenzia il warning di Inferno (usato internamente da AG Grid)
// Il warning appare perché AG Grid è distribuito in production build mentre Angular è in dev mode
const originalWarn = console.warn;
console.warn = function(...args: any[]) {
  const message = args[0]?.toString() || '';
  if (message.includes('production build of Inferno') || message.includes('dev:module entry point')) {
    return; // Ignora questo warning specifico
  }
  originalWarn.apply(console, args);
};

// Registra le icone Ionicons
addIcons({
  'download-outline': downloadOutline,
  'mail-outline': mailOutline,
  'create-outline': createOutline,
  'server-outline': serverOutline,
  'phone-portrait-outline': phonePortraitOutline,
  'document-outline': documentOutline,
  'arrow-down-outline': arrowDownOutline,
  'globe-outline': globeOutline,
  'close': close,
  'checkmark-circle': checkmarkCircle,
  'alert-circle': alertCircle,
  'paper-plane-outline': paperPlaneOutline,
  'layers-outline': layersOutline,
  'flash-outline': flashOutline,
  'refresh-outline': refreshOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'document-text-outline': documentTextOutline,
  'print-outline': printOutline
});   


bootstrapApplication(AppComponent, {
  providers: [
    // IMPORTANTE: Angular 21 richiede configurazione esplicita di zone.js
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      mode: 'md' // Force Material Design mode only (improves performance)
    }),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),  // Abilita Fetch API (richiesto in Angular 20)
      withInterceptors([authInterceptor])
    ),
    provideAppInitializer(() => {
      const configService = inject(ConfigService);
      return configService.load();
    }),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false,  // Disabilita dark mode per coerenza con DevExtreme
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities'
          }
        }
      },
      ripple: true
    }),
    importProvidersFrom(
      IonicStorageModule.forRoot()
    )
  ]
});
