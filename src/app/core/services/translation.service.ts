// src/app/core/services/translation.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Language {
  languageId: string;
  description: string;
  stdImageId?: number;
  flagIcon?: string;
}

export interface AuthText {
  txtId: number;
  languageId: string;
  text: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private http = inject(HttpClient);

  private currentLanguageSubject = new BehaviorSubject<string>(environment.languageId);
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  private textsCache: Map<string, Map<number, string>> = new Map(); // languageId -> txtId -> text
  private languagesCache: Language[] = [];

  private readonly STORAGE_KEY = 'selectedLanguage';

  constructor() {
    // Carica la lingua salvata o usa quella di default
    const savedLanguage = localStorage.getItem(this.STORAGE_KEY);
    if (savedLanguage) {
      this.currentLanguageSubject.next(savedLanguage);
    }
  }

  /**
   * Carica tutte le lingue disponibili
   */
  async loadLanguages(): Promise<Language[]> {
    if (this.languagesCache.length > 0) {
      return this.languagesCache;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{valid: boolean, data: Language[]}>(
          `${environment.apiUrl}/setup/getLanguages`,
          {}
        )
      );

      if (response && response.valid && response.data) {
        // Mappa stdImageId al percorso dell'immagine
        this.languagesCache = response.data.map(lang => ({
          ...lang,
          flagIcon: lang.stdImageId ? `/assets/icons/stdImage_${lang.stdImageId}.png` : undefined
        }));
        return this.languagesCache;
      }

      return [];
    } catch (error) {
      console.error('Error loading languages:', error);
      return [];
    }
  }

  /**
   * Carica i testi per una lingua specifica
   */
  async loadTexts(languageId: string): Promise<void> {
    // Se già in cache, non ricaricare
    if (this.textsCache.has(languageId)) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{valid: boolean, data: AuthText[]}>(
          `${environment.apiUrl}/auth/texts/get`,
          { languageId }
        )
      );

      if (response && response.valid && response.data) {
        const textsMap = new Map<number, string>();
        response.data.forEach(item => {
          textsMap.set(item.txtId, item.text);
        });
        this.textsCache.set(languageId, textsMap);
      }
    } catch (error) {
      console.error(`Error loading texts for language ${languageId}:`, error);
      throw error;
    }
  }

  /**
   * Ottiene un testo tradotto per ID
   */
  getText(txtId: number, fallback: string = ''): string {
    const currentLang = this.currentLanguageSubject.value;
    const langTexts = this.textsCache.get(currentLang);

    if (langTexts && langTexts.has(txtId)) {
      return langTexts.get(txtId)!;
    }

    // Fallback alla lingua di default
    if (currentLang !== environment.languageId) {
      const defaultLangTexts = this.textsCache.get(environment.languageId);
      if (defaultLangTexts && defaultLangTexts.has(txtId)) {
        return defaultLangTexts.get(txtId)!;
      }
    }

    return fallback || `[TEXT_${txtId}]`;
  }

  /**
   * Cambia la lingua corrente
   */
  async setLanguage(languageId: string): Promise<void> {
    if (languageId === this.currentLanguageSubject.value) {
      return;
    }

    // Carica i testi per la nuova lingua se non già in cache
    await this.loadTexts(languageId);

    // Aggiorna la lingua corrente
    this.currentLanguageSubject.next(languageId);
    localStorage.setItem(this.STORAGE_KEY, languageId);
  }

  /**
   * Ottiene la lingua corrente
   */
  getCurrentLanguage(): string {
    return this.currentLanguageSubject.value;
  }

  /**
   * Ottiene tutte le lingue disponibili (da cache)
   */
  getLanguages(): Language[] {
    return this.languagesCache;
  }

  /**
   * Inizializza il servizio caricando lingue e testi di default
   */
  async initialize(): Promise<void> {
    await this.loadLanguages();
    const currentLang = this.getCurrentLanguage();
    await this.loadTexts(currentLang);
  }

  /**
   * Pulisce la cache (utile per test o reset)
   */
  clearCache(): void {
    this.textsCache.clear();
  }
}
