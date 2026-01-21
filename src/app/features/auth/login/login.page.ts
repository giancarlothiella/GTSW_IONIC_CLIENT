// src/app/features/auth/login/login.page.ts
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
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
  IonFooter,
  IonToolbar,
  IonInput,
  IonIcon,
  LoadingController,
  ToastController,
  ViewWillEnter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { AuthService, LoginCredentials } from '../../../core/services/auth.service';
import { TranslationService, Language } from '../../../core/services/translation.service';
import { environment, webInfo } from '../../../../environments/environment';

// Register icons
addIcons({
  'eye-outline': eyeOutline,
  'eye-off-outline': eyeOffOutline
});

@Component({
  selector: 'app-login',
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
    IonFooter,
    IonToolbar,
    IonInput,
    IonIcon
  ],
  template: `
    <ion-content class="login-content">
      @if (!textsLoaded) {
        <div class="loading-container">
          <div class="loading-spinner"></div>
        </div>
      } @else {
      <div class="login-container">
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

        <!-- Card di Login -->
        <ion-card class="login-card">
          <ion-card-header>
            <ion-card-title class="ion-text-center">
              {{ getText(2) }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <!-- Email Field -->
            <div class="input-section">
              <ion-text color="dark">
                <p class="input-label">{{ getText(3) }}</p>
              </ion-text>
              <ion-input
                type="email"
                inputmode="email"
                autocomplete="username"
                [(ngModel)]="formData.email"
                [placeholder]="getText(4)"
                class="custom-input"
                [disabled]="isLoading">
              </ion-input>
              @if (emailError) {
                <ion-text color="danger">
                  <p class="field-error">{{ emailError }}</p>
                </ion-text>
              }
            </div>

            <!-- Password Field -->
            <div class="input-section">
              <ion-text color="dark">
                <p class="input-label">{{ getText(5) }}</p>
              </ion-text>
              <div class="password-input-wrapper">
                <ion-input
                  [type]="passwordVisible ? 'text' : 'password'"
                  autocomplete="current-password"
                  [(ngModel)]="formData.password"
                  [placeholder]="getText(6)"
                  class="custom-input password-input"
                  [disabled]="isLoading">
                </ion-input>
                <button
                  type="button"
                  class="password-toggle-btn"
                  (click)="togglePasswordVisibility()"
                  [disabled]="isLoading"
                  tabindex="-1">
                  <ion-icon [name]="passwordVisible ? 'eye-off-outline' : 'eye-outline'"></ion-icon>
                </button>
              </div>
              @if (passwordError) {
                <ion-text color="danger">
                  <p class="field-error">{{ passwordError }}</p>
                </ion-text>
              }
            </div>

            <!-- Messaggio di errore -->
            @if (errorMessage) {
              <ion-text color="danger" class="error-message">
                <p>{{ errorMessage }}</p>
              </ion-text>
            }

            <!-- Bottone Login -->
            <div class="button-container">
              <ion-button
                expand="block"
                (click)="onLogin()"
                [disabled]="isLoading"
                class="login-button">
                {{ isLoading ? getText(46) : getText(7) }}
              </ion-button>
            </div>

            <!-- Bottoni Secondari -->
            <div class="secondary-actions">
              <ion-button
                fill="clear"
                size="small"
                (click)="onForgotPassword()"
                class="link-button">
                {{ getText(8) }}
              </ion-button>

              @if (environment.TOTP2FAEnabled) {
                <ion-button
                  fill="clear"
                  size="small"
                  (click)="onReset2FA()"
                  class="link-button">
                  {{ getText(27) }}
                </ion-button>
              }

              @if (fromLanding) {
                <ion-button
                  fill="clear"
                  size="small"
                  (click)="backToLanding()"
                  class="back-to-landing-button">
                  ← {{ getText(51) }}
                </ion-button>
              }
            </div>

            <!-- Separatore -->
            <div class="separator">
              <span>{{ getText(11) }}</span>
            </div>

            <!-- Bottone Registrazione -->
            <ion-button
              expand="block"
              fill="outline"
              (click)="onRegister()"
              class="register-button">
              {{ getText(10) }}
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>
      }
    </ion-content>

    <!-- Footer -->
    <ion-footer class="login-footer">
      <ion-toolbar>
        <div class="footer-content">
          <div class="footer-links">
            <a [href]="webInfo.termsURL" target="_blank">Termini di servizio</a>
            <span class="separator">•</span>
            <a [href]="webInfo.policyURL" target="_blank">Privacy Policy</a>
            <span class="separator">•</span>
            <a [href]="webInfo.cookiesURL" target="_blank">Cookies</a>
          </div>
          <div class="footer-owner">
            <p>© {{ currentYear }} {{ webInfo.appOwner }}</p>
            <a [href]="webInfo.footerURL" target="_blank">{{ webInfo.footerText }}</a>
          </div>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    .login-content {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100%;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .login-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100%;
      padding: 20px;
      padding-bottom: 120px;
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

    /* Card di login */
    .login-card {
      max-width: 450px;
      width: 100%;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      border-radius: 16px;
      animation: fadeInUp 0.6s ease-out;
    }

    ion-card-header {
      background: url('${webInfo.homeLogo}') center/100% no-repeat;
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

    /* Form styling */
    .input-section {
      margin-bottom: 20px;
    }

    .input-section:first-child {
      margin-top: 15px;
    }

    .input-label {
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 6px;
      display: block;
      color: #555;
    }

    .custom-input {
      --background: var(--ion-color-light);
      --padding-start: 15px;
      --padding-end: 15px;
      border-radius: 8px;
      font-size: 15px;
    }

    .password-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .password-input {
      flex: 1;
      --padding-end: 45px;
    }

    .password-toggle-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      padding: 8px;
      cursor: pointer;
      color: var(--ion-color-medium);
      z-index: 10;
    }

    .password-toggle-btn:hover {
      color: var(--ion-color-primary);
    }

    .password-toggle-btn ion-icon {
      font-size: 20px;
    }

    .field-error {
      font-size: 12px;
      margin: 5px 0 0 0;
      padding-left: 2px;
    }

    /* Messaggi di errore */
    .error-message {
      display: block;
      text-align: center;
      margin: 15px 0;
      padding: 10px;
      background: rgba(var(--ion-color-danger-rgb), 0.1);
      border-radius: 8px;
    }

    .error-message p {
      margin: 0;
      font-size: 14px;
    }

    /* Bottoni */
    .button-container {
      margin-top: 20px;
    }

    .login-button {
      --background: var(--ion-color-primary);
      --border-radius: 8px;
      font-weight: 600;
      height: 48px;
    }

    .secondary-actions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      margin-top: 10px;
      margin-bottom: 5px;
    }

    .link-button {
      --color: var(--ion-color-medium);
      font-size: 13px;
      text-transform: none;
    }

    .link-button:hover {
      --color: var(--ion-color-primary);
    }

    /* Bottone torna alla landing - più visibile */
    .back-to-landing-button {
      --color: var(--ion-color-primary);
      font-size: 14px;
      font-weight: 600;
      text-transform: none;
      margin-top: 8px;
      padding: 8px 16px;
      border: 1px solid var(--ion-color-primary-shade);
      border-radius: 8px;
    }

    .back-to-landing-button:hover {
      --color: var(--ion-color-primary-shade);
      --background: rgba(var(--ion-color-primary-rgb), 0.1);
    }

    /* Separatore */
    .separator {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 20px 0 15px 0;
      color: var(--ion-color-medium);
    }

    .separator::before,
    .separator::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--ion-color-light-shade);
    }

    .separator span {
      padding: 0 15px;
      font-size: 13px;
      font-weight: 500;
    }

    /* Bottone registrazione */
    .register-button {
      --border-width: 2px;
      --border-radius: 8px;
      font-weight: 600;
      height: 48px;
    }

    /* Footer */
    .login-footer {
      background: transparent;
    }

    .login-footer ion-toolbar {
      --background: rgba(255, 255, 255, 0.95);
      --border-width: 0;
      --padding-top: 10px;
      --padding-bottom: 10px;
    }

    .footer-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
    }

    .footer-links {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
    }

    .footer-links a {
      color: var(--ion-color-primary);
      text-decoration: none;
    }

    .footer-links a:hover {
      text-decoration: underline;
    }

    .footer-links .separator {
      color: var(--ion-color-medium);
      margin: 0;
      border: none;
    }

    .footer-links .separator::before,
    .footer-links .separator::after {
      display: none;
    }

    .footer-owner {
      text-align: center;
      font-size: 11px;
      color: var(--ion-color-medium);
    }

    .footer-owner p {
      margin: 0 0 5px 0;
    }

    .footer-owner a {
      color: var(--ion-color-primary);
      text-decoration: none;
      font-weight: 500;
    }

    /* Animazioni */
    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
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

    /* Responsive */
    @media (max-width: 576px) {
      .login-container {
        padding: 15px;
        padding-bottom: 150px;
      }

      .app-logo {
        width: 90px;
        height: 90px;
      }

      .app-title {
        font-size: 24px;
      }

      .login-card {
        margin: 0;
      }

      .footer-links {
        flex-direction: column;
        gap: 5px;
      }

      .footer-links .separator {
        display: none;
      }
    }
  `]
})
export class LoginPage implements OnInit, ViewWillEnter {
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  // Dati dell'app dall'environment
  webInfo = webInfo;
  environment = environment;
  currentYear = new Date().getFullYear();

