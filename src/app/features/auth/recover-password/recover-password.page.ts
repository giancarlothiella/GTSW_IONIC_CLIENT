// src/app/features/auth/recover-password/recover-password.page.ts
import { Component, OnInit, ViewChild, AfterViewInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { informationCircleOutline, checkmarkCircle, closeCircle, arrowBackOutline } from 'ionicons/icons';
import { DxFormModule, DxButtonModule, DxFormComponent } from 'devextreme-angular';
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

interface RecoverPasswordFormData {
  newPassword: string;
  confirmedPassword: string;
}

@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonPopover,
    IonList,
    IonItem,
    IonLabel,
    DxFormModule,
    DxButtonModule
  ],
  template: `
    <ion-content class="recover-password-content">
      <div class="recover-password-container">
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

        <!-- Password Form -->
        <ion-card class="recover-password-card">
            <ion-card-header>
              <ion-card-title class="ion-text-center">
                {{ getText(214) }}
              </ion-card-title>
            </ion-card-header>

            <ion-card-content>
              <form (submit)="onSubmit($event)">
                <dx-form
                  #recoverPasswordForm
                  [(formData)]="formData"
                  [colCount]="1"
                  [showColonAfterLabel]="false"
                  labelLocation="top"
                  [disabled]="loading">

                  <!-- Nuova Password -->
                  <dxi-item
                    dataField="newPassword"
                    editorType="dxTextBox"
                    [editorOptions]="newPasswordEditorOptions">
                    <dxo-label [text]="getText(621)"></dxo-label>
                    <dxi-validation-rule
                      type="required"
                      [message]="getText(109)">
                    </dxi-validation-rule>
                    <dxi-validation-rule
                      type="custom"
                      [message]="getText(624)"
                      [validationCallback]="checkPassword">
                    </dxi-validation-rule>
                  </dxi-item>

                  <!-- Conferma Password -->
                  <dxi-item
                    dataField="confirmedPassword"
                    editorType="dxTextBox"
                    [editorOptions]="confirmPasswordEditorOptions">
                    <dxo-label [text]="getText(622)"></dxo-label>
                    <dxi-validation-rule
                      type="required"
                      [message]="getText(109)">
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
                    {{ getText(652) }}
                  </ion-button>

                  <ion-popover trigger="password-rules-trigger" triggerAction="click">
                    <ng-template>
                      <ion-content class="password-rules-popover">
                        <div class="popover-header">
                          <h3>{{ getText(625) }}</h3>
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
                                {{ getText(647) }}: {{ authService.psswPolicy.policyMinLen }} {{ getText(651) }}
                              </ion-label>
                            </ion-item>

                            @if (authService.psswPolicy.policyMaxLen) {
                              <ion-item>
                                <ion-icon slot="start" name="checkmark-circle" color="success"></ion-icon>
                                <ion-label class="ion-text-wrap">
                                  {{ getText(648) }}: {{ authService.psswPolicy.policyMaxLen }} {{ getText(651) }}
                                </ion-label>
                              </ion-item>
                            }

                            @if (authService.psswPolicy.policyLC) {
                              <ion-item>
                                <ion-icon slot="start" name="checkmark-circle" color="success"></ion-icon>
                                <ion-label class="ion-text-wrap">
                                  {{ getText(649) }}
                                </ion-label>
                              </ion-item>
                            }

                            @if (authService.psswPolicy.policyUC) {
                              <ion-item>
                                <ion-icon slot="start" name="checkmark-circle" color="success"></ion-icon>
                                <ion-label class="ion-text-wrap">
                                  {{ getText(650) }}
                                </ion-label>
                              </ion-item>
                            }

                            @if (authService.psswPolicy.policyNM) {
                              <ion-item>
                                <ion-icon slot="start" name="checkmark-circle" color="success"></ion-icon>
                                <ion-label class="ion-text-wrap">
                                  {{ getText(639) }}
                                </ion-label>
                              </ion-item>
                            }

                            @if (authService.psswPolicy.policySC) {
                              <ion-item>
                                <ion-icon slot="start" name="checkmark-circle" color="success"></ion-icon>
                                <ion-label class="ion-text-wrap">
                                  {{ getText(640) }}
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
                        {{ pwStrengthLevel <= 2 ? getText(641) : pwStrengthLevel === 3 ? getText(642) : getText(643) }}
                      </span>
                    </p>
                  </div>
                }

                <!-- Bottone Salva Password -->
                <div class="button-container">
                  <ion-button
                    expand="block"
                    type="submit"
                    [disabled]="loading"
                    class="submit-button">
                    {{ loading ? getText(215) : getText(216) }}
                  </ion-button>
                </div>

                <!-- Link Torna al Login -->
                <div class="back-link-container">
                  <a (click)="goToLogin()" class="back-link">
                    <ion-icon name="arrow-back-outline"></ion-icon>
                    {{ getText(206) }}
                  </a>
                </div>
              </form>
            </ion-card-content>
          </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    /* Content background */
    .recover-password-content {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    /* Container */
    .recover-password-container {
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

    /* Card */
    .recover-password-card {
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

    .error-title {
      color: var(--ion-color-danger) !important;
    }

    /* Loading State */
    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 50px 20px;
    }

    .loading-content ion-spinner {
      width: 50px;
      height: 50px;
      margin-bottom: 20px;
    }

    .loading-content p {
      font-size: 16px;
      color: var(--ion-color-medium);
    }

    /* Error Section */
    .error-section {
      text-align: center;
      padding: 20px 0;
    }

    .error-message {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin-bottom: 25px;
    }

    /* Form styling */
    dx-form {
      margin-top: 20px;
      margin-bottom: 20px;
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

    /* Password Strength */
    .password-strength {
      margin: 15px 0;
    }

    .strength-bar {
      height: 8px;
      background-color: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .strength-fill {
      height: 100%;
      transition: all 0.3s ease;
      border-radius: 4px;
    }

    .strength-fill.weak {
      background: linear-gradient(90deg, #ff6b6b, #ff8787);
    }

    .strength-fill.medium {
      background: linear-gradient(90deg, #feca57, #ffd93d);
    }

    .strength-fill.strong {
      background: linear-gradient(90deg, #6bcf7f, #51cf66);
    }

    .strength-label {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin: 0;
    }

    .strength-label span {
      font-weight: 600;
    }

    .strength-label span.weak {
      color: #ff6b6b;
    }

    .strength-label span.medium {
      color: #feca57;
    }

    .strength-label span.strong {
      color: #51cf66;
    }

    /* Bottoni */
    .button-container {
      margin-top: 20px;
    }

    .submit-button {
      --background: var(--ion-color-primary);
      --border-radius: 8px;
      font-weight: 600;
      height: 48px;
    }

    /* Link Torna al Login */
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

    /* Animazioni */
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
      .recover-password-container {
        padding: 15px;
      }

      .recover-password-card {
        margin: 0;
      }

      ion-card-title {
        font-size: 20px;
      }
    }
  `]
})
export class RecoverPasswordPage implements OnInit, AfterViewInit {
  @ViewChild('recoverPasswordForm') recoverPasswordFormComponent?: DxFormComponent;

  authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastCtrl = inject(ToastController);

  webInfo = webInfo;
  environment = environment;

  // Stati della pagina
  authKey = '';
  loading = false;
  pwStrengthLevel = 0;

  formData: RecoverPasswordFormData = {
    newPassword: '',
    confirmedPassword: ''
  };

  newPasswordVisible = false;
  confirmPasswordVisible = false;

  newPasswordEditorOptions: any;
  confirmPasswordEditorOptions: any;

  // Multi-lingua
  availableLanguages: Language[] = [];
  currentLanguage: string = environment.languageId;

  constructor() {
    this.initializePasswordOptions();
  }

  async ngOnInit() {
    // Set logo CSS variable
    document.documentElement.style.setProperty('--webinfo-home-logo', `url('${this.webInfo.homeLogo}')`);

    // Inizializza traduzioni
    await this.initializeTranslations();

    // Ottieni la chiave dalla URL
    this.route.params.subscribe(params => {
      this.authKey = params['key'] || '';
    });
  }

  async ngAfterViewInit() {
    // Carica la policy delle password dal server
    await this.authService.getPsswPolicy();
  }

  private async initializeTranslations() {
    try {
      await this.translationService.initialize();
      this.availableLanguages = this.translationService.getLanguages();
      this.currentLanguage = this.translationService.getCurrentLanguage();

      this.translationService.currentLanguage$.subscribe(lang => {
        this.currentLanguage = lang;
      });
    } catch (error) {
      console.error('Error initializing translations:', error);
      this.currentLanguage = environment.languageId;
    }
  }

