// src/app/features/auth/register/register.page.ts
import { Component, inject, AfterViewInit, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
  IonIcon,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { informationCircleOutline, checkmarkCircle, closeCircle, arrowBackOutline, mailOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService, Language } from '../../../core/services/translation.service';
import { environment, webInfo } from '../../../../environments/environment';

// Register icons
addIcons({
  'information-circle-outline': informationCircleOutline,
  'checkmark-circle': checkmarkCircle,
  'close-circle': closeCircle,
  'arrow-back-outline': arrowBackOutline,
  'mail-outline': mailOutline,
  'eye-outline': eyeOutline,
  'eye-off-outline': eyeOffOutline
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
    FormsModule,
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
    IonInput
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
                <!-- Activation Key Field -->
                <div class="input-section">
                  <ion-text color="dark">
                    <p class="input-label">{{ getText(100) }}</p>
                  </ion-text>
                  <ion-input
                    type="text"
                    [(ngModel)]="formData.authKey"
                    [placeholder]="getText(102)"
                    class="custom-input"
                    [disabled]="isLoading"
                    (ionBlur)="onAuthKeyBlur()">
                  </ion-input>
                  @if (authKeyError) {
                    <ion-text color="danger">
                      <p class="field-error">{{ authKeyError }}</p>
                    </ion-text>
                  }
                  @if (isValidatingKey) {
                    <ion-text color="medium">
                      <p class="field-info">Verifica in corso...</p>
                    </ion-text>
                  }
                </div>

                <!-- Bottone Avanti -->
                <div class="button-container">
                  <ion-button
                    expand="block"
                    (click)="onNextPage()"
                    [disabled]="!isKeyValid || isLoading || isValidatingKey"
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
              <div class="form-section">
                <!-- Nome Field -->
                <div class="input-section">
                  <ion-text color="dark">
                    <p class="input-label">{{ getText(106) || 'Nome' }}</p>
                  </ion-text>
                  <ion-input
                    type="text"
                    [(ngModel)]="formData.name"
                    [placeholder]="getText(106)"
                    class="custom-input"
                    [disabled]="isLoading">
                  </ion-input>
                  @if (nameError) {
                    <ion-text color="danger">
                      <p class="field-error">{{ nameError }}</p>
                    </ion-text>
                  }
                </div>

                <!-- Email Field -->
                <div class="input-section">
                  <ion-text color="dark">
                    <p class="input-label">Email</p>
                  </ion-text>
                  <ion-input
                    type="email"
                    inputmode="email"
                    [(ngModel)]="formData.email"
                    placeholder="Email"
                    class="custom-input"
                    [disabled]="isLoading"
                    (ionBlur)="onEmailBlur()">
                  </ion-input>
                  @if (emailError) {
                    <ion-text color="danger">
                      <p class="field-error">{{ emailError }}</p>
                    </ion-text>
                  }
                  @if (isValidatingEmail) {
                    <ion-text color="medium">
                      <p class="field-info">Verifica email...</p>
                    </ion-text>
                  }
                </div>

                <!-- Password Field -->
                <div class="input-section">
                  <ion-text color="dark">
                    <p class="input-label">Password</p>
                  </ion-text>
                  <div class="password-input-wrapper">
                    <ion-input
                      [type]="passwordVisible ? 'text' : 'password'"
                      [(ngModel)]="formData.password"
                      placeholder="Password"
                      class="custom-input password-input"
                      [disabled]="isLoading"
                      (ionInput)="onPasswordInput()">
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

                <!-- Confirm Password Field -->
                <div class="input-section">
                  <ion-text color="dark">
                    <p class="input-label">{{ getText(110) || 'Conferma Password' }}</p>
                  </ion-text>
                  <div class="password-input-wrapper">
                    <ion-input
                      [type]="passwordVisible ? 'text' : 'password'"
                      [(ngModel)]="formData.confirmedPassword"
                      [placeholder]="getText(110) || 'Conferma Password'"
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
                  @if (confirmPasswordError) {
                    <ion-text color="danger">
                      <p class="field-error">{{ confirmPasswordError }}</p>
                    </ion-text>
                  }
                </div>
              </div>

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

            <!-- Pagina 3: Conferma Email Inviata -->
            @if (page === 3) {
              <div class="email-confirmation-section">
                <div class="email-icon">
                  <ion-icon name="mail-outline" color="primary"></ion-icon>
                </div>
                <h2>{{ getText(129) || 'Controlla la tua email!' }}</h2>
                <p class="confirmation-message">
                  {{ getText(130) || 'Ti abbiamo inviato una email di conferma.' }}
                </p>
                <p class="confirmation-details">
                  {{ getText(131) || 'Clicca sul link presente nella email per attivare il tuo account.' }}
                </p>
                <div class="email-sent-to">
                  <strong>{{ formData.email }}</strong>
                </div>
                <p class="spam-notice">
                  {{ getText(132) || 'Se non trovi la email, controlla anche nella cartella spam.' }}
                </p>
                <div class="button-container">
                  <ion-button
                    expand="block"
                    (click)="goToLogin()"
                    class="register-button">
                    {{ getText(114) || 'Torna al Login' }}
                  </ion-button>
                </div>
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

    .field-info {
      font-size: 12px;
      margin: 5px 0 0 0;
      padding-left: 2px;
      font-style: italic;
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

    /* Email Confirmation Section (Page 3) */
    .email-confirmation-section {
      text-align: center;
      padding: 30px 20px;
    }

    .email-icon {
      margin-bottom: 20px;
    }

    .email-icon ion-icon {
      font-size: 80px;
      color: var(--ion-color-primary);
    }

    .email-confirmation-section h2 {
      font-size: 24px;
      font-weight: 700;
      color: var(--ion-color-primary);
      margin: 0 0 20px 0;
    }

    .confirmation-message {
      font-size: 16px;
      color: var(--ion-text-color);
      margin: 0 0 10px 0;
    }

    .confirmation-details {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin: 0 0 20px 0;
    }

    .email-sent-to {
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      padding: 12px 20px;
      border-radius: 8px;
      margin: 20px 0;
    }

    .email-sent-to strong {
      font-size: 16px;
      color: var(--ion-color-primary);
    }

    .spam-notice {
      font-size: 13px;
      color: var(--ion-color-medium);
      font-style: italic;
      margin: 15px 0 25px 0;
    }
  `]
})
export class RegisterPage implements OnInit, AfterViewInit {
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

  // Validation errors
  authKeyError = '';
  nameError = '';
  emailError = '';
  passwordError = '';
  confirmPasswordError = '';

  // Async validation states
  isValidatingKey = false;
  isValidatingEmail = false;
  isEmailValid = false;

  // Multi-lingua
  availableLanguages: Language[] = [];
  currentLanguage: string = environment.languageId;

  constructor() {
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

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  /**
   * Validazione chiave di attivazione al blur
   */
  async onAuthKeyBlur() {
    if (!this.formData.authKey) {
      this.authKeyError = this.getText(103) || 'Chiave di attivazione obbligatoria';
      this.isKeyValid = false;
      return;
    }

    this.isValidatingKey = true;
    this.authKeyError = '';

    try {
      const response = await this.authService.checkAuthKey(this.formData.authKey);

      if (response.valid) {
        this.isKeyValid = true;
        this.authKeyError = '';
      } else {
        this.isKeyValid = false;
        this.authKeyError = response.message;
      }
    } catch (error: any) {
      this.isKeyValid = false;
      this.authKeyError = error.message || 'Errore nella validazione della chiave';
    }

    this.isValidatingKey = false;
    this.cdr.detectChanges();
  }

  /**
   * Validazione email al blur
   */
  async onEmailBlur() {
    if (!this.formData.email) {
      this.emailError = 'Email obbligatoria';
      this.isEmailValid = false;
      return;
    }

    // Validazione formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formData.email)) {
      this.emailError = this.getText(108) || 'Email non valida';
      this.isEmailValid = false;
      return;
    }

    this.isValidatingEmail = true;
    this.emailError = '';

    try {
      const response = await this.authService.checkEmail(this.formData.authKey || '', this.formData.email);

      if (response.valid) {
        this.isEmailValid = true;
        this.emailError = '';
      } else {
        this.isEmailValid = false;
        this.emailError = response.message;
      }
    } catch (error: any) {
      this.isEmailValid = false;
      this.emailError = error.message || 'Errore nella validazione email';
    }

    this.isValidatingEmail = false;
    this.cdr.detectChanges();
  }

  /**
   * Chiamato quando cambia la password
   */
  onPasswordInput() {
    this.passwordError = '';
    this.confirmPasswordError = '';
    this.formData.confirmedPassword = ''; // Resetta conferma password

    if (this.formData.password && this.authService.psswPolicy) {
      const level = this.authService.getPasswStrength(this.formData.password);
      this.pwStrengthLevel = level;
    } else {
      this.pwStrengthLevel = 0;
    }
  }

  /**
   * Valida il form della pagina 2
   */
  private validateRegistrationForm(): boolean {
    this.nameError = '';
    this.emailError = '';
    this.passwordError = '';
    this.confirmPasswordError = '';

    let isValid = true;

    // Validazione nome
    if (!this.formData.name) {
      this.nameError = this.getText(107) || 'Nome obbligatorio';
      isValid = false;
    }

    // Validazione email
    if (!this.formData.email) {
      this.emailError = 'Email obbligatoria';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.formData.email)) {
        this.emailError = this.getText(108) || 'Email non valida';
        isValid = false;
      }
    }

    // Validazione password
    if (!this.formData.password) {
      this.passwordError = this.getText(109) || 'Password obbligatoria';
      isValid = false;
    } else if (this.authService.psswPolicy) {
      const valid = this.authService.validatePssw(
        this.formData.password,
        this.authService.psswPolicy.policyLC,
        this.authService.psswPolicy.policyUC,
        this.authService.psswPolicy.policyNM,
        this.authService.psswPolicy.policySC,
        this.authService.psswPolicy.policyMinLen,
        this.authService.psswPolicy.policyMaxLen
      );
      if (!valid) {
        this.passwordError = 'Password non conforme alle regole!';
        isValid = false;
      }
    }

    // Validazione conferma password
    if (!this.formData.confirmedPassword) {
      this.confirmPasswordError = this.getText(110) || 'Conferma password obbligatoria';
      isValid = false;
    } else if (this.formData.confirmedPassword !== this.formData.password) {
      this.confirmPasswordError = this.getText(111) || 'Le password non corrispondono';
      isValid = false;
    }

    return isValid;
  }

  /**
   * Passa alla pagina 2 dopo la validazione della chiave
   */
  async onNextPage() {
    // Se la chiave non è stata ancora validata, validala
    if (!this.isKeyValid) {
      await this.onAuthKeyBlur();
    }

    if (this.isKeyValid) {
      this.page = 2;
      this.errorMessage = '';
      this.cdr.detectChanges();
    }
  }

  /**
   * Gestisce la registrazione
   */
  async onRegister() {
    // Valida l'email se non è stata ancora validata
    if (!this.isEmailValid) {
      await this.onEmailBlur();
    }

    // Valida il form
    if (!this.validateRegistrationForm()) {
      return;
    }

    // Controlla che l'email sia stata validata dal server
    if (!this.isEmailValid) {
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

      // Mostra pagina 3 con messaggio di conferma email
      this.page = 3;
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