  formData: LoginCredentials = {
    email: '',
    password: '',
    loginType: 'email'
  };

  isLoading = false;
  errorMessage = '';
  textsLoaded = false;

  // Controllo visibilità password
  passwordVisible = false;

  // Validazione campi
  emailError = '';
  passwordError = '';

  // Multi-lingua
  availableLanguages: Language[] = [];
  currentLanguage: string = environment.languageId;

  // Tracking se arriviamo dalla landing page
  fromLanding = false;

  constructor() {
    // Controlla se arriviamo dalla landing page
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.fromLanding = navigation.extras.state['fromLanding'] || false;
    }
  }

  async ngOnInit() {
    // Inizializza il servizio di traduzione
    await this.initializeTranslations();

    // Pulisci il form al caricamento della pagina se l'utente non è autenticato
    const isAuth = await this.authService.isAuthenticated();
    if (!isAuth) {
      this.clearForm();
    }
  }

  private async initializeTranslations() {
    try {
      await this.translationService.initialize();
      this.availableLanguages = this.translationService.getLanguages();
      this.currentLanguage = this.translationService.getCurrentLanguage();
      this.textsLoaded = true;

      // Force change detection after async operation
      this.cdr.detectChanges();

      // Sottoscrivi ai cambiamenti di lingua
      this.translationService.currentLanguage$.subscribe(lang => {
        this.currentLanguage = lang;
      });
    } catch (error) {
      console.error('Error initializing translations:', error);
      // Fallback: usa solo la lingua di default
      this.currentLanguage = environment.languageId;
      this.textsLoaded = true;
      this.cdr.detectChanges();
    }
  }

  async ionViewWillEnter() {
    // Pulisci il form ogni volta che la pagina diventa attiva dopo un logout
    const isAuth = await this.authService.isAuthenticated();
    if (!isAuth) {
      this.clearForm();
    }
  }

  /**
   * Pulisce completamente il form di login
   */
  private clearForm() {
    // In development, pre-compila le credenziali per velocizzare il testing
    if (!environment.production) {
      this.formData = {
        email: 'giancarlo.thiella@gtsoftware.ch',
        password: 'Wally2$GT271258',
        loginType: 'email'
      };
    } else {
      this.formData = {
        email: '',
        password: '',
        loginType: 'email'
      };
    }
    this.errorMessage = '';
    this.emailError = '';
    this.passwordError = '';
    this.passwordVisible = false;
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  /**
   * Valida il form prima del login
   */
  private validateForm(): boolean {
    this.emailError = '';
    this.passwordError = '';

    if (!this.formData.email) {
      this.emailError = this.getText(3) + ' obbligatoria';
      return false;
    }

    // Validazione email con regex semplice
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formData.email)) {
      this.emailError = 'Email non valida';
      return false;
    }

    if (!this.formData.password) {
      this.passwordError = this.getText(5) + ' obbligatoria';
      return false;
    }

    return true;
  }

  async onLogin() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const loading = await this.loadingCtrl.create({
      message: this.getText(46)
    });
    await loading.present();

    this.authService.login(this.formData).subscribe({
      next: async (response) => {
        await loading.dismiss();
        this.isLoading = false;

        // Se la password è scaduta, naviga alla pagina di cambio password
        if (response.passwordExpired) {
          const toast = await this.toastCtrl.create({
            message: response.message || 'La password è scaduta. È necessario cambiarla.',
            duration: 3000,
            color: 'warning'
          });
          await toast.present();

          // Naviga alla pagina di cambio password con parametro expired
          this.router.navigate(['/change-password'], {
            queryParams: { expired: 'true' }
          });
        }
        // Se 2FA è abilitato, salva i dati e naviga alla pagina TOTP
        else if (environment.TOTP2FAEnabled && response.totp2FAenabled) {
          // Salva i dati temporanei 2FA in localStorage
          const totpData = {
            totp2FAToken: response.totp2FAToken,
            totp2FAenabled: response.totp2FAenabled,
            totp2FAsaved: response.totp2FAsaved,
            totp2FAQRCode: response.totp2FAQRCode,
            totp2FAAppCode: response.totp2FAAppCode,
            totpEmail: response.data.email,
            data: response.data
          };
          localStorage.setItem('totpData', JSON.stringify(totpData));

          // Naviga alla pagina di verifica TOTP
          this.router.navigate(['/totp-verify']);
        } else {
          // Login normale senza 2FA
          const toast = await this.toastCtrl.create({
            message: response.message || 'Login effettuato con successo!',
            duration: 2000,
            color: 'success'
          });
          await toast.present();

          // Controlla se l'utente ha un homePath dedicato (accesso limitato)
          const homePath = this.authService.getHomePath();
          if (homePath) {
            // Naviga direttamente alla pagina dedicata (il menu sarà nascosto nella shell)
            this.router.navigate(['/' + homePath]);
          } else {
            // Naviga alla home standard con menu laterale
            this.router.navigate(['/home']);
          }
        }
      },
      error: async (error) => {
        await loading.dismiss();
        this.isLoading = false;

        // Controlla se la password è scaduta (il server ritorna 401 con messaggio specifico)
        const serverMessage = error.error?.message || error.message;

        if (serverMessage === 'Password is expired!' || error.error?.passwordExpired) {
          // Salva i dati dell'utente in localStorage temporaneamente
          // Combina i dati del server (se presenti) con l'email dal form
          const tempData = {
            ...error.error?.data,
            email: this.formData.email
          };

          localStorage.setItem('tempUserData', JSON.stringify(tempData));

          const toast = await this.toastCtrl.create({
            message: 'La password è scaduta. È necessario cambiarla.',
            duration: 3000,
            color: 'warning'
          });
          await toast.present();

          // Naviga alla pagina di cambio password con parametro expired
          this.router.navigate(['/change-password'], {
            queryParams: { expired: 'true' }
          });
          return;
        }

        // Gestisci altri errori
        this.errorMessage = serverMessage || 'Errore durante il login';

        const toast = await this.toastCtrl.create({
          message: this.errorMessage,
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  /**
   * Gestisce il click su "Registrati"
   */
  async onRegister() {
    this.router.navigate(['/register']);
  }

  /**
   * Gestisce il click su "Password dimenticata"
   */
  async onForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  /**
   * Gestisce il click su "Reset 2FA"
   */
  async onReset2FA() {
    this.router.navigate(['/reset-2fa']);
  }

  /**
   * Torna alla landing page
   */
  backToLanding() {
    this.router.navigate(['/landing']);
  }

  /**
   * Ottiene un testo tradotto per ID
   */
  getText(txtId: number): string {
    return this.translationService.getText(txtId, '');
  }

  /**
   * Cambia la lingua dell'applicazione
   */
  async changeLanguage(languageId: string) {
    try {
      // Normalizza il languageId in maiuscolo per i testi
      const normalizedLangId = languageId.toUpperCase();
      await this.translationService.setLanguage(normalizedLangId);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  }

  /**
   * Ottiene l'emoji della bandiera per una lingua
   */
  getLanguageFlag(languageId: string): string {
    const flags: { [key: string]: string } = {
      'IT': '🇮🇹',
      'it': '🇮🇹',
      'EN': '🇬🇧',
      'en': '🇬🇧',
      'ES': '🇪🇸',
      'es': '🇪🇸',
      'FR': '🇫🇷',
      'fr': '🇫🇷',
      'DE': '🇩🇪',
      'de': '🇩🇪'
    };
    return flags[languageId] || '🌐';
  }
}