// src/app/features/profile/change-password/change-password.page.ts
import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { webInfo } from '../../../../environments/environment';

// PrimeNG
import { PasswordModule } from 'primeng/password';
import { FloatLabel } from 'primeng/floatlabel';

// Register icons
addIcons({
  'information-circle-outline': informationCircleOutline,
  'checkmark-circle': checkmarkCircle,
  'close-circle': closeCircle,
  'arrow-back-outline': arrowBackOutline
});

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
    PasswordModule,
    FloatLabel
  ],
  template: `
    <div class="change-password-content">
      <div class="change-password-container">
        <!-- Card Cambio Password -->
        <ion-card class="change-password-card">
          <ion-card-header>
            <ion-card-title class="ion-text-center">
              {{ getText(606) }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()">
              <!-- Password Corrente (solo se NON è password scaduta) -->
              @if (!isPasswordExpired) {
                <div class="field-container">
                  <p-floatlabel>
                    <p-password
                      id="currentPassword"
                      formControlName="currentPassword"
                      [feedback]="false"
                      [toggleMask]="true"
                      styleClass="w-full"
                      inputStyleClass="w-full"
                    ></p-password>
                    <label for="currentPassword">{{ getText(620) }}</label>
                  </p-floatlabel>
                  @if (passwordForm.get('currentPassword')?.invalid && passwordForm.get('currentPassword')?.touched) {
                    <small class="p-error">{{ getText(623) }}</small>
                  }
                </div>
              }

              <!-- Nuova Password -->
              <div class="field-container">
                <p-floatlabel>
                  <p-password
                    id="newPassword"
                    formControlName="newPassword"
                    [feedback]="false"
                    [toggleMask]="true"
                    styleClass="w-full"
                    inputStyleClass="w-full"
                    (onInput)="onNewPasswordInput($event)"
                  ></p-password>
                  <label for="newPassword">{{ getText(621) }}</label>
                </p-floatlabel>
                @if (passwordForm.get('newPassword')?.hasError('required') && passwordForm.get('newPassword')?.touched) {
                  <small class="p-error">{{ getText(109) }}</small>
                }
                @if (passwordForm.get('newPassword')?.hasError('policyViolation') && passwordForm.get('newPassword')?.touched) {
                  <small class="p-error">{{ getText(624) }}</small>
                }
              </div>

              <!-- Conferma Password -->
              <div class="field-container">
                <p-floatlabel>
                  <p-password
                    id="confirmedPassword"
                    formControlName="confirmedPassword"
                    [feedback]="false"
                    [toggleMask]="true"
                    styleClass="w-full"
                    inputStyleClass="w-full"
                  ></p-password>
                  <label for="confirmedPassword">{{ getText(622) }}</label>
                </p-floatlabel>
                @if (passwordForm.get('confirmedPassword')?.hasError('required') && passwordForm.get('confirmedPassword')?.touched) {
                  <small class="p-error">{{ getText(109) }}</small>
                }
                @if (passwordForm.get('confirmedPassword')?.hasError('passwordMismatch') && passwordForm.get('confirmedPassword')?.touched) {
                  <small class="p-error">{{ getText(111) }}</small>
                }
              </div>

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

              <!-- Bottone Cambia Password -->
              <div class="button-container">
                <ion-button
                  expand="block"
                  type="submit"
                  [disabled]="loading || passwordForm.invalid"
                  class="change-password-button">
                  {{ loading ? getText(626) : getText(606) }}
                </ion-button>
              </div>

              <!-- Link Torna indietro -->
              <div class="back-link-container">
                <a (click)="goBack()" class="back-link">
                  <ion-icon name="arrow-back-outline"></ion-icon>
                  {{ isPasswordExpired ? getText(601) : getText(627) }}
                </a>
              </div>
            </form>
          </ion-card-content>
        </ion-card>
      </div>
    </div>
  `,
  styles: [`
    /* Content background */
    .change-password-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100%;
    }

    /* Container */
    .change-password-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100%;
      padding: 20px;
    }

    /* Card */
    .change-password-card {
      max-width: 500px;
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

    /* Form fields */
    .field-container {
      margin-bottom: 24px;
    }

    .field-container:first-child {
      margin-top: 20px;
    }

    :host ::ng-deep .p-password {
      width: 100%;
    }

    :host ::ng-deep .p-password input {
      width: 100%;
    }

    :host ::ng-deep .p-floatlabel {
      width: 100%;
    }

    .p-error {
      display: block;
      margin-top: 4px;
      color: var(--p-red-500);
      font-size: 12px;
    }

    /* Password Info Container */
    .password-info-container {
      margin: 0 0 15px 0;
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

    .change-password-button {
      --background: var(--ion-color-primary);
      --border-radius: 8px;
      font-weight: 600;
      height: 48px;
    }

    /* Link Torna al Profilo */
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
      .change-password-container {
        padding: 15px;
      }

      .change-password-card {
        margin: 0;
      }

      ion-card-title {
        font-size: 20px;
      }
    }
  `]
})
export class ChangePasswordPage implements OnInit {
  authService = inject(AuthService);
  private translationService = inject(TranslationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastCtrl = inject(ToastController);
  private fb = inject(FormBuilder);

  isPasswordExpired = false;
  webInfo = webInfo;
  loading = false;
  pwStrengthLevel = 0;

  passwordForm: FormGroup;

  constructor() {
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, this.passwordPolicyValidator.bind(this)]],
      confirmedPassword: ['', [Validators.required, this.passwordMatchValidator.bind(this)]]
    });
  }

  async ngOnInit() {
    // Verifica se siamo arrivati qui per password scaduta
    this.route.queryParams.subscribe(params => {
      this.isPasswordExpired = params['expired'] === 'true';

      // Se password scaduta, rimuovi il validatore required per currentPassword
      if (this.isPasswordExpired) {
        this.passwordForm.get('currentPassword')?.clearValidators();
        this.passwordForm.get('currentPassword')?.updateValueAndValidity();
      }
    });

    // Carica la policy delle password dal server
    await this.authService.getPsswPolicy();
  }

  /**
   * Custom validator per la policy password
   */
  passwordPolicyValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value || !this.authService.psswPolicy) {
      return null;
    }

    const isValid = this.authService.validatePssw(
      control.value,
      this.authService.psswPolicy.policyLC,
      this.authService.psswPolicy.policyUC,
      this.authService.psswPolicy.policyNM,
      this.authService.psswPolicy.policySC,
      this.authService.psswPolicy.policyMinLen,
      this.authService.psswPolicy.policyMaxLen
    );

    return isValid ? null : { policyViolation: true };
  }

  /**
   * Custom validator per conferma password
   */
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const newPassword = this.passwordForm?.get('newPassword')?.value;
    return control.value === newPassword ? null : { passwordMismatch: true };
  }

  /**
   * Gestisce l'input della nuova password per calcolare la forza
   */
  onNewPasswordInput(event: any) {
    const value = event.target?.value || '';
    this.pwStrengthLevel = this.authService.getPasswStrength(value);

    // Ri-valida conferma password quando cambia la nuova password
    this.passwordForm.get('confirmedPassword')?.updateValueAndValidity();
  }

  goBack() {
    if (this.isPasswordExpired) {
      localStorage.removeItem('tempUserData');
      this.router.navigate(['/login']);
    } else {
      this.router.navigate(['/profile']);
    }
  }

  async onSubmit() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      let userEmail: string | null = null;

      if (this.isPasswordExpired) {
        const tempUserData = localStorage.getItem('tempUserData');
        if (tempUserData) {
          const userData = JSON.parse(tempUserData);
          userEmail = userData.email;
        }
      } else {
        userEmail = this.authService.getUserEmail();
      }

      if (!userEmail) {
        throw new Error(this.getText(646));
      }

      const formValue = this.passwordForm.value;
      const result = await this.authService.updatePassword(
        userEmail,
        formValue.currentPassword,
        formValue.newPassword
      );

      this.loading = false;

      if (result.valid) {
        const toast = await this.toastCtrl.create({
          message: this.getText(628),
          duration: 3000,
          color: 'success'
        });
        await toast.present();

        if (this.isPasswordExpired) {
          localStorage.removeItem('tempUserData');

          const infoToast = await this.toastCtrl.create({
            message: this.getText(644),
            duration: 3000,
            color: 'success'
          });
          await infoToast.present();

          this.router.navigate(['/login']);
        } else {
          this.router.navigate(['/profile']);
        }
      } else {
        const toast = await this.toastCtrl.create({
          message: result.message || this.getText(645),
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    } catch (error: any) {
      this.loading = false;
      const toast = await this.toastCtrl.create({
        message: error.message || this.getText(645),
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  getText(txtId: number): string {
    return this.translationService.getText(txtId, '');
  }
}
