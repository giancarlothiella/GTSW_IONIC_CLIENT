import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { UserDataService } from '../../../core/services/user-data.service';
import { TranslationService } from '../../../core/services/translation.service';
import { Subscription } from 'rxjs';

// Excel parsing
import ExcelJS from 'exceljs';

// Import GTS Components
import { GtsToolbarComponent } from '../../../core/gts-open-source/gts-toolbar/gts-toolbar.component';
import { GtsTabsComponent } from '../../../core/gts-open-source/gts-tabs/gts-tabs.component';
import { GtsGridComponent } from '../../../core/gts-open-source/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts-open-source/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts-open-source/gts-form-popup/gts-form-popup.component';
import { GtsMessageComponent } from '../../../core/gts-open-source/gts-message/gts-message.component';
import { GtsLoaderComponent } from '../../../core/gts-open-source/gts-loader/gts-loader.component';
import { GtsAiAnalyzerComponent, AiAnalyzerConfig } from '../../../core/gts-open-source/gts-ai-analyzer/gts-ai-analyzer.component';

// PrimeNG
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-sitPagamenti',
  standalone: true,
  imports: [
    CommonModule,

    // GTS Components
    GtsToolbarComponent,
    GtsTabsComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsMessageComponent,
    GtsLoaderComponent,
    GtsAiAnalyzerComponent,

    // PrimeNG
    Toast
  ],
  providers: [MessageService],
  templateUrl: './sitPagamenti.page.html',
  styleUrls: ['./sitPagamenti.page.scss']
})
export class GTR_SitPagamentiComponent implements OnInit, OnDestroy {
  //========= PAGE PARAMS =================
  prjId: string = 'GTR';
  formId: number = 11;

