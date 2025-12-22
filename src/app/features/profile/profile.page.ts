// src/app/features/profile/profile.page.ts
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonAvatar,
  IonItem,
  IonLabel,
  IonInput,
  IonList,
  IonSpinner,
  IonModal,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cameraOutline,
  trashOutline,
  saveOutline,
  languageOutline,
  checkmarkOutline,
  closeOutline,
  keyOutline
} from 'ionicons/icons';
import { AuthService, User } from '../../core/services/auth.service';
import { MenuService } from '../../core/services/menu.service';
import { GtsDataService } from '../../core/services/gts-data.service';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonAvatar,
    IonItem,
    IonLabel,
    IonInput,
    IonList,
    IonSpinner,
    IonModal,
    FormsModule
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="goBack()">
            <ion-icon name="arrow-back-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ getText(600) }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (loading) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>{{ getText(634) }}</p>
        </div>
      } @else {
        <div class="profile-container">
          <!-- Profile Picture Card -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ getText(615) }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="profile-avatar-container">
                <ion-avatar class="profile-avatar">
                  <img [src]="user?.picture || '/assets/images/profile.jpg'" alt="Profile Picture">
                </ion-avatar>
              </div>

              <div class="profile-actions">
                <ion-button expand="block" (click)="onUploadImage()">
                  <ion-icon slot="start" name="camera-outline"></ion-icon>
                  {{ getText(629) }}
                </ion-button>
                <ion-button expand="block" color="danger" (click)="onDeleteImage()">
                  <ion-icon slot="start" name="trash-outline"></ion-icon>
                  {{ getText(630) }}
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Profile Info Card -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ getText(616) }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                <ion-item>
                  <ion-label position="stacked">{{ getText(605) }}</ion-label>
                  <ion-input [value]="user?.email" disabled></ion-input>
                </ion-item>

                <ion-item>
                  <ion-label position="stacked">{{ getText(604) }}</ion-label>
                  <ion-input
                    [(ngModel)]="name"
                    (ionChange)="onNameChanged()"
                    [placeholder]="getText(631)">
                  </ion-input>
                </ion-item>

                <ion-item button (click)="openLanguageModal()">
                  <ion-icon slot="start" name="language-outline" color="primary"></ion-icon>
                  <ion-label>
                    <h3>{{ getText(633) }}</h3>
                    <p>{{ languageDescription }}</p>
                  </ion-label>
                </ion-item>

                @if (user?.authProfileCode) {
                  <ion-item>
                    <ion-label>
                      <h3>{{ getText(617) }}</h3>
                      <p>{{ user?.authProfileCode }}</p>
                    </ion-label>
                  </ion-item>
                }
              </ion-list>

              <div class="save-button-container">
                <ion-button
                  expand="block"
                  color="success"
                  [disabled]="saveDisabled"
                  (click)="onSaveProfile()">
                  <ion-icon slot="start" name="save-outline"></ion-icon>
                  {{ getText(618) }}
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Security Card -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ getText(607) }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                <ion-item button (click)="goToChangePassword()">
                  <ion-icon slot="start" name="key-outline" color="primary"></ion-icon>
                  <ion-label>
                    <h3>{{ getText(606) }}</h3>
                    <p>Modifica la tua password di accesso</p>
                  </ion-label>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>
        </div>
      }

      <!-- Language Selection Modal -->
      <ion-modal [isOpen]="languageModalOpen" (didDismiss)="languageModalOpen = false">
        <ng-template>
          <ion-header>
            <ion-toolbar color="primary">
              <ion-title>{{ getText(133) }}</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="languageModalOpen = false">
                  <ion-icon name="close-outline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-list>
              @for (lang of languages; track lang.languageId) {
                <ion-item
                  button
                  [class.selected-language]="lang.languageId === languageId"
                  (click)="selectLanguage(lang)">
                  @if (lang.stdImageId) {
                    <img
                      slot="start"
                      [src]="'assets/icons/stdImage_' + lang.stdImageId + '.png'"
                      class="language-flag"
                      alt="">
                  }
                  <ion-label>
                    <h3>{{ lang.languageId }}</h3>
                    <p>{{ lang.description }}</p>
                  </ion-label>
                  @if (lang.languageId === languageId) {
                    <ion-icon slot="end" name="checkmark-outline" color="success"></ion-icon>
                  }
                </ion-item>
              }
            </ion-list>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- Hidden file input for image upload -->
      <input
        #fileInput
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif"
        style="display: none"
        (change)="onFileSelected($event)">
    </ion-content>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: var(--ion-color-medium);
    }

    .profile-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .profile-avatar-container {
      display: flex;
      justify-content: center;
      margin: 20px 0;
    }

    .profile-avatar {
      width: 150px;
      height: 150px;
    }

    .profile-actions {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .save-button-container {
      margin-top: 20px;
    }

    .selected-language {
      --background: var(--ion-color-light);
      border-left: 4px solid var(--ion-color-success);
    }

    .language-flag {
      width: 32px;
      height: 24px;
      object-fit: contain;
      margin-right: 12px;
    }

    ion-item {
      --padding-start: 16px;
      --inner-padding-end: 16px;
    }
  `]
})
export class ProfilePage implements OnInit {
  private authService = inject(AuthService);
  private menuService = inject(MenuService);
  private gtsDataService = inject(GtsDataService);
  private translationService = inject(TranslationService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  user: User | null = null;
  loading = false;
  saveDisabled = true;
  languageChanged = false;

  name = '';
  languageId = '';
  languageDescription = '';
  languages: any[] = [];
  languageModalOpen = false;

  fileInput?: HTMLInputElement;

  constructor() {
    // Register icons
    addIcons({
      arrowBackOutline,
      cameraOutline,
      trashOutline,
      saveOutline,
      languageOutline,
      checkmarkOutline,
      closeOutline,
      keyOutline
    });

    // Subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.name = user.name || '';
        this.languageId = user.languageId || 'EN';
      }
    });
  }

  ngOnInit() {
    this.user = this.authService.getCurrentUser();
    if (this.user) {
      this.name = this.user.name || '';
      this.languageId = this.user.languageId || 'EN';
    }

    // Load languages from TranslationService
    this.loadLanguages();
  }

  async loadLanguages() {
    // First try to get from cache
    let languages = this.translationService.getLanguages();

    // If cache is empty, load from server
    if (languages.length === 0) {
      languages = await this.translationService.loadLanguages();
    }

    this.languages = languages.map((language: any) => ({
      languageId: language.languageId,
      description: language.description,
      stdImageId: language.stdImageId
    }));

    // Set language description
    const currentLang = this.languages.find(l => l.languageId === this.languageId);
    this.languageDescription = currentLang?.description || this.languageId;
  }

  onNameChanged() {
    this.saveDisabled = false;
  }

  openLanguageModal() {
    this.languageModalOpen = true;
  }

  selectLanguage(language: any) {
    const oldLanguageId = this.languageId;
    this.languageId = language.languageId;
    this.languageDescription = language.description;
    this.saveDisabled = false;
    this.languageModalOpen = false;

    // Track if language was changed
    this.languageChanged = (oldLanguageId !== this.languageId);

    // Update localStorage
    localStorage.setItem('languageId', this.languageId);
  }

  async onSaveProfile() {
    if (!this.user) return;

    this.loading = true;

    try {
      const updatedUser = await this.authService.updateProfile({
        email: this.user.email,
        name: this.name,
        languageId: this.languageId
      });

      await this.showToast(this.getText(619), 'success');
      this.saveDisabled = true;

      // If language was changed, reload translations and project
      if (this.languageChanged) {
        this.languageChanged = false;

        // Update translation service with new language
        await this.translationService.setLanguage(this.languageId);

        // Clear metadata cache to reload with new language
        this.gtsDataService.clearAllMetadata();

        // If user has an active project, reload it with new language
        if (this.user.prjId) {
          // Find current project connection
          let connCode: string | undefined;
          if (this.user.prjConnections && this.user.prjConnections.length > 0) {
            const defaultConn = this.user.prjConnections.find(c => c.connDefault);
            connCode = defaultConn?.connCode || this.user.prjConnections[0].connCode;
          }

          // Reload project with new language
          this.menuService.changeProject(this.user.prjId, connCode).subscribe({
            next: (response) => {
              this.loading = false;
              // Navigate to home to show updated UI
              this.router.navigate(['/home']);
            },
            error: (error) => {
              console.error('Error reloading project:', error);
              this.loading = false;
              // Navigate to home anyway
              this.router.navigate(['/home']);
            }
          });
        } else {
          this.loading = false;
          // Navigate to home to show updated UI
          this.router.navigate(['/home']);
        }
      } else {
        this.loading = false;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      await this.showToast('Errore durante l\'aggiornamento del profilo', 'danger');
      this.loading = false;
    }
  }

  async onUploadImage() {
    // Trigger file input click
    const fileInputElement = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInputElement) {
      fileInputElement.click();
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      await this.showToast('Il file è troppo grande. Dimensione massima: 5MB', 'warning');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      await this.showToast('Tipo di file non supportato. Usa JPG, PNG o GIF', 'warning');
      return;
    }

    this.loading = true;

    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file);

      // Upload image
      await this.authService.uploadProfileImage(file.name, base64);

      await this.showToast('Immagine caricata con successo', 'success');

      // Refresh user data
      this.user = this.authService.getCurrentUser();
    } catch (error) {
      console.error('Error uploading image:', error);
      await this.showToast('Errore durante il caricamento dell\'immagine', 'danger');
    } finally {
      this.loading = false;
      // Reset file input
      event.target.value = '';
    }
  }

  async onDeleteImage() {
    const alert = await this.alertController.create({
      header: 'Conferma',
      message: 'Sei sicuro di voler eliminare l\'immagine del profilo?',
      buttons: [
        {
          text: this.getText(611),
          role: 'cancel'
        },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: async () => {
            this.loading = true;
            try {
              await this.authService.deleteProfileImage();
              await this.showToast('Immagine eliminata con successo', 'success');
              this.user = this.authService.getCurrentUser();
            } catch (error) {
              console.error('Error deleting image:', error);
              await this.showToast('Errore durante l\'eliminazione dell\'immagine', 'danger');
            } finally {
              this.loading = false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  goToChangePassword() {
    this.router.navigate(['/change-password']);
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  getText(txtId: number): string {
    return this.translationService.getText(txtId, '');
  }
}
