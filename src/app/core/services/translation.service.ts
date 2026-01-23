// src/app/core/services/translation.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, timeout } from 'rxjs';
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
  text?: string;
  txtValue?: string; // Some API responses use txtValue instead of text
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
        this.http.post<{valid: boolean, data: Language[]} | Language[]>(
          `${environment.apiUrl}/setup/getLanguages`,
          {}
        )
      );

      // Handle both response formats:
      // 1. Direct array: Language[]
      // 2. Wrapped response: {valid: boolean, data: Language[]}
      let languages: Language[] = [];

      if (Array.isArray(response)) {
        languages = response;
      } else if (response && response.valid && response.data) {
        languages = response.data;
      }

      if (languages.length > 0) {
        // Mappa stdImageId al percorso dell'immagine
        this.languagesCache = languages.map(lang => ({
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
   * @param languageId - ID della lingua
   * @param forceReload - Se true, ricarica anche se già in cache
   */
  async loadTexts(languageId: string, forceReload: boolean = false): Promise<void> {
    // Normalizza a UPPERCASE per consistenza con DB (EN, IT, etc.)
    const normalizedLang = languageId.toUpperCase();

    // Se già in cache e non forceReload, non ricaricare
    if (this.textsCache.has(normalizedLang) && !forceReload) {
      return;
    }

    try {
      const response: any = await firstValueFrom(
        this.http.post(
          `${environment.apiUrl}/auth/texts/get`,
          { languageId: normalizedLang }
        ).pipe(timeout(10000)) // 10 second timeout
      );

      // console.log('Translation service - texts response:', response);

      // Handle both response formats:
      // 1. Direct array: AuthText[]
      // 2. Wrapped response: {valid: boolean, data: AuthText[]}
      let texts: AuthText[] = [];

      if (Array.isArray(response)) {
        texts = response;
      } else if (response && response.valid && response.data) {
        texts = response.data;
      } else if (response && response.data) {
        // Fallback: just has data property
        texts = response.data;
      }

      // console.log('Translation service - parsed texts count:', texts.length);

      if (texts.length > 0) {
        const textsMap = new Map<number, string>();
        texts.forEach(item => {
          // Support both 'text' and 'txtValue' fields
          const textValue = item.text || item.txtValue || '';
          if (textValue) {
            textsMap.set(item.txtId, textValue);
          }
        });
        this.textsCache.set(normalizedLang, textsMap);
        // console.log('Translation service - cache set for language:', normalizedLang, 'with', textsMap.size, 'texts');
      }
    } catch (error) {
      console.error(`Error loading texts for language ${normalizedLang}:`, error);
      // Don't throw - allow to continue with fallback texts
    }
  }

  /**
   * Ottiene un testo tradotto per ID
   */
  getText(txtId: number, fallback: string = ''): string {
    const currentLang = this.currentLanguageSubject.value.toUpperCase();
    const langTexts = this.textsCache.get(currentLang);

    if (langTexts && langTexts.has(txtId)) {
      return langTexts.get(txtId)!;
    }

    // Fallback alla lingua di default
    const defaultLang = environment.languageId.toUpperCase();
    if (currentLang !== defaultLang) {
      const defaultLangTexts = this.textsCache.get(defaultLang);
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
    // Mantieni il formato originale (es. "EN", "IT") senza modifiche
    if (languageId.toUpperCase() === this.currentLanguageSubject.value.toUpperCase()) {
      return;
    }

    // Carica i testi per la nuova lingua se non già in cache
    await this.loadTexts(languageId);

    // Aggiorna la lingua corrente
    this.currentLanguageSubject.next(languageId);
    localStorage.setItem(this.STORAGE_KEY, languageId);

    // Rimuovi la vecchia chiave 'languageId' se esiste (legacy cleanup)
    localStorage.removeItem('languageId');
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
    try {
      // Load languages (don't wait if it fails - not critical)
      this.loadLanguages().catch(err => console.warn('Failed to load languages:', err));

      // Load texts for current language (this is critical)
      const currentLang = this.getCurrentLanguage();
      await this.loadTexts(currentLang);
    } catch (error) {
      console.error('Error initializing translation service:', error);
      // Don't throw - allow app to continue with fallback texts
    }
  }

  /**
   * Pulisce la cache (utile per test o reset)
   */
  clearCache(): void {
    this.textsCache.clear();
  }

  /**
   * Forza il reload delle traduzioni per la lingua corrente
   * Utile quando vengono aggiunte nuove traduzioni nel database
   */
  async reloadTexts(): Promise<void> {
    const currentLang = this.getCurrentLanguage();
    await this.loadTexts(currentLang, true);
  }
}
