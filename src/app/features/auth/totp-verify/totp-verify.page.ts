// src/app/features/auth/totp-verify/totp-verify.page.ts
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonText,
  IonInput,
  IonSpinner,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService, Language } from '../../../core/services/translation.service';
import { environment, webInfo } from '../../../../environments/environment';

@Component({
  selector: 'app-totp-verify',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonText,
    IonInput,
    IonSpinner
  ],
  template: `
    <ion-content class="totp-content">
      <div class="totp-container">
        <!-- Language Selector -->
        <div class="language-selector">
          @for (lang of availableLanguages; track lang.languageId) {
            <button
              class="language-btn"
              [class.active]="currentLanguage.toUpperCase() === lang.languageId.toUpperCase()"
              (click)="changeLanguage(lang.languageId)"
              [title]="lang.description">
              @if (lang.flagIcon) {
                <img [src]="lang.flagIcon" [alt]="lang.description" class="flag-icon">
              } @else {
                <span class="flag-emoji">{{ getLanguageFlag(lang.languageId) }}</span>
              }
            </button>
          }
        </div>

        <ion-card class="totp-card">
          <ion-card-header>
            <ion-card-title class="ion-text-center">
              {{ totpAppCode }} - {{ getText(300) }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            @if (isLoading) {
              <div class="loading-container">
                <ion-spinner></ion-spinner>
                <p>{{ getText(301) }}</p>
              </div>
            } @else {
              <!-- Messaggio per dispositivo già registrato -->
              @if (totp2FAsaved) {
                <div class="info-section">
                  <ion-text color="primary">
                    <p class="info-text">
                      <strong>{{ getText(302) }}</strong>
                    </p>
                    <p class="info-description">
                      {{ getText(303) }}
                    </p>
                  </ion-text>
                </div>
              }

              <!-- Messaggio e QR code per prima configurazione -->
              @if (!totp2FAsaved && totpQRCode) {
                <div class="qr-section">
                  <ion-text color="primary">
                    <p class="info-text">
                      <strong>{{ getText(304) }}</strong>
                    </p>
                    <p class="info-description">
                      {{ getText(305) }}
                    </p>
                  </ion-text>

                  <!-- QR Code -->
                  <div class="qr-code-container">
                    <img [src]="totpQRCode" alt="QR Code" class="qr-code-image" />
                  </div>

                  <ion-text color="medium">
                    <p class="qr-help-text">
                      {{ getText(306) }}
                    </p>
                  </ion-text>
                </div>
              }

              <!-- Input per il codice TOTP -->
              <div class="code-input-section">
                <ion-text color="dark">
                  <p class="input-label">{{ getText(307) }}</p>
                </ion-text>

                <ion-input
                  #totpInput
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  [(ngModel)]="totpCode"
                  (ionInput)="onCodeInput()"
                  [placeholder]="getText(308)"
                  class="totp-input"
                  [disabled]="isVerifying">
                </ion-input>

                @if (errorMessage) {
                  <ion-text color="danger">
                    <p class="error-message">{{ errorMessage }}</p>
                  </ion-text>
                }
              </div>

              <!-- Bottoni azione -->
              <div class="button-container">
                <ion-button
                  expand="block"
                  (click)="onVerify()"
                  [disabled]="totpCode.length !== 6 || isVerifying"
                  class="verify-button">
                  {{ isVerifying ? getText(310) : getText(309) }}
                </ion-button>

                <ion-button
                  expand="block"
                  fill="outline"
                  (click)="onCancel()"
                  [disabled]="isVerifying"
                  class="cancel-button">
                  {{ getText(311) }}
                </ion-button>
              </div>
            }
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    .totp-content {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .totp-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100%;
      padding: 20px;
      position: relative;
    }

    /* Language Selector */
    .language-selector {
      position: absolute;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 8px;
      z-index: 100;
    }

    .language-btn {
      background: rgba(255, 255, 255, 0.95);
      border: 3px solid #e0e0e0;
      border-radius: 8px;
      padding: 6px 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 42px;
      min-height: 38px;
    }

    .language-btn:hover {
      background: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      border-color: #c0c0c0;
    }

    .language-btn.active {
      background: white;
      border: 4px solid #4CAF50;
      box-shadow: 0 4px 16px rgba(76, 175, 80, 0.5);
      transform: scale(1.0);
    }

    .language-btn .flag-emoji {
      font-size: 24px;
      line-height: 1;
      display: block;
    }

    .language-btn .flag-icon {
      width: 24px;
      height: 24px;
      object-fit: contain;
      display: block;
    }

    .totp-card {
      max-width: 500px;
      width: 100%;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      border-radius: 16px;
      animation: fadeInUp 0.6s ease-out;
    }

    ion-card-header {
      background-color: rgba(102, 126, 234, 0.1);
      padding: 20px;
      border-radius: 16px 16px 0 0;
    }

    ion-card-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--ion-color-primary);
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
    }

    .loading-container ion-spinner {
      margin-bottom: 20px;
    }

    .loading-container p {
      color: var(--ion-color-medium);
      font-size: 14px;
    }

    .info-section,
    .qr-section {
      margin-bottom: 30px;
    }

    .info-text {
      font-size: 16px;
      margin-bottom: 10px;
      text-align: center;
    }

    .info-description {
      font-size: 14px;
      text-align: center;
      line-height: 1.5;
      margin-bottom: 15px;
    }

    .qr-code-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      background: white;
      border-radius: 12px;
      margin: 20px 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .qr-code-image {
      max-width: 250px;
      width: 100%;
      height: auto;
    }

    .qr-help-text {
      font-size: 13px;
      text-align: center;
      line-height: 1.4;
      display: block;
      margin-top: 10px;
    }

    .code-input-section {
      margin-bottom: 30px;
    }

    .input-label {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 10px;
      display: block;
      text-align: center;
    }

    .totp-input {
      --background: var(--ion-color-light);
      --padding-start: 20px;
      --padding-end: 20px;
      --placeholder-color: rgba(0, 0, 0, 0.4);
      --placeholder-font-weight: 300;
      text-align: center;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 6px;
      border-radius: 12px;
      height: 60px;
      margin: 15px 0;
    }

    /* Stili del placeholder con massima specificità */
    ion-input.totp-input::part(native)::placeholder {
      font-size: 9px !important;
      font-weight: 300 !important;
      letter-spacing: 0.5px !important;
      opacity: 0.5 !important;
      line-height: 1.2 !important;
      text-transform: none !important;
    }

    .totp-input input::placeholder,
    .totp-input input::-webkit-input-placeholder,
    .totp-input input::-moz-placeholder,
    .totp-input input:-ms-input-placeholder {
      font-size: 9px !important;
      font-weight: 300 !important;
      letter-spacing: 0.5px !important;
      opacity: 0.5 !important;
      line-height: 1.2 !important;
      text-transform: none !important;
    }

    .error-message {
      font-size: 13px;
      text-align: center;
      margin-top: 10px;
      padding: 10px;
      background: rgba(var(--ion-color-danger-rgb), 0.1);
      border-radius: 8px;
    }

    .button-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 20px;
    }

    .verify-button {
      --background: var(--ion-color-primary);
      --border-radius: 8px;
      font-weight: 600;
      height: 48px;
    }

    .cancel-button {
      --border-width: 2px;
      --border-radius: 8px;
      font-weight: 600;
      height: 48px;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 576px) {
      .totp-container {
        padding: 15px;
      }

      .totp-card {
        margin: 0;
      }

      .qr-code-image {
        max-width: 200px;
      }

      .totp-input {
        font-size: 20px;
        letter-spacing: 4px;
        height: 55px;
      }
    }
  `]
})
export class TotpVerifyPage implements OnInit {
  @ViewChild('totpInput') totpInput!: IonInput;

  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  webInfo = webInfo;
  environment = environment;

