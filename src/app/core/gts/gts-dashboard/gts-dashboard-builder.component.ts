import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { MessageService, ConfirmationService } from 'primeng/api';

// Services
import { GtsDataService } from '../../services/gts-data.service';
import { UserDataService } from '../../services/user-data.service';

// GTS Components
import { GtsDashboardComponent, DashboardConfig } from './gts-dashboard.component';

/**
 * Dashboard configuration interface (matches Mongoose schema)
 */
export interface DashboardModel {
  _id?: string;
  prjId: string;
  connCode: string;
  dashboardCode: string;
  title: string;
  description: string;
  layout?: DashboardLayout;
  datasets?: DatasetConfig[];
  filters?: FilterConfig[];
  settings?: DashboardSettings;
  items?: DashboardItem[];
  tools?: DashboardTools;
  status?: 'active' | 'draft' | 'archived';
  author?: string;
  version?: number;
}

export interface DashboardLayout {
  columns: number;
  gap: number;
  baseRowHeight: number;
  sections: LayoutSection[];
  responsive?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

export interface LayoutSection {
  sectionId: string;
  title?: string;
  columns: number;
  rowHeight: number;
  minItemWidth?: number;
  maxItemWidth?: number;
  items: string[];
}

export interface DatasetConfig {
  datasetId: string;
  adapterCode: string;
  dataSetCode: string;
  description?: string;
  cacheKey?: string;
  cacheTTL?: number;
}

export interface FilterConfig {
  field: string;
  datasetId: string;
  type: 'select' | 'multiselect' | 'daterange' | 'text';
  label: string;
  options?: any;
  defaultValue?: any;
  dependsOn?: string;
  placeholder?: string;
}

export interface DashboardSettings {
  locale: string;
  currency: string;
  dateFormat: string;
  numberFormat?: {
    minimumFractionDigits: number;
    maximumFractionDigits: number;
  };
}

export interface DashboardItem {
  itemId: string;
  type: 'card' | 'chart' | 'grid';
  position?: {
    order: number;
    colSpan: number;
    rowSpan: number;
  };
  level?: number;
  parentItemId?: string | null;
  drillDownFilter?: string | null;
  dataSource?: {
    type: 'dataAdapter' | 'api' | 'static';
    dataAdapterName?: string;
    apiEndpoint?: string;
    staticData?: any;
  };
  datasetId?: string;
  aggregationRule?: AggregationRule;
  cardConfig?: CardConfig;
  chartConfig?: ChartConfig;
  gridConfig?: GridConfig;
  title?: string;
  subtitle?: string;
  visible?: boolean;
  refreshOnFilter?: boolean;
}

export interface AggregationRule {
  groupBy?: string[];
  aggregations?: {
    field: string;
    operation: 'sum' | 'avg' | 'count' | 'countDistinct' | 'min' | 'max' | 'first' | 'last' | 'concat';
    alias?: string;
    format?: string;
    separator?: string;
  }[];
  sortBy?: {
    field: string;
    order: 'asc' | 'desc';
  };
  filters?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'between';
    value: any;
  }[];
  dataTransformations?: {
    field: string;
    operation: 'trim' | 'trimChars' | 'replace' | 'toUpperCase' | 'toLowerCase' | 'normalize' | 'sortWords';
    chars?: string;
    find?: string;
    replaceWith?: string;
  }[];
  limit?: number;
  pivotByYear?: {
    yearField: string;
    years: number[];
    baseYear: number;
    metrics: string[];
  };
}

export interface CardConfig {
  icon?: string;
  iconColor?: string;
  accentColor?: string;
  valueField?: string;
  format?: 'currency' | 'number' | 'percent' | 'integer';
  decimals?: number;
  label?: string;
  subtitleField?: string;
  subtitleFormat?: string;
  showTrend?: boolean;
  trendField?: string;
}

