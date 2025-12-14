// src/app/features/auth/activate/activate.page.ts
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
  IonSpinner,
  IonInput,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService, Language } from '../../../core/services/translation.service';
import { environment, webInfo } from '../../../../environments/environment';

@Component({
  selector: 'app-activate',
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
    IonSpinner,
    IonInput
  ],
  template: `
    <ion-content class="activate-content">
      <div class="activate-container">
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

        <ion-card class="activate-card">
          <ion-card-header>
            <ion-card-title class="ion-text-center">
              {{ getText(500) }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            @if (isLoading) {
              <div class="loading-section">
                <ion-spinner name="crescent"></ion-spinner>
                <p>{{ getText(501) }}</p>
              </div>
            } @else if (isActivated) {
              <!-- Account attivato con successo -->
              <div class="success-section">
                <ion-text color="success">
                  <h2>{{ getText(502) }}</h2>
                  <p>{{ getText(503) }}</p>
                </ion-text>

                @if (environment.TOTP2FAEnabled && totpData) {
                  <!-- Mostra QR code per configurare 2FA -->
                  <div class="totp-section">
                    <ion-text color="primary">
                      <h3>{{ getText(504) }}</h3>
                      <p>{{ getText(505) }}</p>
                    </ion-text>

                    <div class="qr-code-container">
                      <img [src]="totpData.totp2FAQRCode" alt="QR Code 2FA" />
                    </div>

                    <ion-text color="medium">
                      <p class="app-code">{{ getText(506) }} {{ totpData.totp2FAAppCode }}</p>
                      <p class="info-text">{{ getText(507) }}</p>
                    </ion-text>

                    <!-- Input per il codice TOTP -->
                    <div class="code-input-section">
                      <ion-text color="dark">
                        <p class="input-label">{{ getText(307) || 'Inserisci il codice a 6 cifre' }}</p>
                      </ion-text>

                      <ion-input
                        #totpInput
                        type="text"
                        inputmode="numeric"
                        maxlength="6"
                        [(ngModel)]="totpCode"
                        (ionInput)="onCodeInput()"
                        [placeholder]="getText(308) || '000000'"
                        class="totp-input"
                        [disabled]="isVerifying">
                      </ion-input>

                      @if (totpErrorMessage) {
                        <ion-text color="danger">
                          <p class="error-message">{{ totpErrorMessage }}</p>
                        </ion-text>
                      }
                    </div>

                    <div class="button-container">
                      <ion-button
                        expand="block"
                        (click)="onVerifyTotp()"
                        [disabled]="totpCode.length !== 6 || isVerifying"
                        class="submit-button">
                        {{ isVerifying ? (getText(310) || 'Verifica in corso...') : (getText(309) || 'Verifica') }}
                      </ion-button>
                    </div>
                  </div>
                } @else {
                  <div class="button-container">
                    <ion-button
                      expand="block"
                      (click)="goToLogin()"
                      class="submit-button">
                      {{ getText(508) }}
                    </ion-button>
                  </div>
                }
              </div>
            } @else {
              <!-- Errore attivazione -->
              <div class="error-section">
                <ion-text color="danger">
                  <h2>{{ getText(509) }}</h2>
                  <p>{{ errorMessage }}</p>
                </ion-text>

                <div class="button-container">
                  <ion-button
                    expand="block"
                    (click)="goToLogin()"
                    fill="outline"
                    class="submit-button">
                    {{ getText(510) }}
                  </ion-button>
                </div>
              </div>
            }
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    .activate-content {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .activate-container {
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

    .activate-card {
      max-width: 600px;
      width: 100%;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      border-radius: 16px;
      animation: fadeInUp 0.6s ease-out;
    }

    ion-card-header {
      background: var(--webinfo-home-logo) center/100% no-repeat;
      padding: 30px 20px;
      border-radius: 16px 16px 0 0;
      background-color: rgba(102, 126, 234, 0.1);
    }

    ion-card-title {
      font-size: 24px;
      font-weight: 700;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .loading-section {
      text-align: center;
      padding: 40px 20px;
    }

    .loading-section ion-spinner {
      width: 50px;
      height: 50px;
      margin-bottom: 20px;
    }

    .loading-section p {
      color: var(--ion-color-medium);
      font-size: 16px;
    }

    .success-section,
    .error-section {
      text-align: center;
      padding: 20px 0;
    }

    .success-section h2,
    .error-section h2 {
      font-size: 22px;
      font-weight: 600;
      margin: 0 0 15px 0;
    }

    .success-section p,
    .error-section p {
      font-size: 15px;
      line-height: 1.5;
      margin: 0 0 20px 0;
    }

    .totp-section {
      margin: 30px 0;
      padding: 20px;
      background: rgba(var(--ion-color-primary-rgb), 0.05);
      border-radius: 12px;
    }

    .totp-section h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 10px 0;
    }

    .totp-section p {
      font-size: 14px;
      line-height: 1.5;
      margin: 0 0 15px 0;
    }

    .qr-code-container {
      display: flex;
      justify-content: center;
      margin: 25px 0;
      padding: 20px;
      background: white;
      border-radius: 12px;
    }

    .qr-code-container img {
      max-width: 250px;
      width: 100%;
      height: auto;
    }

    .app-code {
      font-weight: 600;
      font-size: 16px;
      color: var(--ion-color-primary);
      margin: 15px 0 !important;
    }

    .info-text {
      font-style: italic;
      font-size: 13px !important;
    }

    .code-input-section {
      margin-top: 25px;
      margin-bottom: 10px;
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

    .error-message {
      font-size: 13px;
      text-align: center;
      margin-top: 10px;
      padding: 10px;
      background: rgba(var(--ion-color-danger-rgb), 0.1);
      border-radius: 8px;
    }

    .button-container {
      margin-top: 30px;
    }

    .submit-button {
      --background: var(--ion-color-primary);
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
      .activate-container {
        padding: 15px;
      }

      .activate-card {
        margin: 0;
      }

      .qr-code-container img {
        max-width: 200px;
      }
    }
  `]
})
export class ActivatePage implements OnInit {
  @ViewChild('totpInput') totpInput!: IonInput;

  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  webInfo = webInfo;
  environment = environment;

