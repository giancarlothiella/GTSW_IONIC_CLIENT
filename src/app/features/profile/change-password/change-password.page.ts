// src/app/features/profile/change-password/change-password.page.ts
import { Component, inject, ViewChild, AfterViewInit, OnInit } from '@angular/core';
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
import { TranslationService } from '../../../core/services/translation.service';
import { webInfo } from '../../../../environments/environment';

// Register icons
addIcons({
  'information-circle-outline': informationCircleOutline,
  'checkmark-circle': checkmarkCircle,
  'close-circle': closeCircle,
  'arrow-back-outline': arrowBackOutline
});

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmedPassword: string;
}

@Component({
  selector: 'app-change-password',
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
    <ion-content class="change-password-content">
      <div class="change-password-container">
        <!-- Card Cambio Password -->
        <ion-card class="change-password-card">
          <ion-card-header>
            <ion-card-title class="ion-text-center">
              {{ getText(606) }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <form (submit)="onSubmit($event)">
              <dx-form
                #changePasswordForm
                [(formData)]="formData"
                [colCount]="1"
                [showColonAfterLabel]="false"
                labelLocation="top"
                [disabled]="loading">

                <!-- Password Corrente (solo se NON è password scaduta) -->
                @if (!isPasswordExpired) {
                  <dxi-item
                    dataField="currentPassword"
                    editorType="dxTextBox"
                    [editorOptions]="currentPasswordEditorOptions">
                    <dxo-label [text]="getText(620)"></dxo-label>
                    <dxi-validation-rule
                      type="required"
                      [message]="getText(623)">
                    </dxi-validation-rule>
                  </dxi-item>
                }

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

              <!-- Bottone Cambia Password -->
              <div class="button-container">
                <ion-button
                  expand="block"
                  type="submit"
                  [disabled]="loading"
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
    </ion-content>
  `,
  styles: [`
    /* Content background */
    .change-password-content {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
export class ChangePasswordPage implements AfterViewInit, OnInit {
  @ViewChild('changePasswordForm') changePasswordFormComponent?: DxFormComponent;

  authService = inject(AuthService); // public per accesso nel template
  private translationService = inject(TranslationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastCtrl = inject(ToastController);

  // Flag per indicare se la password è scaduta
  isPasswordExpired = false;

  // Dati dell'app dall'environment
  webInfo = webInfo;

  loading = false;
  pwStrengthLevel = 0;

  formData: ChangePasswordFormData = {
    currentPassword: '',
    newPassword: '',
    confirmedPassword: ''
  };

  currentPasswordVisible = false;
  newPasswordVisible = false;
  confirmPasswordVisible = false;

  currentPasswordEditorOptions: any;
  newPasswordEditorOptions: any;
  confirmPasswordEditorOptions: any;

  constructor() {
    this.initializePasswordOptions();
  }

  async ngAfterViewInit() {
    // Carica la policy delle password dal server
    await this.authService.getPsswPolicy();
  }

  private initializePasswordOptions() {
    this.currentPasswordEditorOptions = {
      stylingMode: 'filled',
      placeholder: this.getText(620),
      mode: 'password',
      buttons: [{
        name: 'password',
        location: 'after',
        options: {
          icon: 'eyeclose',
          type: 'default',
          stylingMode: 'text',
          onClick: () => {
            this.toggleCurrentPasswordVisibility();
          }
        }
      }]
    };

    this.newPasswordEditorOptions = {
      stylingMode: 'filled',
      placeholder: this.getText(621),
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
            this.toggleNewPasswordVisibility();
          }
        }
      }]
    };

    this.confirmPasswordEditorOptions = {
      stylingMode: 'filled',
      placeholder: this.getText(622),
      mode: 'password',
      buttons: [{
        name: 'password',
        location: 'after',
        options: {
          icon: 'eyeclose',
          type: 'default',
          stylingMode: 'text',
          onClick: () => {
            this.toggleConfirmPasswordVisibility();
          }
        }
      }]
    };
  }

  toggleCurrentPasswordVisibility() {
    this.currentPasswordVisible = !this.currentPasswordVisible;
    this.currentPasswordEditorOptions = {
      ...this.currentPasswordEditorOptions,
      mode: this.currentPasswordVisible ? 'text' : 'password',
      buttons: [{
        name: 'password',
        location: 'after',
        options: {
          icon: this.currentPasswordVisible ? 'eyeopen' : 'eyeclose',
          type: 'default',
          stylingMode: 'text',
          onClick: () => {
            this.toggleCurrentPasswordVisibility();
          }
        }
      }]
    };
    if (this.changePasswordFormComponent) {
      this.changePasswordFormComponent.instance.repaint();
    }
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
          onClick: () => {
            this.toggleNewPasswordVisibility();
          }
        }
      }]
    };
    if (this.changePasswordFormComponent) {
      this.changePasswordFormComponent.instance.repaint();
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
          onClick: () => {
            this.toggleConfirmPasswordVisibility();
          }
        }
      }]
    };
    if (this.changePasswordFormComponent) {
      this.changePasswordFormComponent.instance.repaint();
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
   * Torna alla pagina del profilo
   */
  ngOnInit() {
    // Verifica se siamo arrivati qui per password scaduta
    this.route.queryParams.subscribe(params => {
      this.isPasswordExpired = params['expired'] === 'true';
    });
  }

  goBack() {
    if (this.isPasswordExpired) {
      // Se la password è scaduta, torna al login (e pulisci i dati temporanei)
      localStorage.removeItem('tempUserData');
      this.router.navigate(['/login']);
    } else {
      // Altrimenti torna al profilo
      this.router.navigate(['/profile']);
    }
  }

  /**
   * Gestisce il cambio password
   */
  async onSubmit(e: Event) {
    e.preventDefault();

    if (!this.changePasswordFormComponent) {
      return;
    }

    const validation = this.changePasswordFormComponent.instance.validate();

    if (!validation.isValid) {
      return;
    }

    this.loading = true;

    try {
      let userEmail: string | null = null;

      // Se la password è scaduta, prendi l'email dai dati temporanei
      if (this.isPasswordExpired) {
        const tempUserData = localStorage.getItem('tempUserData');
        if (tempUserData) {
          const userData = JSON.parse(tempUserData);
          userEmail = userData.email;
        }
      } else {
        // Altrimenti prendi l'email dall'utente corrente
        userEmail = this.authService.getUserEmail();
      }

      if (!userEmail) {
        throw new Error(this.getText(646));
      }

      // Cambia la password
      const result = await this.authService.updatePassword(
        userEmail,
        this.formData.currentPassword,
        this.formData.newPassword
      );

      this.loading = false;

      if (result.valid) {
        const toast = await this.toastCtrl.create({
          message: this.getText(628),
          duration: 3000,
          color: 'success'
        });
        await toast.present();

        // Se la password era scaduta, torna al login per rifare l'accesso
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
