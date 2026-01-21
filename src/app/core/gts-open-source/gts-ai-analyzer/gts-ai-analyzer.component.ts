/**
 * GTS AI Analyzer Component
 *
 * Componente generico per l'analisi AI dei dati.
 * Riceve dati in input e genera analisi, grafici e tabelle tramite AI.
 *
 * Caratteristiche:
 * - I dati rimangono nel browser, solo lo schema viene inviato all'AI
 * - Supporta salvataggio e caricamento analisi
 * - Esportazione PDF con grafico e tabella
 * - Feedback per miglioramento AI (auto-learning)
 */

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { Tooltip } from 'primeng/tooltip';
import { InputText } from 'primeng/inputtext';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Services
import { AiReportsService } from '../../services/ai-reports.service';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

// PDF Export
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================
// INTERFACES
// ============================================

export interface AiAnalyzerDataSchema {
  fields: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    sample?: any;
    description?: string;
  }>;
}

export interface AiAnalyzerConfig {
  prjId: string;
  connCode?: string;   // Codice connessione (società) - importante per filtrare analisi
  datasetName?: string;
  pageCode?: string;   // Identificatore unico della pagina (es. formId o nome pagina)
  dialogTitle?: string;
  dialogWidth?: string;
  dialogHeight?: string;
}

export interface AiAnalysisResult {
  aggregationRule: any;
  chartConfig: any;
  gridConfig: any;
  explanation?: string;
}

@Component({
  selector: 'app-gts-ai-analyzer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Dialog,
    ButtonModule,
    Textarea,
    Select,
    ProgressSpinner,
    TableModule,
    ChartModule,
    Tooltip,
    InputText,
    Toast
  ],
  providers: [MessageService],
  templateUrl: './gts-ai-analyzer.component.html',
  styleUrls: ['./gts-ai-analyzer.component.scss']
})
export class GtsAiAnalyzerComponent implements OnInit, OnDestroy {

  // ============================================
  // INPUTS
  // ============================================

  /** Dati raw da analizzare - rimangono nel browser */
  @Input() data: any[] = [];

  /** Schema dei dati (facoltativo - viene dedotto automaticamente se non fornito) */
  @Input() dataSchema: AiAnalyzerDataSchema | null = null;

  /** Configurazione del componente */
  @Input() config: AiAnalyzerConfig = { prjId: '' };

  /** Visibilità del dialog */
  @Input() visible: boolean = false;

  // ============================================
  // OUTPUTS
  // ============================================

  /** Evento quando il dialog viene chiuso */
  @Output() visibleChange = new EventEmitter<boolean>();

  /** Evento quando viene generata un'analisi */
  @Output() analysisGenerated = new EventEmitter<AiAnalysisResult>();

  /** Evento quando viene salvata un'analisi */
  @Output() analysisSaved = new EventEmitter<{ id: string; name: string }>();

  // ============================================
  // SERVICES
  // ============================================

  private aiReportsService = inject(AiReportsService);
  private ts = inject(TranslationService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);

  @ViewChild('aiChartRef') aiChartRef: any;

  // ============================================
  // STATE
  // ============================================

  loading: boolean = false;
  error: string = '';
  panelCollapsed: boolean = false;

  // Input form
  userRequest: string = '';
  chartType: string = 'bar';
  maxResults: number = 10;

  // Results
  analysisResult: AiAnalysisResult | null = null;
  aggregatedData: any[] = [];
  resultChart: any = null;

  // Retry & Validation
  retryCount: number = 0;
  maxRetries: number = 2;
  lastValidationErrors: string[] = [];
  showFeedbackButtons: boolean = false;
  originalRequest: string = '';

  // Saved analyses
  savedAnalyses: any[] = [];
  showSavedAnalyses: boolean = false;

  // Save dialog
  showSaveDialog: boolean = false;
  saveAnalysisName: string = '';

  // ============================================
  // CHART OPTIONS
  // ============================================

  get chartTypeOptions() {
    return [
      { label: this.t(1543, 'Barre'), value: 'bar', icon: 'pi pi-chart-bar' },
      { label: this.t(1544, 'Linea'), value: 'line', icon: 'pi pi-chart-line' },
      { label: this.t(1545, 'Torta'), value: 'pie', icon: 'pi pi-chart-pie' },
      { label: this.t(1546, 'Ciambella'), value: 'doughnut', icon: 'pi pi-circle' },
      { label: this.t(1547, 'Area'), value: 'area', icon: 'pi pi-chart-line' }
    ];
  }

  maxResultsOptions = [
    { label: '5', value: 5 },
    { label: '10', value: 10 },
    { label: '15', value: 15 },
    { label: '20', value: 20 },
    { label: '50', value: 50 }
  ];

