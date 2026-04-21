import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import {
  Analyzer,
  AnalyzerField,
  AnalyzerFieldType,
  GtsAiAnalyzerApiService
} from '../../services/gts-ai-analyzer-api.service';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

type DialogMode = 'new' | 'edit';

@Component({
  selector: 'app-gts-analyzer-setup-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Dialog,
    ButtonModule,
    InputText,
    InputNumber,
    Textarea,
    Select,
    TableModule,
    Tooltip,
    Toast
  ],
  providers: [MessageService],
  templateUrl: './gts-analyzer-setup-dialog.component.html',
  styleUrls: ['./gts-analyzer-setup-dialog.component.scss']
})
export class GtsAnalyzerSetupDialogComponent implements OnChanges {

  @Input() visible: boolean = false;
  @Input() prjId: string = '';
  @Input() mode: DialogMode = 'new';
  @Input() editingCode: string | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<{ code: string }>();

  private api = inject(GtsAiAnalyzerApiService);
  private ts = inject(TranslationService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);

  loading: boolean = false;
  analyzingSchema: boolean = false;

  analyzer: Analyzer = this.emptyAnalyzer();
  origCode: string | null = null;

  fieldTypeOptions: { label: string; value: AnalyzerFieldType }[] = [
    { label: 'String', value: 'string' },
    { label: 'Integer', value: 'integer' },
    { label: 'Number', value: 'number' },
    { label: 'Date', value: 'date' },
    { label: 'DateTime', value: 'datetime' },
    { label: 'Boolean', value: 'boolean' }
  ];

  t(txtId: number, fallback: string = ''): string {
    return this.ts.getText(txtId, fallback);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.initForOpen();
    }
  }

  private emptyAnalyzer(): Analyzer {
    return {
      prjId: this.prjId,
      code: '',
      description: '',
      sqlId: 0,
      dataStructure: { availableFields: [] },
      dialogConfig: { title: '', width: '', height: '' },
      analyses: [],
      status: 'active'
    };
  }

  private initForOpen(): void {
    if (this.mode === 'edit' && this.editingCode) {
      this.loadAnalyzer(this.editingCode);
    } else {
      this.analyzer = this.emptyAnalyzer();
      this.analyzer.prjId = this.prjId;
      this.origCode = null;
    }
  }

  private loadAnalyzer(code: string): void {
    this.loading = true;
    this.api.get(this.prjId, code).subscribe({
      next: (res) => {
        if (res?.valid && res.analyzer) {
          this.analyzer = res.analyzer;
          this.analyzer.dataStructure = this.analyzer.dataStructure || { availableFields: [] };
          this.analyzer.dialogConfig = this.analyzer.dialogConfig || { title: '', width: '', height: '' };
          this.analyzer.analyses = this.analyzer.analyses || [];
          this.origCode = this.analyzer.code;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showError(this.t(1700, 'Errore caricamento: ') + (err?.error?.message || err.message));
        this.loading = false;
      }
    });
  }

  onAnalyzeSchema(): void {
    if (!this.analyzer.code) {
      this.showWarning(this.t(1701, 'Salva prima l\'analyzer'));
      return;
    }
    this.analyzingSchema = true;
    this.api.analyzeSchema(this.prjId, this.analyzer.code).subscribe({
      next: (res) => {
        if (res?.valid) {
          this.analyzer.dataStructure = this.analyzer.dataStructure || { availableFields: [] };
          this.analyzer.dataStructure.availableFields = res.availableFields || [];
          this.showSuccess(this.t(1702, 'Schema analizzato'));
        }
        this.analyzingSchema = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showError(this.t(1703, 'Errore analisi schema: ') + (err?.error?.message || err.message));
        this.analyzingSchema = false;
      }
    });
  }

  onSave(): void {
    if (!this.isValid()) return;

    this.loading = true;
    const payload: Partial<Analyzer> = {
      prjId: this.prjId,
      code: this.analyzer.code,
      description: this.analyzer.description,
      sqlId: this.analyzer.sqlId,
      dialogConfig: this.analyzer.dialogConfig,
      status: this.analyzer.status,
      author: this.authService.getUserEmail() || 'unknown'
    };

    const isCreate = this.mode === 'new' || !this.origCode;
    const call$ = isCreate
      ? this.api.create(payload)
      : this.api.update(this.prjId, this.origCode!, payload);

    call$.subscribe({
      next: (res) => {
        if (res?.valid) {
          // After create/update, persist the availableFields if user edited them
          const fields = this.analyzer.dataStructure?.availableFields || [];
          if (fields.length > 0) {
            this.api.updateFields(this.prjId, this.analyzer.code, fields).subscribe({
              next: () => this.onSaveSuccess(),
              error: (err) => this.onSaveError(err)
            });
          } else {
            this.onSaveSuccess();
          }
        } else {
          this.onSaveError({ error: { message: (res as any)?.message } });
        }
      },
      error: (err) => this.onSaveError(err)
    });
  }

  private onSaveSuccess(): void {
    this.loading = false;
    this.showSuccess(this.t(1704, 'Analyzer salvato'));
    this.saved.emit({ code: this.analyzer.code });
    this.close();
  }

  private onSaveError(err: any): void {
    this.loading = false;
    this.showError(this.t(1705, 'Errore salvataggio: ') + (err?.error?.message || err?.message || ''));
  }

  onDeleteAnalysis(analysis: any): void {
    if (!analysis?._id) return;
    if (!confirm(this.t(1706, 'Eliminare l\'analisi "') + analysis.analysisName + '"?')) return;
    this.api.deleteAnalysis(this.prjId, this.analyzer.code, analysis._id).subscribe({
      next: () => {
        this.analyzer.analyses = (this.analyzer.analyses || []).filter(a => a._id !== analysis._id);
        this.showSuccess(this.t(1707, 'Analisi eliminata'));
        this.cdr.detectChanges();
      },
      error: (err) => this.showError(this.t(1708, 'Errore eliminazione: ') + (err?.error?.message || err.message))
    });
  }

  private isValid(): boolean {
    if (!this.analyzer.code || !this.analyzer.code.trim()) {
      this.showWarning(this.t(1710, 'Code obbligatorio'));
      return false;
    }
    if (!this.analyzer.sqlId || this.analyzer.sqlId <= 0) {
      this.showWarning(this.t(1711, 'sqlId obbligatorio'));
      return false;
    }
    return true;
  }

  onDialogHide(): void {
    this.close();
  }

  private close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
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