  // Dati 2FA
  totpEmail = '';
  totpAppCode = '';
  totp2FAsaved = false;
  totpQRCode = '';

  // Input utente
  totpCode = '';

  // Stati
  isLoading = false;
  isVerifying = false;
  errorMessage = '';

  // Multi-lingua
  availableLanguages: Language[] = [];
  currentLanguage: string = environment.languageId;

  async ngOnInit() {
    // Inizializza traduzioni
    await this.initializeTranslations();

    // Carica i dati temporanei dal localStorage
    const totpDataStr = localStorage.getItem('totpData');

    if (!totpDataStr) {
      // Se non ci sono dati, torna al login
      this.router.navigate(['/login']);
      return;
    }

    try {
      const totpData = JSON.parse(totpDataStr);
      this.totpEmail = totpData.totpEmail;
      this.totpAppCode = totpData.totp2FAAppCode || webInfo.appCode;
      this.totp2FAsaved = totpData.totp2FAsaved || false;
      this.totpQRCode = totpData.totp2FAQRCode || '';

      // Metti il focus sul campo input dopo un breve ritardo
      setTimeout(() => {
        this.totpInput?.setFocus();
      }, 300);
    } catch (error) {
      console.error('Error parsing TOTP data:', error);
      this.router.navigate(['/login']);
    }
  }