export interface ChartConfig {
  chartType?: 'line' | 'bar' | 'horizontalBar' | 'pie' | 'doughnut' | 'area' | 'combo';
  xAxis?: {
    field?: string;
    label?: string;
    format?: string;
  };
  yAxis?: {
    label?: string;
    format?: string;
  };
  series?: {
    field: string;
    label?: string;
    color?: string;
    type?: 'line' | 'bar' | 'area';
  }[];
  labelField?: string;
  valueField?: string;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  showGrid?: boolean;
  stacked?: boolean;
  colors?: string[];
  height?: number;
}

export interface GridConfig {
  columns?: {
    field: string;
    header?: string;
    width?: string;
    format?: 'text' | 'currency' | 'number' | 'percent' | 'date' | 'integer';
    align?: 'left' | 'center' | 'right';
    decimals?: number;
    sortable?: boolean;
  }[];
  showTotals?: boolean;
  totalsFields?: string[];
  pageSize?: number;
  showPagination?: boolean;
  rowClickable?: boolean;
  height?: string;
}

export interface DashboardTools {
  aiAnalyzer?: boolean;
  export?: boolean;
  refresh?: boolean;
  fullscreen?: boolean;
}

@Component({
  selector: 'app-gts-dashboard-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
    CheckboxModule,
    TabsModule,
    AccordionModule,
    PanelModule,
    TableModule,
    TooltipModule,
    ConfirmDialogModule,
    ToastModule,
    DividerModule,
    DialogModule,
    MultiSelectModule,
    GtsDashboardComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './gts-dashboard-builder.component.html',
  styleUrls: ['./gts-dashboard-builder.component.scss']
})
export class GtsDashboardBuilderComponent implements OnInit, OnChanges {

  @Input() prjId: string = '';
  @Input() connCode: string = '';
  @Input() dashboardCode: string = '';
  @Input() visible: boolean = false;

  @Output() onSave = new EventEmitter<DashboardModel>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() onBack = new EventEmitter<void>();

  private gtsDataService = inject(GtsDataService);
  private userDataService = inject(UserDataService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // Dashboard model
  dashboard: DashboardModel = this.getEmptyDashboard();

  // UI state
  loading: boolean = false;
  activeTab: number = 0;
  selectedItem: DashboardItem | null = null;
  selectedSection: LayoutSection | null = null;
  selectedDataset: DatasetConfig | null = null;
  selectedFilter: FilterConfig | null = null;

  // Dialogs
  showItemDialog: boolean = false;
  showSectionDialog: boolean = false;
  showDatasetDialog: boolean = false;
  showFilterDialog: boolean = false;
  showJsonDialog: boolean = false;
  itemDialogTab: number = 0;

  // Preview
  showPreviewMappingDialog: boolean = false;
  showPreviewDialog: boolean = false;
  previewLoading: boolean = false;
  previewDatasetMappings: { datasetId: string; cacheKey: string; description?: string }[] = [];
  availableCaches: { label: string; value: string; recordCount?: number }[] = [];
  previewData: Map<string, any[]> = new Map();
  previewDashboardConfig: DashboardConfig | null = null;

  // JSON editor
  jsonContent: string = '';
  jsonError: string = '';

  // Options for dropdowns
  itemTypes = [
    { label: 'Card', value: 'card' },
    { label: 'Chart', value: 'chart' },
    { label: 'Grid', value: 'grid' }
  ];

  chartTypes = [
    { label: 'Bar', value: 'bar' },
    { label: 'Horizontal Bar', value: 'horizontalBar' },
    { label: 'Line', value: 'line' },
    { label: 'Area', value: 'area' },
    { label: 'Pie', value: 'pie' },
    { label: 'Doughnut', value: 'doughnut' },
    { label: 'Combo', value: 'combo' }
  ];

  cardFormats = [
    { label: 'Number', value: 'number' },
    { label: 'Currency', value: 'currency' },
    { label: 'Percent', value: 'percent' },
    { label: 'Integer', value: 'integer' }
  ];

  columnFormats = [
    { label: 'Text', value: 'text' },
    { label: 'Number', value: 'number' },
    { label: 'Currency', value: 'currency' },
    { label: 'Percent', value: 'percent' },
    { label: 'Integer', value: 'integer' },
    { label: 'Date', value: 'date' }
  ];

  alignOptions = [
    { label: 'Left', value: 'left' },
    { label: 'Center', value: 'center' },
    { label: 'Right', value: 'right' }
  ];

  aggregationOperations = [
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'avg' },
    { label: 'Count', value: 'count' },
    { label: 'Count Distinct', value: 'countDistinct' },
    { label: 'Min', value: 'min' },
    { label: 'Max', value: 'max' },
    { label: 'First', value: 'first' },
    { label: 'Last', value: 'last' },
    { label: 'Concat', value: 'concat' }
  ];

