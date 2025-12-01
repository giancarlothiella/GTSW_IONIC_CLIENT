// src/app/features/auth/reset-2fa/reset-2fa.page.ts
import { Component, OnInit, inject } from '@angular/core';
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
  IonIcon,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService, Language } from '../../../core/services/translation.service';
import { environment, webInfo } from '../../../../environments/environment';

@Component({
  selector: 'app-reset-2fa',
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
    IonIcon
  ],
  template: `
    <ion-content class="reset-2fa-content">
      <div class="reset-2fa-container">
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

        <ion-card class="reset-2fa-card">
          <ion-card-header>
            <ion-card-title class="ion-text-center">
              {{ getText(400) }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <!-- Info section -->
            <div class="info-section">
              <ion-text color="primary">
                <p class="info-text">
                  {{ getText(401) }}
                </p>
              </ion-text>
            </div>

            <!-- Email input -->
            <div class="input-section">
              <ion-text color="dark">
                <p class="input-label">{{ getText(402) }}</p>
              </ion-text>
              <ion-input
                type="email"
                inputmode="email"
                [(ngModel)]="formData.email"
                [placeholder]="getText(403)"
                class="custom-input"
                [disabled]="isLoading">
              </ion-input>
            </div>

            <!-- Secret key input -->
            <div class="input-section">
              <ion-text color="dark">
                <p class="input-label">{{ getText(404) }}</p>
              </ion-text>
              <ion-input
                type="text"
                [(ngModel)]="formData.reset2FATOTPSecret"
                [placeholder]="getText(405)"
                class="custom-input"
                [disabled]="isLoading">
              </ion-input>
              <ion-text color="medium">
                <p class="input-help">
                  {{ getText(406) }}
                </p>
              </ion-text>
            </div>

            @if (errorMessage) {
              <ion-text color="danger">
                <p class="error-message">{{ errorMessage }}</p>
              </ion-text>
            }

            <!-- Submit button -->
            <div class="button-container">
              <ion-button
                expand="block"
                (click)="onSubmit()"
                [disabled]="isLoading"
                class="submit-button">
                {{ isLoading ? getText(407) : getText(408) }}
              </ion-button>
            </div>

            <!-- Link torna al login -->
            <div class="back-link-container">
              <a (click)="onBackToLogin()" class="back-link">
                <ion-icon name="arrow-back-outline"></ion-icon>
                {{ getText(409) }}
              </a>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    .reset-2fa-content {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .reset-2fa-container {
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

    .reset-2fa-card {
      max-width: 500px;
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

    ion-card-content {
      padding-top: 30px;
    }

    .info-section {
      margin-bottom: 25px;
    }

    .info-text {
      font-size: 14px;
      text-align: center;
      line-height: 1.5;
      margin: 0;
    }

    .input-section {
      margin-bottom: 20px;
    }

    .input-label {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      display: block;
    }

    .custom-input {
      --background: var(--ion-color-light);
      --padding-start: 15px;
      --padding-end: 15px;
      border-radius: 8px;
      font-size: 15px;
      margin-bottom: 5px;
    }

    .input-help {
      font-size: 12px;
      margin: 8px 0 0 0;
      line-height: 1.4;
      font-style: italic;
    }

    .error-message {
      font-size: 13px;
      text-align: center;
      margin: 15px 0;
      padding: 10px;
      background: rgba(var(--ion-color-danger-rgb), 0.1);
      border-radius: 8px;
    }

    .button-container {
      margin-top: 25px;
    }

    .submit-button {
      --background: var(--ion-color-primary);
      --border-radius: 8px;
      font-weight: 600;
      height: 48px;
    }

    /* Link torna al login */
    .back-link-container {
      margin-top: 15px;
      text-align: center;
    }

    .back-link {
      color: var(--ion-color-medium);
      text-decoration: none;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: color 0.3s ease;
    }

    .back-link:hover {
      color: var(--ion-color-primary);
    }

    .back-link ion-icon {
      font-size: 18px;
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
      .reset-2fa-container {
        padding: 15px;
      }

      .reset-2fa-card {
        margin: 0;
      }
    }
  `]
})
export class Reset2FAPage implements OnInit {
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  webInfo = webInfo;
  environment = environment;

  formData = {
    email: '',
    reset2FATOTPSecret: ''
  };

  isLoading = false;
  errorMessage = '';

  // Multi-lingua
  availableLanguages: Language[] = [];
  currentLanguage: string = environment.languageId;

  async ngOnInit() {
    // Set logo CSS variable
    document.documentElement.style.setProperty('--webinfo-home-logo', `url('${this.webInfo.homeLogo}')`);

    // Inizializza traduzioni
    await this.initializeTranslations();
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

  async onSubmit() {
    // Validazione campi obbligatori
    if (!this.formData.email) {
      this.errorMessage = this.getText(410);
      return;
    }

    if (!this.formData.reset2FATOTPSecret || this.formData.reset2FATOTPSecret.trim() === '') {
      this.errorMessage = this.getText(411);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const loading = await this.loadingCtrl.create({
      message: this.getText(407)
    });
    await loading.present();

    try {
      const result = await this.authService.reset2FA(
        this.formData.email,
        this.formData.reset2FATOTPSecret
      );

      await loading.dismiss();
      this.isLoading = false;

      if (result && result.valid) {
        const toast = await this.toastCtrl.create({
          message: this.getText(412),
          duration: 4000,
          color: 'success'
        });
        await toast.present();

        this.router.navigate(['/login']);
      } else {
        this.errorMessage = result.message || 'Errore durante il reset 2FA';

        const toast = await this.toastCtrl.create({
          message: this.errorMessage,
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    } catch (error: any) {
      await loading.dismiss();
      this.isLoading = false;
      this.errorMessage = error.message || 'Errore durante il reset 2FA';

      const toast = await this.toastCtrl.create({
        message: this.errorMessage,
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  onBackToLogin() {
    this.router.navigate(['/login']);
  }
}
