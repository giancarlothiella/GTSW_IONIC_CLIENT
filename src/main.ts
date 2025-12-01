// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { IonicStorageModule } from '@ionic/storage-angular';
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

import config from 'devextreme/core/config';
import { licenseKey } from './devextreme-license';

config({ licenseKey });

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
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      mode: 'md' // Force Material Design mode only (improves performance)
    }),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),  // Abilita Fetch API (richiesto in Angular 20)
      withInterceptors([authInterceptor])
    ),
    importProvidersFrom(
      IonicStorageModule.forRoot()
    )
  ]
});
