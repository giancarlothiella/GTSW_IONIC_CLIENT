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

// PrimeNG
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { Dialog } from 'primeng/dialog';
import { Textarea } from 'primeng/textarea';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tooltip } from 'primeng/tooltip';
import { InputText } from 'primeng/inputtext';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// ============================================
// DASHBOARD INTERFACES
// ============================================

interface DashboardData {
  metadata: {
    generated_at: string;
    period_start: string;
    period_end: string;
    total_records: number;
  };
  kpi: KPI;
  trend_mensile: TrendMensile[];
  top_clienti: TopCliente[];
  top_prodotti: TopProdotto[];
  per_categoria: PerCategoria[];
  per_famiglia: PerFamiglia[];
}

interface KPI {
  totale_fatturato: number;
  totale_kg: number;
  totale_costi: number;
  margine_totale: number;
  margine_percentuale: number;
  num_ordini: number;
  num_clienti: number;
  num_prodotti: number;
  prezzo_medio_kg: number;
}

interface TrendMensile {
  periodo: string;
  fatturato: number;
  quantita: number;
  margine: number;
  margine_pct: number;
  num_ordini: number;
}

interface TopCliente {
  cliente: string;
  fatturato: number;
  quantita: number;
  margine: number;
  margine_pct: number;
  num_ordini: number;
}

interface TopProdotto {
  prodotto: string;
  fatturato: number;
  quantita: number;
  margine: number;
  margine_pct: number;
  num_ordini: number;
}

interface PerCategoria {
  categoria: string;
  fatturato: number;
  quantita: number;
  margine: number;
  margine_pct: number;
}

