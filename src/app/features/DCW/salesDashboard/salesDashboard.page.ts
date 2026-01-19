import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { AiReportsService } from '../../../core/services/ai-reports.service';
import { UserDataService } from '../../../core/services/user-data.service';
import { TranslationService } from '../../../core/services/translation.service';
import { Subscription } from 'rxjs';

// Excel parsing (using ExcelJS - no security vulnerabilities)
import ExcelJS from 'exceljs';

// PDF Export
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import GTS Components
import { GtsToolbarComponent } from '../../../core/gts/gts-toolbar/gts-toolbar.component';
import { GtsTabsComponent } from '../../../core/gts/gts-tabs/gts-tabs.component';
import { GtsGridComponent } from '../../../core/gts/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts/gts-form-popup/gts-form-popup.component';
import { GtsMessageComponent } from '../../../core/gts/gts-message/gts-message.component';
import { GtsLoaderComponent } from '../../../core/gts/gts-loader/gts-loader.component';
import { GtsAiAnalyzerComponent, AiAnalyzerConfig } from '../../../core/gts/gts-ai-analyzer/gts-ai-analyzer.component';
import { GtsDashboardComponent, DashboardConfig } from '../../../core/gts/gts-dashboard/gts-dashboard.component';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Interface for raw Excel data row
interface ExcelRow {
  data: Date | string | number;
  Anno: string | number;
  Mese: number;
  kg: number;
  valore: number;
  'totale costi': number;
  delta: number;
  'num doc': string | number;
  Clienti: string;
  Prodotto: string;
  CATEGORIA: string;
  famiglia: string;
}

@Component({
  selector: 'app-salesDashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    // GTS Components
    GtsToolbarComponent,
    GtsTabsComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsMessageComponent,
    GtsLoaderComponent,
    GtsAiAnalyzerComponent,
    GtsDashboardComponent,

    // PrimeNG
    ButtonModule,
    Dialog,
    Toast
  ],
  providers: [MessageService],
  templateUrl: './salesDashboard.page.html',
  styleUrls: ['./salesDashboard.page.scss']
})
export class DCW_SalesDashboardComponent implements OnInit, OnDestroy {
  //========= PAGE PARAMS =================
  prjId: string = 'DCW';
  formId: number = 51;

  // Reference to hidden file input for LOAD_EXCEL
  @ViewChild('excelFileInput') excelFileInput!: ElementRef<HTMLInputElement>;

