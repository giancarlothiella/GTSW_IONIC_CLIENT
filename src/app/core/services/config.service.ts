import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicConfig {
  appTitle: string;
  totpEnabled: boolean;
  signWithGoogle: boolean;
  signWithMicrosoft: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);

  /** Public config fetched from server, with hardcoded defaults as fallback */
  publicConfig: PublicConfig = {
    appTitle: 'App Portal',
    totpEnabled: true,
    signWithGoogle: false,
    signWithMicrosoft: false
  };

  async load(): Promise<void> {
    // Step 1: load apiUrl/localUrl from config.json
    try {
      const data: any = await lastValueFrom(
        this.http.get('/assets/config.json')
      );
      environment.apiUrl = data.apiUrl;
      environment.localUrl = data.localUrl;
    } catch (e) {
      console.warn('config.json not found, using environment defaults');
    }

    // Step 2: fetch public config from server
    try {
      const res: any = await lastValueFrom(
        this.http.get(`${environment.apiUrl}/setup/publicConfig`)
      );
      if (res?.valid && res.data) {
        this.publicConfig = {
          appTitle: res.data.appTitle ?? this.publicConfig.appTitle,
          totpEnabled: res.data.totpEnabled ?? this.publicConfig.totpEnabled,
          signWithGoogle: res.data.signWithGoogle ?? this.publicConfig.signWithGoogle,
          signWithMicrosoft: res.data.signWithMicrosoft ?? this.publicConfig.signWithMicrosoft
        };
      }
    } catch (e) {
      console.warn('publicConfig not available, using environment defaults');
    }
  }
}