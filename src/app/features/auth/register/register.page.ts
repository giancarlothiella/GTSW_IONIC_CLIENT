// src/app/features/auth/register/register.page.ts
import { Component, inject, ViewChild, AfterViewInit, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
  IonIcon,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { informationCircleOutline, checkmarkCircle, closeCircle, arrowBackOutline } from 'ionicons/icons';
import { DxFormModule, DxButtonModule, DxFormComponent, DxLinearGaugeModule } from 'devextreme-angular';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService, Language } from '../../../core/services/translation.service';
import { environment, webInfo } from '../../../../environments/environment';

// Register icons
addIcons({
  'information-circle-outline': informationCircleOutline,
  'checkmark-circle': checkmarkCircle,
  'close-circle': closeCircle,
  'arrow-back-outline': arrowBackOutline
});

interface RegisterFormData {
  authKey?: string;
  name: string;
  email: string;
  password: string;
  confirmedPassword: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonText,
    IonFooter,
    IonToolbar,
    IonIcon,
    IonPopover,
    IonList,
    IonItem,
    IonLabel,
    DxFormModule,
    DxButtonModule,
    DxLinearGaugeModule
  ],
  template: `
    <ion-content class="register-content">
      <div class="register-container">
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

        <!-- Card di Registrazione -->
        <ion-card class="register-card">
          <ion-card-header>
            <ion-card-title class="ion-text-center">
              {{ page === 1 ? getText(100) : getText(101) }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <!-- Pagina 1: Activation Key -->
            @if (page === 1) {
              <div class="form-section">
                <dx-form
                  #authKeyForm
                  [(formData)]="formData"
                  [colCount]="1"
                  [showColonAfterLabel]="false"
                  labelLocation="top">

                  <dxi-item
                    dataField="authKey"
                    editorType="dxTextBox"
                    [editorOptions]="{
                      placeholder: getText(102),
                      mode: 'text'
                    }">
                    <dxi-validation-rule
                      type="required"
                      [message]="getText(103)">
                    </dxi-validation-rule>
                    <dxi-validation-rule
                      type="async"
                      [message]="errorMessage"
                      [validationCallback]="asyncKeyValidation">
                    </dxi-validation-rule>
                  </dxi-item>
                </dx-form>

                <!-- Bottone Avanti (fuori dal form DevExtreme) -->
                <div class="button-container">
                  <ion-button
                    expand="block"
                    (click)="onNextPage()"
                    [disabled]="!isKeyValid || isLoading"
                    class="register-button">
                    {{ isLoading ? getText(104) : getText(105) }}
                  </ion-button>
                </div>

                <!-- Link torna al login -->
                <div class="back-link-container">
                  <a (click)="goToLogin()" class="back-link">
                    <ion-icon name="arrow-back-outline"></ion-icon>
                    {{ getText(114) }}
                  </a>
                </div>
              </div>
            }

            <!-- Pagina 2: Dati Utente -->
            @if (page === 2) {
              <dx-form
                #registerForm
                [(formData)]="formData"
                [colCount]="1"
                [showColonAfterLabel]="false"
                labelLocation="top">

                <!-- Nome -->
                <dxi-item
                  dataField="name"
                  editorType="dxTextBox"
                  [editorOptions]="{
                    placeholder: getText(106),
                    mode: 'text'
                  }">
                  <dxi-validation-rule
                    type="required"
                    [message]="getText(107)">
                  </dxi-validation-rule>
                </dxi-item>

                <!-- Email -->
                <dxi-item
                  dataField="email"
                  editorType="dxTextBox"
                  [editorOptions]="{
                    placeholder: 'Email',
                    mode: 'email'
                  }">
                  <dxi-validation-rule
                    type="required"
                    message="Email obbligatoria">
                  </dxi-validation-rule>
                  <dxi-validation-rule
                    type="email"
                    [message]="getText(108)">
                  </dxi-validation-rule>
                  <dxi-validation-rule
                    type="async"
                    [message]="errorMessage"
                    [validationCallback]="asyncMailValidation">
                  </dxi-validation-rule>
                </dxi-item>

                <!-- Password -->
                <dxi-item
                  dataField="password"
                  editorType="dxTextBox"
                  [editorOptions]="passwordEditorOptions">
                  <dxi-validation-rule
                    type="required"
                    [message]="getText(109)">
                  </dxi-validation-rule>
                  <dxi-validation-rule
                    type="custom"
                    message="Password non conforme alle regole!"
                    [validationCallback]="checkPassword">
                  </dxi-validation-rule>
                  <dxi-validation-rule
                    type="custom"
                    [validationCallback]="cleanConfirmPassword">
                  </dxi-validation-rule>
                </dxi-item>

                <!-- Conferma Password -->
                <dxi-item
                  dataField="confirmedPassword"
                  editorType="dxTextBox"
                  [editorOptions]="confirmPasswordEditorOptions">
                  <dxi-validation-rule
                    type="required"
                    [message]="getText(110)">
                  </dxi-validation-rule>
                  <dxi-validation-rule
                    type="custom"
                    [message]="getText(111)"
                    [validationCallback]="confirmPassword">
                  </dxi-validation-rule>
                </dxi-item>

              </dx-form>

              <!-- Info Password Rules -->
              <div class="password-info-container">
                <ion-button
                  id="password-rules-trigger"
                  fill="clear"
                  size="small"
                  class="password-info-button">
                  <ion-icon slot="start" name="information-circle-outline"></ion-icon>
                  {{ getText(115) }}
                </ion-button>

                <ion-popover trigger="password-rules-trigger" triggerAction="click">
                  <ng-template>
                    <ion-content class="password-rules-popover">
                      <div class="popover-header">
                        <h3>{{ getText(115) }}</h3>
                      </div>
                      <ion-list lines="none">
                        @if (authService.psswPolicy) {
                          <ion-item>
                            <ion-icon
                              slot="start"
                              [name]="authService.psswPolicy.policyMinLen ? 'checkmark-circle' : 'close-circle'"
                              [color]="authService.psswPolicy.policyMinLen ? 'success' : 'medium'">
                            </ion-icon>
                            <ion-label class="ion-text-wrap">
                              {{ getText(116) }}
                            </ion-label>
                          </ion-item>

                          @if (authService.psswPolicy.policyMaxLen) {
                            <ion-item>
                              <ion-icon slot="start" name="checkmark-circle" color="success"></ion-icon>
                              <ion-label class="ion-text-wrap">
                                Lunghezza massima: {{ authService.psswPolicy.policyMaxLen }} caratteri
                              </ion-label>
                            </ion-item>
                          }

                          @if (authService.psswPolicy.policyLC) {
                            <ion-item>
                              <ion-icon slot="start" name="checkmark-circle" color="success"></ion-icon>
                              <ion-label class="ion-text-wrap">
                                {{ getText(118) }}
                              </ion-label>
                            </ion-item>
                          }

                          @if (authService.psswPolicy.policyUC) {
                            <ion-item>
                              <ion-icon slot="start" name="checkmark-circle" color="success"></ion-icon>
                              <ion-label class="ion-text-wrap">
                                {{ getText(117) }}
                              </ion-label>
                            </ion-item>
                          }

                          @if (authService.psswPolicy.policyNM) {
                            <ion-item>
                              <ion-icon slot="start" name="checkmark-circle" color="success"></ion-icon>
                              <ion-label class="ion-text-wrap">
                                {{ getText(119) }}
                              </ion-label>
                            </ion-item>
                          }

                          @if (authService.psswPolicy.policySC) {
                            <ion-item>
                              <ion-icon slot="start" name="checkmark-circle" color="success"></ion-icon>
                              <ion-label class="ion-text-wrap">
                                {{ getText(120) }}
                              </ion-label>
                            </ion-item>
                          }
                        }
                      </ion-list>
                    </ion-content>
                  </ng-template>
                </ion-popover>
              </div>

              <!-- Password Strength Indicator -->
              @if (pwStrengthLevel > 0) {
                <div class="password-strength">
                  <div class="strength-bar">
                    <div
                      class="strength-fill"
                      [style.width.%]="(pwStrengthLevel / 5) * 100"
                      [class.weak]="pwStrengthLevel <= 2"
                      [class.medium]="pwStrengthLevel === 3"
                      [class.strong]="pwStrengthLevel >= 4">
                    </div>
                  </div>
                  <p class="strength-label">
                    {{ getText(121) }}:
                    <span [class.weak]="pwStrengthLevel <= 2"
                          [class.medium]="pwStrengthLevel === 3"
                          [class.strong]="pwStrengthLevel >= 4">
                      {{ pwStrengthLevel <= 2 ? 'Debole' : pwStrengthLevel === 3 ? 'Media' : 'Forte' }}
                    </span>
                  </p>
                </div>
              }

              <!-- Messaggio di errore -->
              @if (errorMessage) {
                <ion-text color="danger" class="error-message">
                  <p>{{ errorMessage }}</p>
                </ion-text>
              }

              <!-- Policy Info -->
              <div class="policy-info">
                {{ getText(122) }}
                <a [href]="webInfo.termsURL" target="_blank">{{ getText(123) }}</a>
                {{ getText(126) }}
                <a [href]="webInfo.policyURL" target="_blank">{{ getText(124) }}</a>
              </div>

              <!-- Bottone Registrazione -->
              <div class="button-container">
                <ion-button
                  expand="block"
                  (click)="onRegister()"
                  [disabled]="isLoading"
                  class="register-button">
                  {{ isLoading ? getText(112) : getText(113) }}
                </ion-button>
              </div>

              <!-- Link per tornare indietro -->
              <div class="login-link">
                {{ getText(125) }} <a routerLink="/login">{{ getText(114) }}</a>
              </div>
            }
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>

    <!-- Footer -->
    <ion-footer class="register-footer">
      <ion-toolbar>
        <div class="footer-content">
          <div class="footer-links">
            <a [href]="webInfo.termsURL" target="_blank">{{ getText(123) }}</a>
            <span class="separator">•</span>
            <a [href]="webInfo.policyURL" target="_blank">{{ getText(124) }}</a>
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
    .register-content {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .register-container {
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

    /* Card di registrazione */
    .register-card {
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
    .form-section {
      margin-top: 20px;
    }

    dx-form {
      margin-bottom: 20px;
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

    /* Password Strength */
    .password-strength {
      margin: 20px 0;
    }

    .strength-bar {
      width: 100%;
      height: 8px;
      background: var(--ion-color-light);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .strength-fill {
      height: 100%;
      transition: width 0.3s ease, background-color 0.3s ease;
    }

    .strength-fill.weak {
      background: linear-gradient(90deg, #ff6b6b, #ff8e53);
    }

    .strength-fill.medium {
      background: linear-gradient(90deg, #ffd93d, #ffb800);
    }

    .strength-fill.strong {
      background: linear-gradient(90deg, #51cf66, #37b24d);
    }

    .strength-label {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin: 0;
      text-align: center;
    }

    .strength-label span.weak {
      color: #ff6b6b;
      font-weight: 600;
    }

    .strength-label span.medium {
      color: #ffd93d;
      font-weight: 600;
    }

    .strength-label span.strong {
      color: #51cf66;
      font-weight: 600;
    }

    /* Policy info */
    .policy-info {
      margin: 15px 0;
      font-size: 13px;
      color: var(--ion-color-medium);
      text-align: center;
      line-height: 1.5;
    }

    .policy-info a {
      color: var(--ion-color-primary);
      text-decoration: none;
    }

    .policy-info a:hover {
      text-decoration: underline;
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

    /* Password Info Container */
    .password-info-container {
      margin: -10px 0 15px 0;
      display: flex;
      justify-content: flex-start;
    }

    .password-info-button {
      --color: var(--ion-color-primary);
      font-size: 13px;
      margin: 0;
      height: auto;
      padding: 4px 8px;
      text-transform: none;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .password-info-button::part(native) {
      padding: 4px 8px;
    }

    .password-info-button ion-icon {
      font-size: 20px;
      color: var(--ion-color-primary);
      display: inline-block;
    }

    /* Password Rules Popover */
    ion-popover {
      --width: auto;
      --min-width: 320px;
      --max-width: 400px;
    }

    .password-rules-popover {
      --background: var(--ion-color-light);
    }

    .popover-header {
      padding: 16px;
      background: var(--ion-color-primary);
      color: white;
    }

    .popover-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      white-space: nowrap;
    }

    .password-rules-popover ion-list {
      padding: 12px 0;
      background: transparent;
    }

    .password-rules-popover ion-item {
      --background: transparent;
      --padding-start: 16px;
      --padding-end: 16px;
      --min-height: 40px;
      font-size: 14px;
    }

    .password-rules-popover ion-icon {
      font-size: 20px;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .password-rules-popover ion-label {
      margin: 0;
      white-space: nowrap;
    }

    /* Bottoni */
    .button-container {
      margin-top: 20px;
    }

    .register-button {
      --background: var(--ion-color-primary);
      --border-radius: 8px;
      font-weight: 600;
      height: 48px;
    }

    /* Link login */
    .login-link {
      text-align: center;
      margin-top: 20px;
      font-size: 14px;
      color: var(--ion-color-medium);
    }

    .login-link a {
      color: var(--ion-color-primary);
      text-decoration: none;
      font-weight: 600;
    }

    .login-link a:hover {
      text-decoration: underline;
    }

    /* Footer */
    .register-footer {
      background: transparent;
    }

    .register-footer ion-toolbar {
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
      .register-container {
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

      .register-card {
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
export class RegisterPage implements OnInit, AfterViewInit {
  @ViewChild('registerForm') registerFormComponent?: DxFormComponent;
  @ViewChild('authKeyForm') authKeyFormComponent?: DxFormComponent;

  authService = inject(AuthService); // public per accesso nel template
  private translationService = inject(TranslationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  // Dati dell'app dall'environment
  webInfo = webInfo;
  currentYear = new Date().getFullYear();

  page = 1; // 1 = activation key, 2 = registration form
  isLoading = false;
  isKeyValid = false; // traccia se la chiave è stata validata
  errorMessage = '';

  formData: RegisterFormData = {
    authKey: '',
    name: '',
    email: '',
    password: '',
    confirmedPassword: ''
  };

  // Password strength
  pwStrengthLevel = 0;

  // Password visibility
  passwordVisible = false;
  passwordEditorOptions: any;
  confirmPasswordEditorOptions: any;

  // Multi-lingua
  availableLanguages: Language[] = [];
  currentLanguage: string = environment.languageId;

  constructor() {
    this.initializePasswordOptions();
  }

  async ngOnInit() {
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

  async ionViewWillEnter() {
    // Reset dello stato OGNI volta che si entra nella pagina
    this.resetForm();

    // Leggi la chiave di attivazione dalla route (se presente)
    const keyParam = this.route.snapshot.paramMap.get('key');
    if (keyParam) {
      this.formData.authKey = keyParam;
      // Valida la chiave e se valida passa direttamente alla pagina 2
      await this.validateKeyAndProceed(keyParam);
    }
  }

  /**
   * Valida la chiave ricevuta da URL e passa alla pagina 2 se valida
   */
  private async validateKeyAndProceed(key: string) {
    this.isLoading = true;

    try {
      const response = await this.authService.checkAuthKey(key);

      if (response.valid) {
        this.isKeyValid = true;
        this.errorMessage = '';
        this.page = 2; // Passa direttamente alla pagina dei dati utente
      } else {
        this.isKeyValid = false;
        this.errorMessage = response.message;
        // Resta sulla pagina 1 con errore
      }
    } catch (error: any) {
      this.isKeyValid = false;
      this.errorMessage = error.message || 'Errore nella validazione della chiave';
    }

    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async ngAfterViewInit() {
    // Carica la policy delle password dal server
    await this.authService.getPsswPolicy();
  }

  /**
   * Reset del form e dello stato della pagina
   */
  private resetForm() {
    this.page = 1;
    this.isLoading = false;
    this.isKeyValid = false;
    this.errorMessage = '';
    this.pwStrengthLevel = 0;
    this.formData = {
      authKey: '',
      name: '',
      email: '',
      password: '',
      confirmedPassword: ''
    };
  }

  private initializePasswordOptions() {
    this.passwordEditorOptions = {
      placeholder: 'Password',
      mode: 'password',
      onValueChanged: (e: any) => {
        this.checkPassword({ value: e.value });
      },
      buttons: [{
        name: 'password',
        location: 'after',
        options: {
          icon: 'eyeclose',
          type: 'default',
          stylingMode: 'text',
          onClick: () => {
            this.togglePasswordVisibility();
          }
        }
      }]
    };

    this.confirmPasswordEditorOptions = {
      placeholder: 'Conferma password',
      mode: 'password',
      buttons: [{
        name: 'password',
        location: 'after',
        options: {
          icon: 'eyeclose',
          type: 'default',
          stylingMode: 'text',
          onClick: () => {
            this.togglePasswordVisibility();
          }
        }
      }]
    };
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
    const mode = this.passwordVisible ? 'text' : 'password';
    const icon = this.passwordVisible ? 'eyeopen' : 'eyeclose';

    // Aggiorna entrambi i campi password
    this.passwordEditorOptions = {
      ...this.passwordEditorOptions,
      mode: mode,
      buttons: [{
        name: 'password',
        location: 'after',
        options: {
          icon: icon,
          type: 'default',
          stylingMode: 'text',
          onClick: () => {
            this.togglePasswordVisibility();
          }
        }
      }]
    };

    this.confirmPasswordEditorOptions = {
      ...this.confirmPasswordEditorOptions,
      mode: mode,
      buttons: [{
        name: 'password',
        location: 'after',
        options: {
          icon: icon,
          type: 'default',
          stylingMode: 'text',
          onClick: () => {
            this.togglePasswordVisibility();
          }
        }
      }]
    };

    // Forza il repaint
    if (this.registerFormComponent) {
      this.registerFormComponent.instance.repaint();
    }
  }

  /**
   * Validazione asincrona della chiave di attivazione
   */
  asyncKeyValidation = async (e: { value: string }) => {
    const response = await this.authService.checkAuthKey(e.value);

    // DevExtreme richiede che la Promise venga rigettata se non valido
    if (response.valid) {
      this.errorMessage = ''; // Pulisci il messaggio se valido
      this.isKeyValid = true; // Chiave valida, abilita il bottone
      this.cdr.detectChanges();
      return true;
    } else {
      this.errorMessage = response.message;
      this.isKeyValid = false; // Chiave non valida, disabilita il bottone
      this.cdr.detectChanges();
      return Promise.reject(response.message);
    }
  };

  /**
   * Validazione asincrona dell'email
   */
  asyncMailValidation = async (e: { value: string }) => {
    const response = await this.authService.checkEmail(this.formData.authKey || '', e.value);

    // DevExtreme richiede che la Promise venga rigettata se non valido
    if (response.valid) {
      this.errorMessage = ''; // Pulisci il messaggio se valido
      return true;
    } else {
      this.errorMessage = response.message;
      return Promise.reject(response.message);
    }
  };

  /**
   * Validazione password con policy
   */
  checkPassword = (e: { value: string }): boolean => {
    if (!this.authService.psswPolicy) {
      return false;
    }

    const level = this.authService.getPasswStrength(e.value);
    this.pwStrengthLevel = level;

    const valid = this.authService.validatePssw(
      e.value,
      this.authService.psswPolicy.policyLC,
      this.authService.psswPolicy.policyUC,
      this.authService.psswPolicy.policyNM,
      this.authService.psswPolicy.policySC,
      this.authService.psswPolicy.policyMinLen,
      this.authService.psswPolicy.policyMaxLen
    );

    return valid;
  };

  /**
   * Pulisce la conferma password quando si modifica la password
   */
  cleanConfirmPassword = (e: { value: string }): boolean => {
    this.formData.confirmedPassword = '';
    return true;
  };

  /**
   * Valida che le due password corrispondano
   */
  confirmPassword = (e: { value: string }): boolean => {
    return e.value === this.formData.password;
  };

  /**
   * Passa alla pagina 2 dopo la validazione della chiave
   */
  async onNextPage() {
    if (!this.authKeyFormComponent) {
      return;
    }

    const validation = this.authKeyFormComponent.instance.validate();

    // Aspetta il completamento della validazione asincrona
    if (validation.complete) {
      try {
        await validation.complete;

        // Dopo il completamento, controlla se è valido
        if (validation.isValid) {
          this.page = 2;
          this.errorMessage = '';
          this.cdr.detectChanges();
        }
      } catch (error) {
        // La validazione asincrona ha fallito
        console.error('Validation error:', error);
      }
    } else if (validation.isValid) {
      // Se non c'è validazione asincrona, passa direttamente
      this.page = 2;
      this.errorMessage = '';
      this.cdr.detectChanges();
    }
  }

  /**
   * Gestisce la registrazione
   */
  async onRegister() {
    if (!this.registerFormComponent) {
      return;
    }

    const validation = this.registerFormComponent.instance.validate();
    if (!validation.isValid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const loading = await this.loadingCtrl.create({
      message: this.getText(127)
    });
    await loading.present();

    try {
      await this.authService.createUser(
        'email',
        this.formData.email,
        this.formData.password,
        this.formData.authKey || '',
        this.formData.name
      );

      await loading.dismiss();
      this.isLoading = false;

      const toast = await this.toastCtrl.create({
        message: this.getText(128),
        duration: 3000,
        color: 'success'
      });
      await toast.present();

      // Naviga alla pagina di login
      this.router.navigate(['/login']);
    } catch (error: any) {
      await loading.dismiss();
      this.isLoading = false;

      const serverMessage = error.error?.message || error.message;
      this.errorMessage = serverMessage || 'Errore durante la registrazione';

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
}
