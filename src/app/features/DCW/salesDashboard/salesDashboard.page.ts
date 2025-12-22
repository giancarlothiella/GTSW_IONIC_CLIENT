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
import { Tooltip } from 'primeng/tooltip';
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
    Tooltip,
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
}