  private async initializeTranslations() {
    try {
      await this.translationService.initialize();
      this.availableLanguages = this.translationService.getLanguages();
      this.currentLanguage = this.translationService.getCurrentLanguage();

      // Sottoscrivi ai cambiamenti di lingua
      this.translationService.currentLanguage$.subscribe(lang => {
        this.currentLanguage = lang;
      });
    } catch (error) {
      console.error('Error initializing translations:', error);
      this.currentLanguage = environment.languageId;
    }
  }

  getText(txtId: number): string {
    return this.translationService.getText(txtId, '');
  }

  async changeLanguage(languageId: string) {
    try {
      const normalizedLangId = languageId.toUpperCase();
      await this.translationService.setLanguage(normalizedLangId);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  }

  getLanguageFlag(languageId: string): string {
    const flags: { [key: string]: string } = {
      'IT': '🇮🇹', 'it': '🇮🇹',
      'EN': '🇬🇧', 'en': '🇬🇧',
      'ES': '🇪🇸', 'es': '🇪🇸',
      'FR': '🇫🇷', 'fr': '🇫🇷',
      'DE': '🇩🇪', 'de': '🇩🇪'
    };
    return flags[languageId] || '🌐';
  }

  /**
   * Auto-verifica quando l'utente inserisce 6 cifre
   */
  async onCodeInput() {
    this.errorMessage = '';

    // Se il codice è di 6 cifre, verifica automaticamente
    if (this.totpCode.length === 6) {
      await this.onVerify();
    }
  }

  /**
   * Verifica il codice TOTP
   */
  async onVerify() {
    if (this.totpCode.length !== 6) {
      this.errorMessage = 'Il codice deve essere di 6 cifre';
      return;
    }

    this.isVerifying = true;
    this.errorMessage = '';

    const loading = await this.loadingCtrl.create({
      message: this.getText(301)
    });
    await loading.present();

    try {
      const result = await this.authService.verifyTotp(this.totpEmail, this.totpCode);

      await loading.dismiss();
      this.isVerifying = false;

      if (result.valid) {
        // Rimuovi i dati temporanei
        localStorage.removeItem('totpData');

        const toast = await this.toastCtrl.create({
          message: this.getText(312),
          duration: 2000,
          color: 'success'
        });
        await toast.present();

        // Attendi che l'autenticazione sia effettivamente salvata
        // Verifica in loop fino a quando isAuthenticated() ritorna true
        let isAuth = false;
        let attempts = 0;
        const maxAttempts = 20; // Max 2 secondi (20 x 100ms)

        while (!isAuth && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          isAuth = await this.authService.isAuthenticated();
          attempts++;
        }

        if (!isAuth) {
          this.errorMessage = 'Errore nel salvataggio dell\'autenticazione';
          return;
        }

        // Controlla se l'utente ha un homePath dedicato (accesso limitato)
        const homePath = this.authService.getHomePath();
        if (homePath) {
          // Naviga direttamente alla pagina dedicata (il menu sarà nascosto nella shell)
          await this.router.navigateByUrl('/' + homePath, { replaceUrl: true });
        } else {
          // Naviga alla home standard con menu laterale
          await this.router.navigateByUrl('/home', { replaceUrl: true });
        }
      } else {
        this.errorMessage = result.message || 'Codice non valido';
        this.totpCode = '';

        const toast = await this.toastCtrl.create({
          message: this.errorMessage,
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    } catch (error: any) {
      await loading.dismiss();
      this.isVerifying = false;
      this.errorMessage = error.message || 'Errore durante la verifica';
      this.totpCode = '';

      const toast = await this.toastCtrl.create({
        message: this.errorMessage,
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  /**
   * Annulla e torna al login
   */
  async onCancel() {
    // Rimuovi i dati temporanei
    localStorage.removeItem('totpData');

    // Torna al login
    this.router.navigate(['/login']);
  }
}