  private initializePasswordOptions() {
    this.newPasswordEditorOptions = {
      stylingMode: 'filled',
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
          tabIndex: -1,
          onClick: () => {
            this.toggleNewPasswordVisibility();
          }
        }
      }]
    };

    this.confirmPasswordEditorOptions = {
      stylingMode: 'filled',
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
            this.toggleConfirmPasswordVisibility();
          }
        }
      }]
    };
  }

  toggleNewPasswordVisibility() {
    this.newPasswordVisible = !this.newPasswordVisible;
    this.newPasswordEditorOptions = {
      ...this.newPasswordEditorOptions,
      mode: this.newPasswordVisible ? 'text' : 'password',
      buttons: [{
        name: 'password',
        location: 'after',
        options: {
          icon: this.newPasswordVisible ? 'eyeopen' : 'eyeclose',
          type: 'default',
          stylingMode: 'text',
          tabIndex: -1,
          onClick: () => {
            this.toggleNewPasswordVisibility();
          }
        }
      }]
    };
    if (this.recoverPasswordFormComponent) {
      this.recoverPasswordFormComponent.instance.repaint();
    }
  }

  toggleConfirmPasswordVisibility() {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
    this.confirmPasswordEditorOptions = {
      ...this.confirmPasswordEditorOptions,
      mode: this.confirmPasswordVisible ? 'text' : 'password',
      buttons: [{
        name: 'password',
        location: 'after',
        options: {
          icon: this.confirmPasswordVisible ? 'eyeopen' : 'eyeclose',
          type: 'default',
          stylingMode: 'text',
          tabIndex: -1,
          onClick: () => {
            this.toggleConfirmPasswordVisibility();
          }
        }
      }]
    };
    if (this.recoverPasswordFormComponent) {
      this.recoverPasswordFormComponent.instance.repaint();
    }
  }

  /**
   * Validazione password con policy
   */
  checkPassword = (e: { value: string }): boolean => {
    if (!this.authService.psswPolicy) {
      return false;
    }

    const level = this.authService.getPasswStrength(e.value);
    this.pwStrengthLevel = level;

    return this.authService.validatePssw(
      e.value,
      this.authService.psswPolicy.policyLC,
      this.authService.psswPolicy.policyUC,
      this.authService.psswPolicy.policyNM,
      this.authService.psswPolicy.policySC,
      this.authService.psswPolicy.policyMinLen,
      this.authService.psswPolicy.policyMaxLen
    );
  };

  /**
   * Validazione conferma password
   */
  confirmPassword = (e: { value: string }): boolean => {
    return e.value === this.formData.newPassword;
  };

  /**
   * Gestisce il salvataggio della nuova password
   */
  async onSubmit(e: Event) {
    e.preventDefault();

    if (!this.recoverPasswordFormComponent) {
      return;
    }

    const validation = this.recoverPasswordFormComponent.instance.validate();

    if (!validation.isValid) {
      return;
    }

    this.loading = true;

    try {
      const result = await this.authService.recoverPassword(this.authKey, this.formData.newPassword);

      this.loading = false;

      if (result.valid) {
        const toast = await this.toastCtrl.create({
          message: this.getText(217),
          duration: 3000,
          color: 'success'
        });
        await toast.present();

        this.router.navigate(['/login']);
      } else {
        const toast = await this.toastCtrl.create({
          message: result.message || this.getText(218),
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    } catch (error: any) {
      this.loading = false;
      const toast = await this.toastCtrl.create({
        message: error.message || this.getText(218),
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
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

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
}
