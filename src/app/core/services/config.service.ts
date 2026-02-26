import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);

  async load(): Promise<void> {
    const data: any = await lastValueFrom(
      this.http.get('/assets/config.json')
    );
    environment.apiUrl = data.apiUrl;
    environment.localUrl = data.localUrl;
  }
}