  // Reference to AI chart for PDF export
  @ViewChild('aiChartRef') aiChartRef: any;

  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);
  private cdr = inject(ChangeDetectorRef);
  private aiReportsService = inject(AiReportsService);
  private ts = inject(TranslationService);
  private userDataService = inject(UserDataService);
  private messageService = inject(MessageService);

  /**
   * Ottiene un testo tradotto
   * @param txtId ID del testo
   * @param fallback Testo di fallback se non trovato
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
      // ECCEZIONE: Per LOAD_CACHED il loader viene gestito dal caricamento dei dati e dalla griglia
      if (customCode !== 'LOAD_CACHED') {
        setTimeout(() => {
          this.gtsDataService.sendAppLoaderListener(false);
        }, 300);
      }

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
    this.gtsAiAnalyzerConfig.connCode = this.gtsDataService.getActualConnCode();

    // Verifica se esistono dati cached per questa pagina
    this.checkCachedData();
  }

  /**
   * Verifica se esistono dati Excel cached per questa pagina
   */
  private checkCachedData(): void {
    const pageCode = `salesDashboard_${this.formId}`;

    // Cache condivisa tra tutti gli utenti (userId = 'shared')
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
        }
      },
      error: (err) => {
        console.warn('Error checking cached data:', err);
        this.hasCachedData = false;
      }
    });
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

  //========= DASHBOARD STATE =================
  showDashboard: boolean = false;

  // Dati raw per filtraggio per anno (clienti/prodotti unici)
  rawExcelData: ExcelRow[] = [];

  //========= CACHE STATE =================
  hasCachedData: boolean = false;
  cachedDataInfo: {
    recordCount: number;
    fileName?: string;
    updatedAt?: Date;
    uploadedBy?: string;
  } | null = null;
  cacheLoading: boolean = false;
  dashboardLoading: boolean = false;

  //========= CONFIRM DIALOG =================
  showConfirmDialog: boolean = false;
  confirmDialogHeader: string = '';
  confirmDialogMessage: string = '';
  confirmDialogAcceptLabel: string = '';
  confirmDialogRejectLabel: string = '';
  private confirmDialogCallback: (() => void) | null = null;

  /**
   * Mostra una dialog di conferma
   */
  showConfirm(message: string, header: string, onAccept: () => void): void {
    this.confirmDialogMessage = message;
    this.confirmDialogHeader = header;
    this.confirmDialogAcceptLabel = this.t(1611, 'Elimina');
    this.confirmDialogRejectLabel = this.t(1612, 'Annulla');
    this.confirmDialogCallback = onAccept;
    this.showConfirmDialog = true;
    this.cdr.detectChanges();
  }

  onConfirmAccept(): void {
    this.showConfirmDialog = false;
    if (this.confirmDialogCallback) {
      this.confirmDialogCallback();
      this.confirmDialogCallback = null;
    }
  }

  onConfirmReject(): void {
    this.showConfirmDialog = false;
    this.confirmDialogCallback = null;
  }

  /**
   * Mostra un messaggio toast di errore
   */
  showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: this.t(1554, 'Errore'),
      detail: message,
      life: 5000
    });
  }

  /**
   * Mostra un messaggio toast di successo
   */
  showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: this.t(1555, 'Successo'),
      detail: message,
      life: 3000
    });
  }

  /**
   * Mostra un messaggio toast di warning
   */
  showWarning(message: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: this.t(1556, 'Attenzione'),
      detail: message,
      life: 4000
    });
  }

  //========= PAGE FUNCTIONS =================
  async getCustomData(prjId: string, formId: number, customCode: string, actualView: string) {
    //===== START CUSTOM CODE =====

    if (customCode === 'SHOW_DASHBOARD') {
      this.showDashboard = true;
    }

    if (customCode === 'HIDE_DASHBOARD') {
      this.showDashboard = false;
      this.cdr.detectChanges();
    }

    if (customCode === 'LOAD_EXCEL') {
      // Trigger the hidden file input click
      this.excelFileInput.nativeElement.click();
    }

    if (customCode === 'LOAD_CACHED') {
      // Il loader verrà attivato dentro loadCachedData() prima della chiamata MongoDB
      // e verrà spento dalla griglia quando avrà finito di renderizzare
      if (this.hasCachedData) {
        this.loadCachedData();
      }
    }

    if (customCode === 'SHOW_AI_ANALYZER_GTS' || customCode === 'SHOW_AI_ANALYZER') {
      // Apri AI Analyzer generico con i dati raw Excel
      this.showDashboard = false; // Analyzer non mostra la dashboard
      if (this.rawExcelData && this.rawExcelData.length > 0) {
        this.gtsAiAnalyzerData = this.rawExcelData;
        this.showGtsAiAnalyzer = true;
      } else {
        // Mostra la sezione cache per caricare i dati, poi apri l'analyzer
        this.pendingOpenAnalyzer = true;
        this.showDashboard = true;
      }
    }

    //===== END CUSTOM CODE =====
  }

  closeDashboard(): void {
    this.showDashboard = false;
  }

  //========= EXCEL IMPORT =================

  // Helper to convert ExcelJS worksheet to JSON array
  worksheetToJson(worksheet: ExcelJS.Worksheet): ExcelRow[] {
    const rows: ExcelRow[] = [];
    const headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // First row is headers
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = cell.value?.toString() || `col${colNumber}`;
        });
      } else {
        // Data rows
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            // Handle different cell value types
            let value = cell.value;
            if (value && typeof value === 'object' && 'result' in value) {
              // Formula cell - use the result
              value = (value as any).result;
            }
            if (value && typeof value === 'object' && 'richText' in value) {
              // Rich text - extract plain text
              value = (value as any).richText.map((rt: any) => rt.text).join('');
            }
            rowData[header] = value;
          }
        });
        // Only add non-empty rows
        if (Object.keys(rowData).length > 0) {
          rows.push(rowData as ExcelRow);
        }
      }
    });

    return rows;
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.dashboardLoading = true;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      // Get the 'DB' sheet
      let worksheet = workbook.worksheets.find(ws => ws.name.toUpperCase() === 'DB');
      if (!worksheet) {
        worksheet = workbook.worksheets[0];
      }

      // Convert to JSON - ExcelJS reads rows differently
      const rawData: ExcelRow[] = this.worksheetToJson(worksheet);

      // console.log(`Loaded ${rawData.length} records from Excel`);

      // Process data
      this.processExcelData(rawData);

    } catch (err) {
      console.error('Error parsing Excel:', err);
      this.showError(this.t(1519, 'Errore nel parsing del file Excel. Assicurati che il file abbia il formato corretto.'));
    } finally {
      this.dashboardLoading = false;
      // Reset file input
      input.value = '';
    }
  }

  // Handler for LOAD_EXCEL custom code - loads data into GTS grid
  async onExcelFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.gtsDataService.sendAppLoaderListener(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      // Get the 'DB' sheet
      let worksheet = workbook.worksheets.find(ws => ws.name.toUpperCase() === 'DB');
      if (!worksheet) {
        worksheet = workbook.worksheets[0];
      }

      // Convert to JSON
      const rawData: ExcelRow[] = this.worksheetToJson(worksheet);

      // console.log(`LOAD_EXCEL: Loaded ${rawData.length} records from Excel`);

      // Filter valid rows
      const validData = rawData.filter(row => row.kg != null && row.valore != null);

      if (validData.length === 0) {
        this.showWarning(this.t(1520, 'Nessun dato valido trovato nel file Excel.'));
        return;
      }

      // Transform data for grid display (flatten and format)
      const gridRows = validData.map((row, index) => {
        let dataDate: Date | null = null;
        let dataStr = '';

        try {
          if (row.data instanceof Date && !isNaN(row.data.getTime())) {
            dataDate = row.data;
          } else if (typeof row.data === 'number') {
            dataDate = this.excelDateToJS(row.data);
          } else if (row.data) {
            dataDate = new Date(row.data);
          }

          // Validate the date
          if (dataDate && !isNaN(dataDate.getTime())) {
            dataStr = dataDate.toISOString().split('T')[0];
          }
        } catch {
          // Invalid date, leave empty
        }

        return {
          ID: index + 1,
          DATA: dataStr,
          ANNO: row.Anno?.toString() || (dataDate && !isNaN(dataDate.getTime()) ? dataDate.getFullYear().toString() : ''),
          MESE: row.Mese || (dataDate && !isNaN(dataDate.getTime()) ? dataDate.getMonth() + 1 : 0),
          KG: row.kg || 0,
          VALORE: row.valore || 0,
          TOTALE_COSTI: row['totale costi'] || 0,
          DELTA: row.delta || 0,
          NUM_DOC: row['num doc']?.toString() || '',
          CLIENTE: row.Clienti || '',
          PRODOTTO: row.Prodotto || '',
          CATEGORIA: row.CATEGORIA || '',
          FAMIGLIA: row.famiglia || ''
        };
      });

      // Inject data into pageData for the GTS grid
      this.gtsDataService.setPageDataSet(
        this.prjId,
        this.formId,
        'daDummy',
        'qDummy',
        gridRows
      );

      // Inject raw data into qSales for the dashboard
      this.gtsDataService.setPageDataSet(
        this.prjId,
        this.formId,
        'daDummy',
        'qSales',
        rawData
      );

      // Trigger grid reload to display the new data
      this.gtsDataService.sendGridReload('qDummy');

      // Also process data for dashboard (so SHOW_DASHBOARD can use it)
      this.processExcelData(rawData);

      // Salva i dati nella cache per uso futuro
      this.saveDataToCache(rawData, file.name);

      // console.log(`Grid populated with ${gridRows.length} rows`);
      // console.log('Sample grid row:', gridRows[0]);

    } catch (err) {
      console.error('Error parsing Excel:', err);
      this.showError(this.t(1519, 'Errore nel parsing del file Excel. Assicurati che il file abbia il formato corretto.'));
    } finally {
      this.gtsDataService.sendAppLoaderListener(false);
      // Reset file input
      input.value = '';
    }
  }

  processExcelData(rawData: ExcelRow[]): void {
    // Filter out invalid rows
    const validData = rawData.filter(row => row.kg != null && row.valore != null);

    if (validData.length === 0) {
      this.showWarning(this.t(1520, 'Nessun dato valido trovato nel file Excel.'));
      return;
    }

    // Salva i dati raw per la dashboard e l'AI Analyzer
    this.rawExcelData = validData;

    // Se c'era una richiesta pendente di aprire l'analyzer, aprilo ora e chiudi la dashboard
    if (this.pendingOpenAnalyzer && this.rawExcelData && this.rawExcelData.length > 0) {
      this.pendingOpenAnalyzer = false;
      this.showDashboard = false; // Chiudi la dashboard, torna alla griglia
      this.gtsAiAnalyzerData = this.rawExcelData;
      this.showGtsAiAnalyzer = true;
    }
  }

  /**
   * Salva i dati Excel nella cache per uso futuro
   */
  private saveDataToCache(data: ExcelRow[], fileName?: string): void {
    const pageCode = `salesDashboard_${this.formId}`;
    const uploadedBy = this.authService.getUserEmail() || 'unknown';

    // Cache condivisa tra tutti gli utenti (userId = 'shared'), ma salviamo chi l'ha caricata
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
            updatedAt: new Date()
          };
          // console.log(`Data cached: ${response.recordCount} records, compression: ${response.compressionRatio}`);
        }
      },
      error: (err) => {
        console.warn('Error saving data to cache:', err);
      }
    });
  }

  /**
   * Carica i dati dalla cache (resta sulla griglia, non apre la dashboard)
   */
  loadCachedData(): void {
    if (!this.hasCachedData) {
      this.showWarning(this.t(1548, 'Nessun dato in cache'));
      return;
    }

    const pageCode = `salesDashboard_${this.formId}`;

    this.cacheLoading = true;
    this.gtsDataService.sendAppLoaderListener(true);

    // Cache condivisa tra tutti gli utenti (userId = 'shared')
    this.userDataService.loadExcelCache<ExcelRow[]>(this.prjId, pageCode, 'shared').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const rawData = response.data;

          // Filter valid rows
          const validData = rawData.filter(row => row.kg != null && row.valore != null);

          if (validData.length === 0) {
            this.showWarning(this.t(1520, 'Nessun dato valido trovato nella cache.'));
            return;
          }

          // Transform data for grid display (come in onExcelFileSelected)
          const gridRows = validData.map((row, index) => {
            let dataDate: Date | null = null;
            let dataStr = '';

            try {
              if (row.data instanceof Date && !isNaN(row.data.getTime())) {
                dataDate = row.data;
              } else if (typeof row.data === 'number') {
                dataDate = this.excelDateToJS(row.data);
              } else if (row.data) {
                dataDate = new Date(row.data);
              }

              if (dataDate && !isNaN(dataDate.getTime())) {
                dataStr = dataDate.toISOString().split('T')[0];
              }
            } catch {
              // Invalid date, leave empty
            }

            return {
              ID: index + 1,
              DATA: dataStr,
              ANNO: row.Anno?.toString() || (dataDate && !isNaN(dataDate.getTime()) ? dataDate.getFullYear().toString() : ''),
              MESE: row.Mese || (dataDate && !isNaN(dataDate.getTime()) ? dataDate.getMonth() + 1 : 0),
              KG: row.kg || 0,
              VALORE: row.valore || 0,
              TOTALE_COSTI: row['totale costi'] || 0,
              DELTA: row.delta || 0,
              NUM_DOC: row['num doc']?.toString() || '',
              CLIENTE: row.Clienti || '',
              PRODOTTO: row.Prodotto || '',
              CATEGORIA: row.CATEGORIA || '',
              FAMIGLIA: row.famiglia || ''
            };
          });

          // Inject data into pageData for the GTS grid
          this.gtsDataService.setPageDataSet(
            this.prjId,
            this.formId,
            'daDummy',
            'qDummy',
            gridRows
          );

          // Inject raw data into qSales for the dashboard
          this.gtsDataService.setPageDataSet(
            this.prjId,
            this.formId,
            'daDummy',
            'qSales',
            rawData
          );

          // Trigger grid reload to display the new data
          this.gtsDataService.sendGridReload('qDummy');

          // Processa i dati per dashboard (popola rawExcelData)
          this.processExcelData(rawData);
          // NON apre la dashboard - c'è un bottone separato per quello
        }
      },
      error: (err) => {
        console.error('Error loading cached data:', err);
        this.showError(this.t(1551, 'Errore nel caricamento dei dati dalla cache'));
        this.cacheLoading = false;
        this.gtsDataService.sendAppLoaderListener(false);
      },
      complete: () => {
        this.cacheLoading = false;
        // NON spegnere il loader qui - la griglia lo spegnerà quando avrà finito di renderizzare
      }
    });
  }

  /**
   * Carica i dati dalla cache e poi apre l'AI Analyzer (resta sulla griglia, non va alla dashboard)
   */
  loadCachedDataForAnalyzer(): void {
    if (!this.hasCachedData) {
      this.showWarning(this.t(1548, 'Carica prima un file Excel con i dati di vendita'));
      return;
    }

    const pageCode = `salesDashboard_${this.formId}`;

    this.cacheLoading = true;
    this.gtsDataService.sendAppLoaderListener(true);

    // Cache condivisa tra tutti gli utenti (userId = 'shared')
    this.userDataService.loadExcelCache<ExcelRow[]>(this.prjId, pageCode, 'shared').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Processa i dati (popola rawExcelData e dashboardData)
          this.processExcelData(response.data);

          // Ora apri l'AI Analyzer con i dati caricati
          if (this.rawExcelData && this.rawExcelData.length > 0) {
            this.gtsAiAnalyzerData = this.rawExcelData;
            this.showGtsAiAnalyzer = true;
          }
        }
      },
      error: (err) => {
        console.error('Error loading cached data for analyzer:', err);
        this.showError(this.t(1551, 'Errore nel caricamento dei dati dalla cache'));
      },
      complete: () => {
        this.cacheLoading = false;
        this.gtsDataService.sendAppLoaderListener(false);
      }
    });
  }

  /**
   * Elimina la cache dei dati
   */
  clearCachedData(): void {
    if (!this.hasCachedData) return;

    const pageCode = `salesDashboard_${this.formId}`;

    // Cache condivisa tra tutti gli utenti (userId = 'shared')
    this.userDataService.deleteExcelCache(this.prjId, pageCode, 'shared').subscribe({
      next: () => {
        this.hasCachedData = false;
        this.cachedDataInfo = null;
      },
      error: (err) => {
        console.warn('Error clearing cache:', err);
      }
    });
  }

  excelDateToJS(excelDate: number): Date {
    // Excel dates are days since 1900-01-01 (with a bug for 1900 leap year)
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    return new Date(excelEpoch.getTime() + excelDate * millisecondsPerDay);
  }

  // ============================================
  // GTS AI ANALYZER (Componente Generico)
  // ============================================
  showGtsAiAnalyzer: boolean = false;
  gtsAiAnalyzerData: any[] = [];
  gtsAiAnalyzerConfig: AiAnalyzerConfig = {
    prjId: 'DCW',
    datasetName: 'salesData',
    pageCode: 'salesDashboard_20',  // datasetName + formId per filtro analisi salvate
    dialogTitle: 'AI Analyzer - Sales Data'
  };
  pendingOpenAnalyzer: boolean = false; // Flag per aprire analyzer dopo caricamento dati

  // ============================================
  // GTS DASHBOARD (metadata-driven)
  // ============================================
  gtsDashboardConfig: DashboardConfig = {
    prjId: 'DCW',
    dashboardCode: 'salesDashboard',
    connCode: 'DCW_SS',
    title: 'Sales Dashboard'
  };

  /**
   * Refresh handler per GTS Dashboard - ricarica i dati dalla cache
   */
  onGtsDashboardRefresh(): void {
    // Il refresh della dashboard non ricarica i dati dalla cache
    // I dati vengono caricati solo tramite il bottone LOAD_CACHED
  }

  /**
   * Handler per richiesta dati da GTS Dashboard
   * Carica i dati dal dataAdapter GTSuite usando adapterCode e dataSetCode
   */
  onDashboardDataRequest(event: { dataset: any; callback: (data: any[]) => void }): void {
    const { dataset, callback } = event;
    console.log('Dashboard requesting data for dataset:', dataset);

    // Estrai adapterCode e dataSetCode dal dataset richiesto
    const adapterCode = dataset.adapterCode;
    const dataSetCode = dataset.dataSetCode;

    if (!adapterCode || !dataSetCode) {
      console.error('Missing adapterCode or dataSetCode in dataset:', dataset);
      callback([]);
      return;
    }

    // Ottieni i dati dal dataAdapter GTSuite (già caricati con la pagina)
    const dataSetRows = this.gtsDataService.getDataSet(this.prjId, this.formId, adapterCode, dataSetCode);

    if (dataSetRows && dataSetRows.length > 0) {
      console.log(`Loaded ${dataSetRows.length} rows from ${adapterCode}.${dataSetCode}`);
      callback(dataSetRows);
    } else {
      console.warn(`No data found for ${adapterCode}.${dataSetCode}`);
      callback([]);
    }
  }
}