  isLoading = true;
  isActivated = false;
  errorMessage = '';
  authKey = '';
  totpData: any = null;

  // TOTP verification
  totpCode = '';
  totpErrorMessage = '';
  isVerifying = false;
  userEmail = '';

  // Multi-lingua
  availableLanguages: Language[] = [];
  currentLanguage: string = environment.languageId;

  async ngOnInit() {
    // Set logo CSS variable
    document.documentElement.style.setProperty('--webinfo-home-logo', `url('${this.webInfo.homeLogo}')`);

    // Inizializza traduzioni
    await this.initializeTranslations();

    // Get authKey from route params
    this.route.params.subscribe(params => {
      this.authKey = params['key'];
      if (this.authKey) {
        this.activateAccount();
      } else {
        this.isLoading = false;
        this.errorMessage = 'Chiave di attivazione mancante';
      }
    });
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

  async activateAccount() {
    try {
      const result = await this.authService.activateUser(this.authKey);

      this.isLoading = false;

      if (result && result.valid) {
        this.isActivated = true;

        // Se il 2FA è abilitato e ci sono dati TOTP nella risposta, salvali
        if (environment.TOTP2FAEnabled && result.totp2FAQRCode) {
          this.totpData = {
            totp2FAQRCode: result.totp2FAQRCode,
            totp2FAAppCode: result.totp2FAAppCode || webInfo.appCode
          };
          // Salva l'email per la verifica TOTP
          this.userEmail = (result as any).email || result.data?.email || '';

          // Focus sull'input TOTP dopo un breve ritardo
          setTimeout(() => {
            this.totpInput?.setFocus();
          }, 300);
        }

        const toast = await this.toastCtrl.create({
          message: this.getText(502),
          duration: 3000,
          color: 'success'
        });
        await toast.present();
      } else {
        this.isActivated = false;
        this.errorMessage = result.message || 'Chiave di attivazione non valida';

        const toast = await this.toastCtrl.create({
          message: this.errorMessage,
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    } catch (error: any) {
      this.isLoading = false;
      this.isActivated = false;
      this.errorMessage = error.message || 'Errore durante l\'attivazione dell\'account';

      const toast = await this.toastCtrl.create({
        message: this.errorMessage,
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  /**
   * Auto-verifica quando l'utente inserisce 6 cifre
   */
  async onCodeInput() {
    this.totpErrorMessage = '';

    // Se il codice è di 6 cifre, verifica automaticamente
    if (this.totpCode.length === 6) {
      await this.onVerifyTotp();
    }
  }

  /**
   * Verifica il codice TOTP
   */
  async onVerifyTotp() {
    if (this.totpCode.length !== 6) {
      this.totpErrorMessage = 'Il codice deve essere di 6 cifre';
      return;
    }

    if (!this.userEmail) {
      this.totpErrorMessage = 'Email utente non disponibile';
      return;
    }

    this.isVerifying = true;
    this.totpErrorMessage = '';

    const loading = await this.loadingCtrl.create({
      message: this.getText(301) || 'Verifica in corso...'
    });
    await loading.present();

    try {
      const result = await this.authService.verifyTotp(this.userEmail, this.totpCode);

      await loading.dismiss();
      this.isVerifying = false;

      if (result.valid) {
        const toast = await this.toastCtrl.create({
          message: this.getText(312) || 'Verifica completata con successo!',
          duration: 2000,
          color: 'success'
        });
        await toast.present();

        // Vai al login
        this.router.navigate(['/login']);
      } else {
        this.totpErrorMessage = result.message || 'Codice non valido';
        this.totpCode = '';

        const toast = await this.toastCtrl.create({
          message: this.totpErrorMessage,
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    } catch (error: any) {
      await loading.dismiss();
      this.isVerifying = false;
      this.totpErrorMessage = error.message || 'Errore durante la verifica';
      this.totpCode = '';

      const toast = await this.toastCtrl.create({
        message: this.totpErrorMessage,
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }
}