  filterTypes = [
    { label: 'Select', value: 'select' },
    { label: 'Multi Select', value: 'multiselect' },
    { label: 'Date Range', value: 'daterange' },
    { label: 'Text', value: 'text' }
  ];

  statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Draft', value: 'draft' },
    { label: 'Archived', value: 'archived' }
  ];

  legendPositions = [
    { label: 'Top', value: 'top' },
    { label: 'Bottom', value: 'bottom' },
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' }
  ];

  ngOnInit(): void {
    if (this.dashboardCode) {
      this.loadDashboard();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dashboardCode'] && !changes['dashboardCode'].firstChange) {
      if (this.dashboardCode) {
        this.loadDashboard();
      } else {
        this.dashboard = this.getEmptyDashboard();
      }
    }
  }

  /**
   * Load dashboard from server
   */
  async loadDashboard(): Promise<void> {
    if (!this.prjId || !this.dashboardCode) return;

    this.loading = true;
    try {
      const response = await this.gtsDataService.postServerData('data', 'getDashboard', {
        prjId: this.prjId,
        connCode: this.connCode,
        dashboardCode: this.dashboardCode
      });

      if (response && response.dashboard) {
        this.dashboard = response.dashboard;
        this.initializeDefaults();
      } else {
        // New dashboard - initialize with PK values
        this.dashboard = this.getEmptyDashboard();
        this.dashboard.prjId = this.prjId;
        this.dashboard.connCode = this.connCode;
        this.dashboard.dashboardCode = this.dashboardCode;
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      this.showError('Errore nel caricamento della dashboard');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Initialize default values for optional fields
   */
  private initializeDefaults(): void {
    if (!this.dashboard.layout) {
      this.dashboard.layout = {
        columns: 2,
        gap: 16,
        baseRowHeight: 100,
        sections: []
      };
    }
    if (!this.dashboard.datasets) this.dashboard.datasets = [];
    if (!this.dashboard.filters) this.dashboard.filters = [];
    if (!this.dashboard.items) this.dashboard.items = [];
    if (!this.dashboard.settings) {
      this.dashboard.settings = {
        locale: 'it-IT',
        currency: 'EUR',
        dateFormat: 'dd/MM/yyyy'
      };
    }
    if (!this.dashboard.tools) {
      this.dashboard.tools = {
        refresh: true,
        export: false,
        aiAnalyzer: false,
        fullscreen: false
      };
    }
  }

  /**
   * Get empty dashboard model
   */
  private getEmptyDashboard(): DashboardModel {
    return {
      prjId: this.prjId || '',
      connCode: this.connCode || '',
      dashboardCode: this.dashboardCode || '',
      title: '',
      description: '',
      layout: {
        columns: 2,
        gap: 16,
        baseRowHeight: 100,
        sections: [],
        responsive: {
          mobile: 1,
          tablet: 2,
          desktop: 3
        }
      },
      datasets: [],
      filters: [],
      items: [],
      settings: {
        locale: 'it-IT',
        currency: 'EUR',
        dateFormat: 'dd/MM/yyyy',
        numberFormat: {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }
      },
      tools: {
        refresh: true,
        export: false,
        aiAnalyzer: false,
        fullscreen: false
      },
      status: 'draft',
      version: 1
    };
  }

  // ============================================
  // SAVE / CANCEL
  // ============================================

  /**
   * Save dashboard to server
   */
  async saveDashboard(): Promise<void> {
    if (!this.validateDashboard()) return;

    this.loading = true;
    try {
      const response = await this.gtsDataService.postServerData('data', 'saveDashboard', {
        dashboard: this.dashboard
      });

      if (response && response.success) {
        this.showSuccess('Dashboard salvata con successo');
        this.onSave.emit(this.dashboard);
      } else {
        this.showError(response?.error || 'Errore nel salvataggio');
      }
    } catch (error) {
      console.error('Error saving dashboard:', error);
      this.showError('Errore nel salvataggio della dashboard');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Validate dashboard before save
   */
  private validateDashboard(): boolean {
    if (!this.dashboard.prjId) {
      this.showError('Project ID is required');
      return false;
    }
    if (!this.dashboard.dashboardCode) {
      this.showError('Dashboard Code is required');
      return false;
    }
    if (!this.dashboard.title) {
      this.showError('Title is required');
      return false;
    }
    return true;
  }

  /**
   * Cancel editing and go back
   */
  cancel(): void {
    this.confirmationService.confirm({
      message: 'Sei sicuro di voler annullare? Le modifiche non salvate andranno perse.',
      header: 'Conferma',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.onCancel.emit();
        this.onBack.emit();
      }
    });
  }

  /**
   * Go back without confirmation (for toolbar button)
   */
  goBack(): void {
    this.onBack.emit();
  }

  // ============================================
  // SECTIONS MANAGEMENT
  // ============================================

  addSection(): void {
    this.selectedSection = {
      sectionId: 'section-' + Date.now(),
      title: '',
      columns: 3,
      rowHeight: 3,
      items: []
    };
    this.showSectionDialog = true;
  }

  editSection(section: LayoutSection): void {
    this.selectedSection = { ...section };
    this.showSectionDialog = true;
  }

  saveSection(): void {
    if (!this.selectedSection || !this.dashboard.layout) return;

    const index = this.dashboard.layout.sections.findIndex(
      s => s.sectionId === this.selectedSection!.sectionId
    );

    if (index >= 0) {
      this.dashboard.layout.sections[index] = { ...this.selectedSection };
    } else {
      this.dashboard.layout.sections.push({ ...this.selectedSection });
    }

    this.showSectionDialog = false;
    this.selectedSection = null;
  }

  deleteSection(section: LayoutSection): void {
    this.confirmationService.confirm({
      message: `Eliminare la sezione "${section.title || section.sectionId}"?`,
      header: 'Conferma eliminazione',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (this.dashboard.layout) {
          this.dashboard.layout.sections = this.dashboard.layout.sections.filter(
            s => s.sectionId !== section.sectionId
          );
        }
      }
    });
  }

  // ============================================
  // DATASETS MANAGEMENT
  // ============================================

  addDataset(): void {
    this.selectedDataset = {
      datasetId: 'ds-' + Date.now(),
      adapterCode: '',
      dataSetCode: '',
      description: '',
      cacheTTL: 30
    };
    this.showDatasetDialog = true;
  }

  editDataset(dataset: DatasetConfig): void {
    this.selectedDataset = { ...dataset };
    this.showDatasetDialog = true;
  }

  saveDataset(): void {
    if (!this.selectedDataset || !this.dashboard.datasets) return;

    const index = this.dashboard.datasets.findIndex(
      d => d.datasetId === this.selectedDataset!.datasetId
    );

    if (index >= 0) {
      this.dashboard.datasets[index] = { ...this.selectedDataset };
    } else {
      this.dashboard.datasets.push({ ...this.selectedDataset });
    }

    this.showDatasetDialog = false;
    this.selectedDataset = null;
  }

  deleteDataset(dataset: DatasetConfig): void {
    this.confirmationService.confirm({
      message: `Eliminare il dataset "${dataset.datasetId}"?`,
      header: 'Conferma eliminazione',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (this.dashboard.datasets) {
          this.dashboard.datasets = this.dashboard.datasets.filter(
            d => d.datasetId !== dataset.datasetId
          );
        }
      }
    });
  }

  // ============================================
  // FILTERS MANAGEMENT
  // ============================================

  addFilter(): void {
    this.selectedFilter = {
      field: '',
      datasetId: '',
      type: 'select',
      label: '',
      options: 'auto'
    };
    this.showFilterDialog = true;
  }

  editFilter(filter: FilterConfig): void {
    this.selectedFilter = { ...filter };
    this.showFilterDialog = true;
  }

  saveFilter(): void {
    if (!this.selectedFilter || !this.dashboard.filters) return;

    const index = this.dashboard.filters.findIndex(
      f => f.field === this.selectedFilter!.field && f.datasetId === this.selectedFilter!.datasetId
    );

    if (index >= 0) {
      this.dashboard.filters[index] = { ...this.selectedFilter };
    } else {
      this.dashboard.filters.push({ ...this.selectedFilter });
    }

    this.showFilterDialog = false;
    this.selectedFilter = null;
  }

  deleteFilter(filter: FilterConfig): void {
    this.confirmationService.confirm({
      message: `Eliminare il filtro "${filter.label}"?`,
      header: 'Conferma eliminazione',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (this.dashboard.filters) {
          this.dashboard.filters = this.dashboard.filters.filter(
            f => !(f.field === filter.field && f.datasetId === filter.datasetId)
          );
        }
      }
    });
  }

  // ============================================
  // ITEMS MANAGEMENT
  // ============================================

  addItem(): void {
    this.selectedItem = {
      itemId: 'item-' + Date.now(),
      type: 'card',
      position: {
        order: (this.dashboard.items?.length || 0),
        colSpan: 1,
        rowSpan: 1
      },
      level: 0,
      visible: true,
      refreshOnFilter: true
    };
    // Inizializza cardConfig per il tipo di default 'card'
    this.initCardConfig();
    this.itemDialogTab = 0;
    this.showItemDialog = true;
  }

  onItemTypeChange(): void {
    if (!this.selectedItem) return;
    switch (this.selectedItem.type) {
      case 'card':
        this.initCardConfig();
        break;
      case 'chart':
        this.initChartConfig();
        break;
      case 'grid':
        this.initGridConfig();
        break;
    }
  }

  editItem(item: DashboardItem): void {
    this.selectedItem = JSON.parse(JSON.stringify(item)); // Deep clone
    this.showItemDialog = true;
  }

  saveItem(): void {
    if (!this.selectedItem || !this.dashboard.items) return;

    const index = this.dashboard.items.findIndex(
      i => i.itemId === this.selectedItem!.itemId
    );

    if (index >= 0) {
      this.dashboard.items[index] = JSON.parse(JSON.stringify(this.selectedItem));
    } else {
      this.dashboard.items.push(JSON.parse(JSON.stringify(this.selectedItem)));
    }

    this.showItemDialog = false;
    this.selectedItem = null;
  }

  deleteItem(item: DashboardItem): void {
    this.confirmationService.confirm({
      message: `Eliminare l'item "${item.title || item.itemId}"?`,
      header: 'Conferma eliminazione',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (this.dashboard.items) {
          this.dashboard.items = this.dashboard.items.filter(
            i => i.itemId !== item.itemId
          );
          // Remove from sections
          if (this.dashboard.layout?.sections) {
            this.dashboard.layout.sections.forEach(s => {
              s.items = s.items.filter(id => id !== item.itemId);
            });
          }
        }
      }
    });
  }

  duplicateItem(item: DashboardItem): void {
    const newItem = JSON.parse(JSON.stringify(item));
    newItem.itemId = 'item-' + Date.now();
    newItem.title = (newItem.title || '') + ' (copy)';
    this.dashboard.items?.push(newItem);
    this.showSuccess('Item duplicato');
  }

  // ============================================
  // JSON EDITOR
  // ============================================

  openJsonEditor(): void {
    this.jsonContent = JSON.stringify(this.dashboard, null, 2);
    this.jsonError = '';
    this.showJsonDialog = true;
  }

  applyJson(): void {
    try {
      const parsed = JSON.parse(this.jsonContent);
      this.dashboard = parsed;
      this.initializeDefaults();
      this.showJsonDialog = false;
      this.showSuccess('JSON applicato con successo');
    } catch (e: any) {
      this.jsonError = 'JSON non valido: ' + e.message;
    }
  }

  copyJson(): void {
    navigator.clipboard.writeText(this.jsonContent);
    this.showSuccess('JSON copiato negli appunti');
  }

  // ============================================
  // HELPERS
  // ============================================

  getDatasetOptions(): { label: string; value: string }[] {
    return (this.dashboard.datasets || []).map(d => ({
      label: d.datasetId,
      value: d.datasetId
    }));
  }

  getItemOptions(): { label: string; value: string }[] {
    return (this.dashboard.items || []).map(i => ({
      label: i.title || i.itemId,
      value: i.itemId
    }));
  }

  getSectionOptions(): { label: string; value: string }[] {
    return (this.dashboard.layout?.sections || []).map(s => ({
      label: s.title || s.sectionId,
      value: s.sectionId
    }));
  }

  getParentItemOptions(currentItem?: DashboardItem): { label: string; value: string | null }[] {
    const options: { label: string; value: string | null }[] = [
      { label: '(None - Root level)', value: null }
    ];
    const excludeItemId = currentItem?.itemId || this.selectedItem?.itemId;
    (this.dashboard.items || []).forEach(i => {
      if (i.itemId !== excludeItemId) {
        options.push({
          label: i.title || i.itemId,
          value: i.itemId
        });
      }
    });
    return options;
  }

  /**
   * Move item up in the list
   */
  moveItemUp(index: number): void {
    if (!this.dashboard.items || index <= 0) return;
    const items = this.dashboard.items;
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
  }

  /**
   * Move item down in the list
   */
  moveItemDown(index: number): void {
    if (!this.dashboard.items || index >= this.dashboard.items.length - 1) return;
    const items = this.dashboard.items;
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
  }

  // ============================================
  // ITEM TYPE CONFIG HELPERS
  // ============================================

  initCardConfig(): void {
    if (!this.selectedItem) return;
    if (!this.selectedItem.cardConfig) {
      this.selectedItem.cardConfig = {
        format: 'number',
        decimals: 0
      };
    }
  }

  initChartConfig(): void {
    if (!this.selectedItem) return;
    if (!this.selectedItem.chartConfig) {
      this.selectedItem.chartConfig = {
        chartType: 'bar',
        showLegend: true,
        legendPosition: 'top',
        showGrid: true,
        height: 300,
        xAxis: { field: '', label: '' },
        series: []
      };
    }
    // Assicura che xAxis sia sempre definito
    if (!this.selectedItem.chartConfig.xAxis) {
      this.selectedItem.chartConfig.xAxis = { field: '', label: '' };
    }
  }

  initGridConfig(): void {
    if (!this.selectedItem) return;
    if (!this.selectedItem.gridConfig) {
      this.selectedItem.gridConfig = {
        columns: [],
        pageSize: 10,
        showPagination: true,
        showTotals: false
      };
    }
  }

  // Grid columns management
  addGridColumn(): void {
    if (!this.selectedItem?.gridConfig?.columns) {
      if (this.selectedItem) {
        this.initGridConfig();
      }
    }
    this.selectedItem?.gridConfig?.columns?.push({
      field: '',
      header: '',
      format: 'text',
      align: 'left',
      sortable: true
    });
  }

  removeGridColumn(index: number): void {
    this.selectedItem?.gridConfig?.columns?.splice(index, 1);
  }

  // Chart series management
  addChartSeries(): void {
    if (!this.selectedItem?.chartConfig?.series) {
      if (this.selectedItem) {
        this.initChartConfig();
        if (this.selectedItem.chartConfig) {
          this.selectedItem.chartConfig.series = [];
        }
      }
    }
    this.selectedItem?.chartConfig?.series?.push({
      field: '',
      label: ''
    });
  }

  removeChartSeries(index: number): void {
    this.selectedItem?.chartConfig?.series?.splice(index, 1);
  }

  // Aggregation management
  initAggregationRule(): void {
    if (!this.selectedItem) return;
    if (!this.selectedItem.aggregationRule) {
      this.selectedItem.aggregationRule = {
        groupBy: [],
        aggregations: [],
        sortBy: { field: '', order: 'desc' },
        limit: 0
      };
    }
    if (!this.selectedItem.aggregationRule.sortBy) {
      this.selectedItem.aggregationRule.sortBy = { field: '', order: 'desc' };
    }
  }

  addAggregation(): void {
    if (!this.selectedItem?.aggregationRule?.aggregations) {
      this.initAggregationRule();
      if (this.selectedItem?.aggregationRule) {
        this.selectedItem.aggregationRule.aggregations = [];
      }
    }
    this.selectedItem?.aggregationRule?.aggregations?.push({
      field: '',
      operation: 'sum',
      alias: ''
    });
  }

  removeAggregation(index: number): void {
    this.selectedItem?.aggregationRule?.aggregations?.splice(index, 1);
  }

  // ============================================
  // ARRAY HELPERS FOR TEMPLATE
  // ============================================

  /**
   * Parse comma-separated string to array (for section items)
   */
  parseSectionItems(value: string): void {
    if (this.selectedSection) {
      this.selectedSection.items = value.split(',').map(s => s.trim()).filter(s => s);
    }
  }

  /**
   * Parse comma-separated string to array (for groupBy)
   */
  parseGroupBy(value: string): void {
    this.initAggregationRule();
    if (this.selectedItem?.aggregationRule) {
      this.selectedItem.aggregationRule.groupBy = value.split(',').map(s => s.trim()).filter(s => s);
    }
  }

  /**
   * Get section items as comma-separated string
   */
  getSectionItemsString(): string {
    return this.selectedSection?.items?.join(', ') || '';
  }

  /**
   * Get available items for section multi-select
   */
  getAvailableItemsForSection(): { label: string; value: string }[] {
    if (!this.dashboard.items) return [];
    return this.dashboard.items.map(item => ({
      label: item.title ? `${item.itemId} - ${item.title}` : item.itemId,
      value: item.itemId
    }));
  }

  /**
   * Get groupBy as comma-separated string
   */
  getGroupByString(): string {
    return this.selectedItem?.aggregationRule?.groupBy?.join(', ') || '';
  }

  /**
   * Get/Set sortBy field
   */
  getSortByField(): string {
    return this.selectedItem?.aggregationRule?.sortBy?.field || '';
  }

  setSortByField(value: string): void {
    this.initAggregationRule();
    if (this.selectedItem?.aggregationRule?.sortBy) {
      this.selectedItem.aggregationRule.sortBy.field = value;
    }
  }

  /**
   * Get/Set sortBy order
   */
  getSortByOrder(): string {
    return this.selectedItem?.aggregationRule?.sortBy?.order || 'desc';
  }

  setSortByOrder(value: 'asc' | 'desc'): void {
    this.initAggregationRule();
    if (this.selectedItem?.aggregationRule?.sortBy) {
      this.selectedItem.aggregationRule.sortBy.order = value;
    }
  }

  /**
   * Get/Set aggregation limit
   */
  getAggregationLimit(): number {
    return this.selectedItem?.aggregationRule?.limit || 0;
  }

  setAggregationLimit(value: number): void {
    this.initAggregationRule();
    if (this.selectedItem?.aggregationRule) {
      this.selectedItem.aggregationRule.limit = value;
    }
  }

  /**
   * Get layout sections (safe accessor)
   */
  getLayoutSections(): LayoutSection[] {
    return this.dashboard.layout?.sections || [];
  }

  // ============================================
  // MESSAGES
  // ============================================

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Errore',
      detail: message,
      life: 5000
    });
  }

  private showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Successo',
      detail: message,
      life: 3000
    });
  }

  // ============================================
  // PREVIEW FUNCTIONALITY
  // ============================================

  /**
   * Open the preview mapping dialog
   * Shows available caches and allows mapping datasets to cache keys
   */
  async openPreviewMapping(): Promise<void> {
    if (!this.dashboard.datasets || this.dashboard.datasets.length === 0) {
      this.showError('Aggiungi almeno un dataset prima di fare il preview');
      return;
    }

    // Initialize mappings from datasets
    this.previewDatasetMappings = (this.dashboard.datasets || []).map(ds => ({
      datasetId: ds.datasetId,
      cacheKey: ds.cacheKey || '',
      description: ds.description
    }));

    // Load available caches
    await this.loadAvailableCaches();

    this.showPreviewMappingDialog = true;
  }

  /**
   * Load list of available caches from server
   */
  async loadAvailableCaches(): Promise<void> {
    this.previewLoading = true;

    // Usa l'endpoint per listare le cache condivise (userId = 'shared')
    this.userDataService.listExcelCaches(this.prjId).subscribe({
      next: (response) => {
        if (response.success && response.caches) {
          this.availableCaches = response.caches.map((cache: any) => ({
            label: `${cache.pageCode} (${cache.metadata?.recordCount || 0} records)`,
            value: cache.pageCode,
            recordCount: cache.metadata?.recordCount || 0
          }));
        } else {
          this.availableCaches = [];
        }
        this.previewLoading = false;
      },
      error: (err) => {
        console.error('Error loading caches:', err);
        this.availableCaches = [];
        this.previewLoading = false;
      }
    });
  }

  /**
   * Start the preview with the configured mappings
   */
  async startPreview(): Promise<void> {
    // Check all datasets have cache mappings
    const unmapped = this.previewDatasetMappings.filter(m => !m.cacheKey);
    if (unmapped.length > 0) {
      this.showError(`Configura la cache per tutti i dataset: ${unmapped.map(m => m.datasetId).join(', ')}`);
      return;
    }

    this.previewLoading = true;
    this.previewData.clear();

    try {
      // Load data for each dataset from cache
      const loadPromises = this.previewDatasetMappings.map(mapping =>
        this.loadCacheData(mapping.datasetId, mapping.cacheKey)
      );

      await Promise.all(loadPromises);

      // Setup preview dashboard config
      this.previewDashboardConfig = {
        prjId: this.dashboard.prjId,
        dashboardCode: this.dashboard.dashboardCode,
        connCode: this.dashboard.connCode,
        title: this.dashboard.title
      };

      // Close mapping dialog and open preview
      this.showPreviewMappingDialog = false;
      this.showPreviewDialog = true;

    } catch (error) {
      console.error('Error loading preview data:', error);
      this.showError('Errore nel caricamento dei dati per il preview');
    } finally {
      this.previewLoading = false;
    }
  }

  /**
   * Load data from cache for a specific dataset
   */
  private loadCacheData(datasetId: string, cacheKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userDataService.loadExcelCache<any[]>(this.prjId, cacheKey, 'shared').subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.previewData.set(datasetId, response.data);
            console.log(`Loaded ${response.data.length} records for dataset ${datasetId} from cache ${cacheKey}`);
          } else {
            this.previewData.set(datasetId, []);
          }
          resolve();
        },
        error: (err) => {
          console.error(`Error loading cache ${cacheKey}:`, err);
          this.previewData.set(datasetId, []);
          resolve(); // Don't reject, just use empty data
        }
      });
    });
  }

  /**
   * Handle data request from dashboard preview
   */
  onPreviewDataRequest(event: { dataset: any; callback: (data: any[]) => void }): void {
    const { dataset, callback } = event;
    const datasetId = dataset.datasetId;

    // Get data from previewData map
    const data = this.previewData.get(datasetId) || [];
    console.log(`Preview data request for ${datasetId}: ${data.length} records`);
    callback(data);
  }

  /**
   * Close preview dialog
   */
  closePreview(): void {
    this.showPreviewDialog = false;
    this.previewData.clear();
  }
}