interface PerFamiglia {
  famiglia: string;
  fatturato: number;
  quantita: number;
  margine: number;
  margine_pct: number;
}

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

    // PrimeNG
    CardModule,
    ChartModule,
    TableModule,
    ButtonModule,
    Select,
    Dialog,
    Textarea,
    ProgressSpinner,
    Tooltip,
    InputText,
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
  dashboardData: DashboardData | null = null;
  dashboardLoading: boolean = false;

  // Dati raw per filtraggio per anno (clienti/prodotti unici)
  private rawExcelData: ExcelRow[] = [];

  //========= CACHE STATE =================
  hasCachedData: boolean = false;
  cachedDataInfo: {
    recordCount: number;
    fileName?: string;
    updatedAt?: Date;
    uploadedBy?: string;
  } | null = null;
  cacheLoading: boolean = false;

  //========= CHART DATA =================
  trendFatturatoChart: any = null;
  trendMargineChart: any = null;
  topClientiChart: any = null;
  topProdottiChart: any = null;
  perCategoriaChart: any = null;
  perFamigliaChart: any = null;

  // Dati filtrati per drill-down (aggiornati quando cambiano i filtri)
  private _filteredTopClienti: { cliente: string; fatturato: number }[] = [];
  private _filteredTopProdotti: { prodotto: string; fatturato: number }[] = [];
  private _filteredCategorie: { categoria: string; fatturato: number }[] = [];
  private _filteredFamiglie: { famiglia: string; fatturato: number }[] = [];

  //========= DRILL-DOWN STATE =================
  // Stato drill-down per chart Clienti
  clientiDrillDown: {
    active: boolean;
    clienteName: string;
    chart: any;
  } = { active: false, clienteName: '', chart: null };

  // Stato drill-down per chart Prodotti
  prodottiDrillDown: {
    active: boolean;
    prodottoName: string;
    chart: any;
  } = { active: false, prodottoName: '', chart: null };

  // Stato drill-down per chart Categorie
  categoriaDrillDown: {
    active: boolean;
    categoriaName: string;
    chart: any;
  } = { active: false, categoriaName: '', chart: null };

  // Stato drill-down per chart Famiglie
  famigliaDrillDown: {
    active: boolean;
    famigliaName: string;
    chart: any;
  } = { active: false, famigliaName: '', chart: null };

  //========= CHART OPTIONS =================
  lineChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (value: number) => this.formatCurrency(value) }
      }
    }
  };

  barChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (context: any) => this.formatCurrency(context.parsed.x) }
      }
    },
    scales: {
      x: { ticks: { callback: (value: number) => this.formatCurrency(value) } }
    }
  };

  pieChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.label || ''}: ${this.formatCurrency(context.parsed)}`
        }
      }
    }
  };

  //========= FILTERS =================
  selectedYear: string = 'all';
  selectedQuarter: string = 'all';
  selectedMonth: string = 'all';
  private _yearOptions: { label: string; value: string }[] = [];

  get yearOptions(): { label: string; value: string }[] {
    if (this._yearOptions.length === 0) {
      return [{ label: this.t(1518, 'Tutti gli anni'), value: 'all' }];
    }
    return this._yearOptions;
  }

  get quarterOptions(): { label: string; value: string }[] {
    return [
      { label: this.t(1684, 'Tutti i trimestri'), value: 'all' },
      { label: 'Q1 (Gen-Mar)', value: 'Q1' },
      { label: 'Q2 (Apr-Giu)', value: 'Q2' },
      { label: 'Q3 (Lug-Set)', value: 'Q3' },
      { label: 'Q4 (Ott-Dic)', value: 'Q4' }
    ];
  }

  get monthOptions(): { label: string; value: string }[] {
    return [
      { label: this.t(1685, 'Tutti i mesi'), value: 'all' },
      { label: this.t(1686, 'Gennaio'), value: '01' },
      { label: this.t(1687, 'Febbraio'), value: '02' },
      { label: this.t(1688, 'Marzo'), value: '03' },
      { label: this.t(1689, 'Aprile'), value: '04' },
      { label: this.t(1690, 'Maggio'), value: '05' },
      { label: this.t(1691, 'Giugno'), value: '06' },
      { label: this.t(1692, 'Luglio'), value: '07' },
      { label: this.t(1693, 'Agosto'), value: '08' },
      { label: this.t(1694, 'Settembre'), value: '09' },
      { label: this.t(1695, 'Ottobre'), value: '10' },
      { label: this.t(1696, 'Novembre'), value: '11' },
      { label: this.t(1697, 'Dicembre'), value: '12' }
    ];
  }

  // Verifica se i filtri avanzati sono visibili (anno specifico selezionato)
  get showAdvancedFilters(): boolean {
    return this.selectedYear !== 'all';
  }

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
      // Dashboard starts empty - user must upload Excel file
    }

    if (customCode === 'HIDE_DASHBOARD') {
      this.showDashboard = false;
      this.cdr.detectChanges();
    }

    if (customCode === 'LOAD_EXCEL') {
      // Trigger the hidden file input click
      this.excelFileInput.nativeElement.click();
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

  // KPI filtrati per anno/trimestre/mese selezionato
  get kpi(): KPI | null {
    if (!this.dashboardData) return null;

    // Se "tutti gli anni", restituisce i KPI originali
    if (this.selectedYear === 'all') {
      return this.dashboardData.kpi;
    }

    // Altrimenti calcola i KPI dal trend mensile filtrato
    const filteredTrend = this.filterByYear(this.dashboardData.trend_mensile);

    if (filteredTrend.length === 0) return this.dashboardData.kpi;

    const totale_fatturato = filteredTrend.reduce((sum, t) => sum + t.fatturato, 0);
    const totale_kg = filteredTrend.reduce((sum, t) => sum + t.quantita, 0);
    const margine_totale = filteredTrend.reduce((sum, t) => sum + t.margine, 0);
    const num_ordini = filteredTrend.reduce((sum, t) => sum + t.num_ordini, 0);

    // Per i costi, calcoliamo dalla differenza fatturato - margine
    const totale_costi = totale_fatturato - margine_totale;

    // Calcola clienti e prodotti unici dai dati raw filtrati
    const filteredRawData = this.rawExcelData.filter(row => this.rowPassesFilters(row));

    const uniqueClienti = new Set(filteredRawData.map(row => row.Clienti).filter(c => c));
    const uniqueProdotti = new Set(filteredRawData.map(row => row.Prodotto).filter(p => p));

    return {
      totale_fatturato,
      totale_kg,
      totale_costi,
      margine_totale,
      margine_percentuale: totale_fatturato > 0 ? (margine_totale / totale_fatturato) * 100 : 0,
      num_ordini,
      num_clienti: uniqueClienti.size,
      num_prodotti: uniqueProdotti.size,
      prezzo_medio_kg: totale_kg > 0 ? totale_fatturato / totale_kg : 0
    };
  }

  // Helper per estrarre l'anno da una riga Excel
  private getYearFromRow(row: ExcelRow): string {
    if (row.Anno) return row.Anno.toString();

    if (row.data) {
      let date: Date | null = null;
      if (row.data instanceof Date) {
        date = row.data;
      } else if (typeof row.data === 'number') {
        date = this.excelDateToJS(row.data);
      } else {
        date = new Date(row.data);
      }

      if (date && !isNaN(date.getTime())) {
        return date.getFullYear().toString();
      }
    }

    return '';
  }

  //========= CHART PREPARATION =================

  prepareCharts(): void {
    if (!this.dashboardData) return;

    this.prepareTrendFatturatoChart();
    this.prepareTrendMargineChart();
    this.prepareTopClientiChart();
    this.prepareTopProdottiChart();
    this.preparePerCategoriaChart();
    this.preparePerFamigliaChart();
  }

  prepareTrendFatturatoChart(): void {
    if (!this.dashboardData) return;
    const trend = this.filterByYear(this.dashboardData.trend_mensile);

    this.trendFatturatoChart = {
      labels: trend.map(t => t.periodo),
      datasets: [
        {
          label: 'Fatturato',
          data: trend.map(t => t.fatturato),
          borderColor: '#42A5F5',
          backgroundColor: 'rgba(66, 165, 245, 0.2)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Margine',
          data: trend.map(t => t.margine),
          borderColor: '#66BB6A',
          backgroundColor: 'rgba(102, 187, 106, 0.2)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  }

  prepareTrendMargineChart(): void {
    if (!this.dashboardData) return;
    const trend = this.filterByYear(this.dashboardData.trend_mensile);

    this.trendMargineChart = {
      labels: trend.map(t => t.periodo),
      datasets: [{
        label: 'Margine %',
        data: trend.map(t => t.margine_pct),
        borderColor: '#FFA726',
        backgroundColor: 'rgba(255, 167, 38, 0.2)',
        tension: 0.4,
        fill: true
      }]
    };
  }

  prepareTopClientiChart(): void {
    if (!this.dashboardData) return;

    // Filtra i dati raw secondo i filtri correnti
    const filteredData = this.rawExcelData.filter(row => this.rowPassesFilters(row));

    // Aggrega per cliente
    const clientiMap = new Map<string, number>();
    filteredData.forEach(row => {
      const cliente = row.Clienti || 'N/D';
      const valore = Number(row.valore) || 0;
      clientiMap.set(cliente, (clientiMap.get(cliente) || 0) + valore);
    });

    // Ordina e prendi top 10
    const topClienti = Array.from(clientiMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Salva i nomi originali per il drill-down
    this._filteredTopClienti = topClienti.map(c => ({ cliente: c[0], fatturato: c[1] }));

    this.topClientiChart = {
      labels: topClienti.map(c => this.truncateText(c[0], 30)),
      datasets: [{
        label: 'Fatturato',
        data: topClienti.map(c => c[1]),
        backgroundColor: '#42A5F5'
      }]
    };
  }

  prepareTopProdottiChart(): void {
    if (!this.dashboardData) return;

    // Filtra i dati raw secondo i filtri correnti
    const filteredData = this.rawExcelData.filter(row => this.rowPassesFilters(row));

    // Aggrega per prodotto
    const prodottiMap = new Map<string, number>();
    filteredData.forEach(row => {
      const prodotto = row.Prodotto || 'N/D';
      const valore = Number(row.valore) || 0;
      prodottiMap.set(prodotto, (prodottiMap.get(prodotto) || 0) + valore);
    });

    // Ordina e prendi top 10
    const topProdotti = Array.from(prodottiMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Salva i nomi originali per il drill-down
    this._filteredTopProdotti = topProdotti.map(p => ({ prodotto: p[0], fatturato: p[1] }));

    this.topProdottiChart = {
      labels: topProdotti.map(p => this.truncateText(p[0], 30)),
      datasets: [{
        label: 'Fatturato',
        data: topProdotti.map(p => p[1]),
        backgroundColor: '#66BB6A'
      }]
    };
  }

  preparePerCategoriaChart(): void {
    if (!this.dashboardData) return;
    const colors = ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC', '#26A69A', '#78909C', '#8D6E63'];

    // Filtra i dati raw secondo i filtri correnti
    const filteredData = this.rawExcelData.filter(row => this.rowPassesFilters(row));

    // Aggrega per categoria
    const categorieMap = new Map<string, number>();
    filteredData.forEach(row => {
      const categoria = row.CATEGORIA || 'N/D';
      const valore = Number(row.valore) || 0;
      categorieMap.set(categoria, (categorieMap.get(categoria) || 0) + valore);
    });

    // Ordina per valore
    const categorie = Array.from(categorieMap.entries())
      .sort((a, b) => b[1] - a[1]);

    // Salva per il drill-down
    this._filteredCategorie = categorie.map(c => ({ categoria: c[0], fatturato: c[1] }));

    this.perCategoriaChart = {
      labels: categorie.map(c => c[0]),
      datasets: [{
        data: categorie.map(c => c[1]),
        backgroundColor: colors.slice(0, categorie.length)
      }]
    };
  }

  preparePerFamigliaChart(): void {
    if (!this.dashboardData) return;
    const colors = ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC', '#26A69A', '#5C6BC0', '#EC407A', '#78909C', '#8D6E63'];

    // Filtra i dati raw secondo i filtri correnti
    const filteredData = this.rawExcelData.filter(row => this.rowPassesFilters(row));

    // Aggrega per famiglia
    const famiglieMap = new Map<string, number>();
    filteredData.forEach(row => {
      const famiglia = row.famiglia || 'N/D';
      const valore = Number(row.valore) || 0;
      famiglieMap.set(famiglia, (famiglieMap.get(famiglia) || 0) + valore);
    });

    // Ordina e prendi top 10
    const topFamiglie = Array.from(famiglieMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Salva per il drill-down
    this._filteredFamiglie = topFamiglie.map(f => ({ famiglia: f[0], fatturato: f[1] }));

    this.perFamigliaChart = {
      labels: topFamiglie.map(f => this.truncateText(f[0], 25)),
      datasets: [{
        data: topFamiglie.map(f => f[1]),
        backgroundColor: colors.slice(0, topFamiglie.length)
      }]
    };
  }

  //========= DRILL-DOWN FUNCTIONS =================

  /**
   * Drill-down: click su un cliente mostra i top 10 prodotti per quel cliente
   */
  onClienteClick(event: any): void {
    if (!event?.element?.index && event?.element?.index !== 0) return;

    const index = event.element.index;
    // Usa i dati filtrati invece di dashboardData
    const clienteName = this._filteredTopClienti[index]?.cliente;
    if (!clienteName) return;

    // Filtra i dati raw per questo cliente e filtri correnti
    const clienteData = this.rawExcelData.filter(row => {
      return row.Clienti === clienteName && this.rowPassesFilters(row);
    });

    // Aggrega per prodotto
    const prodottiMap = new Map<string, number>();
    clienteData.forEach(row => {
      const prodotto = row.Prodotto || 'N/D';
      const valore = Number(row.valore) || 0;
      prodottiMap.set(prodotto, (prodottiMap.get(prodotto) || 0) + valore);
    });

    // Ordina e prendi top 10 + Altri
    const sorted = Array.from(prodottiMap.entries())
      .sort((a, b) => b[1] - a[1]);

    const top10 = sorted.slice(0, 10);
    const othersTotal = sorted.slice(10).reduce((sum, item) => sum + item[1], 0);

    const labels = top10.map(item => this.truncateText(item[0], 25));
    const data = top10.map(item => item[1]);

    if (othersTotal > 0) {
      labels.push(this.t(1679, 'Altri'));
      data.push(othersTotal);
    }

    // Colori per la torta
    const colors = ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC',
                    '#26A69A', '#5C6BC0', '#EC407A', '#78909C', '#8D6E63', '#BDBDBD'];

    this.clientiDrillDown = {
      active: true,
      clienteName: clienteName,
      chart: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length)
        }]
      }
    };
  }

  /**
   * Torna alla vista principale del chart Clienti
   */
  backFromClientiDrillDown(): void {
    this.clientiDrillDown = { active: false, clienteName: '', chart: null };
  }

  /**
   * Drill-down: click su un prodotto mostra i top 10 clienti per quel prodotto
   */
  onProdottoClick(event: any): void {
    if (!event?.element?.index && event?.element?.index !== 0) return;

    const index = event.element.index;
    // Usa i dati filtrati invece di dashboardData
    const prodottoName = this._filteredTopProdotti[index]?.prodotto;
    if (!prodottoName) return;

    // Filtra i dati raw per questo prodotto e filtri correnti
    const prodottoData = this.rawExcelData.filter(row => {
      return row.Prodotto === prodottoName && this.rowPassesFilters(row);
    });

    // Aggrega per cliente
    const clientiMap = new Map<string, number>();
    prodottoData.forEach(row => {
      const cliente = row.Clienti || 'N/D';
      const valore = Number(row.valore) || 0;
      clientiMap.set(cliente, (clientiMap.get(cliente) || 0) + valore);
    });

    // Ordina e prendi top 10 + Altri
    const sorted = Array.from(clientiMap.entries())
      .sort((a, b) => b[1] - a[1]);

    const top10 = sorted.slice(0, 10);
    const othersTotal = sorted.slice(10).reduce((sum, item) => sum + item[1], 0);

    const labels = top10.map(item => this.truncateText(item[0], 25));
    const data = top10.map(item => item[1]);

    if (othersTotal > 0) {
      labels.push(this.t(1679, 'Altri'));
      data.push(othersTotal);
    }

    // Colori per la torta
    const colors = ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC',
                    '#26A69A', '#5C6BC0', '#EC407A', '#78909C', '#8D6E63', '#BDBDBD'];

    this.prodottiDrillDown = {
      active: true,
      prodottoName: prodottoName,
      chart: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length)
        }]
      }
    };
  }

  /**
   * Torna alla vista principale del chart Prodotti
   */
  backFromProdottiDrillDown(): void {
    this.prodottiDrillDown = { active: false, prodottoName: '', chart: null };
  }

  /**
   * Drill-down: click su una categoria mostra i top 10 clienti per quella categoria
   */
  onCategoriaClick(event: any): void {
    if (!event?.element?.index && event?.element?.index !== 0) return;

    const index = event.element.index;
    // Usa i dati filtrati invece di dashboardData
    const categoriaName = this._filteredCategorie[index]?.categoria;
    if (!categoriaName) return;

    // Filtra i dati raw per questa categoria e filtri correnti
    const categoriaData = this.rawExcelData.filter(row => {
      return row.CATEGORIA === categoriaName && this.rowPassesFilters(row);
    });

    // Aggrega per cliente
    const clientiMap = new Map<string, number>();
    categoriaData.forEach(row => {
      const cliente = row.Clienti || 'N/D';
      const valore = Number(row.valore) || 0;
      clientiMap.set(cliente, (clientiMap.get(cliente) || 0) + valore);
    });

    // Ordina e prendi top 10 + Altri
    const sorted = Array.from(clientiMap.entries())
      .sort((a, b) => b[1] - a[1]);

    const top10 = sorted.slice(0, 10);
    const othersTotal = sorted.slice(10).reduce((sum, item) => sum + item[1], 0);

    const labels = top10.map(item => this.truncateText(item[0], 25));
    const data = top10.map(item => item[1]);

    if (othersTotal > 0) {
      labels.push(this.t(1679, 'Altri'));
      data.push(othersTotal);
    }

    // Bar chart per clienti
    this.categoriaDrillDown = {
      active: true,
      categoriaName: categoriaName,
      chart: {
        labels,
        datasets: [{
          label: this.t(1559, 'Fatturato'),
          data,
          backgroundColor: '#42A5F5'
        }]
      }
    };
  }

  /**
   * Torna alla vista principale del chart Categorie
   */
  backFromCategoriaDrillDown(): void {
    this.categoriaDrillDown = { active: false, categoriaName: '', chart: null };
  }

  /**
   * Drill-down: click su una famiglia mostra i top 10 clienti per quella famiglia
   */
  onFamigliaClick(event: any): void {
    if (!event?.element?.index && event?.element?.index !== 0) return;

    const index = event.element.index;
    // Usa i dati filtrati invece di dashboardData
    const famigliaName = this._filteredFamiglie[index]?.famiglia;
    if (!famigliaName) return;

    // Filtra i dati raw per questa famiglia e filtri correnti
    const famigliaData = this.rawExcelData.filter(row => {
      return row.famiglia === famigliaName && this.rowPassesFilters(row);
    });

    // Aggrega per cliente
    const clientiMap = new Map<string, number>();
    famigliaData.forEach(row => {
      const cliente = row.Clienti || 'N/D';
      const valore = Number(row.valore) || 0;
      clientiMap.set(cliente, (clientiMap.get(cliente) || 0) + valore);
    });

    // Ordina e prendi top 10 + Altri
    const sorted = Array.from(clientiMap.entries())
      .sort((a, b) => b[1] - a[1]);

    const top10 = sorted.slice(0, 10);
    const othersTotal = sorted.slice(10).reduce((sum, item) => sum + item[1], 0);

    const labels = top10.map(item => this.truncateText(item[0], 25));
    const data = top10.map(item => item[1]);

    if (othersTotal > 0) {
      labels.push(this.t(1679, 'Altri'));
      data.push(othersTotal);
    }

    // Bar chart per clienti
    this.famigliaDrillDown = {
      active: true,
      famigliaName: famigliaName,
      chart: {
        labels,
        datasets: [{
          label: this.t(1559, 'Fatturato'),
          data,
          backgroundColor: '#66BB6A'
        }]
      }
    };
  }

  /**
   * Torna alla vista principale del chart Famiglie
   */
  backFromFamigliaDrillDown(): void {
    this.famigliaDrillDown = { active: false, famigliaName: '', chart: null };
  }

  //========= FILTERS =================

  onYearChange(): void {
    // Reset filtri avanzati quando cambia l'anno
    this.selectedQuarter = 'all';
    this.selectedMonth = 'all';
    this.applyFilters();
  }

  onQuarterChange(): void {
    // Reset mese quando cambia trimestre (se non compatibile)
    if (this.selectedQuarter !== 'all') {
      const quarterMonths = this.getQuarterMonths(this.selectedQuarter);
      if (this.selectedMonth !== 'all' && !quarterMonths.includes(this.selectedMonth)) {
        this.selectedMonth = 'all';
      }
    }
    this.applyFilters();
  }

  onMonthChange(): void {
    // Se seleziono un mese, aggiorna il trimestre corrispondente
    if (this.selectedMonth !== 'all') {
      this.selectedQuarter = this.getQuarterFromMonth(this.selectedMonth);
    }
    this.applyFilters();
  }

  private applyFilters(): void {
    this.prepareCharts();
    // Reset drill-down quando cambiano i filtri
    this.backFromClientiDrillDown();
    this.backFromProdottiDrillDown();
    this.backFromCategoriaDrillDown();
    this.backFromFamigliaDrillDown();
  }

  // Restituisce i mesi di un trimestre
  private getQuarterMonths(quarter: string): string[] {
    switch (quarter) {
      case 'Q1': return ['01', '02', '03'];
      case 'Q2': return ['04', '05', '06'];
      case 'Q3': return ['07', '08', '09'];
      case 'Q4': return ['10', '11', '12'];
      default: return [];
    }
  }

  // Restituisce il trimestre di un mese
  private getQuarterFromMonth(month: string): string {
    const monthNum = parseInt(month, 10);
    if (monthNum <= 3) return 'Q1';
    if (monthNum <= 6) return 'Q2';
    if (monthNum <= 9) return 'Q3';
    return 'Q4';
  }

  // Filtra i dati del trend per anno/trimestre/mese
  filterByYear(trend: TrendMensile[]): TrendMensile[] {
    if (this.selectedYear === 'all') return trend;

    return trend.filter(t => {
      // Filtra per anno
      if (!t.periodo.startsWith(this.selectedYear)) return false;

      // Estrai il mese dal periodo (formato: "YYYY-MM")
      const month = t.periodo.split('-')[1];

      // Filtra per trimestre
      if (this.selectedQuarter !== 'all') {
        const quarterMonths = this.getQuarterMonths(this.selectedQuarter);
        if (!quarterMonths.includes(month)) return false;
      }

      // Filtra per mese specifico
      if (this.selectedMonth !== 'all') {
        if (month !== this.selectedMonth) return false;
      }

      return true;
    });
  }

  // Verifica se una riga raw passa i filtri correnti
  private rowPassesFilters(row: ExcelRow): boolean {
    const rowYear = this.getYearFromRow(row);

    // Filtra per anno
    if (this.selectedYear !== 'all' && rowYear !== this.selectedYear) {
      return false;
    }

    // Se anno specifico, applica filtri avanzati
    if (this.selectedYear !== 'all') {
      const rowMonth = this.getMonthFromRow(row);

      // Filtra per trimestre
      if (this.selectedQuarter !== 'all') {
        const quarterMonths = this.getQuarterMonths(this.selectedQuarter);
        if (!quarterMonths.includes(rowMonth)) return false;
      }

      // Filtra per mese
      if (this.selectedMonth !== 'all') {
        if (rowMonth !== this.selectedMonth) return false;
      }
    }

    return true;
  }

  // Estrae il mese da una riga Excel
  private getMonthFromRow(row: ExcelRow): string {
    if (row.Mese) {
      return row.Mese.toString().padStart(2, '0');
    }

    if (row.data) {
      const dateValue = row.data;
      let date: Date | null = null;

      if (typeof dateValue === 'number') {
        date = this.excelDateToJS(dateValue);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      }

      if (date && !isNaN(date.getTime())) {
        return (date.getMonth() + 1).toString().padStart(2, '0');
      }
    }

    return '01';
  }

  //========= UTILITIES =================

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatNumber(value: number, decimals: number = 0): string {
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatCacheDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  }

  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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

    // Salva i dati raw per il filtraggio per anno (clienti/prodotti unici)
    this.rawExcelData = validData;

    // Parse dates and extract year/month
    const processedData = validData.map(row => {
      let dataDate: Date;
      if (row.data instanceof Date) {
        dataDate = row.data;
      } else if (typeof row.data === 'number') {
        // Excel serial date
        dataDate = this.excelDateToJS(row.data);
      } else {
        dataDate = new Date(row.data);
      }

      return {
        ...row,
        dataDate,
        anno: row.Anno?.toString() || dataDate.getFullYear().toString(),
        mese: row.Mese || (dataDate.getMonth() + 1)
      };
    });

    // Get date range
    const dates = processedData.map(r => r.dataDate).filter(d => d instanceof Date && !isNaN(d.getTime()));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // ==========================================
    // KPI
    // ==========================================
    const totale_fatturato = processedData.reduce((sum, r) => sum + (r.valore || 0), 0);
    const totale_kg = processedData.reduce((sum, r) => sum + (r.kg || 0), 0);
    const totale_costi = processedData.reduce((sum, r) => sum + (r['totale costi'] || 0), 0);
    const margine_totale = processedData.reduce((sum, r) => sum + (r.delta || 0), 0);

    const uniqueOrdini = new Set(processedData.map(r => r['num doc']));
    const uniqueClienti = new Set(processedData.map(r => r.Clienti));
    const uniqueProdotti = new Set(processedData.map(r => r.Prodotto));

    const kpi: KPI = {
      totale_fatturato,
      totale_kg,
      totale_costi,
      margine_totale,
      margine_percentuale: totale_fatturato > 0 ? (margine_totale / totale_fatturato) * 100 : 0,
      num_ordini: uniqueOrdini.size,
      num_clienti: uniqueClienti.size,
      num_prodotti: uniqueProdotti.size,
      prezzo_medio_kg: totale_kg > 0 ? totale_fatturato / totale_kg : 0
    };

    // ==========================================
    // TREND MENSILE
    // ==========================================
    const trendMap = new Map<string, { fatturato: number; quantita: number; margine: number; ordini: Set<string | number> }>();

    processedData.forEach(row => {
      const periodo = `${row.anno}-${String(row.mese).padStart(2, '0')}`;
      if (!trendMap.has(periodo)) {
        trendMap.set(periodo, { fatturato: 0, quantita: 0, margine: 0, ordini: new Set() });
      }
      const entry = trendMap.get(periodo)!;
      entry.fatturato += row.valore || 0;
      entry.quantita += row.kg || 0;
      entry.margine += row.delta || 0;
      entry.ordini.add(row['num doc']);
    });

    const trend_mensile: TrendMensile[] = Array.from(trendMap.entries())
      .map(([periodo, data]) => ({
        periodo,
        fatturato: data.fatturato,
        quantita: data.quantita,
        margine: data.margine,
        margine_pct: data.fatturato > 0 ? Math.round((data.margine / data.fatturato) * 10000) / 100 : 0,
        num_ordini: data.ordini.size
      }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));

    // ==========================================
    // TOP 10 CLIENTI
    // ==========================================
    const clientiMap = new Map<string, { fatturato: number; quantita: number; margine: number; ordini: Set<string | number> }>();

    processedData.forEach(row => {
      const cliente = row.Clienti || 'N/A';
      if (!clientiMap.has(cliente)) {
        clientiMap.set(cliente, { fatturato: 0, quantita: 0, margine: 0, ordini: new Set() });
      }
      const entry = clientiMap.get(cliente)!;
      entry.fatturato += row.valore || 0;
      entry.quantita += row.kg || 0;
      entry.margine += row.delta || 0;
      entry.ordini.add(row['num doc']);
    });

    const top_clienti: TopCliente[] = Array.from(clientiMap.entries())
      .map(([cliente, data]) => ({
        cliente,
        fatturato: data.fatturato,
        quantita: data.quantita,
        margine: data.margine,
        margine_pct: data.fatturato > 0 ? Math.round((data.margine / data.fatturato) * 10000) / 100 : 0,
        num_ordini: data.ordini.size
      }))
      .sort((a, b) => b.fatturato - a.fatturato)
      .slice(0, 10);

    // ==========================================
    // TOP 10 PRODOTTI
    // ==========================================
    const prodottiMap = new Map<string, { fatturato: number; quantita: number; margine: number; ordini: Set<string | number> }>();

    processedData.forEach(row => {
      const prodotto = row.Prodotto || 'N/A';
      if (!prodottiMap.has(prodotto)) {
        prodottiMap.set(prodotto, { fatturato: 0, quantita: 0, margine: 0, ordini: new Set() });
      }
      const entry = prodottiMap.get(prodotto)!;
      entry.fatturato += row.valore || 0;
      entry.quantita += row.kg || 0;
      entry.margine += row.delta || 0;
      entry.ordini.add(row['num doc']);
    });

    const top_prodotti: TopProdotto[] = Array.from(prodottiMap.entries())
      .map(([prodotto, data]) => ({
        prodotto,
        fatturato: data.fatturato,
        quantita: data.quantita,
        margine: data.margine,
        margine_pct: data.fatturato > 0 ? Math.round((data.margine / data.fatturato) * 10000) / 100 : 0,
        num_ordini: data.ordini.size
      }))
      .sort((a, b) => b.fatturato - a.fatturato)
      .slice(0, 10);

    // ==========================================
    // PER CATEGORIA
    // ==========================================
    const categoriaMap = new Map<string, { fatturato: number; quantita: number; margine: number }>();

    processedData.forEach(row => {
      const categoria = row.CATEGORIA || 'N/A';
      if (!categoriaMap.has(categoria)) {
        categoriaMap.set(categoria, { fatturato: 0, quantita: 0, margine: 0 });
      }
      const entry = categoriaMap.get(categoria)!;
      entry.fatturato += row.valore || 0;
      entry.quantita += row.kg || 0;
      entry.margine += row.delta || 0;
    });

    const per_categoria: PerCategoria[] = Array.from(categoriaMap.entries())
      .map(([categoria, data]) => ({
        categoria,
        fatturato: data.fatturato,
        quantita: data.quantita,
        margine: data.margine,
        margine_pct: data.fatturato > 0 ? Math.round((data.margine / data.fatturato) * 10000) / 100 : 0
      }))
      .sort((a, b) => b.fatturato - a.fatturato);

    // ==========================================
    // TOP 10 FAMIGLIE
    // ==========================================
    const famigliaMap = new Map<string, { fatturato: number; quantita: number; margine: number }>();

    processedData.forEach(row => {
      const famiglia = row.famiglia || 'N/A';
      if (!famigliaMap.has(famiglia)) {
        famigliaMap.set(famiglia, { fatturato: 0, quantita: 0, margine: 0 });
      }
      const entry = famigliaMap.get(famiglia)!;
      entry.fatturato += row.valore || 0;
      entry.quantita += row.kg || 0;
      entry.margine += row.delta || 0;
    });

    const per_famiglia: PerFamiglia[] = Array.from(famigliaMap.entries())
      .map(([famiglia, data]) => ({
        famiglia,
        fatturato: data.fatturato,
        quantita: data.quantita,
        margine: data.margine,
        margine_pct: data.fatturato > 0 ? Math.round((data.margine / data.fatturato) * 10000) / 100 : 0
      }))
      .sort((a, b) => b.fatturato - a.fatturato)
      .slice(0, 10);

    // ==========================================
    // BUILD DASHBOARD DATA
    // ==========================================
    this.dashboardData = {
      metadata: {
        generated_at: new Date().toISOString(),
        period_start: minDate.toISOString().split('T')[0],
        period_end: maxDate.toISOString().split('T')[0],
        total_records: validData.length
      },
      kpi,
      trend_mensile,
      top_clienti,
      top_prodotti,
      per_categoria,
      per_famiglia
    };

    // Update year options dynamically
    this.updateYearOptions();

    // Prepare charts
    this.prepareCharts();

    // Se c'era una richiesta pendente di aprire l'analyzer, aprilo ora e chiudi la dashboard
    if (this.pendingOpenAnalyzer && this.rawExcelData && this.rawExcelData.length > 0) {
      this.pendingOpenAnalyzer = false;
      this.showDashboard = false; // Chiudi la dashboard, torna alla griglia
      this.gtsAiAnalyzerData = this.rawExcelData;
      this.showGtsAiAnalyzer = true;
    }

    // console.log('Dashboard data processed successfully');
    // console.log(`Fatturato: €${kpi.totale_fatturato.toLocaleString()}`);
    // console.log(`Clienti: ${kpi.num_clienti}, Prodotti: ${kpi.num_prodotti}`);
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
   * Carica i dati dalla cache
   */
  loadCachedData(): void {
    if (!this.hasCachedData) return;

    const pageCode = `salesDashboard_${this.formId}`;

    this.cacheLoading = true;
    this.gtsDataService.sendAppLoaderListener(true);

    // Cache condivisa tra tutti gli utenti (userId = 'shared')
    this.userDataService.loadExcelCache<ExcelRow[]>(this.prjId, pageCode, 'shared').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Processa i dati come se fossero stati caricati da Excel
          this.processExcelData(response.data);

          // Popola anche la grid se necessario
          const validData = response.data.filter((row: ExcelRow) => row.kg != null && row.valore != null);
          const gridRows = validData.map((row: ExcelRow, index: number) => {
            let dataDate: Date | null = null;
            let dataStr = '';

            try {
              if (row.data instanceof Date && !isNaN(row.data.getTime())) {
                dataDate = row.data;
              } else if (typeof row.data === 'number') {
                dataDate = this.excelDateToJS(row.data);
              } else if (row.data) {
                dataDate = new Date(row.data as string);
              }

              if (dataDate && !isNaN(dataDate.getTime())) {
                dataStr = dataDate.toISOString().split('T')[0];
              }
            } catch {
              // Invalid date
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

          this.gtsDataService.setPageDataSet(
            this.prjId,
            this.formId,
            'daDummy',
            'qDummy',
            gridRows
          );
          this.gtsDataService.sendGridReload('qDummy');
        }
      },
      error: (err) => {
        console.error('Error loading cached data:', err);
        this.showError(this.t(1551, 'Errore nel caricamento dei dati dalla cache'));
      },
      complete: () => {
        this.cacheLoading = false;
        this.gtsDataService.sendAppLoaderListener(false);
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

  updateYearOptions(): void {
    if (!this.dashboardData) return;

    // Extract unique years from trend data
    const years = new Set<string>();
    this.dashboardData.trend_mensile.forEach(t => {
      const year = t.periodo.split('-')[0];
      years.add(year);
    });

    // Sort years descending
    const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));

    // Build options
    this._yearOptions = [
      { label: this.t(1518, 'Tutti gli anni'), value: 'all' },
      ...sortedYears.map(year => ({ label: year, value: year }))
    ];

    // Reset selection to 'all'
    this.selectedYear = 'all';
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
    dialogTitle: 'AI Analyzer - Sales Data'
  };
  pendingOpenAnalyzer: boolean = false; // Flag per aprire analyzer dopo caricamento dati

  // ============================================
  // AI DATA ANALYZER (Embedded nella dashboard)
  // ============================================

  showAiAnalyzer: boolean = false;
  aiAnalyzerLoading: boolean = false;
  aiAnalyzerRequest: string = '';
  aiAnalyzerChartType: string = 'bar';
  aiAnalyzerMaxResults: number = 10;
  aiAnalyzerError: string = '';
  aiPanelCollapsed: boolean = false;

  // Risultati dell'analisi AI
  aiAnalysisResult: any = null;
  aiAggregatedData: any[] = [];
  aiResultChart: any = null;

  // Opzioni per il tipo di grafico (con traduzioni)
  get chartTypeOptions() {
    return [
      { label: this.t(1543, 'Barre'), value: 'bar', icon: 'pi pi-chart-bar' },
      { label: this.t(1544, 'Linea'), value: 'line', icon: 'pi pi-chart-line' },
      { label: this.t(1545, 'Torta'), value: 'pie', icon: 'pi pi-chart-pie' },
      { label: this.t(1546, 'Ciambella'), value: 'doughnut', icon: 'pi pi-circle' },
      { label: this.t(1547, 'Area'), value: 'area', icon: 'pi pi-chart-line' }
    ];
  }

  // Opzioni per numero risultati
  maxResultsOptions = [
    { label: '5', value: 5 },
    { label: '10', value: 10 },
    { label: '15', value: 15 },
    { label: '20', value: 20 },
    { label: '50', value: 50 }
  ];

  // Analisi salvate
  savedAnalyses: any[] = [];
  showSavedAnalyses: boolean = false;

  // Dialog salvataggio analisi
  showSaveDialog: boolean = false;
  saveAnalysisName: string = '';

  // Retry & Validation state
  aiRetryCount: number = 0;
  aiMaxRetries: number = 2;
  aiLastValidationErrors: string[] = [];
  aiShowFeedbackButtons: boolean = false;
  aiOriginalRequest: string = '';

  /**
   * Apre il dialog dell'AI Analyzer
   */
  openAiAnalyzer(): void {
    if (!this.rawExcelData || this.rawExcelData.length === 0) {
      this.showWarning(this.t(1548, 'Carica prima un file Excel con i dati di vendita'));
      return;
    }
    this.showAiAnalyzer = true;
    this.aiAnalyzerError = '';
    this.aiAnalysisResult = null;
    this.aiAggregatedData = [];
    this.aiResultChart = null;
  }

  /**
   * Chiude il dialog dell'AI Analyzer
   */
  closeAiAnalyzer(): void {
    this.showAiAnalyzer = false;
  }

  /**
   * Estrae lo schema dei dati dall'array Excel per inviarlo all'AI
   * NON invia i dati sensibili, solo i nomi dei campi e i tipi
   */
  private getDataSchema(): { fields: Array<{ name: string; type: 'string' | 'number' | 'date' | 'boolean'; sample?: any; description?: string }> } {
    if (!this.rawExcelData || this.rawExcelData.length === 0) {
      return { fields: [] };
    }

    const sampleRow = this.rawExcelData[0];
    const fields: Array<{ name: string; type: 'string' | 'number' | 'date' | 'boolean'; sample?: any; description?: string }> = [];

    // Mappa i campi dell'interfaccia ExcelRow
    const fieldDescriptions: Record<string, string> = {
      'data': 'Data della transazione',
      'Anno': 'Anno della transazione',
      'Mese': 'Mese della transazione (1-12)',
      'kg': 'Quantità in chilogrammi',
      'valore': 'Valore della vendita in euro',
      'totale costi': 'Costi totali in euro',
      'delta': 'Margine (valore - costi)',
      'num doc': 'Numero documento/ordine',
      'Clienti': 'Nome del cliente',
      'Prodotto': 'Nome del prodotto',
      'CATEGORIA': 'Categoria del prodotto',
      'famiglia': 'Famiglia del prodotto'
    };

    for (const [key, value] of Object.entries(sampleRow)) {
      let fieldType: 'string' | 'number' | 'date' | 'boolean' = 'string';

      if (typeof value === 'number') {
        fieldType = 'number';
      } else if (typeof value === 'boolean') {
        fieldType = 'boolean';
      } else if (value instanceof Date) {
        fieldType = 'date';
      } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        fieldType = 'date';
      }

      // Anonimizza il sample per i campi sensibili
      let sampleValue = value;
      if (key === 'Clienti' || key === 'num doc') {
        sampleValue = fieldType === 'string' ? '***' : 0;
      }

      fields.push({
        name: key,
        type: fieldType,
        sample: sampleValue,
        description: fieldDescriptions[key] || undefined
      });
    }

    return { fields };
  }

  /**
   * Genera l'analisi AI
   */
  async generateAiAnalysis(): Promise<void> {
    if (!this.aiAnalyzerRequest.trim()) {
      this.aiAnalyzerError = this.t(1549, 'Inserisci una richiesta di analisi');
      return;
    }

    // Reset retry state for new analysis
    this.aiRetryCount = 0;
    this.aiLastValidationErrors = [];
    this.aiShowFeedbackButtons = false;
    this.aiOriginalRequest = this.aiAnalyzerRequest;

    await this.executeAiAnalysis();
  }

  /**
   * Esegue l'analisi AI (usata sia per prima richiesta che per retry)
   */
  private async executeAiAnalysis(retryContext?: { errorType: string; errorMessage: string; previousRules: any }): Promise<void> {
    this.aiAnalyzerLoading = true;
    this.aiAnalyzerError = '';
    this.aiAnalysisResult = null;
    this.aiAggregatedData = [];
    this.aiResultChart = null;
    this.aiShowFeedbackButtons = false;

    try {
      const dataSchema = this.getDataSchema();

      // Chiama l'API con supporto retry
      const result = await this.aiReportsService.generateDataAnalysisRulesWithRetry({
        userRequest: this.aiOriginalRequest || this.aiAnalyzerRequest,
        dataSchema: dataSchema,
        chartType: this.aiAnalyzerChartType as any,
        maxResults: this.aiAnalyzerMaxResults,
        prjId: this.prjId,
        retryContext: retryContext
      }).toPromise();

      if (result) {
        this.aiAnalysisResult = result;

        // Normalizza la gridConfig per tipi e allineamenti corretti
        this.normalizeGridConfig(result);

        // Applica le regole di aggregazione ai dati locali
        this.aiAggregatedData = this.applyAggregationRules(this.rawExcelData, result);

        // Se pivotByYear con anni definiti, rigenera gridConfig con i campi corretti
        const pivotYears = result.aggregationRule?.pivotByYear?.years;
        if (pivotYears && pivotYears.length >= 2) {
          this.adaptGridConfigForPivot(result);
        }

        // Valida i risultati
        const validationResult = this.validateAiResults(this.aiAggregatedData, result);

        if (!validationResult.valid) {
          // Validazione fallita
          this.aiLastValidationErrors = validationResult.errors;

          if (this.aiRetryCount < this.aiMaxRetries) {
            // Retry automatico
            this.aiRetryCount++;
            console.warn(`[AI Analyzer] Validation failed (attempt ${this.aiRetryCount}/${this.aiMaxRetries}):`, validationResult.errors);

            // Retry con contesto errore
            await this.executeAiAnalysis({
              errorType: validationResult.errorType || 'validation_failed',
              errorMessage: validationResult.errors.join('; '),
              previousRules: result.aggregationRule
            });
            return;
          } else {
            // Max retry raggiunto - mostra errore e bottoni feedback
            this.aiAnalyzerError = this.t(1598, 'I dati generati potrebbero non essere corretti:') + ' ' + validationResult.errors.join(', ');
            this.aiShowFeedbackButtons = true;
          }
        } else {
          // Validazione OK - mostra bottoni feedback per conferma
          this.aiShowFeedbackButtons = true;
        }

        // Prepara il grafico
        this.prepareAiResultChart(result);
      }

    } catch (error: any) {
      console.error('AI Analysis error:', error);
      this.aiAnalyzerError = error.message || this.t(1550, 'Errore durante la generazione dell\'analisi');
    } finally {
      this.aiAnalyzerLoading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Valida i risultati dell'analisi AI
   * Rileva NaN, risultati vuoti, errori strutturali
   */
  private validateAiResults(data: any[], rules: any): { valid: boolean; errors: string[]; errorType?: string } {
    const errors: string[] = [];
    let errorType: string | undefined;

    // 1. Check risultati vuoti
    if (!data || data.length === 0) {
      errors.push(this.t(1599, 'Nessun risultato trovato per questa richiesta'));
      errorType = 'empty_results';
      return { valid: false, errors, errorType };
    }

    // 2. Check NaN values
    const numericColumns = rules?.gridConfig?.columns?.filter((c: any) =>
      c.type === 'number' || c.type === 'currency'
    ) || [];

    let hasNaN = false;
    let nanFields: string[] = [];

    for (const row of data) {
      for (const col of numericColumns) {
        const value = row[col.field];
        if (value !== undefined && value !== null && typeof value === 'number' && isNaN(value)) {
          hasNaN = true;
          if (!nanFields.includes(col.field)) {
            nanFields.push(col.field);
          }
        }
      }
    }

    if (hasNaN) {
      errors.push(this.t(1600, 'Valori NaN rilevati nei campi:') + ' ' + nanFields.join(', '));
      errorType = 'nan_values';
    }

    // 3. Check tutti zeri (possibile errore di aggregazione)
    const hasAllZeros = numericColumns.length > 0 && data.every(row =>
      numericColumns.every((col: any) => {
        const value = row[col.field];
        return value === 0 || value === undefined || value === null;
      })
    );

    if (hasAllZeros && data.length > 1) {
      errors.push(this.t(1601, 'Tutti i valori numerici sono zero - possibile errore di aggregazione'));
      errorType = errorType || 'all_zeros';
    }

    // 4. Check pivotByYear con groupBy mancante
    if (rules?.aggregationRule?.pivotByYear) {
      const yearField = rules.aggregationRule.pivotByYear.yearField;
      const groupBy = rules.aggregationRule.groupBy || [];

      if (yearField && !groupBy.includes(yearField)) {
        errors.push(this.t(1602, 'Confronto anno su anno richiede il campo Anno nel groupBy'));
        errorType = errorType || 'missing_year_groupby';
      }
    }

    // 5. Check colonne mancanti nel risultato
    const expectedColumns = rules?.gridConfig?.columns?.map((c: any) => c.field) || [];
    if (data.length > 0 && expectedColumns.length > 0) {
      const actualColumns = Object.keys(data[0]);
      const missingColumns = expectedColumns.filter((col: string) => !actualColumns.includes(col));

      if (missingColumns.length > 0) {
        errors.push(this.t(1603, 'Colonne mancanti nei risultati:') + ' ' + missingColumns.join(', '));
        errorType = errorType || 'missing_columns';
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      errorType
    };
  }

  /**
   * Conferma che i dati sono corretti - salva come esempio per auto-learning
   */
  async confirmDataCorrect(): Promise<void> {
    if (!this.aiAnalysisResult) return;

    try {
      const result = await this.aiReportsService.learnFromSuccess({
        userRequest: this.aiOriginalRequest || this.aiAnalyzerRequest,
        aggregationRule: this.aiAnalysisResult.aggregationRule,
        chartConfig: this.aiAnalysisResult.chartConfig,
        gridConfig: this.aiAnalysisResult.gridConfig,
        explanation: this.aiAnalysisResult.explanation,
        prjId: this.prjId
      }).toPromise();

      if (result?.success) {
        // Nascondi i bottoni feedback
        this.aiShowFeedbackButtons = false;
        // Mostra conferma breve
        this.aiAnalyzerError = ''; // Clear any previous error
        console.log('[AI Analyzer] Example saved for auto-learning:', result.action);
      }
    } catch (error: any) {
      console.warn('[AI Analyzer] Failed to save example:', error.message);
      // Non mostrare errore all'utente - è un'operazione di background
    }
  }

  /**
   * Segnala che i dati non sono corretti - forza retry con contesto
   */
  async reportDataIncorrect(): Promise<void> {
    if (!this.aiAnalysisResult) return;

    // Incrementa retry count
    this.aiRetryCount++;

    if (this.aiRetryCount <= this.aiMaxRetries + 1) { // +1 per retry manuale
      // Retry con contesto errore fornito dall'utente
      await this.executeAiAnalysis({
        errorType: 'user_reported_incorrect',
        errorMessage: 'L\'utente ha segnalato che i dati non sono corretti. La precedente aggregazione non ha prodotto risultati attesi.',
        previousRules: this.aiAnalysisResult.aggregationRule
      });
    } else {
      this.aiAnalyzerError = this.t(1604, 'Numero massimo di tentativi raggiunto. Prova a riformulare la richiesta.');
      this.aiShowFeedbackButtons = false;
    }
  }

  /**
   * Applica le regole di aggregazione ai dati locali
   * Questa logica gira SOLO nel browser, i dati NON vengono inviati al server
   */
  private applyAggregationRules(data: ExcelRow[], rules: any): any[] {
    if (!Array.isArray(data) || data.length === 0 || !rules?.aggregationRule) {
      return [];
    }

    const { groupBy, aggregations, sortBy, filters, limit, pivotByYear } = rules.aggregationRule;

    let result = [...data] as any[];

    // 1. Applica filtri
    if (filters && filters.length > 0) {
      result = result.filter(row => {
        return filters.every((filter: any) => {
          const value = row[filter.field];
          const filterValue = filter.value;

          switch (filter.operator) {
            case 'eq': return value == filterValue;
            case 'ne': return value != filterValue;
            case 'gt': return value > filterValue;
            case 'lt': return value < filterValue;
            case 'gte': return value >= filterValue;
            case 'lte': return value <= filterValue;
            case 'contains':
              return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
            case 'startsWith':
              return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
            case 'endsWith':
              return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
            case 'in':
              return Array.isArray(filterValue) && filterValue.includes(value);
            case 'between':
              return Array.isArray(filterValue) && value >= filterValue[0] && value <= filterValue[1];
            default:
              return true;
          }
        });
      });
    }

    // 2. Raggruppa
    if (groupBy && groupBy.length > 0) {
      const groups = new Map<string, { groupData: any; rows: any[] }>();

      result.forEach(row => {
        const key = groupBy.map((field: string) => row[field]).join('|||');

        if (!groups.has(key)) {
          const groupData: any = {};
          groupBy.forEach((field: string) => {
            groupData[field] = row[field];
          });
          groups.set(key, { groupData, rows: [] });
        }

        groups.get(key)!.rows.push(row);
      });

      // 3. Applica aggregazioni
      result = Array.from(groups.values()).map(group => {
        const aggregated = { ...group.groupData };

        if (aggregations && aggregations.length > 0) {
          aggregations.forEach((agg: any) => {
            const alias = agg.alias || agg.field;
            const values = group.rows
              .map(r => r[agg.field])
              .filter(v => v !== undefined && v !== null);

            switch (agg.operation) {
              case 'sum':
                aggregated[alias] = values.reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
                break;
              case 'avg':
                aggregated[alias] = values.length > 0
                  ? values.reduce((sum, v) => sum + (parseFloat(v) || 0), 0) / values.length
                  : 0;
                break;
              case 'count':
                aggregated[alias] = group.rows.length;
                break;
              case 'min':
                aggregated[alias] = Math.min(...values.map(v => parseFloat(v) || 0));
                break;
              case 'max':
                aggregated[alias] = Math.max(...values.map(v => parseFloat(v) || 0));
                break;
              case 'first':
                aggregated[alias] = values[0];
                break;
              case 'last':
                aggregated[alias] = values[values.length - 1];
                break;
              case 'concat':
                aggregated[alias] = values.join(agg.separator || ', ');
                break;
            }
          });
        }

        return aggregated;
      });
    }

    // 4. Ordina
    if (sortBy && sortBy.field) {
      const field = sortBy.field;
      const order = sortBy.order === 'desc' ? -1 : 1;

      result.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];

        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * order;
        }

        return String(valA).localeCompare(String(valB)) * order;
      });
    }

    // 5. Pivot by Year (per confronti anno su anno)
    if (pivotByYear && pivotByYear.yearField && pivotByYear.years && pivotByYear.years.length > 0) {
      const { yearField, years, baseYear } = pivotByYear;

      // Deduce metrics da pivotByYear.metrics o dalle aggregations
      let metrics = pivotByYear.metrics || [];
      if ((!metrics || metrics.length === 0) && aggregations && aggregations.length > 0) {
        metrics = aggregations.map((agg: any) => agg.alias || agg.field);
        console.log('[applyAggregationRules] Deduced metrics from aggregations:', metrics);
      }

      console.log('[applyAggregationRules] Pivot config:', { yearField, years, metrics, groupBy });
      console.log('[applyAggregationRules] Result before pivot (first 2):', result.slice(0, 2));

      const pivotedMap = new Map<string, any>();

      // Raggruppa per chiave (escludendo l'anno) e anno
      result.forEach(row => {
        // Crea chiave senza anno
        const keyFields = groupBy.filter((f: string) => f !== yearField);
        const key = keyFields.map((f: string) => row[f]).join('|||');
        // Normalizza anno a numero per match corretto
        const year = typeof row[yearField] === 'string' ? parseInt(row[yearField], 10) : row[yearField];

        if (!pivotedMap.has(key)) {
          const pivotedRow: any = {};
          keyFields.forEach((f: string) => {
            pivotedRow[f] = row[f];
          });
          pivotedMap.set(key, pivotedRow);
        }

        const pivotedRow = pivotedMap.get(key);

        // Aggiungi valori con suffisso anno
        (metrics || []).forEach((metric: string) => {
          const fieldName = `${metric}_${year}`;
          pivotedRow[fieldName] = row[metric] || 0;
        });
      });

      // Converti in array e calcola variazioni
      result = Array.from(pivotedMap.values()).map(row => {
        // Calcola variazioni percentuali per ogni metrica
        (metrics || []).forEach((metric: string) => {
          const currentYear = baseYear || years[0];
          const previousYear = years.find((y: number) => y !== currentYear) || years[1];

          const currentValue = row[`${metric}_${currentYear}`] || 0;
          const previousValue = row[`${metric}_${previousYear}`] || 0;

          if (previousValue !== 0) {
            // Arrotonda a 2 decimali
            row[`${metric}_variazione`] = Math.round(((currentValue - previousValue) / previousValue) * 10000) / 100;
          } else {
            row[`${metric}_variazione`] = currentValue > 0 ? 100 : 0;
          }
        });

        return row;
      });

      // Riordina per il campo base dell'anno principale
      if (sortBy && sortBy.field && metrics && metrics.length > 0) {
        const baseSortField = sortBy.field;
        const baseYearValue = baseYear || years[0];
        const sortField = `${baseSortField}_${baseYearValue}`;
        const order = sortBy.order === 'desc' ? -1 : 1;

        result.sort((a, b) => {
          const valA = a[sortField] || 0;
          const valB = b[sortField] || 0;
          return (valA - valB) * order;
        });
      }

      console.log('[applyAggregationRules] Result AFTER pivot (first 2):', result.slice(0, 2));
    }

    // 6. Limita risultati
    if (limit && limit > 0) {
      result = result.slice(0, limit);
    }

    return result;
  }

  /**
   * Normalizza la gridConfig assegnando tipi corretti alle colonne
   * basandosi sulle aggregations e sui nomi dei campi
   */
  private normalizeGridConfig(result: any): void {
    if (!result.gridConfig?.columns) return;

    const aggregations = result.aggregationRule?.aggregations || [];
    const groupBy = result.aggregationRule?.groupBy || [];

    // Mappa dei campi aggregati (sono numerici)
    const aggregatedFields = new Set(aggregations.map((agg: any) => agg.alias || agg.field));

    // Campi che sono tipicamente valuta
    const currencyPatterns = ['valore', 'importo', 'fatturato', 'costo', 'costi', 'prezzo', 'delta', 'margine', 'euro', '€'];
    const isCurrencyField = (field: string): boolean => {
      const lower = field.toLowerCase();
      return currencyPatterns.some(p => lower.includes(p));
    };

    result.gridConfig.columns = result.gridConfig.columns.map((col: any) => {
      const field = col.field;
      const isGroupByField = groupBy.includes(field);
      const isAggregatedField = aggregatedFields.has(field);

      // Se è un campo groupBy (stringa), tipo text
      if (isGroupByField && !isAggregatedField) {
        return {
          ...col,
          type: col.type || 'text',
          align: col.align || 'left'
        };
      }

      // Se è un campo aggregato, determina se è currency o number
      if (isAggregatedField) {
        const isCurrency = isCurrencyField(field);
        return {
          ...col,
          type: isCurrency ? 'currency' : 'number',
          align: 'right'
        };
      }

      // Fallback: cerca di dedurre dal nome del campo
      if (isCurrencyField(field)) {
        return { ...col, type: 'currency', align: 'right' };
      }

      // Se il campo contiene kg, quantita, numero - è un number
      const numberPatterns = ['kg', 'quantita', 'qty', 'num', 'count', 'totale'];
      const lower = field.toLowerCase();
      if (numberPatterns.some(p => lower.includes(p))) {
        return { ...col, type: 'number', align: 'right' };
      }

      return col;
    });

    console.log('[normalizeGridConfig] Normalized columns:', result.gridConfig.columns);
  }

  /**
   * Adatta la gridConfig per i dati pivot by year
   * Rigenera le colonne con i nomi corretti (campo_anno)
   */
  private adaptGridConfigForPivot(result: any): void {
    const pivotByYear = result.aggregationRule?.pivotByYear;
    if (!pivotByYear) return;

    const years = pivotByYear.years || [];

    // Se years è vuoto, non è un vero pivot - non modificare gridConfig
    if (years.length === 0) {
      console.log('[adaptGridConfigForPivot] Skipping - no years defined');
      return;
    }

    const aggregations = result.aggregationRule?.aggregations || [];
    const groupBy = result.aggregationRule?.groupBy || [];
    const yearField = pivotByYear.yearField;

    // Deriva metrics da pivotByYear.metrics o dalle aggregations
    let metrics = pivotByYear.metrics || [];
    if (metrics.length === 0 && aggregations.length > 0) {
      metrics = aggregations.map((agg: any) => agg.alias || agg.field);
    }

    // Se ancora vuoto, prova a dedurre dai dati aggregati
    if (metrics.length === 0 && this.aiAggregatedData.length > 0) {
      const firstRow = this.aiAggregatedData[0];
      const allFields = Object.keys(firstRow);
      // Trova campi che hanno il pattern _anno (es. totaleKg_2025)
      const yearPattern = new RegExp(`_${years[0]}$`);
      metrics = allFields
        .filter(f => yearPattern.test(f))
        .map(f => f.replace(yearPattern, ''));
    }

    // Se ancora vuoto, usa i dati aggregati per dedurre i metrics
    if (metrics.length === 0 && this.aiAggregatedData.length > 0) {
      const firstRow = this.aiAggregatedData[0];
      console.log('[adaptGridConfigForPivot] First row keys:', Object.keys(firstRow));
    }

    console.log('[adaptGridConfigForPivot] years:', years, 'metrics:', metrics, 'groupBy:', groupBy);
    console.log('[adaptGridConfigForPivot] aiAggregatedData sample:', this.aiAggregatedData.length > 0 ? this.aiAggregatedData[0] : 'empty');

    // Trova i campi groupBy escluso l'anno
    const keyFields = groupBy.filter((f: string) => f !== yearField);

    // Crea nuove colonne
    const newColumns: any[] = [];

    // 1. Colonne per i campi chiave (groupBy senza anno)
    keyFields.forEach((field: string) => {
      newColumns.push({
        field: field,
        header: field,
        type: 'text'
      });
    });

    // 2. Colonne per ogni metrica per ogni anno
    metrics.forEach((metric: string) => {
      years.forEach((year: number) => {
        const fieldName = `${metric}_${year}`;
        // Determina il tipo e header leggibile
        const isKg = metric.toLowerCase().includes('kg');
        const isValore = metric.toLowerCase().includes('valore') || metric.toLowerCase().includes('importo');

        newColumns.push({
          field: fieldName,
          header: isKg ? `Kg ${year}` : isValore ? `€ ${year}` : `${metric} ${year}`,
          type: isValore ? 'currency' : 'number'
        });
      });

      // Aggiungi colonna variazione per questa metrica
      const isKg = metric.toLowerCase().includes('kg');
      const isValore = metric.toLowerCase().includes('valore') || metric.toLowerCase().includes('importo');
      newColumns.push({
        field: `${metric}_variazione`,
        header: isKg ? `Var. Kg %` : isValore ? `Var. € %` : `Var. %`,
        type: 'number'
      });
    });

    console.log('[adaptGridConfigForPivot] newColumns:', newColumns);

    // Aggiorna la gridConfig
    result.gridConfig = result.gridConfig || {};
    result.gridConfig.columns = newColumns;

    // Aggiorna anche il titolo del grafico con anni chiari
    if (result.chartConfig && years.length >= 2) {
      const mainMetric = metrics[0] || '';
      const isKg = mainMetric.toLowerCase().includes('kg');
      const isValore = mainMetric.toLowerCase().includes('valore') || mainMetric.toLowerCase().includes('importo');
      const metricLabel = isKg ? 'Kg' : isValore ? 'Valore €' : mainMetric;
      result.chartConfig.title = `${metricLabel}: ${years[0]} vs ${years[1]}`;
    }
  }

  /**
   * Prepara il grafico dai risultati dell'analisi
   * Supporta grafici multi-serie con doppio asse Y
   */
  private prepareAiResultChart(result: any): void {
    if (!this.aiAggregatedData || this.aiAggregatedData.length === 0 || !result.chartConfig) {
      return;
    }

    const config = result.chartConfig;
    const aggregations = result.aggregationRule?.aggregations || [];
    const pivotByYear = result.aggregationRule?.pivotByYear;
    const xField = config.xAxis?.field;

    if (!xField) return;

    const labels = this.aiAggregatedData.map(d => this.truncateText(String(d[xField] || ''), 25));
    const colors = config.colors || ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC', '#26A69A', '#5C6BC0', '#EC407A', '#78909C', '#8D6E63'];

    // Determina il tipo di grafico
    const chartType = config.type || this.aiAnalyzerChartType;

    // Filtra aggregazioni numeriche (escludi count se presente con altre)
    const numericAggregations = aggregations.filter((agg: any) =>
      agg.operation === 'sum' || agg.operation === 'avg' || agg.operation === 'min' || agg.operation === 'max'
    );

    if (chartType === 'pie' || chartType === 'doughnut') {
      // Pie/Doughnut supporta solo un dataset
      const yField = config.yAxis?.field || numericAggregations[0]?.alias;
      if (!yField) return;

      const values = this.aiAggregatedData.map(d => d[yField] || 0);
      this.aiResultChart = {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, values.length)
        }]
      };
    } else if (pivotByYear && pivotByYear.years && pivotByYear.years.length >= 2) {
      // CASO PIVOT BY YEAR - confronto anno su anno
      // I campi nei dati hanno suffisso _anno (es. totaleKg_2025, totaleKg_2024)
      const datasets: any[] = [];
      const years = pivotByYear.years;

      // Deduce metrics se non presenti
      let metrics = pivotByYear.metrics || [];
      if (metrics.length === 0 && numericAggregations.length > 0) {
        metrics = numericAggregations.map((a: any) => a.alias || a.field);
      }

      // Se ancora vuoto, prova a dedurre dai dati
      if (metrics.length === 0 && this.aiAggregatedData.length > 0) {
        const firstRow = this.aiAggregatedData[0];
        const yearPattern = new RegExp(`_${years[0]}$`);
        metrics = Object.keys(firstRow)
          .filter(f => yearPattern.test(f))
          .map(f => f.replace(yearPattern, ''));
      }

      console.log('[prepareAiResultChart] PIVOT BY YEAR - years:', years, 'metrics:', metrics);

      // Genera label leggibile per la metrica
      const getReadableLabel = (metric: string, year: number): string => {
        const isKg = metric.toLowerCase().includes('kg');
        const isValore = metric.toLowerCase().includes('valore') || metric.toLowerCase().includes('importo');
        if (isKg) return `Kg ${year}`;
        if (isValore) return `€ ${year}`;
        return `${metric} ${year}`;
      };

      // Colori per distinguere anni: blu per anno più recente, arancione per anno precedente
      const yearColors = ['#42A5F5', '#FFA726', '#66BB6A', '#EF5350'];

      // Per un confronto chiaro, mostriamo ogni metrica con entrambi gli anni
      // Se ci sono 2 metriche (Kg e Valore), usiamo doppio asse Y
      const useDualAxis = metrics.length >= 2;

      metrics.forEach((metric: string, metricIdx: number) => {
        years.forEach((year: number, yearIdx: number) => {
          const fieldName = `${metric}_${year}`;
          const values = this.aiAggregatedData.map(d => d[fieldName] || 0);
          const label = getReadableLabel(metric, year);

          // Colore: combina indice metrica e anno per varietà
          const colorIdx = metricIdx * 2 + yearIdx;

          datasets.push({
            label: label,
            data: values,
            backgroundColor: yearColors[colorIdx % yearColors.length],
            borderColor: yearColors[colorIdx % yearColors.length],
            // Se doppio asse, prima metrica su y, seconda su y1
            yAxisID: useDualAxis && metricIdx === 1 ? 'y1' : 'y',
            tension: 0.4,
            fill: chartType === 'area',
            order: colorIdx
          });
        });
      });

      this.aiResultChart = {
        labels: labels,
        datasets: datasets
      };

      console.log('[prepareAiResultChart] Created pivot chart with', datasets.length, 'datasets');
    } else if (numericAggregations.length >= 2) {
      // Multi-serie con doppio asse Y per bar/line verticale
      const datasets: any[] = [];

      numericAggregations.slice(0, 2).forEach((agg: any, index: number) => {
        const alias = agg.alias || agg.field;
        const values = this.aiAggregatedData.map(d => d[alias] || 0);

        // Trova la label dalla gridConfig se disponibile
        const colConfig = result.gridConfig?.columns?.find((c: any) => c.field === alias);
        const label = colConfig?.header || alias;

        datasets.push({
          label: label,
          data: values,
          backgroundColor: index === 0 ? colors[0] : colors[1],
          borderColor: index === 0 ? colors[0] : colors[1],
          yAxisID: index === 0 ? 'y' : 'y1',
          tension: 0.4,
          fill: chartType === 'area',
          order: index
        });
      });

      this.aiResultChart = {
        labels: labels,
        datasets: datasets
      };
    } else {
      // Singola serie - bar, line, area
      const yField = config.yAxis?.field || numericAggregations[0]?.alias;
      if (!yField) return;

      const values = this.aiAggregatedData.map(d => d[yField] || 0);

      this.aiResultChart = {
        labels: labels,
        datasets: [{
          label: config.yAxis?.label || yField,
          data: values,
          backgroundColor: chartType === 'line' || chartType === 'area'
            ? 'rgba(66, 165, 245, 0.2)'
            : colors[0],
          borderColor: colors[0],
          tension: 0.4,
          fill: chartType === 'area'
        }]
      };
    }

    this.cdr.detectChanges();
  }

  /**
   * Verifica se il grafico corrente ha doppio asse Y
   */
  private hasDualAxis(): boolean {
    const aggregations = this.aiAnalysisResult?.aggregationRule?.aggregations || [];
    const pivotByYear = this.aiAnalysisResult?.aggregationRule?.pivotByYear;
    const chartType = this.aiAnalysisResult?.chartConfig?.type || this.aiAnalyzerChartType;

    if (chartType === 'pie' || chartType === 'doughnut') return false;

    // Per pivot by year, doppio asse se ci sono 2+ metriche
    if (pivotByYear) {
      let metrics = pivotByYear.metrics || [];
      if (metrics.length === 0 && aggregations.length > 0) {
        metrics = aggregations.map((agg: any) => agg.alias || agg.field);
      }
      return metrics.length >= 2;
    }

    const numericAggregations = aggregations.filter((agg: any) =>
      agg.operation === 'sum' || agg.operation === 'avg' || agg.operation === 'min' || agg.operation === 'max'
    );

    return numericAggregations.length >= 2;
  }

  /**
   * Verifica se è un grafico pivot by year
   */
  private isPivotByYear(): boolean {
    const pivotByYear = this.aiAnalysisResult?.aggregationRule?.pivotByYear;
    return pivotByYear && pivotByYear.years && pivotByYear.years.length >= 2;
  }

  /**
   * Ottiene le opzioni del grafico AI in base al tipo
   */
  getAiChartOptions(): any {
    const chartType = this.aiAnalysisResult?.chartConfig?.type || this.aiAnalyzerChartType;
    const gridConfig = this.aiAnalysisResult?.gridConfig;

    // Disabilita click (solo hover per tooltip), nessuna animazione
    const noAnimationOptions = {
      animation: false,
      events: ['mousemove', 'mouseout']  // Escludi 'click' e 'mousedown'
    };

    if (chartType === 'pie' || chartType === 'doughnut') {
      return { ...this.pieChartOptions, ...noAnimationOptions };
    }

    // Caso speciale: Pivot by Year (confronto anni)
    if (this.isPivotByYear()) {
      const pivotByYear = this.aiAnalysisResult?.aggregationRule?.pivotByYear;
      const aggregations = this.aiAnalysisResult?.aggregationRule?.aggregations || [];

      let metrics = pivotByYear.metrics || [];
      if (metrics.length === 0 && aggregations.length > 0) {
        metrics = aggregations.map((agg: any) => agg.alias || agg.field);
      }

      const useDualAxis = metrics.length >= 2;

      // Label per gli assi basate sulle metriche
      const getMetricLabel = (metric: string): string => {
        const isKg = metric.toLowerCase().includes('kg');
        const isValore = metric.toLowerCase().includes('valore') || metric.toLowerCase().includes('importo');
        if (isKg) return 'Kg';
        if (isValore) return 'Valore €';
        return metric;
      };

      const leftLabel = getMetricLabel(metrics[0] || '');
      const rightLabel = metrics.length >= 2 ? getMetricLabel(metrics[1]) : '';

      return {
        ...noAnimationOptions,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context: any) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                if (label.includes('€') || label.toLowerCase().includes('valor')) {
                  return `${label}: ${this.formatCurrency(value)}`;
                }
                return `${label}: ${this.formatNumber(value, 0)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: leftLabel,
              font: { weight: 'bold' }
            },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              callback: (value: any) => this.formatNumber(value, 0)
            }
          },
          ...(useDualAxis ? {
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: rightLabel,
                font: { weight: 'bold' }
              },
              grid: { drawOnChartArea: false },
              ticks: {
                callback: (value: any) => this.formatCurrency(value)
              }
            }
          } : {})
        }
      };
    }

    // Controlla se abbiamo doppio asse Y (caso non-pivot)
    if (this.hasDualAxis()) {
      const aggregations = this.aiAnalysisResult?.aggregationRule?.aggregations || [];
      const numericAggs = aggregations.filter((agg: any) =>
        agg.operation === 'sum' || agg.operation === 'avg' || agg.operation === 'min' || agg.operation === 'max'
      );

      // Trova le label per gli assi
      const getAxisLabel = (alias: string) => {
        const col = gridConfig?.columns?.find((c: any) => c.field === alias);
        return col?.header || alias;
      };

      const leftLabel = getAxisLabel(numericAggs[0]?.alias);
      const rightLabel = getAxisLabel(numericAggs[1]?.alias);

      return {
        ...noAnimationOptions,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context: any) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                // Se contiene € o valuta, formatta come currency
                if (label.toLowerCase().includes('valor') || label.toLowerCase().includes('€') || label.toLowerCase().includes('fatturato')) {
                  return `${label}: ${this.formatCurrency(value)}`;
                }
                return `${label}: ${this.formatNumber(value, 2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: leftLabel,
              font: { weight: 'bold' }
            },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              callback: (value: any) => this.formatNumber(value, 0)
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: rightLabel,
              font: { weight: 'bold' }
            },
            grid: { drawOnChartArea: false },
            ticks: {
              callback: (value: any) => {
                // Se sembra una valuta, formatta come tale
                if (rightLabel.toLowerCase().includes('valor') || rightLabel.toLowerCase().includes('€')) {
                  return this.formatCurrency(value);
                }
                return this.formatNumber(value, 0);
              }
            }
          }
        }
      };
    }

    // Singolo asse - bar orizzontale
    if (chartType === 'bar') {
      return {
        ...this.barChartOptions,
        ...noAnimationOptions,
        indexAxis: 'y'
      };
    }

    return { ...this.lineChartOptions, ...noAnimationOptions };
  }

  /**
   * Ottiene il tipo di grafico per p-chart
   */
  getAiChartType(): 'bar' | 'line' | 'scatter' | 'bubble' | 'pie' | 'doughnut' | 'polarArea' | 'radar' {
    const chartType = this.aiAnalysisResult?.chartConfig?.type || this.aiAnalyzerChartType;
    if (chartType === 'area') return 'line';
    // Mappa ai tipi supportati da PrimeNG Chart
    const validTypes = ['bar', 'line', 'scatter', 'bubble', 'pie', 'doughnut', 'polarArea', 'radar'];
    if (validTypes.includes(chartType)) {
      return chartType as 'bar' | 'line' | 'scatter' | 'bubble' | 'pie' | 'doughnut' | 'polarArea' | 'radar';
    }
    return 'bar'; // default
  }

  /**
   * Apre la dialog per salvare l'analisi corrente
   */
  openSaveDialog(): void {
    if (!this.aiAnalysisResult) {
      return;
    }
    // Pre-popola con il titolo del grafico o un default
    this.saveAnalysisName = this.aiAnalysisResult.chartConfig?.title || '';
    this.showSaveDialog = true;
  }

  /**
   * Chiude la dialog di salvataggio
   */
  closeSaveDialog(): void {
    this.showSaveDialog = false;
    this.saveAnalysisName = '';
  }

  /**
   * Salva l'analisi corrente su MongoDB
   */
  async saveCurrentAnalysis(): Promise<void> {
    if (!this.aiAnalysisResult || !this.saveAnalysisName.trim()) {
      return;
    }

    // Debug: verifica cosa stiamo salvando
    console.log('[saveCurrentAnalysis] Saving aggregationRule:', JSON.stringify(this.aiAnalysisResult.aggregationRule, null, 2));

    try {
      const result = await this.aiReportsService.saveDataAnalysis({
        prjId: this.prjId,
        analysisName: this.saveAnalysisName.trim(),
        description: this.aiAnalysisResult.explanation,
        dataContext: {
          datasetName: 'salesData',
          availableFields: this.getDataSchema().fields.map(f => ({ name: f.name, type: f.type }))
        },
        userRequest: this.aiAnalyzerRequest,
        aggregationRule: this.aiAnalysisResult.aggregationRule,
        chartConfig: this.aiAnalysisResult.chartConfig,
        gridConfig: this.aiAnalysisResult.gridConfig,
        createdBy: this.authService.getUserEmail() || 'unknown'
      }).toPromise();

      if (result?.success) {
        this.closeSaveDialog();
        this.showSuccess(this.t(1557, 'Analisi salvata con successo'));
      }
    } catch (error: any) {
      console.error('Save analysis error:', error);
      this.showError(this.t(1525, 'Errore durante il salvataggio:') + ' ' + (error.message || this.t(1526, 'Errore sconosciuto')));
    }
  }

  /**
   * Esporta l'analisi corrente in PDF
   * Include grafico (come immagine) e tabella dati formattata
   */
  exportAnalysisToPdf(): void {
    if (!this.aiAnalysisResult || this.aiAggregatedData.length === 0) {
      this.showWarning(this.t(1671, 'Nessuna analisi da esportare'));
      return;
    }

    try {
      // Crea documento PDF in formato A4 portrait
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // === HEADER ===
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const title = this.aiAnalysisResult.chartConfig?.title || this.t(1672, 'Analisi Dati');
      doc.text(title, margin, yPosition);
      yPosition += 10;

      // Sottotitolo con data
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      const dateStr = new Date().toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`${this.t(1673, 'Generato il')}: ${dateStr}`, margin, yPosition);
      yPosition += 8;

      // Descrizione analisi
      if (this.aiAnalysisResult.explanation) {
        doc.setTextColor(60);
        const explanationLines = doc.splitTextToSize(this.aiAnalysisResult.explanation, pageWidth - margin * 2);
        doc.text(explanationLines, margin, yPosition);
        yPosition += explanationLines.length * 5 + 5;
      }

      doc.setTextColor(0);

      // === GRAFICO ===
      // Estrai immagine dal chart Chart.js
      if (this.aiChartRef?.chart) {
        const chartCanvas = this.aiChartRef.chart.canvas;
        const chartImage = chartCanvas.toDataURL('image/png', 1.0);

        // Calcola dimensioni proporzionali del grafico
        const maxChartWidth = pageWidth - margin * 2;
        const maxChartHeight = 80; // mm
        const aspectRatio = chartCanvas.width / chartCanvas.height;

        let chartWidth = maxChartWidth;
        let chartHeight = chartWidth / aspectRatio;

        if (chartHeight > maxChartHeight) {
          chartHeight = maxChartHeight;
          chartWidth = chartHeight * aspectRatio;
        }

        // Centra il grafico
        const chartX = (pageWidth - chartWidth) / 2;
        doc.addImage(chartImage, 'PNG', chartX, yPosition, chartWidth, chartHeight);
        yPosition += chartHeight + 10;
      }

      // === TABELLA ===
      const columns = this.aiAnalysisResult.gridConfig?.columns || [];
      const tableColumns = columns.map((col: any) => ({
        header: col.header || col.field,
        dataKey: col.field
      }));

      // Prepara i dati formattati per la tabella
      const tableData = this.aiAggregatedData.map((row: any) => {
        const formattedRow: any = {};
        columns.forEach((col: any) => {
          const value = row[col.field];
          if (col.type === 'currency') {
            formattedRow[col.field] = this.formatCurrency(value);
          } else if (col.type === 'number') {
            formattedRow[col.field] = this.formatNumber(value, 2);
          } else {
            formattedRow[col.field] = value ?? '';
          }
        });
        return formattedRow;
      });

      // Mappa indici colonne numeriche per allineamento header
      const numericColumnIndices = new Set<number>();
      columns.forEach((col: any, index: number) => {
        if (col.type === 'currency' || col.type === 'number') {
          numericColumnIndices.add(index);
        }
      });

      // Genera la tabella con autoTable
      autoTable(doc, {
        startY: yPosition,
        head: [tableColumns.map((c: any) => c.header)],
        body: tableData.map((row: any) => tableColumns.map((c: any) => row[c.dataKey])),
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [6, 182, 212], // Cyan come il tema
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: this.getColumnStyles(columns),
        didParseCell: (data: any) => {
          // Allinea a destra sia header che body per colonne numeriche
          if (numericColumnIndices.has(data.column.index)) {
            data.cell.styles.halign = 'right';
          }
        },
        didDrawPage: (data: any) => {
          // Footer con numero pagina
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `${this.t(1674, 'Pagina')} ${data.pageNumber} / ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }
      });

      // Salva il PDF
      const fileName = this.sanitizeFileName(title) + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
      doc.save(fileName);

      this.showSuccess(this.t(1675, 'PDF esportato con successo'));

    } catch (error: any) {
      console.error('PDF export error:', error);
      this.showError(this.t(1676, 'Errore durante l\'esportazione PDF:') + ' ' + error.message);
    }
  }

  /**
   * Helper: genera gli stili delle colonne per autoTable
   */
  private getColumnStyles(columns: any[]): any {
    const styles: any = {};
    columns.forEach((col: any, index: number) => {
      if (col.type === 'currency' || col.type === 'number') {
        styles[index] = { halign: 'right' };
      }
    });
    return styles;
  }

  /**
   * Helper: sanitizza il nome file rimuovendo caratteri non validi
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9àèéìòù\s\-_]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }

  /**
   * Carica le analisi salvate
   */
  async loadSavedAnalyses(): Promise<void> {
    try {
      const result = await this.aiReportsService.listDataAnalyses(this.prjId).toPromise();
      // Backend returns array directly, not { analyses: [] }
      if (Array.isArray(result)) {
        this.savedAnalyses = result;
      } else if (result?.analyses) {
        this.savedAnalyses = result.analyses;
      } else {
        this.savedAnalyses = [];
      }
      this.showSavedAnalyses = true;
    } catch (error: any) {
      console.error('Load saved analyses error:', error);
      this.showError(this.t(1527, 'Errore durante il caricamento:') + ' ' + (error.message || this.t(1526, 'Errore sconosciuto')));
    }
  }

  /**
   * Applica un'analisi salvata
   */
  async applySavedAnalysis(analysis: any): Promise<void> {
    try {
      const fullAnalysis = await this.aiReportsService.getDataAnalysis(analysis._id).toPromise();
      if (fullAnalysis) {
        this.aiAnalyzerRequest = fullAnalysis.userRequest;
        this.aiAnalysisResult = {
          aggregationRule: fullAnalysis.aggregationRule,
          chartConfig: fullAnalysis.chartConfig,
          gridConfig: fullAnalysis.gridConfig,
          explanation: fullAnalysis.description
        };

        // Normalizza la gridConfig per tipi e allineamenti corretti
        this.normalizeGridConfig(this.aiAnalysisResult);

        // Debug: verifica aggregationRule caricata
        console.log('[applySavedAnalysis] Loaded aggregationRule:', JSON.stringify(this.aiAnalysisResult.aggregationRule, null, 2));

        // Applica l'aggregazione
        this.aiAggregatedData = this.applyAggregationRules(this.rawExcelData, this.aiAnalysisResult);

        // Debug: verifica dati e colonne
        console.log('[applySavedAnalysis] Aggregated data sample:', this.aiAggregatedData[0]);
        console.log('[applySavedAnalysis] Grid columns:', this.aiAnalysisResult.gridConfig?.columns);

        // Adatta gridConfig per pivot se necessario (solo se years ha valori)
        const pivotYears = this.aiAnalysisResult.aggregationRule?.pivotByYear?.years;
        if (pivotYears && pivotYears.length >= 2) {
          this.adaptGridConfigForPivot(this.aiAnalysisResult);
        }

        this.prepareAiResultChart(this.aiAnalysisResult);

        this.showSavedAnalyses = false;
        this.cdr.detectChanges();
      }
    } catch (error: any) {
      console.error('Apply saved analysis error:', error);
      this.showError(this.t(1528, 'Errore durante l\'applicazione:') + ' ' + (error.message || this.t(1526, 'Errore sconosciuto')));
    }
  }

  /**
   * Elimina un'analisi salvata (chiede conferma con dialog)
   */
  deleteSavedAnalysis(analysis: any, event: Event): void {
    event.stopPropagation();

    this.showConfirm(
      this.t(1529, 'Eliminare l\'analisi') + ` "${analysis.analysisName}"?`,
      this.t(1558, 'Conferma eliminazione'),
      async () => {
        try {
          await this.aiReportsService.deleteDataAnalysis(analysis._id).toPromise();
          this.savedAnalyses = this.savedAnalyses.filter(a => a._id !== analysis._id);
          this.showSuccess(this.t(1559, 'Analisi eliminata'));
        } catch (error: any) {
          console.error('Delete analysis error:', error);
          this.showError(this.t(1530, 'Errore durante l\'eliminazione:') + ' ' + (error.message || this.t(1526, 'Errore sconosciuto')));
        }
      }
    );
  }
}