  // Reference to hidden file input for LOAD_EXCEL
  @ViewChild('excelFileInput') excelFileInput!: ElementRef<HTMLInputElement>;

  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);
  private userDataService = inject(UserDataService);
  private ts = inject(TranslationService);
  private messageService = inject(MessageService);

  /**
   * Ottiene un testo tradotto
   */
  t(txtId: number, fallback: string = ''): string {
    return this.ts.getText(txtId, fallback);
  }

  constructor() {
    addIcons({ arrowBackOutline });
  }

  appViewListenerSubs: Subscription | undefined;
  formReqListenerSubs: Subscription | undefined;
  pageCustomListenerSubs: Subscription | undefined;
  appLoaderListenerSubs: Subscription | undefined;
  toolbarListenerSubs: Subscription | undefined;

  ngOnInit(): void {
    // Loader Listener
    this.appLoaderListenerSubs = this.gtsDataService
    .getAppLoaderListener()
    .subscribe((loading) => {
      this.loading = loading;
    })

    // View Listener
    this.appViewListenerSubs = this.gtsDataService
    .getAppViewListener()
    .subscribe((actualView) => {
      if (actualView !== undefined && actualView !== '') {
        this.actualView = actualView;
        this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
        this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'all', 'all');
        if (this.metaData.views.filter((view: any) => view.viewName === actualView)[0] !== undefined)
          this.viewStyle = this.metaData.views.filter((view: any) => view.viewName === actualView)[0].viewStyle;
      }
    });

    // Form Req Listener
    this.formReqListenerSubs = this.gtsDataService
    .getFormReqListener()
    .subscribe((formRequest) => {
      let reply: any = {
        valid: true
      };

      //===== START FORM REQUEST CUSTOM CODE =====

      //===== END FORM REQUEST CUSTOM CODE =====
      this.gtsDataService.sendFormReply(reply);
    });

    // Custom Code Listener
    this.pageCustomListenerSubs = this.gtsDataService
    .getPageCustomListener()
    .subscribe(async (customCode) => {
      //===== START CUSTOM CODE =====

      // Riattiva il loader per il custom code
      this.gtsDataService.sendAppLoaderListener(true);

      await this.getCustomData(this.prjId, this.formId, customCode, this.actualView);

      // Disattiva il loader dopo il custom code
      setTimeout(() => {
        this.gtsDataService.sendAppLoaderListener(false);
      }, 300);

      //===== END CUSTOM CODE =====
    });

    // Toolbar Events Listener
    this.toolbarListenerSubs = this.gtsDataService
    .getToolbarEventListener()
    .subscribe((data) => {
      //===== START CUSTOM TOOLBAR EVENT CODE =====

      //===== END CUSTOM TOOLBAR EVENT CODE =====
    });

    // Run Page with hardcoded formId
    this.gtsDataService.runPage(this.prjId, this.formId);

    // Imposta connCode dinamicamente per AI Analyzer
    this.aiAnalyzerConfig.connCode = this.gtsDataService.getActualConnCode();

    // Verifica se esistono dati cached per questa pagina
    this.checkCachedData();
  }

  ngOnDestroy(): void {
    this.appViewListenerSubs?.unsubscribe();
    this.pageCustomListenerSubs?.unsubscribe();
    this.appLoaderListenerSubs?.unsubscribe();
    this.formReqListenerSubs?.unsubscribe();
    this.toolbarListenerSubs?.unsubscribe();
  }

  //========= GLOBALS =================
  metaData: any = {};
  actualView: string = '';
  loading: boolean = true;
  pageData: any = {};
  viewStyle: string = '';
  customData: any[] = [];
  toolbarSelectedValue = '';

  //========= EXCEL DATA =================
  rawExcelData: any[] = [];

  //========= CACHE STATE =================
  hasCachedData: boolean = false;
  cachedDataInfo: {
    recordCount: number;
    fileName?: string;
    updatedAt?: Date;
    uploadedBy?: string;
  } | null = null;
  cacheLoading: boolean = false;
  pendingOpenAnalyzer: boolean = false;

  //========= AI ANALYZER =================
  showAiAnalyzer: boolean = false;
  aiAnalyzerData: any[] = [];
  aiAnalyzerConfig: AiAnalyzerConfig = {
    prjId: 'GTR',
    datasetName: 'sitPagamenti',
    pageCode: 'sitPagamenti_11',  // prjId + formId per filtro analisi salvate
    dialogTitle: 'AI Analyzer - Situazione Pagamenti'
  };

  //========= PAGE FUNCTIONS =================
  async getCustomData(prjId: string, formId: number, customCode: string, actualView: string) {
    //===== START CUSTOM CODE =====

    // LOAD_EXCEL - Apri file picker per caricare Excel
    if (customCode === 'LOAD_EXCEL') {
      this.excelFileInput.nativeElement.click();
    }

    // LOAD_CACHE_DATA - Carica i dati dalla cache MongoDB
    if (customCode === 'LOAD_CACHE_DATA') {
      if (this.hasCachedData) {
        this.loadCachedData();
      } else {
        // Verifica se esistono dati in cache
        this.checkCachedData();
      }
    }

    // SHOW_AI_ANALYZER - Apri AI Analyzer con i dati caricati
    if (customCode === 'SHOW_AI_ANALYZER') {
      if (this.rawExcelData && this.rawExcelData.length > 0) {
        this.aiAnalyzerData = this.rawExcelData;
        this.showAiAnalyzer = true;
      } else if (this.hasCachedData) {
        // Carica dalla cache e poi apri
        this.pendingOpenAnalyzer = true;
        this.loadCachedData();
      } else {
        this.showWarning(this.t(1548, 'Carica prima un file Excel con i dati'));
      }
    }

    //===== END CUSTOM CODE =====
  }

  //========= CACHE FUNCTIONS =================

  /**
   * Verifica se esistono dati Excel cached per questa pagina
   */
  private checkCachedData(): void {
    const pageCode = `sitPagamenti_${this.formId}`;

    this.userDataService.excelCacheExists(this.prjId, pageCode, 'shared').subscribe({
      next: (response) => {
        this.hasCachedData = response.exists;
        if (response.exists && response.metadata) {
          this.cachedDataInfo = {
            recordCount: response.metadata.recordCount,
            fileName: response.metadata.fileName,
            updatedAt: response.updatedAt,
            uploadedBy: response.metadata.uploadedBy
          };
          // Auto-carica i dati dalla cache
          this.loadCachedData();
        }
      },
      error: (err) => {
        console.warn('Error checking cached data:', err);
        this.hasCachedData = false;
      }
    });
  }

  /**
   * Carica i dati dalla cache
   */
  loadCachedData(): void {
    if (!this.hasCachedData) return;

    const pageCode = `sitPagamenti_${this.formId}`;

    this.cacheLoading = true;
    this.gtsDataService.sendAppLoaderListener(true);

    this.userDataService.loadExcelCache<any[]>(this.prjId, pageCode, 'shared').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Formatta le date ISO dalla cache
          const formattedData = this.formatDatesInData(response.data);
          this.rawExcelData = formattedData;
          this.populateGrid(formattedData);

          // Se c'era richiesta pendente di aprire l'analyzer
          if (this.pendingOpenAnalyzer) {
            this.pendingOpenAnalyzer = false;
            this.aiAnalyzerData = formattedData;
            this.showAiAnalyzer = true;
          }
        }
      },
      error: (err) => {
        console.error('Error loading cached data:', err);
        this.showError(this.t(1551, 'Errore nel caricamento dei dati dalla cache'));
        this.pendingOpenAnalyzer = false;
      },
      complete: () => {
        this.cacheLoading = false;
        this.gtsDataService.sendAppLoaderListener(false);
      }
    });
  }

  /**
   * Salva i dati Excel nella cache
   */
  private saveDataToCache(data: any[], fileName?: string): void {
    const pageCode = `sitPagamenti_${this.formId}`;
    const uploadedBy = this.authService.getUserEmail() || 'unknown';

    this.userDataService.saveExcelCache(
      this.prjId,
      pageCode,
      'shared',
      data,
      fileName,
      30, // TTL 30 giorni
      uploadedBy
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.hasCachedData = true;
          this.cachedDataInfo = {
            recordCount: response.recordCount,
            fileName: fileName,
            updatedAt: new Date(),
            uploadedBy: uploadedBy
          };
        }
      },
      error: (err) => {
        console.warn('Error saving data to cache:', err);
      }
    });
  }

  //========= EXCEL IMPORT =================

  /**
   * Handler per selezione file Excel
   */
  async onExcelFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.gtsDataService.sendAppLoaderListener(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      // Prendi il primo foglio
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        this.showError(this.t(1519, 'File Excel vuoto o non valido'));
        return;
      }

      // Converti in JSON
      const rawData = this.worksheetToJson(worksheet);

      if (rawData.length === 0) {
        this.showWarning(this.t(1520, 'Nessun dato valido trovato nel file Excel'));
        return;
      }

      // Aggiungi ID sequenziale a ogni riga (maiuscolo per la PK della griglia)
      const dataWithId = rawData.map((row, index) => ({
        ID: index + 1,
        ...row
      }));

      // Salva i dati raw
      this.rawExcelData = dataWithId;

      // Popola la griglia
      this.populateGrid(dataWithId);

      // Salva nella cache
      this.saveDataToCache(dataWithId, file.name);

      this.showSuccess(this.t(1698, 'Caricati') + ` ${dataWithId.length} ` + this.t(1501, 'record'));

    } catch (err) {
      console.error('Error parsing Excel:', err);
      this.showError(this.t(1519, 'Errore nel parsing del file Excel'));
    } finally {
      this.gtsDataService.sendAppLoaderListener(false);
      input.value = '';
    }
  }

  /**
   * Converte un worksheet ExcelJS in array JSON
   */
  private worksheetToJson(worksheet: ExcelJS.Worksheet): any[] {
    const rows: any[] = [];
    const headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // Prima riga = headers
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = cell.value?.toString() || `col${colNumber}`;
        });
      } else {
        // Righe dati
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            let value = cell.value;
            // Gestisci formule
            if (value && typeof value === 'object' && 'result' in value) {
              value = (value as any).result;
            }
            // Gestisci rich text
            if (value && typeof value === 'object' && 'richText' in value) {
              value = (value as any).richText.map((rt: any) => rt.text).join('');
            }
            // Formatta le date
            if (value instanceof Date) {
              value = this.formatDate(value);
            }
            rowData[header] = value;
          }
        });

        if (Object.keys(rowData).length > 0) {
          rows.push(rowData);
        }
      }
    });

    return rows;
  }

  /**
   * Formatta una data in formato dd/MM/yyyy
   */
  private formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Formatta le date ISO string nei dati (per dati caricati dalla cache)
   */
  private formatDatesInData(data: any[]): any[] {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

    return data.map(row => {
      const formattedRow: any = {};
      for (const key in row) {
        let value = row[key];
        // Se è una stringa ISO date, formattala
        if (typeof value === 'string' && isoDateRegex.test(value)) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            value = this.formatDate(date);
          }
        }
        formattedRow[key] = value;
      }
      return formattedRow;
    });
  }

  /**
   * Popola la griglia GTS con i dati
   */
  private populateGrid(data: any[]): void {
    // Inietta i dati nel pageData per la griglia GTS
    this.gtsDataService.setPageDataSet(
      this.prjId,
      this.formId,
      'daPagam',      // dataAdapter name
      'qPagam',       // dataSet name
      data
    );

    // Ricarica la griglia
    this.gtsDataService.sendGridReload('qPagam');
  }

  //========= TOAST MESSAGES =================

  showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: this.t(1554, 'Errore'),
      detail: message,
      life: 5000
    });
  }

  showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: this.t(1555, 'Successo'),
      detail: message,
      life: 3000
    });
  }

  showWarning(message: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: this.t(1556, 'Attenzione'),
      detail: message,
      life: 4000
    });
  }
}
