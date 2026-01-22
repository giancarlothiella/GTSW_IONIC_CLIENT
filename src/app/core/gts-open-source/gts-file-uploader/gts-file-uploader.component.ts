import { Component, OnInit, OnDestroy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';
import { GtsLoaderComponent } from '../gts-loader/gts-loader.component';

// PrimeNG
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { ProgressBar } from 'primeng/progressbar';

/**
 * GTS File Uploader Component - Open Source Version
 *
 * Componente per l'upload di file usando PrimeNG Dialog.
 * Compatibile con i metadati GTS esistenti e gtsDataService.
 */
@Component({
  selector: 'app-gts-file-uploader',
  standalone: true,
  imports: [
    CommonModule,
    GtsLoaderComponent,
    Dialog,
    Button,
    ProgressBar
  ],
  template: `
    <p-dialog
      [header]="uploaderTitle"
      [(visible)]="fileUploadVisible"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: '500px' }"
      [closable]="true"
      (onHide)="closeModal()"
    >
      @if (loading) {
        <app-gts-loader></app-gts-loader>
      }

      <div class="upload-container">
        <!-- File Input Area -->
        <div class="file-input-area" (click)="fileInput.click()">
          <input
            #fileInput
            type="file"
            (change)="onFileSelected($event)"
            [accept]="acceptedFileTypes"
            class="file-input"
          />
          <i class="pi pi-cloud-upload upload-icon"></i>
          <p class="upload-text">Click to select a file</p>
          @if (allowedExtensions.length > 0) {
            <p class="allowed-types">Allowed types: {{ allowedExtensions.join(', ') }}</p>
          }
          @if (maxFileSize > 0) {
            <p class="max-size">Max size: {{ getFileSize(maxFileSize) }}</p>
          }
        </div>

        <!-- Selected File Info -->
        @if (selectedFile) {
          <div class="selected-file-info">
            <i class="pi pi-file"></i>
            <div class="file-details">
              <span class="file-name">{{ selectedFile.name }}</span>
              <span class="file-size">{{ getFileSize(selectedFile.size) }}</span>
            </div>
          </div>
        }

        <!-- Upload Progress -->
        @if (uploadProgress > 0 && uploadProgress < 100) {
          <div class="progress-container">
            <p-progressBar [value]="uploadProgress"></p-progressBar>
            <p class="progress-text">Uploading: {{ uploadProgress }}%</p>
          </div>
        }

        <!-- Error Message -->
        @if (errorMessage) {
          <div class="error-message">
            <p>{{ errorMessage }}</p>
          </div>
        }
      </div>

      <ng-template pTemplate="footer">
        <p-button
          label="Cancel"
          icon="pi pi-times"
          severity="secondary"
          (onClick)="closeModal()"
        ></p-button>
        <p-button
          label="Upload"
          icon="pi pi-upload"
          [disabled]="!selectedFile || loading"
          (onClick)="uploadFile()"
        ></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .upload-container {
      padding: 10px 0;
    }

    .file-input-area {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.3s, background-color 0.3s;

      &:hover {
        border-color: #007bff;
        background-color: #f8f9fa;
      }
    }

    .file-input {
      display: none;
    }

    .upload-icon {
      font-size: 48px;
      color: #6c757d;
      margin-bottom: 10px;
    }

    .upload-text {
      font-size: 16px;
      color: #333;
      margin-bottom: 8px;
    }

    .allowed-types, .max-size {
      font-size: 12px;
      color: #6c757d;
      margin: 4px 0;
    }

    .selected-file-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      margin-top: 15px;

      i {
        font-size: 24px;
        color: #007bff;
      }

      .file-details {
        display: flex;
        flex-direction: column;

        .file-name {
          font-weight: 500;
          color: #333;
        }

        .file-size {
          font-size: 12px;
          color: #6c757d;
        }
      }
    }

    .progress-container {
      margin-top: 15px;

      .progress-text {
        text-align: center;
        font-size: 12px;
        color: #6c757d;
        margin-top: 5px;
      }
    }

    .error-message {
      margin-top: 15px;
      padding: 10px;
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 6px;
      color: #721c24;

      p {
        margin: 0;
      }
    }
  `]
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

  ngOnInit() {
    this.fileLoaderListenerSubs = this.gtsDataService
      .getFileLoaderListener()
      .subscribe((status: any) => {
        this.fileUploadVisible = status.fileUploadVisible;
        if (status.fileUploadVisible) {
          // Reset state when opening
          this.resetUploader();
        }
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
        // Success - close modal after a short delay and notify with result
        setTimeout(() => {
          this.gtsDataService.sendFileLoaderListener({
            fileUploadVisible: false,
            result: true,
            fileUploadedName: result.fileName || this.selectedFile?.name
          });
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
