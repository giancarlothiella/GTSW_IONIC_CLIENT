// src/app/features/auth/login/login.page.ts
import { Component, inject, ViewChild, AfterViewInit, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
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
  LoadingController,
  ToastController,
  ViewWillEnter
} from '@ionic/angular/standalone';
import { DxFormModule, DxButtonModule, DxFormComponent } from 'devextreme-angular';
import { AuthService, LoginCredentials } from '../../../core/services/auth.service';
import { TranslationService, Language } from '../../../core/services/translation.service';
import { environment, webInfo } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonText,
    IonFooter,
    IonToolbar,
    DxFormModule,
    DxButtonModule
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
            <dx-form
              #loginForm
              [(formData)]="formData"
              [colCount]="1"
              [showColonAfterLabel]="false"
              labelLocation="top">

              <dxi-item
                [label]="{text: getText(3)}"
                dataField="email"
                [editorOptions]="{
                  placeholder: getText(4),
                  mode: 'email',
                  inputAttr: { autocomplete: 'username' }
                }">
                <dxi-validation-rule
                  type="required"
                  [message]="getText(3) + ' obbligatoria'">
                </dxi-validation-rule>
                <dxi-validation-rule
                  type="email"
                  message="Email non valida">
                </dxi-validation-rule>
              </dxi-item>

              <dxi-item
                [label]="{text: getText(5)}"
                dataField="password"
                editorType="dxTextBox"
                [editorOptions]="passwordEditorOptions">
                <dxi-validation-rule
                  type="required"
                  [message]="getText(5) + ' obbligatoria'">
                </dxi-validation-rule>
              </dxi-item>

            </dx-form>

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
    dx-form {
      margin-top: 20px;
      margin-bottom: 20px;
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
export class LoginPage implements OnInit, AfterViewInit, ViewWillEnter {
  @ViewChild('loginForm') loginFormComponent!: DxFormComponent;

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
  passwordEditorOptions: any;

  // Multi-lingua
  availableLanguages: Language[] = [];
  currentLanguage: string = environment.languageId;

  // Tracking se arriviamo dalla landing page
  fromLanding = false;

  constructor() {
    // Inizializza le opzioni del campo password
    this.updatePasswordEditorOptions();

    // Controlla se arriviamo dalla landing page
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.fromLanding = navigation.extras.state['fromLanding'] || false;
    }
  }

  private updatePasswordEditorOptions() {
    this.passwordEditorOptions = {
      placeholder: this.getText(6),
      mode: 'password',
      inputAttr: { autocomplete: 'current-password' },
      buttons: [{
        name: 'password',
        location: 'after',
        options: {
          icon: 'eyeclose',
          type: 'default',
          stylingMode: 'text',
          tabIndex: -1,
          onClick: () => {
            this.togglePasswordVisibility();
          }
        }
      }]
    };
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

      // Aggiorna le opzioni dopo che i testi sono caricati
      this.updatePasswordEditorOptions();

      // Sottoscrivi ai cambiamenti di lingua
      this.translationService.currentLanguage$.subscribe(lang => {
        this.currentLanguage = lang;
        this.updatePasswordEditorOptions();
      });
    } catch (error) {
      console.error('Error initializing translations:', error);
      // Fallback: usa solo la lingua di default
      this.currentLanguage = environment.languageId;
      this.textsLoaded = true;
      this.cdr.detectChanges();
    }
  }

  ngAfterViewInit() {
    // Form is now available
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
    this.passwordVisible = false;

    // Reset delle opzioni del campo password
    this.passwordEditorOptions = {
      ...this.passwordEditorOptions,
      mode: 'password',
      buttons: [{
        name: 'password',
        location: 'after',
        options: {
          icon: 'eyeclose',
          type: 'default',
          stylingMode: 'text',
          tabIndex: -1,
          onClick: () => {
            this.togglePasswordVisibility();
          }
        }
      }]
    };

    // Ripulisci anche il form component se disponibile
    if (this.loginFormComponent) {
      this.loginFormComponent.instance.resetValues();
    }
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;

    // Aggiorna le opzioni del campo password
    this.passwordEditorOptions = {
      ...this.passwordEditorOptions,
      mode: this.passwordVisible ? 'text' : 'password',
      inputAttr: { autocomplete: 'current-password' },
      buttons: [{
        name: 'password',
        location: 'after',
        options: {
          icon: this.passwordVisible ? 'eyeopen' : 'eyeclose',
          type: 'default',
          stylingMode: 'text',
          tabIndex: -1,
          onClick: () => {
            this.togglePasswordVisibility();
          }
        }
      }]
    };

    // Forza il repaint del componente
    if (this.loginFormComponent) {
      this.loginFormComponent.instance.repaint();
    }
  }

  async onLogin() {
    if (!this.formData.email || !this.formData.password) {
      this.errorMessage = 'Compila tutti i campi';
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

      // Aggiorna le opzioni del campo password con i nuovi testi
      this.updatePasswordEditorOptions();

      // Forza il repaint del form
      if (this.loginFormComponent) {
        this.loginFormComponent.instance.repaint();
      }
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