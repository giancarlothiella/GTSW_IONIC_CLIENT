import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, ViewChild, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import ExcelJS from 'exceljs';

import { GtsImportDataService } from '../../services/gts-import-data.service';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';

export interface ExcelUploadRequest {
  prjId: string;
  formId: number;
  sqlId: number;
  dataSetName: string;
}

@Component({
  selector: 'app-gts-excel-uploader',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, ButtonModule, Toast],
  providers: [MessageService],
  templateUrl: './gts-excel-uploader.component.html',
  styleUrls: ['./gts-excel-uploader.component.scss']
})
export class GtsExcelUploaderComponent implements OnChanges {

  @Input() request: ExcelUploadRequest | null = null;
  @Output() uploaded = new EventEmitter<{ mode: 'replace' | 'append'; count: number; dataSetName: string }>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  private importApi = inject(GtsImportDataService);
  private authService = inject(AuthService);
  private ts = inject(TranslationService);
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);

  parsing: boolean = false;
  uploading: boolean = false;
  showModeDialog: boolean = false;

  parsedRows: any[] = [];
  parsedFileName: string = '';
  pendingFile: File | null = null;

  t(txtId: number, fallback: string = ''): string {
    return this.ts.getText(txtId, fallback);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['request'] && this.request) {
      // Reset state and open picker
      this.resetState();
      setTimeout(() => this.openPicker(), 0);
    }
  }

  private resetState(): void {
    this.parsing = false;
    this.uploading = false;
    this.showModeDialog = false;
    this.parsedRows = [];
    this.parsedFileName = '';
    this.pendingFile = null;
  }

  private openPicker(): void {
    if (!this.fileInput) return;
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.closed.emit();
      return;
    }

    const file = input.files[0];
    this.parsedFileName = file.name;
    this.pendingFile = file;
    this.parsing = true;

    try {
      // Parse locale solo per mostrare il conteggio — i rows non vengono inviati (mandiamo il file binario)
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      let worksheet = workbook.worksheets.find(ws => ws.name.toUpperCase() === 'DB') || workbook.worksheets[0];
      if (!worksheet) {
        this.showError(this.t(1750, 'Nessun foglio trovato nel file Excel'));
        this.parsing = false;
        return;
      }

      // Solo count, non servono i dati veri
      this.parsedRows = new Array(Math.max(0, worksheet.rowCount - 1));

      if (this.parsedRows.length === 0) {
        this.showWarning(this.t(1751, 'Il file non contiene righe dati'));
        this.parsing = false;
        return;
      }

      this.parsing = false;
      this.showModeDialog = true;
      this.cdr.detectChanges();
    } catch (err: any) {
      this.showError(this.t(1752, 'Errore parsing Excel: ') + (err.message || ''));
      this.parsing = false;
      this.closed.emit();
    } finally {
      input.value = '';
    }
  }

  private worksheetToJson(worksheet: ExcelJS.Worksheet): any[] {
    const rows: any[] = [];
    const headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = (cell.value?.toString() || `col${colNumber}`).trim();
        });
      } else {
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (!header) return;

          let value: any = cell.value;
          if (value && typeof value === 'object' && 'result' in value) {
            value = (value as any).result;
          }
          if (value && typeof value === 'object' && 'richText' in value) {
            value = (value as any).richText?.map((rt: any) => rt.text).join('') || '';
          }
          rowData[header] = value;
        });
        rows.push(rowData);
      }
    });

    return rows;
  }

  onConfirm(mode: 'replace' | 'append'): void {
    if (!this.request || !this.pendingFile) return;
    this.showModeDialog = false;
    this.uploading = true;

    this.importApi.fromSqlIdFile(
      this.request.prjId,
      this.request.sqlId,
      this.pendingFile,
      {
        mode,
        fileName: this.parsedFileName,
        importedBy: this.authService.getUserEmail() || 'unknown'
      }
    ).subscribe({
      next: (res) => {
        this.uploading = false;
        if (res?.valid) {
          const insertedCount = res.insertedCount || 0;
          const msg = mode === 'replace'
            ? this.t(1753, 'Dati sostituiti: ') + insertedCount
            : this.t(1754, 'Dati aggiunti: ') + insertedCount;
          this.showSuccess(msg);
          this.uploaded.emit({ mode, count: insertedCount, dataSetName: this.request!.dataSetName });
          this.close();
        } else {
          this.showError(this.t(1755, 'Errore upload: ') + (res as any)?.message);
        }
      },
      error: (err) => {
        this.uploading = false;
        this.showError(this.t(1755, 'Errore upload: ') + (err?.error?.message || err.message || ''));
      }
    });
  }

  onCancel(): void {
    this.close();
  }

  private close(): void {
    this.resetState();
    this.closed.emit();
  }

  private showSuccess(message: string): void {
    this.messageService.add({ severity: 'success', summary: 'OK', detail: message, life: 3000 });
  }

  private showError(message: string): void {
    this.messageService.add({ severity: 'error', summary: 'Errore', detail: message, life: 5000 });
  }

  private showWarning(message: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Attenzione', detail: message, life: 4000 });
  }
}