  // Chart options
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

  // ============================================
  // LIFECYCLE
  // ============================================

  ngOnInit(): void {
    // Initialization if needed
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  // ============================================
  // TRANSLATION HELPER
  // ============================================

  t(txtId: number, fallback: string = ''): string {
    return this.ts.getText(txtId, fallback);
  }

  // ============================================
  // DIALOG METHODS
  // ============================================

  onDialogHide(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  // ============================================
  // DATA SCHEMA
  // ============================================

  /**
   * Genera lo schema dei dati automaticamente se non fornito
   */
  private getDataSchema(): AiAnalyzerDataSchema {
    if (this.dataSchema) {
      return this.dataSchema;
    }

    if (!this.data || this.data.length === 0) {
      return { fields: [] };
    }

    const sampleRow = this.data[0];
    const fields: AiAnalyzerDataSchema['fields'] = [];

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

      fields.push({
        name: key,
        type: fieldType,
        sample: value
      });
    }

    return { fields };
  }

  // ============================================
  // ANALYSIS METHODS
  // ============================================

  /**
   * Genera l'analisi AI
   */
  async generateAnalysis(): Promise<void> {
    if (!this.userRequest.trim()) {
      this.error = this.t(1549, 'Inserisci una richiesta di analisi');
      return;
    }

    if (!this.data || this.data.length === 0) {
      this.error = this.t(1548, 'Nessun dato disponibile per l\'analisi');
      return;
    }

    // Reset retry state
    this.retryCount = 0;
    this.lastValidationErrors = [];
    this.showFeedbackButtons = false;
    this.originalRequest = this.userRequest;

    await this.executeAnalysis();
  }

  /**
   * Esegue l'analisi AI (usata sia per prima richiesta che per retry)
   */
  private async executeAnalysis(retryContext?: { errorType: string; errorMessage: string; previousRules: any }): Promise<void> {
    this.loading = true;
    this.error = '';
    this.analysisResult = null;
    this.aggregatedData = [];
    this.resultChart = null;
    this.showFeedbackButtons = false;

    try {
      const dataSchema = this.getDataSchema();

      const result = await this.aiReportsService.generateDataAnalysisRulesWithRetry({
        userRequest: this.originalRequest || this.userRequest,
        dataSchema: dataSchema,
        chartType: this.chartType as any,
        maxResults: this.maxResults,
        prjId: this.config.prjId,
        retryContext: retryContext
      }).toPromise();

      if (result) {
        this.analysisResult = result;

        // Normalizza la gridConfig
        this.normalizeGridConfig(result);

        // Applica le regole di aggregazione LATO CLIENT (include pivot!)
        this.aggregatedData = this.applyAggregationRules(this.data, result);

        // Se pivotByYear con anni definiti, adatta la gridConfig
        const pivotYears = result.aggregationRule?.pivotByYear?.years;
        if (pivotYears && pivotYears.length >= 2) {
          this.adaptGridConfigForPivot(result);
        }

        // Valida i risultati
        const validationResult = this.validateResults(this.aggregatedData, result);

        if (!validationResult.valid) {
          this.lastValidationErrors = validationResult.errors;

          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            await this.executeAnalysis({
              errorType: validationResult.errorType || 'validation_failed',
              errorMessage: validationResult.errors.join('; '),
              previousRules: result.aggregationRule
            });
            return;
          } else {
            this.error = this.t(1598, 'I dati generati potrebbero non essere corretti:') + ' ' + validationResult.errors.join(', ');
            this.showFeedbackButtons = true;
          }
        } else {
          this.showFeedbackButtons = true;
        }

        // Prepara il grafico
        this.prepareResultChart(result);

        // Emit event
        this.analysisGenerated.emit(result);
      }

    } catch (err: any) {
      console.error('AI Analysis error:', err);
      this.error = err.message || this.t(1550, 'Errore durante la generazione dell\'analisi');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ============================================
  // VALIDATION
  // ============================================

  private validateResults(data: any[], rules: any): { valid: boolean; errors: string[]; errorType?: string } {
    const errors: string[] = [];
    let errorType: string | undefined;

    if (!data || data.length === 0) {
      errors.push(this.t(1599, 'Nessun risultato trovato per questa richiesta'));
      errorType = 'empty_results';
      return { valid: false, errors, errorType };
    }

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

    return {
      valid: errors.length === 0,
      errors,
      errorType
    };
  }

  // ============================================
  // FEEDBACK
  // ============================================

  async confirmDataCorrect(): Promise<void> {
    if (!this.analysisResult) return;

    try {
      const result = await this.aiReportsService.learnFromSuccess({
        userRequest: this.originalRequest || this.userRequest,
        aggregationRule: this.analysisResult.aggregationRule,
        chartConfig: this.analysisResult.chartConfig,
        gridConfig: this.analysisResult.gridConfig,
        explanation: this.analysisResult.explanation || '',
        prjId: this.config.prjId
      }).toPromise();

      if (result?.success) {
        this.showFeedbackButtons = false;
        this.error = '';
      }
    } catch (err: any) {
      console.warn('[AI Analyzer] Failed to save example:', err.message);
    }
  }

  async reportDataIncorrect(): Promise<void> {
    if (!this.analysisResult) return;

    this.retryCount++;

    if (this.retryCount <= this.maxRetries + 1) {
      await this.executeAnalysis({
        errorType: 'user_reported_incorrect',
        errorMessage: 'L\'utente ha segnalato che i dati non sono corretti.',
        previousRules: this.analysisResult.aggregationRule
      });
    } else {
      this.error = this.t(1604, 'Numero massimo di tentativi raggiunto. Prova a riformulare la richiesta.');
      this.showFeedbackButtons = false;
    }
  }

  // ============================================
  // GRID CONFIG
  // ============================================

  private normalizeGridConfig(result: any): void {
    if (!result.gridConfig?.columns) return;

    const aggregations = result.aggregationRule?.aggregations || [];
    const groupBy = result.aggregationRule?.groupBy || [];

    const aggregatedFields = new Set(aggregations.map((agg: any) => agg.alias || agg.field));

    const currencyPatterns = ['valore', 'importo', 'fatturato', 'costo', 'costi', 'prezzo', 'delta', 'margine', 'euro'];
    const isCurrencyField = (field: string): boolean => {
      const lower = field.toLowerCase();
      return currencyPatterns.some(p => lower.includes(p));
    };

    result.gridConfig.columns = result.gridConfig.columns.map((col: any) => {
      const field = col.field;
      const isGroupByField = groupBy.includes(field);
      const isAggregatedField = aggregatedFields.has(field);

      if (isGroupByField && !isAggregatedField) {
        return { ...col, type: col.type || 'text', align: col.align || 'left' };
      }

      if (isAggregatedField) {
        const isCurrency = isCurrencyField(field);
        return { ...col, type: isCurrency ? 'currency' : 'number', align: 'right' };
      }

      if (isCurrencyField(field)) {
        return { ...col, type: 'currency', align: 'right' };
      }

      const numberPatterns = ['kg', 'quantita', 'qty', 'num', 'count', 'totale'];
      const lower = field.toLowerCase();
      if (numberPatterns.some(p => lower.includes(p))) {
        return { ...col, type: 'number', align: 'right' };
      }

      return col;
    });
  }

  private adaptGridConfigForPivot(result: any): void {
    const pivotByYear = result.aggregationRule?.pivotByYear;
    if (!pivotByYear) return;

    const years = pivotByYear.years || [];
    if (years.length === 0) return;

    const aggregations = result.aggregationRule?.aggregations || [];
    const groupBy = result.aggregationRule?.groupBy || [];
    const yearField = pivotByYear.yearField;

    let metrics = pivotByYear.metrics || [];
    if (metrics.length === 0 && aggregations.length > 0) {
      metrics = aggregations.map((agg: any) => agg.alias || agg.field);
    }

    const keyFields = groupBy.filter((f: string) => f !== yearField);
    const newColumns: any[] = [];

    keyFields.forEach((field: string) => {
      newColumns.push({ field: field, header: field, type: 'text' });
    });

    metrics.forEach((metric: string) => {
      years.forEach((year: number) => {
        const fieldName = `${metric}_${year}`;
        const isKg = metric.toLowerCase().includes('kg');
        const isValore = metric.toLowerCase().includes('valore') || metric.toLowerCase().includes('importo');

        newColumns.push({
          field: fieldName,
          header: isKg ? `Kg ${year}` : isValore ? `${year}` : `${metric} ${year}`,
          type: isValore ? 'currency' : 'number'
        });
      });

      const isKg = metric.toLowerCase().includes('kg');
      const isValore = metric.toLowerCase().includes('valore');
      newColumns.push({
        field: `${metric}_variazione`,
        header: isKg ? `Var. Kg %` : isValore ? `Var. %` : `Var. %`,
        type: 'number'
      });
    });

    result.gridConfig = result.gridConfig || {};
    result.gridConfig.columns = newColumns;
  }

  // ============================================
  // CHART PREPARATION
  // ============================================

  private prepareResultChart(result: any): void {
    if (!this.aggregatedData || this.aggregatedData.length === 0 || !result.chartConfig) {
      return;
    }

    const config = result.chartConfig;
    const aggregations = result.aggregationRule?.aggregations || [];
    const pivotByYear = result.aggregationRule?.pivotByYear;
    const xField = config.xAxis?.field;

    if (!xField) return;

    const labels = this.aggregatedData.map(d => this.truncateText(String(d[xField] || ''), 25));
    const colors = config.colors || ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC', '#26A69A', '#5C6BC0', '#EC407A', '#78909C', '#8D6E63'];

    const chartType = config.type || this.chartType;

    const numericAggregations = aggregations.filter((agg: any) =>
      agg.operation === 'sum' || agg.operation === 'avg' || agg.operation === 'min' || agg.operation === 'max'
    );

    if (chartType === 'pie' || chartType === 'doughnut') {
      const yField = config.yAxis?.field || numericAggregations[0]?.alias;
      if (!yField) return;

      const values = this.aggregatedData.map(d => d[yField] || 0);
      this.resultChart = {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, values.length)
        }]
      };
    } else if (pivotByYear && pivotByYear.years && pivotByYear.years.length >= 2) {
      const datasets: any[] = [];
      const years = pivotByYear.years;

      let metrics = pivotByYear.metrics || [];
      if (metrics.length === 0 && numericAggregations.length > 0) {
        metrics = numericAggregations.map((a: any) => a.alias || a.field);
      }

      const getReadableLabel = (metric: string, year: number): string => {
        const isKg = metric.toLowerCase().includes('kg');
        const isValore = metric.toLowerCase().includes('valore');
        if (isKg) return `Kg ${year}`;
        if (isValore) return `${year}`;
        return `${metric} ${year}`;
      };

      const yearColors = ['#42A5F5', '#FFA726', '#66BB6A', '#EF5350'];
      const useDualAxis = metrics.length >= 2;

      metrics.forEach((metric: string, metricIdx: number) => {
        years.forEach((year: number, yearIdx: number) => {
          const fieldName = `${metric}_${year}`;
          const values = this.aggregatedData.map(d => d[fieldName] || 0);
          const label = getReadableLabel(metric, year);
          const colorIdx = metricIdx * 2 + yearIdx;

          datasets.push({
            label: label,
            data: values,
            backgroundColor: yearColors[colorIdx % yearColors.length],
            borderColor: yearColors[colorIdx % yearColors.length],
            yAxisID: useDualAxis && metricIdx === 1 ? 'y1' : 'y',
            tension: 0.4,
            fill: chartType === 'area',
            order: colorIdx
          });
        });
      });

      this.resultChart = { labels: labels, datasets: datasets };
    } else if (numericAggregations.length >= 2) {
      const datasets: any[] = [];

      numericAggregations.slice(0, 2).forEach((agg: any, index: number) => {
        const alias = agg.alias || agg.field;
        const values = this.aggregatedData.map(d => d[alias] || 0);
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

      this.resultChart = { labels: labels, datasets: datasets };
    } else {
      const yField = config.yAxis?.field || numericAggregations[0]?.alias;
      if (!yField) return;

      const values = this.aggregatedData.map(d => d[yField] || 0);

      this.resultChart = {
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

  // ============================================
  // CHART OPTIONS
  // ============================================

  private hasDualAxis(): boolean {
    const aggregations = this.analysisResult?.aggregationRule?.aggregations || [];
    const pivotByYear = this.analysisResult?.aggregationRule?.pivotByYear;
    const chartType = this.analysisResult?.chartConfig?.type || this.chartType;

    if (chartType === 'pie' || chartType === 'doughnut') return false;

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

  private isPivotByYear(): boolean {
    const pivotByYear = this.analysisResult?.aggregationRule?.pivotByYear;
    return pivotByYear && pivotByYear.years && pivotByYear.years.length >= 2;
  }

  getChartOptions(): any {
    const chartType = this.analysisResult?.chartConfig?.type || this.chartType;
    const gridConfig = this.analysisResult?.gridConfig;

    const noAnimationOptions = {
      animation: false,
      events: ['mousemove', 'mouseout']
    };

    if (chartType === 'pie' || chartType === 'doughnut') {
      return { ...this.pieChartOptions, ...noAnimationOptions };
    }

    if (this.isPivotByYear() || this.hasDualAxis()) {
      // Dual axis chart options
      return {
        ...noAnimationOptions,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: (value: any) => this.formatNumber(value, 0) }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { callback: (value: any) => this.formatCurrency(value) }
          }
        }
      };
    }

    if (chartType === 'bar') {
      return { ...this.barChartOptions, ...noAnimationOptions, indexAxis: 'y' };
    }

    return { ...this.lineChartOptions, ...noAnimationOptions };
  }

  getChartType(): 'bar' | 'line' | 'scatter' | 'bubble' | 'pie' | 'doughnut' | 'polarArea' | 'radar' {
    const chartType = this.analysisResult?.chartConfig?.type || this.chartType;
    if (chartType === 'area') return 'line';
    const validTypes = ['bar', 'line', 'scatter', 'bubble', 'pie', 'doughnut', 'polarArea', 'radar'];
    if (validTypes.includes(chartType)) {
      return chartType as any;
    }
    return 'bar';
  }

  // ============================================
  // SAVED ANALYSES
  // ============================================

  openSaveDialog(): void {
    if (!this.analysisResult) return;
    this.saveAnalysisName = this.analysisResult.chartConfig?.title || '';
    this.showSaveDialog = true;
  }

  closeSaveDialog(): void {
    this.showSaveDialog = false;
    this.saveAnalysisName = '';
  }

  async saveCurrentAnalysis(): Promise<void> {
    if (!this.analysisResult || !this.saveAnalysisName.trim()) return;

    try {
      // Prepara i dati aggregati per il caching (compressi in base64)
      const cachedResult = this.prepareCachedResult(this.aggregatedData);

      const result = await this.aiReportsService.saveDataAnalysis({
        prjId: this.config.prjId,
        connCode: this.config.connCode || '',
        pageCode: this.config.pageCode || '',
        analysisName: this.saveAnalysisName.trim(),
        description: this.analysisResult.explanation,
        dataContext: {
          datasetName: this.config.datasetName || 'data',
          availableFields: this.getDataSchema().fields.map(f => ({ name: f.name, type: f.type }))
        },
        userRequest: this.userRequest,
        aggregationRule: this.analysisResult.aggregationRule,
        chartConfig: this.analysisResult.chartConfig,
        gridConfig: this.analysisResult.gridConfig,
        cachedResult: cachedResult,
        createdBy: this.authService.getUserEmail() || 'unknown'
      }).toPromise();

      if (result?.success) {
        this.closeSaveDialog();
        const msg = result.updated
          ? this.t(1560, 'Analisi aggiornata con successo')
          : this.t(1557, 'Analisi salvata con successo');
        this.showSuccess(msg);
        this.analysisSaved.emit({ id: result.analysisId, name: this.saveAnalysisName.trim() });
      }
    } catch (err: any) {
      console.error('Save analysis error:', err);
      this.showError(this.t(1525, 'Errore durante il salvataggio:') + ' ' + (err.message || ''));
    }
  }

  /**
   * Prepara i dati aggregati per il caching (JSON -> base64)
   */
  private prepareCachedResult(data: any[]): { data: string; recordCount: number; compressed: boolean } | undefined {
    if (!data || data.length === 0) return undefined;

    try {
      const jsonStr = JSON.stringify(data);
      const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
      return {
        data: base64,
        recordCount: data.length,
        compressed: false  // Semplice base64, non gzip
      };
    } catch (err) {
      console.warn('Failed to prepare cached result:', err);
      return undefined;
    }
  }

  /**
   * Decodifica i dati cached (base64 -> JSON)
   */
  private decodeCachedResult(cachedResult: { data: string; compressed: boolean }): any[] | null {
    if (!cachedResult?.data) return null;

    try {
      const jsonStr = decodeURIComponent(escape(atob(cachedResult.data)));
      return JSON.parse(jsonStr);
    } catch (err) {
      console.warn('Failed to decode cached result:', err);
      return null;
    }
  }

  async loadSavedAnalyses(): Promise<void> {
    try {
      // Carica analisi filtrate per prjId + connCode + pageCode (lato server)
      const result = await this.aiReportsService.listDataAnalyses(this.config.prjId, {
        connCode: this.config.connCode || '',
        pageCode: this.config.pageCode
      }).toPromise();

      this.savedAnalyses = Array.isArray(result) ? result : [];
      this.showSavedAnalyses = true;
    } catch (err: any) {
      console.error('Load saved analyses error:', err);
      this.showError(this.t(1527, 'Errore durante il caricamento:') + ' ' + (err.message || ''));
    }
  }

  async applySavedAnalysis(analysis: any): Promise<void> {
    try {
      const fullAnalysis = await this.aiReportsService.getDataAnalysis(analysis._id).toPromise();
      if (!fullAnalysis) return;

      this.userRequest = fullAnalysis.userRequest;
      this.analysisResult = {
        aggregationRule: fullAnalysis.aggregationRule,
        chartConfig: fullAnalysis.chartConfig,
        gridConfig: fullAnalysis.gridConfig,
        explanation: fullAnalysis.description
      };

      this.normalizeGridConfig(this.analysisResult);

      // Prova a usare i dati cached (istantaneo!)
      let usedCache = false;
      if (fullAnalysis.cachedResult?.data) {
        const cachedData = this.decodeCachedResult(fullAnalysis.cachedResult);
        if (cachedData && cachedData.length > 0) {
          this.aggregatedData = cachedData;
          usedCache = true;
        }
      }

      // Fallback: riaggrega LATO CLIENT se non ci sono dati cached
      if (!usedCache) {
        this.aggregatedData = this.applyAggregationRules(this.data, this.analysisResult);

        // Aggiorna la cache per le prossime volte (in background)
        this.updateAnalysisCache(analysis._id, this.aggregatedData);
      }

      const pivotYears = this.analysisResult.aggregationRule?.pivotByYear?.years;
      if (pivotYears && pivotYears.length >= 2) {
        this.adaptGridConfigForPivot(this.analysisResult);
      }

      this.prepareResultChart(this.analysisResult);

      this.showSavedAnalyses = false;
      this.cdr.detectChanges();

    } catch (err: any) {
      console.error('Apply saved analysis error:', err);
      this.showError(this.t(1528, 'Errore durante l\'applicazione:') + ' ' + (err.message || ''));
    }
  }

  /**
   * Aggiorna la cache di un'analisi esistente (in background)
   */
  private updateAnalysisCache(analysisId: string, aggregatedData: any[]): void {
    // Non blocca l'UI, aggiorna in background
    const cachedResult = this.prepareCachedResult(aggregatedData);
    if (!cachedResult) return;

    // Ricarica l'analisi completa e risalvala con i dati cached
    this.aiReportsService.getDataAnalysis(analysisId).subscribe({
      next: (fullAnalysis: any) => {
        if (fullAnalysis) {
          this.aiReportsService.saveDataAnalysis({
            prjId: fullAnalysis.prjId,
            connCode: fullAnalysis.connCode || '',
            pageCode: fullAnalysis.pageCode || '',
            analysisName: fullAnalysis.analysisName,
            description: fullAnalysis.description,
            dataContext: fullAnalysis.dataContext,
            userRequest: fullAnalysis.userRequest,
            aggregationRule: fullAnalysis.aggregationRule,
            chartConfig: fullAnalysis.chartConfig,
            gridConfig: fullAnalysis.gridConfig,
            cachedResult: cachedResult,
            createdBy: fullAnalysis.createdBy
          }).subscribe({
            next: () => console.log('[AI Analyzer] Cache updated for:', fullAnalysis.analysisName),
            error: (err) => console.warn('[AI Analyzer] Failed to update cache:', err)
          });
        }
      }
    });
  }

  deleteSavedAnalysis(analysis: any, event: Event): void {
    event.stopPropagation();

    // Simple confirmation
    if (confirm(this.t(1529, 'Eliminare l\'analisi') + ` "${analysis.analysisName}"?`)) {
      this.aiReportsService.deleteDataAnalysis(analysis._id).subscribe({
        next: () => {
          this.savedAnalyses = this.savedAnalyses.filter(a => a._id !== analysis._id);
          this.showSuccess(this.t(1559, 'Analisi eliminata'));
        },
        error: (err) => {
          console.error('Delete analysis error:', err);
          this.showError(this.t(1530, 'Errore durante l\'eliminazione'));
        }
      });
    }
  }

  // ============================================
  // PDF EXPORT
  // ============================================

  exportToPdf(): void {
    if (!this.analysisResult || this.aggregatedData.length === 0) {
      this.showWarning(this.t(1671, 'Nessuna analisi da esportare'));
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const title = this.analysisResult.chartConfig?.title || this.t(1672, 'Analisi Dati');
      doc.text(title, margin, yPosition);
      yPosition += 10;

      // Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      const dateStr = new Date().toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      doc.text(`${this.t(1673, 'Generato il')}: ${dateStr}`, margin, yPosition);
      yPosition += 8;

      // Explanation
      if (this.analysisResult.explanation) {
        doc.setTextColor(60);
        const explanationLines = doc.splitTextToSize(this.analysisResult.explanation, pageWidth - margin * 2);
        doc.text(explanationLines, margin, yPosition);
        yPosition += explanationLines.length * 5 + 5;
      }

      doc.setTextColor(0);

      // Chart
      if (this.aiChartRef?.chart) {
        const chartCanvas = this.aiChartRef.chart.canvas;
        const chartImage = chartCanvas.toDataURL('image/png', 1.0);

        const maxChartWidth = pageWidth - margin * 2;
        const maxChartHeight = 80;
        const aspectRatio = chartCanvas.width / chartCanvas.height;

        let chartWidth = maxChartWidth;
        let chartHeight = chartWidth / aspectRatio;

        if (chartHeight > maxChartHeight) {
          chartHeight = maxChartHeight;
          chartWidth = chartHeight * aspectRatio;
        }

        const chartX = (pageWidth - chartWidth) / 2;
        doc.addImage(chartImage, 'PNG', chartX, yPosition, chartWidth, chartHeight);
        yPosition += chartHeight + 10;
      }

      // Table
      const columns = this.analysisResult.gridConfig?.columns || [];
      const tableColumns = columns.map((col: any) => ({
        header: col.header || col.field,
        dataKey: col.field
      }));

      const tableData = this.aggregatedData.map((row: any) => {
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

      const numericColumnIndices = new Set<number>();
      columns.forEach((col: any, index: number) => {
        if (col.type === 'currency' || col.type === 'number') {
          numericColumnIndices.add(index);
        }
      });

      autoTable(doc, {
        startY: yPosition,
        head: [tableColumns.map((c: any) => c.header)],
        body: tableData.map((row: any) => tableColumns.map((c: any) => row[c.dataKey])),
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (data: any) => {
          if (numericColumnIndices.has(data.column.index)) {
            data.cell.styles.halign = 'right';
          }
        },
        didDrawPage: (data: any) => {
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

      const fileName = this.sanitizeFileName(title) + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
      doc.save(fileName);

      this.showSuccess(this.t(1675, 'PDF esportato con successo'));

    } catch (err: any) {
      console.error('PDF export error:', err);
      this.showError(this.t(1676, 'Errore durante l\'esportazione PDF:') + ' ' + err.message);
    }
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }

  // ============================================
  // CLIENT-SIDE AGGREGATION (ripristinato per performance e pivot)
  // ============================================

  /**
   * Applica le regole di aggregazione ai dati localmente (client-side)
   * Include: trasformazioni, filtri, groupBy, aggregazioni, sort, limit, pivot
   */
  private applyAggregationRules(data: any[], rules: any): any[] {
    if (!Array.isArray(data) || data.length === 0) return [];
    if (!rules?.aggregationRule) return data;

    const { groupBy, aggregations, sortBy, filters, limit, dataTransformations, pivotByYear } = rules.aggregationRule;
    let result = [...data];

    // 1. Data transformations
    if (dataTransformations && dataTransformations.length > 0) {
      result = this.applyTransformations(result, dataTransformations);
    }

    // 2. Filters
    if (filters && filters.length > 0) {
      result = this.applyFilters(result, filters);
    }

    // 3. GroupBy + Aggregations
    if (groupBy && groupBy.length > 0) {
      result = this.applyGroupBy(result, groupBy, aggregations || []);
    }

    // 4. Sort
    if (sortBy && sortBy.field) {
      result = this.applySort(result, sortBy);
    }

    // 5. Limit (prima del pivot per non perdere dati)
    // NOTA: se c'è pivot, il limit va applicato DOPO il pivot
    const shouldLimitBeforePivot = !(pivotByYear?.years?.length >= 2);
    if (shouldLimitBeforePivot && limit && limit > 0) {
      result = result.slice(0, limit);
    }

    // 6. PIVOT BY YEAR
    if (pivotByYear?.years?.length >= 2) {
      result = this.applyPivotByYear(result, groupBy || [], aggregations || [], pivotByYear);

      // Applica limit dopo il pivot
      if (limit && limit > 0) {
        result = result.slice(0, limit);
      }
    }

    return result;
  }

  /**
   * Applica trasformazioni ai dati (trim, replace, normalize, etc.)
   */
  private applyTransformations(data: any[], transformations: any[]): any[] {
    return data.map(row => {
      const transformed = { ...row };

      transformations.forEach(transform => {
        const field = transform.field;
        if (transformed[field] === undefined || transformed[field] === null) return;

        let value = String(transformed[field]);

        switch (transform.operation) {
          case 'trim':
            value = value.trim();
            break;
          case 'trimChars':
            if (transform.chars) {
              const chars = transform.chars;
              while (value.length > 0 && chars.includes(value[0])) {
                value = value.substring(1);
              }
              while (value.length > 0 && chars.includes(value[value.length - 1])) {
                value = value.substring(0, value.length - 1);
              }
            }
            break;
          case 'replace':
            if (transform.find !== undefined) {
              const replaceWith = transform.replaceWith || '';
              value = value.split(transform.find).join(replaceWith);
            }
            break;
          case 'toUpperCase':
            value = value.toUpperCase();
            break;
          case 'toLowerCase':
            value = value.toLowerCase();
            break;
          case 'normalize':
            value = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            break;
          case 'sortWords':
            value = value.split(/\s+/).filter(w => w.length > 0)
              .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
              .join(' ');
            break;
        }

        transformed[field] = value;
      });

      return transformed;
    });
  }

  /**
   * Applica filtri ai dati
   */
  private applyFilters(data: any[], filters: any[]): any[] {
    return data.filter(row => {
      return filters.every(filter => {
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

  /**
   * Applica groupBy e aggregazioni
   */
  private applyGroupBy(data: any[], groupBy: string[], aggregations: any[]): any[] {
    const groups = new Map<string, any>();

    data.forEach(row => {
      const key = groupBy.map(field => row[field]).join('|||');

      if (!groups.has(key)) {
        const groupData: any = { _rows: [] };
        groupBy.forEach(field => groupData[field] = row[field]);
        groups.set(key, groupData);
      }

      groups.get(key)._rows.push(row);
    });

    return Array.from(groups.values()).map(group => {
      const aggregated: any = {};

      // Copia campi groupBy
      Object.keys(group).forEach(k => {
        if (k !== '_rows') aggregated[k] = group[k];
      });

      // Applica aggregazioni
      aggregations.forEach(agg => {
        const alias = agg.alias || agg.field;
        const values = group._rows
          .map((r: any) => r[agg.field])
          .filter((v: any) => v !== undefined && v !== null);

        switch (agg.operation) {
          case 'sum':
            aggregated[alias] = values.reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0);
            break;
          case 'avg':
            aggregated[alias] = values.length > 0
              ? values.reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0) / values.length
              : 0;
            break;
          case 'count':
            aggregated[alias] = group._rows.length;
            break;
          case 'min':
            aggregated[alias] = Math.min(...values.map((v: any) => parseFloat(v) || 0));
            break;
          case 'max':
            aggregated[alias] = Math.max(...values.map((v: any) => parseFloat(v) || 0));
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

      return aggregated;
    });
  }

  /**
   * Applica ordinamento
   */
  private applySort(data: any[], sortBy: { field: string; order: string }): any[] {
    const field = sortBy.field;
    const order = sortBy.order === 'desc' ? -1 : 1;

    return [...data].sort((a, b) => {
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

  /**
   * Applica pivot per anno - trasforma righe in colonne per confronto anno su anno
   *
   * Input: [{ Prodotto: 'A', Anno: 2025, totaleKg: 100 }, { Prodotto: 'A', Anno: 2024, totaleKg: 80 }]
   * Output: [{ Prodotto: 'A', totaleKg_2025: 100, totaleKg_2024: 80, totaleKg_variazione: 25 }]
   */
  private applyPivotByYear(data: any[], groupBy: string[], aggregations: any[], pivotConfig: any): any[] {
    const { yearField, years, baseYear, metrics } = pivotConfig;

    if (!yearField || !years || years.length < 2) {
      return data;
    }

    // Campi chiave (escluso l'anno)
    const keyFields = groupBy.filter(f => f !== yearField);

    // Metriche da pivotare (prende alias se definito)
    const metricFields = metrics && metrics.length > 0
      ? metrics
      : aggregations.map(a => a.alias || a.field);

    // Raggruppa per chiave (senza anno)
    const pivotGroups = new Map<string, any>();

    data.forEach(row => {
      const key = keyFields.map(f => row[f]).join('|||');

      if (!pivotGroups.has(key)) {
        const newRow: any = {};
        keyFields.forEach(f => newRow[f] = row[f]);
        pivotGroups.set(key, newRow);
      }

      const pivotRow = pivotGroups.get(key);
      const year = row[yearField];

      // Assegna valori per anno (es. totaleKg_2025)
      metricFields.forEach((metric: string) => {
        if (row[metric] !== undefined) {
          pivotRow[`${metric}_${year}`] = row[metric];
        }
      });
    });

    // Calcola variazioni %
    const result = Array.from(pivotGroups.values());
    const [year1, year2] = years; // es. [2025, 2024] - year1 è l'anno più recente

    result.forEach(row => {
      metricFields.forEach((metric: string) => {
        const val1 = row[`${metric}_${year1}`] || 0;
        const val2 = row[`${metric}_${year2}`] || 0;

        if (val2 !== 0) {
          row[`${metric}_variazione`] = ((val1 - val2) / val2) * 100;
        } else {
          row[`${metric}_variazione`] = val1 > 0 ? 100 : 0;
        }
      });
    });

    // Riordina per la prima metrica dell'anno più recente (desc)
    if (metricFields.length > 0) {
      const sortField = `${metricFields[0]}_${year1}`;
      result.sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));
    }

    return result;
  }

  // ============================================
  // UTILITIES
  // ============================================

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

  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  private showSuccess(message: string): void {
    this.messageService.add({ severity: 'success', summary: 'Successo', detail: message, life: 3000 });
  }

  private showError(message: string): void {
    this.messageService.add({ severity: 'error', summary: 'Errore', detail: message, life: 5000 });
  }

  private showWarning(message: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Attenzione', detail: message, life: 4000 });
  }
}
