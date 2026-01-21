import { Component, OnInit, OnDestroy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';
import { GtsLoaderComponent } from '../gts-loader/gts-loader.component';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonProgressBar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cloudUpload, document, close } from 'ionicons/icons';

/**
 * GTS File Uploader Component - Open Source Version
 *
 * Componente per l'upload di file usando Ionic invece di DevExtreme.
 * Compatibile con i metadati GTS esistenti e gtsDataService.
 */
@Component({
  selector: 'app-gts-file-uploader',
  standalone: true,
  imports: [
    CommonModule,
    GtsLoaderComponent,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonProgressBar
  ],
  templateUrl: './gts-file-uploader.component.html',
  styleUrls: ['./gts-file-uploader.component.scss']
})
export class GtsFileUploaderComponent implements OnInit, OnDestroy {
  private gtsDataService = inject(GtsDataService);

  @Input() fileUploadPath: string = '';
  @Input() fileUploadName: string = '';
  @Input() uploaderTitle: string = 'Upload File';
  @Input() allowedExtensions: string[] = [];
  @Input() maxFileSize: number = 0; // in bytes

  loading: boolean = false;
  fileUploadVisible: boolean = false;
  selectedFile: File | null = null;
  uploadProgress: number = 0;
  errorMessage: string = '';

  fileLoaderListenerSubs: Subscription | undefined;

  constructor() {
    // Register Ionic icons
    addIcons({ cloudUpload, document, close });
  }

  ngOnInit() {
    this.fileLoaderListenerSubs = this.gtsDataService
      .getFileLoaderListener()
      .subscribe((status: any) => {
        this.fileUploadVisible = status.fileUploadVisible;
      });
  }

  ngOnDestroy(): void {
    this.fileLoaderListenerSubs?.unsubscribe();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.errorMessage = '';

    // Validate file extension
    if (this.allowedExtensions.length > 0) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!this.allowedExtensions.includes(fileExtension)) {
        this.errorMessage = `File type not allowed. Allowed types: ${this.allowedExtensions.join(', ')}`;
        return;
      }
    }

    // Validate file size
    if (this.maxFileSize > 0 && file.size > this.maxFileSize) {
      const maxSizeMB = (this.maxFileSize / (1024 * 1024)).toFixed(2);
      this.errorMessage = `File size exceeds maximum allowed size of ${maxSizeMB} MB`;
      return;
    }

    this.selectedFile = file;
  }

  async uploadFile(): Promise<void> {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file first';
      return;
    }

    this.loading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';

    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile);
      formData.append('path', this.fileUploadPath);
      formData.append('name', this.fileUploadName);

      // Simulate progress (you can implement real progress tracking with HttpClient)
      const progressInterval = setInterval(() => {
        if (this.uploadProgress < 90) {
          this.uploadProgress += 10;
        }
      }, 100);

      // Call the upload service
      const result = await this.gtsDataService.execMethod('file', 'uploadFile', {
        formData: formData,
        path: this.fileUploadPath,
        fileName: this.fileUploadName || this.selectedFile.name
      });

      clearInterval(progressInterval);
      this.uploadProgress = 100;

      if (result && result.success) {
        // Success - close modal after a short delay
        setTimeout(() => {
          this.closeModal();
          this.resetUploader();
        }, 500);
      } else {
        this.errorMessage = result?.message || 'Upload failed';
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'An error occurred during upload';
    } finally {
      this.loading = false;
    }
  }

  closeModal(): void {
    this.gtsDataService.sendFileLoaderListener({ fileUploadVisible: false });
  }

  resetUploader(): void {
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.errorMessage = '';
  }

  getFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  get acceptedFileTypes(): string {
    return this.allowedExtensions.join(',');
  }
}
