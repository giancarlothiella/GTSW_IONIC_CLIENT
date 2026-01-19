/**
 * GTS Dashboard Component
 *
 * Componente contenitore per dashboard dinamiche da metadati MongoDB.
 * Renderizza card, chart e grid con supporto drill-down multi-livello.
 *
 * Caratteristiche:
 * - Layout responsive con CSS Grid
 * - Drill-down click su elementi → livello successivo
 * - Aggregazione dati client-side (stessa logica AI Analyzer)
 * - Supporto dataAdapter GTSuite per sorgente dati
 */

import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tooltip } from 'primeng/tooltip';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';

// Services
import { DashboardService, Dashboard, DashboardItem, DashboardSection, DashboardDataset, DashboardSettings, DashboardFilterConfig } from '../../services/dashboard.service';
import { GtsDataService } from '../../services/gts-data.service';
import { TranslationService } from '../../services/translation.service';

// Sub-components
import { GtsDashCardComponent } from './gts-dash-card.component';
import { GtsDashChartComponent } from './gts-dash-chart.component';
import { GtsDashGridComponent } from './gts-dash-grid.component';

// ============================================
// INTERFACES
// ============================================

export interface DashboardConfig {
  prjId: string;
  dashboardCode: string;
  connCode?: string;
  title?: string;
}

/**
 * Singolo filtro nella catena drill-down
 */
interface DrillDownFilter {
  field: string;
  value: any;
  itemId: string;  // ID dell'item che ha generato questo filtro
  itemTitle?: string;  // Titolo dell'item per il breadcrumb
}

/**
 * Drill-down per posizione: ogni posizione nella sezione può avere il proprio livello
 * Key: "sectionId:position" (es. "rankings-bar:0")
 * Value: { level, filters (catena cumulativa), parentItemId }
 */
interface PositionDrillDownState {
  level: number;
  parentItemId: string | null;
  // Catena cumulativa di filtri (ogni livello aggiunge un filtro)
  filters: DrillDownFilter[];
  // Mantenuti per retrocompatibilità - rappresentano l'ultimo filtro
  filterField: string | null;
  filterValue: any;
}

interface DrillDownState {
  // Mappa: "sectionId:position" -> stato drill-down per quella posizione
  positions: Map<string, PositionDrillDownState>;
  // History per tornare indietro (per posizione)
  history: Map<string, PositionDrillDownState[]>;
}

@Component({
  selector: 'app-gts-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ProgressSpinner,
    Tooltip,
    Toast,
    Select,
    GtsDashCardComponent,
    GtsDashChartComponent,
    GtsDashGridComponent
  ],
  providers: [MessageService],
  templateUrl: './gts-dashboard.component.html',
  styleUrls: ['./gts-dashboard.component.scss']
})
export class GtsDashboardComponent implements OnInit, OnDestroy, OnChanges {

  // ============================================
  // INPUTS
  // ============================================

  @Input() config!: DashboardConfig;
  @Input() visible: boolean = true;

  // Override config: se fornito, usa questa configurazione invece di caricarla dal server
  // Utile per il preview nel dashboard builder
  @Input() overrideConfig: Dashboard | null = null;

  // Raw data con setter per normalizzazione automatica
  private _rawData: any[] = [];
  @Input()
  set rawData(value: any[]) {
    this._rawData = this.normalizeFieldNames(value);
    // Se dashboard già caricata, ricalcola gli items
    if (this.dashboard) {
      this.itemDataCache.clear();
      this.processAllItems();
    }
  }
  get rawData(): any[] {
    return this._rawData;
  }

  // ============================================
  // OUTPUTS
  // ============================================

  @Output() onItemClick = new EventEmitter<{ item: DashboardItem; data: any }>();
  @Output() onRefresh = new EventEmitter<void>();
  @Output() onDataRequest = new EventEmitter<{ dataset: DashboardDataset; callback: (data: any[]) => void }>();

  // ============================================
  // STATE
  // ============================================

  dashboard: Dashboard | null = null;
  loading: boolean = false;
  error: string | null = null;

  // Drill-down state per posizione
  drillDown: DrillDownState = {
    positions: new Map<string, PositionDrillDownState>(),
    history: new Map<string, PositionDrillDownState[]>()
  };

  // Cache dati aggregati per item
  private itemDataCache: Map<string, any[]> = new Map();

  // Cache dati originali per dataset (key = datasetId) - NON filtrati
  private datasetCacheOriginal: Map<string, any[]> = new Map();

  // Cache dati per dataset (key = datasetId) - può contenere dati filtrati
  private datasetCache: Map<string, any[]> = new Map();

  // ============================================
  // FILTERS STATE
  // ============================================

  // Valori filtri correnti (non ancora applicati)
  filterValues: Map<string, any> = new Map();

  // Valori filtri applicati (dopo click su Refresh)
  appliedFilterValues: Map<string, any> = new Map();

  // Opzioni per filtri con options: 'auto'
  filterOptions: Map<string, Array<{ label: string; value: any }>> = new Map();

  // Settings della dashboard (per formattazione)
  get settings(): DashboardSettings {
    return this.dashboard?.settings || { locale: 'it-IT', currency: 'EUR' };
  }

  constructor(
    private dashboardService: DashboardService,
    private gtsDataService: GtsDataService,
    private translationService: TranslationService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  // ============================================
  // LIFECYCLE
  // ============================================

  ngOnInit(): void {
    if (this.config) {
      this.loadDashboard();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Quando la dashboard diventa visibile e i dati sono già caricati
    if (changes['visible'] && changes['visible'].currentValue === true && !changes['visible'].firstChange) {
      console.log('[ngOnChanges] Dashboard diventa visibile, inizializzo filtri');
      // Se i dati sono già stati caricati, inizializza i filtri ora
      if (this.datasetCacheOriginal.size > 0 && this.dashboard) {
        this.initializeFilters();
        this.applyFilters();
      }
    }
  }

  ngOnDestroy(): void {
    this.itemDataCache.clear();
    this.datasetCache.clear();
    this.filterValues.clear();
    this.appliedFilterValues.clear();
    this.filterOptions.clear();
  }

  // ============================================
  // DATA LOADING
  // ============================================

  async loadDashboard(): Promise<void> {
    // Se overrideConfig è fornito, usalo direttamente senza caricare dal server
    if (this.overrideConfig) {
      this.loading = true;
      this.error = null;

      try {
        this.dashboard = this.overrideConfig as Dashboard;

        console.log('Dashboard loaded from overrideConfig:', this.dashboard?.title);
        console.log('Datasets:', this.dashboard?.datasets);

        // Richiedi i dati alla pagina padre
        if (this.dashboard?.datasets && this.dashboard.datasets.length > 0) {
          this.requestDatasets();
        } else if (this.dashboard && this.rawData.length > 0) {
          this.processAllItems();
        }
      } catch (err: any) {
        console.error('Error loading dashboard from override:', err);
        this.error = err.message || 'Error loading dashboard';
        this.showError(this.error!);
      } finally {
        this.loading = false;
        this.cdr.detectChanges();
      }
      return;
    }

    if (!this.config?.prjId || !this.config?.dashboardCode) {
      this.error = 'Configuration missing: prjId and dashboardCode required';
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      this.dashboard = await this.dashboardService.getDashboard(
        this.config.prjId,
        this.config.dashboardCode,
        this.config.connCode
      ).toPromise() || null;

      // DEBUG: log dashboard sections
      console.log('Dashboard loaded:', this.dashboard?.title);
      console.log('Sections:', this.dashboard?.layout?.sections);
      console.log('Items count:', this.dashboard?.items?.length);
      console.log('Datasets:', this.dashboard?.datasets);

      // Se ci sono datasets definiti, richiedi i dati alla pagina padre
      if (this.dashboard?.datasets && this.dashboard.datasets.length > 0) {
        this.requestDatasets();
      } else if (this.dashboard && this.rawData.length > 0) {
        // Fallback: usa rawData se già fornito (retrocompatibilità)
        this.processAllItems();
      }
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      this.error = err.message || 'Error loading dashboard';
      this.showError(this.error!);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Ricarica i dati della dashboard
   */
  /**
   * Ricarica la dashboard applicando i filtri correnti
   * Chiamato quando l'utente clicca sul pulsante Refresh
   */
  refresh(): void {
    this.itemDataCache.clear();
    this.resetDrillDown();

    // Applica i filtri e ricalcola
    this.applyFilters();

    this.onRefresh.emit();
  }

  /**
   * Aggiorna i dati raw e ricalcola tutto
   */
  updateData(newData: any[]): void {
    // Il setter rawData già normalizza e ricalcola
    this.rawData = newData;
    this.cdr.detectChanges();
  }

  /**
   * Richiede i dati per TUTTI i dataset definiti nella dashboard
   * Emette evento onDataRequest per ogni dataset in parallelo
   */
  private requestDatasets(): void {
    if (!this.dashboard?.datasets || this.dashboard.datasets.length === 0) return;

    // Conta quanti dataset dobbiamo caricare
    this.pendingDatasets = this.dashboard.datasets.length;
    console.log(`Requesting ${this.pendingDatasets} datasets...`);

    // Richiedi tutti i dataset in parallelo
    this.dashboard.datasets.forEach(dataset => {
      console.log('Requesting data for dataset:', dataset.datasetId, '(', dataset.dataSetCode, ')');
      this.onDataRequest.emit({
        dataset: dataset,
        callback: (data: any[]) => this.onDatasetReceived(dataset.datasetId, data)
      });
    });
  }

  // Contatore dataset pendenti
  private pendingDatasets: number = 0;

  /**
   * Callback quando i dati di un dataset sono stati caricati
   */
  private onDatasetReceived(datasetId: string, data: any[]): void {
    // Log dati PRIMA della normalizzazione
    if (data && data.length > 0) {
      console.log(`[DEBUG] ORIGINAL keys (before normalize):`, Object.keys(data[0]));
      console.log(`[DEBUG] ORIGINAL sample row:`, data[0]);
    }
    // Normalizza e salva nella cache ORIGINALE (non filtrata)
    const normalizedData = this.normalizeFieldNames(data);
    console.log(`Dataset ${datasetId} received: ${normalizedData.length} records`);
    if (normalizedData.length > 0) {
      console.log(`[DEBUG] NORMALIZED keys:`, Object.keys(normalizedData[0]));
      console.log(`[DEBUG] NORMALIZED sample row:`, normalizedData[0]);
    }
    this.datasetCacheOriginal.set(datasetId, normalizedData);
    // Inizialmente, anche la cache normale ha gli stessi dati
    this.datasetCache.set(datasetId, normalizedData);

    // Decrementa contatore pendenti
    this.pendingDatasets--;
    console.log(`Pending datasets: ${this.pendingDatasets}`);

    // Quando tutti i dataset sono caricati, processa gli items
    if (this.pendingDatasets <= 0) {
      console.log('All datasets loaded, processing items...');
      // Per retrocompatibilità, usa il primo dataset come rawData
      const primaryDataset = this.getPrimaryDataset();
      if (primaryDataset) {
        this._rawData = this.datasetCache.get(primaryDataset.datasetId) || [];
      }

      // IMPORTANTE: Inizializza e applica filtri SOLO se la dashboard è visibile
      if (this.visible) {
        console.log('[onDatasetReceived] Dashboard visibile, inizializzo filtri');
        // Inizializza i filtri
        this.initializeFilters();
        // Applica filtri di default e processa items
        this.applyFilters();
      } else {
        console.log('[onDatasetReceived] Dashboard NON visibile, skip inizializzazione filtri');
      }
    }
  }

  /**
   * Metodo pubblico per fornire i dati di un dataset dall'esterno
   * Usato dalla pagina padre per passare i dati caricati dalla cache
   */
  setDatasetData(datasetId: string, data: any[]): void {
    this.onDatasetReceived(datasetId, data);
  }

  /**
   * Ottiene la configurazione di un dataset per ID
   */
  getDataset(datasetId: string): DashboardDataset | undefined {
    return this.dashboard?.datasets?.find(d => d.datasetId === datasetId);
  }

  /**
   * Ottiene il dataset primario (il primo definito)
   */
  getPrimaryDataset(): DashboardDataset | undefined {
    return this.dashboard?.datasets?.[0];
  }

  /**
   * Ottiene i dati cached per un dataset specifico
   */
  getDatasetData(datasetId: string): any[] {
    return this.datasetCache.get(datasetId) || [];
  }

  /**
   * Verifica se tutti i dataset sono stati caricati
   */
  allDatasetsLoaded(): boolean {
    if (!this.dashboard?.datasets) return true;
    return this.dashboard.datasets.every(ds => this.datasetCache.has(ds.datasetId));
  }

  /**
   * Normalizza tutti i nomi dei campi in minuscolo per evitare problemi case-sensitivity
   */
  private normalizeFieldNames(data: any[]): any[] {
    if (!Array.isArray(data) || data.length === 0) return [];

    return data.map(row => {
      const normalized: any = {};
      Object.keys(row).forEach(key => {
        normalized[key.toLowerCase()] = row[key];
      });
      return normalized;
    });
  }

  // ============================================
  // FILTERS
  // ============================================

  /**
   * Inizializza i filtri con i valori di default e genera opzioni 'auto'
   */
  private initializeFilters(): void {
    if (!this.dashboard?.filters || this.dashboard.filters.length === 0) {
      console.log('[initializeFilters] Nessun filtro configurato');
      return;
    }

    console.log('[initializeFilters] Inizializzo', this.dashboard.filters.length, 'filtri');

    this.dashboard.filters.forEach(filterConfig => {
      // Imposta valore di default
      const defaultValue = filterConfig.defaultValue !== undefined ? filterConfig.defaultValue : 'all';
      this.filterValues.set(filterConfig.field, defaultValue);
      this.appliedFilterValues.set(filterConfig.field, defaultValue);
      console.log(`[initializeFilters] Filtro ${filterConfig.field}: defaultValue = ${defaultValue}`);

      // Genera opzioni automatiche se richiesto
      if (filterConfig.options === 'auto') {
        console.log(`[initializeFilters] Generazione auto-options per ${filterConfig.field} da dataset ${filterConfig.datasetId}`);
        this.generateAutoOptions(filterConfig);
      } else if (Array.isArray(filterConfig.options)) {
        this.filterOptions.set(filterConfig.field, filterConfig.options);
        console.log(`[initializeFilters] Opzioni manuali per ${filterConfig.field}:`, filterConfig.options.length);
      }
    });

    console.log('[initializeFilters] Completato');
  }

  /**
   * Genera opzioni automatiche per un filtro dai dati del dataset
   */
  private generateAutoOptions(filterConfig: DashboardFilterConfig): void {
    const dataset = this.datasetCache.get(filterConfig.datasetId);
    if (!dataset || dataset.length === 0) {
      console.warn(`[generateAutoOptions] Dataset ${filterConfig.datasetId} non trovato o vuoto`);
      return;
    }

    const field = filterConfig.field.toLowerCase();
    const uniqueValues = new Set<any>();

    dataset.forEach(row => {
      const value = row[field];
      if (value !== undefined && value !== null && value !== '') {
        uniqueValues.add(value);
      }
    });

    console.log(`[generateAutoOptions] Campo ${field}: ${uniqueValues.size} valori unici`);

    // Ordina i valori (numeri per valore, stringhe alfabeticamente)
    const sortedValues = Array.from(uniqueValues).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return b - a; // Numeri in ordine decrescente (anni più recenti prima)
      }
      return String(a).localeCompare(String(b));
    });

    // Crea opzioni con 'Tutti' come prima opzione
    const options = [
      { label: this.t(1518, 'Tutti'), value: 'all' },
      ...sortedValues.map(val => ({ label: String(val), value: val }))
    ];

    this.filterOptions.set(filterConfig.field, options);
    console.log(`[generateAutoOptions] Opzioni generate per ${field}:`, options.length);
  }

  /**
   * Ottiene le opzioni per un filtro
   */
  getFilterOptions(field: string): Array<{ label: string; value: any }> {
    return this.filterOptions.get(field) || [];
  }

  /**
   * Ottiene il valore corrente di un filtro
   */
  getFilterValue(field: string): any {
    return this.filterValues.get(field);
  }

  /**
   * Imposta il valore di un filtro (NON applica ancora il filtro)
   */
  setFilterValue(field: string, value: any): void {
    this.filterValues.set(field, value);
  }

  /**
   * Ottiene i filtri configurati
   */
  getFilters(): DashboardFilterConfig[] {
    return this.dashboard?.filters || [];
  }

  /**
   * Verifica se un filtro deve essere disabilitato per dipendenza
   */
  isFilterDisabled(filterConfig: DashboardFilterConfig): boolean {
    if (!filterConfig.dependsOn) return false;

    // Verifica se il filtro da cui dipende ha valore 'all'
    const dependsOnValue = this.filterValues.get(filterConfig.dependsOn);
    return dependsOnValue === 'all' || dependsOnValue === undefined;
  }

  /**
   * Applica i filtri correnti ai dataset e ricalcola gli items
   * Questo metodo viene chiamato solo quando l'utente clicca su Refresh
   */
  applyFilters(): void {
    try {
      console.log('[applyFilters] Inizio applicazione filtri');

      // Copia i valori correnti nei valori applicati
      this.filterValues.forEach((value, key) => {
        this.appliedFilterValues.set(key, value);
        console.log(`[applyFilters] Filtro ${key} applicato: ${value}`);
      });

      // Filtra i dataset in base ai filtri applicati
      this.filterDatasets();

      // Ricalcola tutti gli items con i dati filtrati
      this.itemDataCache.clear();
      this.processAllItems();
      this.cdr.detectChanges();

      console.log('[applyFilters] Filtri applicati con successo');
    } catch (error) {
      console.error('[applyFilters] Errore durante applicazione filtri:', error);
      // In caso di errore, non bloccare l'app, usa i dati non filtrati
      this.filterDatasets(); // Ripristina dati originali
      this.processAllItems();
      this.cdr.detectChanges();
    }
  }

  /**
   * Filtra i dataset in base ai filtri applicati
   */
  private filterDatasets(): void {
    if (!this.dashboard?.filters || this.dashboard.filters.length === 0) {
      // Nessun filtro: ripristina i dati originali
      this.datasetCacheOriginal.forEach((originalData, datasetId) => {
        this.datasetCache.set(datasetId, originalData);
      });
    } else {
      // Per ogni dataset ORIGINALE, crea una versione filtrata
      this.datasetCacheOriginal.forEach((originalData, datasetId) => {
        const filteredData = this.applyDatasetFilters(originalData, datasetId);
        // Sovrascrivi la cache con i dati filtrati
        this.datasetCache.set(datasetId, filteredData);
      });
    }

    // Aggiorna anche rawData per retrocompatibilità
    const primaryDataset = this.getPrimaryDataset();
    if (primaryDataset) {
      this._rawData = this.datasetCache.get(primaryDataset.datasetId) || [];
    }
  }

  /**
   * Applica i filtri attivi a un dataset specifico
   */
  private applyDatasetFilters(data: any[], datasetId: string): any[] {
    if (!this.dashboard?.filters) return data;

    let filtered = [...data];

    // Applica ogni filtro che si riferisce a questo dataset
    this.dashboard.filters.forEach(filterConfig => {
      if (filterConfig.datasetId !== datasetId) return;

      const filterValue = this.appliedFilterValues.get(filterConfig.field);
      if (filterValue === undefined || filterValue === 'all') return;

      const field = filterConfig.field.toLowerCase();

      filtered = filtered.filter(row => {
        const rowValue = row[field];

        // Gestione speciale per trimestre
        if (filterConfig.field.toLowerCase() === 'trimestre' && filterValue !== 'all') {
          const month = String(row['mese'] || '').padStart(2, '0');
          const quarterMonths = this.getQuarterMonths(filterValue);
          return quarterMonths.includes(month);
        }

        // Gestione speciale per mese
        if (filterConfig.field.toLowerCase() === 'mese' && filterValue !== 'all') {
          const month = String(row['mese'] || '').padStart(2, '0');
          return month === filterValue;
        }

        // Confronto normale
        return rowValue == filterValue;
      });
    });

    return filtered;
  }

  /**
   * Ritorna i mesi di un trimestre
   */
  private getQuarterMonths(quarter: string): string[] {
    switch (quarter) {
      case 'Q1': return ['01', '02', '03'];
      case 'Q2': return ['04', '05', '06'];
      case 'Q3': return ['07', '08', '09'];
      case 'Q4': return ['10', '11', '12'];
      default: return [];
    }
  }

  /**
   * Ottiene la label per i filtri attivi (da mostrare nell'header)
   */
  getAppliedFiltersLabel(): string {
    if (!this.dashboard?.filters) return '';

    const activeFilters: string[] = [];

    this.dashboard.filters.forEach(filterConfig => {
      const value = this.appliedFilterValues.get(filterConfig.field);
      if (value !== undefined && value !== 'all') {
        // Trova la label corrispondente al valore
        const options = this.filterOptions.get(filterConfig.field);
        const option = options?.find(opt => opt.value === value);
        const label = option?.label || String(value);
        activeFilters.push(`${filterConfig.label}: ${label}`);
      }
    });

    return activeFilters.join(' | ');
  }

  /**
   * Verifica se ci sono filtri attivi
   */
  hasActiveFilters(): boolean {
    if (!this.dashboard?.filters) return false;

    return Array.from(this.appliedFilterValues.values()).some(val => val !== 'all' && val !== undefined);
  }

  /**
   * Reset tutti i filtri ai valori di default
   */
  resetFilters(): void {
    if (!this.dashboard?.filters) return;

    this.dashboard.filters.forEach(filterConfig => {
      const defaultValue = filterConfig.defaultValue !== undefined ? filterConfig.defaultValue : 'all';
      this.filterValues.set(filterConfig.field, defaultValue);
    });

    // Applica automaticamente il reset
    this.applyFilters();
  }

  // ============================================
  // ITEM PROCESSING
  // ============================================

  /**
   * Processa tutti gli items visibili al livello corrente
   */
  private processAllItems(): void {
    if (!this.dashboard) return;

    const visibleItems = this.getVisibleItems();
    visibleItems.forEach(item => {
      this.processItem(item);
    });
  }

  /**
   * Processa un singolo item: applica aggregazioni ai dati
   * Se l'item è di livello > 0, applica il filtro della posizione corrispondente
   * Se l'item ha un datasetId, usa il dataset dalla cache
   */
  private processItem(item: DashboardItem, sectionId?: string): void {
    // Determina la sorgente dati: usa datasetId se specificato, altrimenti rawData
    let sourceData: any[];
    if (item.datasetId && this.datasetCache.has(item.datasetId)) {
      sourceData = [...this.datasetCache.get(item.datasetId)!];
    } else {
      sourceData = [...this.rawData];
    }

    // Trova il filtro applicabile per questo item
    let filterField: string | null = null;
    let filterValue: any = null;

    // Se l'item ha un parentItemId, cerca il filtro dalla posizione del parent
    if (item.parentItemId && sectionId) {
      // Trova la posizione del parent nella sezione
      const section = this.dashboard?.layout?.sections?.find(s => s.sectionId === sectionId);
      if (section) {
        const parentIndex = section.items.indexOf(item.parentItemId);
        if (parentIndex >= 0) {
          const posKey = `${sectionId}:${parentIndex}`;
          const posState = this.drillDown.positions.get(posKey);
          if (posState) {
            filterField = posState.filterField;
            filterValue = posState.filterValue;
          }
        }
      }
    }

    // Applica drill-down filter se presente (singolo filtro - retrocompatibilità)
    if (filterField && filterValue !== null) {
      sourceData = sourceData.filter(row => row[filterField!] === filterValue);
    }

    // Applica TUTTI i filtri cumulativi della catena drill-down
    if (sectionId) {
      const section = this.dashboard?.layout?.sections?.find(s => s.sectionId === sectionId);
      if (section) {
        const posIdx = section.items.indexOf(item.itemId);
        // Cerca anche negli items figli
        let foundPosIdx = posIdx;
        if (foundPosIdx < 0) {
          // Item figlio: trova la posizione del parent originale
          for (let i = 0; i < section.items.length; i++) {
            const posKey = `${sectionId}:${i}`;
            const posState = this.drillDown.positions.get(posKey);
            if (posState && posState.parentItemId) {
              // Verifica se questo item è nella catena di drill-down di questa posizione
              const childItems = this.getChildItemsChain(posState.parentItemId);
              if (childItems.includes(item.itemId)) {
                foundPosIdx = i;
                break;
              }
            }
          }
        }

        if (foundPosIdx >= 0) {
          const posKey = `${sectionId}:${foundPosIdx}`;
          const posState = this.drillDown.positions.get(posKey);
          if (posState && posState.filters && posState.filters.length > 0) {
            // Applica tutti i filtri della catena
            posState.filters.forEach(f => {
              sourceData = sourceData.filter(row => row[f.field] === f.value);
            });
          }
        }
      }
    }

    if (!item.aggregationRule) {
      // Nessuna aggregazione, usa dati filtrati
      this.itemDataCache.set(item.itemId, sourceData);
      return;
    }

    // Applica aggregazione
    const aggregatedData = this.applyAggregationRules(sourceData, { aggregationRule: item.aggregationRule });
    console.log(`[processItem] Item ${item.itemId}: sourceData=${sourceData.length} rows, aggregatedData=`, aggregatedData);
    this.itemDataCache.set(item.itemId, aggregatedData);
  }

  /**
   * Ottiene i dati processati per un item
   */
  getItemData(itemId: string): any[] {
    return this.itemDataCache.get(itemId) || [];
  }

  // ============================================
  // VISIBLE ITEMS
  // ============================================

  /**
   * Ritorna tutti gli items visibili (usato per processing)
   * Con drill-down per posizione, ritorna tutti gli items che potrebbero essere visibili
   */
  getVisibleItems(): DashboardItem[] {
    if (!this.dashboard) return [];

    // Raccoglie tutti gli items che sono visibili in almeno una posizione
    const visibleItems: DashboardItem[] = [];

    this.dashboard.layout?.sections?.forEach(section => {
      const sectionItems = this.getItemsForSection(section);
      sectionItems.forEach(item => {
        if (!visibleItems.find(i => i.itemId === item.itemId)) {
          visibleItems.push(item);
        }
      });
    });

    return visibleItems;
  }

  // ============================================
  // DRILL-DOWN PER POSIZIONE
  // ============================================

  /**
   * Gestisce click su un item per drill-down
   * Trova la sezione e posizione dell'item e aggiorna solo quella posizione
   */
  onDrillDown(item: DashboardItem, clickedData: any, sectionId?: string, positionIndex?: number): void {
    // Emetti evento
    this.onItemClick.emit({ item, data: clickedData });

    // Se non abbiamo sectionId e positionIndex, cercali
    if (sectionId === undefined || positionIndex === undefined) {
      const found = this.findItemPosition(item.itemId);
      if (!found) return;
      sectionId = found.sectionId;
      positionIndex = found.position;
    }

    // Verifica se ci sono figli (items con parentItemId = questo item)
    const childItems = this.dashboard?.items.filter(
      i => i.parentItemId === item.itemId
    ) || [];

    if (childItems.length === 0) {
      // Nessun drill-down disponibile
      return;
    }

    const posKey = `${sectionId}:${positionIndex}`;

    // Ottieni stato corrente della posizione (o crea default)
    const currentState = this.drillDown.positions.get(posKey) || {
      level: 0,
      parentItemId: null,
      filters: [],
      filterField: null,
      filterValue: null
    };

    // Salva stato corrente nella history per questa posizione (deep copy dei filtri)
    if (!this.drillDown.history.has(posKey)) {
      this.drillDown.history.set(posKey, []);
    }
    this.drillDown.history.get(posKey)!.push({
      ...currentState,
      filters: [...(currentState.filters || [])]
    });

    // Costruisci la nuova catena di filtri (mantieni quelli esistenti + aggiungi il nuovo)
    const newFilters: DrillDownFilter[] = [...(currentState.filters || [])];
    if (item.drillDownFilter && clickedData) {
      newFilters.push({
        field: item.drillDownFilter,
        value: clickedData[item.drillDownFilter],
        itemId: item.itemId,
        itemTitle: item.title
      });
    }

    // Aggiorna stato drill-down per questa posizione
    const newState: PositionDrillDownState = {
      level: currentState.level + 1,
      parentItemId: item.itemId,
      filters: newFilters,
      // Retrocompatibilità: ultimo filtro
      filterField: item.drillDownFilter || null,
      filterValue: item.drillDownFilter && clickedData ? clickedData[item.drillDownFilter] : null
    };
    this.drillDown.positions.set(posKey, newState);

    // Ricalcola items per questa sezione
    this.processItemsForSection(sectionId!);
    this.cdr.detectChanges();
  }

  /**
   * Trova la sezione e posizione di un item
   */
  private findItemPosition(itemId: string): { sectionId: string; position: number } | null {
    if (!this.dashboard?.layout?.sections) return null;

    for (const section of this.dashboard.layout.sections) {
      const pos = section.items.indexOf(itemId);
      if (pos >= 0) {
        return { sectionId: section.sectionId, position: pos };
      }
    }
    return null;
  }

  /**
   * Processa gli items di una specifica sezione
   */
  private processItemsForSection(sectionId: string): void {
    if (!this.dashboard) return;

    const section = this.dashboard.layout?.sections?.find(s => s.sectionId === sectionId);
    if (!section) return;

    const items = this.getItemsForSection(section);
    items.forEach(item => {
      this.processItem(item, sectionId);
    });
  }

  /**
   * Torna al livello precedente per una specifica posizione
   */
  goBackPosition(sectionId: string, positionIndex: number): void {
    const posKey = `${sectionId}:${positionIndex}`;
    const history = this.drillDown.history.get(posKey);

    if (!history || history.length === 0) {
      // Nessuna history, rimuovi lo stato
      this.drillDown.positions.delete(posKey);
    } else {
      // Ripristina stato precedente
      const prevState = history.pop()!;
      if (prevState.level === 0) {
        this.drillDown.positions.delete(posKey);
      } else {
        this.drillDown.positions.set(posKey, prevState);
      }
    }

    this.processItemsForSection(sectionId);
    this.cdr.detectChanges();
  }

  /**
   * Torna indietro - trova quale posizione è in drill-down e torna indietro
   */
  goBack(): void {
    // Trova la prima posizione con livello > 0
    for (const [posKey, state] of this.drillDown.positions) {
      if (state.level > 0) {
        const [sectionId, posStr] = posKey.split(':');
        this.goBackPosition(sectionId, parseInt(posStr, 10));
        return;
      }
    }
  }

  /**
   * Reset al livello 0 per tutte le posizioni
   */
  resetDrillDown(): void {
    this.drillDown = {
      positions: new Map<string, PositionDrillDownState>(),
      history: new Map<string, PositionDrillDownState[]>()
    };
    this.processAllItems();
    this.cdr.detectChanges();
  }

  /**
   * Verifica se siamo in drill-down (almeno una posizione con livello > 0)
   */
  isInDrillDown(): boolean {
    for (const state of this.drillDown.positions.values()) {
      if (state.level > 0) return true;
    }
    return false;
  }

  /**
   * Ottiene lo stato drill-down per una posizione specifica
   */
  getPositionDrillDownState(sectionId: string, positionIndex: number): PositionDrillDownState | null {
    const posKey = `${sectionId}:${positionIndex}`;
    return this.drillDown.positions.get(posKey) || null;
  }

  /**
   * Verifica se una posizione è in drill-down (level > 0)
   */
  isPositionInDrillDown(sectionId: string, positionIndex: number): boolean {
    const state = this.getPositionDrillDownState(sectionId, positionIndex);
    return state !== null && state.level > 0;
  }

  /**
   * Ottiene il valore del filtro attivo per mostrarlo nel titolo
   */
  getActiveDrillDownInfo(): { field: string; value: any } | null {
    for (const state of this.drillDown.positions.values()) {
      if (state.level > 0 && state.filterField && state.filterValue) {
        return { field: state.filterField, value: state.filterValue };
      }
    }
    return null;
  }

  /**
   * Ottiene la label del drill-down per una posizione specifica (per mostrare nel titolo del chart)
   */
  getDrillDownLabel(sectionId: string, positionIndex: number): string {
    const posKey = `${sectionId}:${positionIndex}`;
    const posState = this.drillDown.positions.get(posKey);
    if (posState && posState.level > 0 && posState.filterValue) {
      return String(posState.filterValue);
    }
    return '';
  }

  /**
   * Verifica se un item ha figli (items con parentItemId = itemId)
   * Usato per mostrare dinamicamente "Click for details" solo se c'è drill-down disponibile
   */
  hasChildItems(itemId: string): boolean {
    if (!this.dashboard?.items) return false;
    return this.dashboard.items.some(item => item.parentItemId === itemId);
  }

  /**
   * Ottiene la catena di itemId figli a partire da un parentItemId
   * Usato per trovare a quale posizione appartiene un item figlio
   */
  private getChildItemsChain(parentItemId: string): string[] {
    if (!this.dashboard?.items) return [];
    const result: string[] = [];
    const children = this.dashboard.items.filter(i => i.parentItemId === parentItemId);
    children.forEach(child => {
      result.push(child.itemId);
      // Ricorsione per figli di figli
      result.push(...this.getChildItemsChain(child.itemId));
    });
    return result;
  }

  /**
   * Ottiene il breadcrumb completo per una posizione (tutti i filtri della catena)
   * Formato: "Prodotto: NEBRASKA → Cliente: MARIO CUCCHETTI"
   */
  getDrillDownBreadcrumb(sectionId: string, positionIndex: number): string {
    const posKey = `${sectionId}:${positionIndex}`;
    const posState = this.drillDown.positions.get(posKey);
    if (!posState || !posState.filters || posState.filters.length === 0) {
      return '';
    }
    return posState.filters.map(f => `${f.field}: ${f.value}`).join(' → ');
  }

  /**
   * Ottiene i filtri della catena drill-down per una posizione
   */
  getDrillDownFilters(sectionId: string, positionIndex: number): DrillDownFilter[] {
    const posKey = `${sectionId}:${positionIndex}`;
    const posState = this.drillDown.positions.get(posKey);
    return posState?.filters || [];
  }

  // ============================================
  // LAYOUT HELPERS - SECTIONS
  // ============================================

  /**
   * Ritorna le sezioni della dashboard (o una sezione default per retrocompatibilità)
   */
  getSections(): DashboardSection[] {
    if (!this.dashboard) return [];

    // Se ci sono sezioni definite, usale
    if (this.dashboard.layout?.sections && this.dashboard.layout.sections.length > 0) {
      return this.dashboard.layout.sections;
    }

    // Fallback: crea sezione unica con tutti gli items (retrocompatibilità)
    return [{
      sectionId: 'default',
      columns: this.dashboard.layout?.columns || 3,
      rowHeight: 3,
      items: this.dashboard.items.map(i => i.itemId)
    }];
  }

  /**
   * Ritorna gli items di una sezione specifica
   * Per ogni posizione, mostra l'item del livello corretto (basato sullo stato drill-down della posizione)
   */
  getItemsForSection(section: DashboardSection): DashboardItem[] {
    if (!this.dashboard) return [];

    const result: DashboardItem[] = [];

    // Per ogni posizione nella sezione, determina quale item mostrare
    section.items.forEach((itemId, positionIndex) => {
      const posKey = `${section.sectionId}:${positionIndex}`;
      const posState = this.drillDown.positions.get(posKey);
      const currentLevel = posState?.level ?? 0;
      const parentItemId = posState?.parentItemId ?? null;

      // Trova l'item da mostrare per questa posizione
      let itemToShow: DashboardItem | undefined;

      if (currentLevel === 0) {
        // Livello 0: mostra l'item originale della posizione
        itemToShow = this.dashboard!.items.find(i => i.itemId === itemId);
      } else {
        // Livello > 0: cerca l'item figlio con parentItemId corretto
        itemToShow = this.dashboard!.items.find(i =>
          i.parentItemId === parentItemId &&
          (i.level ?? 0) === currentLevel
        );
      }

      // Verifica visibilità e aggiungi
      if (itemToShow && itemToShow.visible !== false) {
        // Aggiungi info sulla posizione per il template
        (itemToShow as any)._sectionId = section.sectionId;
        (itemToShow as any)._positionIndex = positionIndex;
        result.push(itemToShow);
      }
    });

    return result.sort((a, b) => (a.position?.order || 0) - (b.position?.order || 0));
  }

  /**
   * Genera stile CSS per una sezione
   */
  getSectionStyle(section: DashboardSection): { [key: string]: string } {
    // Se la sezione non ha items visibili, nascondila
    const visibleItems = this.getItemsForSection(section);
    if (visibleItems.length === 0) {
      return { 'display': 'none' };
    }

    const gap = this.dashboard?.layout?.gap || 16;
    const baseHeight = this.dashboard?.layout?.baseRowHeight || 100;
    const sectionHeight = section.rowHeight * baseHeight;

    // Per sezioni con card (kpi-cards) usa auto-fill per wrap automatico
    const isCardSection = section.sectionId === 'kpi-cards' || section.rowHeight <= 1.5;

    if (isCardSection) {
      const minWidth = section.minItemWidth || 180;
      const maxWidth = section.maxItemWidth ? `${section.maxItemWidth}px` : '1fr';
      return {
        'display': 'grid',
        'grid-template-columns': `repeat(auto-fill, minmax(${minWidth}px, ${maxWidth}))`,
        'gap': `${gap}px`,
        'min-height': `${sectionHeight}px`
      };
    }

    // Per sezioni drill-down, usa min-height invece di height fissa
    const isDrillDownSection = section.sectionId === 'drill-down-detail';

    return {
      'display': 'grid',
      'grid-template-columns': `repeat(${section.columns}, 1fr)`,
      'gap': `${gap}px`,
      'min-height': isDrillDownSection ? `${sectionHeight}px` : undefined,
      'height': isDrillDownSection ? 'auto' : `${sectionHeight}px`
    } as { [key: string]: string };
  }

  /**
   * Genera stile CSS per il layout grid (retrocompatibilità)
   */
  getGridStyle(): { [key: string]: string } {
    const columns = this.dashboard?.layout?.columns || 2;
    const gap = this.dashboard?.layout?.gap || 16;

    return {
      'display': 'grid',
      'grid-template-columns': `repeat(${columns}, 1fr)`,
      'gap': `${gap}px`
    };
  }

  /**
   * Genera stile CSS per un item
   */
  getItemStyle(item: DashboardItem): { [key: string]: string } {
    const colSpan = item.position?.colSpan || 1;
    const rowSpan = item.position?.rowSpan || 1;

    return {
      'grid-column': `span ${colSpan}`,
      'grid-row': `span ${rowSpan}`
    };
  }

  // ============================================
  // CLIENT-SIDE AGGREGATION (from AI Analyzer)
  // ============================================

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
      result = this.applyAggregationFilters(result, filters);
    }

    // 3. GroupBy + Aggregations
    if (groupBy && groupBy.length > 0) {
      result = this.applyGroupBy(result, groupBy, aggregations || []);

      // Post-processing: crea campo 'periodo' se groupBy include anno e mese (case-insensitive)
      const hasAnno = groupBy.some((f: string) => f.toLowerCase() === 'anno');
      const hasMese = groupBy.some((f: string) => f.toLowerCase() === 'mese');
      if (hasAnno && hasMese) {
        result = result.map(row => ({
          ...row,
          periodo: `${row.anno || row.Anno}-${String(row.mese || row.Mese).padStart(2, '0')}`
        }));
      }

      // Post-processing: calcola marginePct se esistono fatturato e margine
      result = result.map(row => {
        if (row.fatturato !== undefined && row.margine !== undefined && row.fatturato > 0) {
          return { ...row, marginePct: (row.margine / row.fatturato) * 100 };
        }
        return row;
      });

    } else if (aggregations && aggregations.length > 0) {
      // No groupBy but has aggregations = aggregate all data into single row
      result = this.applyGlobalAggregation(result, aggregations);
    }

    // 4. Sort
    if (sortBy && sortBy.field) {
      result = this.applySort(result, sortBy);
    }

    // 5. Limit
    const shouldLimitBeforePivot = !(pivotByYear?.years?.length >= 2);
    if (shouldLimitBeforePivot && limit && limit > 0) {
      result = result.slice(0, limit);
    }

    // 6. PIVOT BY YEAR
    if (pivotByYear?.years?.length >= 2) {
      result = this.applyPivotByYear(result, groupBy || [], aggregations || [], pivotByYear);
      if (limit && limit > 0) {
        result = result.slice(0, limit);
      }
    }

    return result;
  }

  private applyTransformations(data: any[], transformations: any[]): any[] {
    return data.map(row => {
      const transformed = { ...row };
      transformations.forEach(transform => {
        const field = transform.field;
        if (transformed[field] === undefined || transformed[field] === null) return;
        let value = String(transformed[field]);

        switch (transform.operation) {
          case 'trim': value = value.trim(); break;
          case 'trimChars':
            if (transform.chars) {
              const chars = transform.chars;
              while (value.length > 0 && chars.includes(value[0])) value = value.substring(1);
              while (value.length > 0 && chars.includes(value[value.length - 1])) value = value.substring(0, value.length - 1);
            }
            break;
          case 'replace':
            if (transform.find !== undefined) {
              value = value.split(transform.find).join(transform.replaceWith || '');
            }
            break;
          case 'toUpperCase': value = value.toUpperCase(); break;
          case 'toLowerCase': value = value.toLowerCase(); break;
          case 'normalize':
            value = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            break;
          case 'sortWords':
            value = value.split(/\s+/).filter(w => w.length > 0)
              .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).join(' ');
            break;
        }
        transformed[field] = value;
      });
      return transformed;
    });
  }

  private applyAggregationFilters(data: any[], filters: any[]): any[] {
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
          case 'contains': return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'startsWith': return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
          case 'endsWith': return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
          case 'in': return Array.isArray(filterValue) && filterValue.includes(value);
          case 'between': return Array.isArray(filterValue) && value >= filterValue[0] && value <= filterValue[1];
          default: return true;
        }
      });
    });
  }

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
      Object.keys(group).forEach(k => { if (k !== '_rows') aggregated[k] = group[k]; });

      aggregations.forEach(agg => {
        const alias = agg.alias || agg.field;
        const values = group._rows.map((r: any) => r[agg.field]).filter((v: any) => v !== undefined && v !== null);

        switch (agg.operation) {
          case 'sum':
            aggregated[alias] = values.reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0);
            break;
          case 'avg':
            aggregated[alias] = values.length > 0
              ? values.reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0) / values.length : 0;
            break;
          case 'count': aggregated[alias] = group._rows.length; break;
          case 'countDistinct':
            aggregated[alias] = new Set(values).size;
            break;
          case 'min': aggregated[alias] = Math.min(...values.map((v: any) => parseFloat(v) || 0)); break;
          case 'max': aggregated[alias] = Math.max(...values.map((v: any) => parseFloat(v) || 0)); break;
          case 'first': aggregated[alias] = values[0]; break;
          case 'last': aggregated[alias] = values[values.length - 1]; break;
          case 'concat': aggregated[alias] = values.join(agg.separator || ', '); break;
        }
      });
      return aggregated;
    });
  }

  /**
   * Aggregazione globale senza groupBy - produce un singolo record
   */
  private applyGlobalAggregation(data: any[], aggregations: any[]): any[] {
    if (data.length === 0) return [];

    const aggregated: any = {};

    aggregations.forEach(agg => {
      const alias = agg.alias || agg.field;
      const values = data.map(r => r[agg.field]).filter(v => v !== undefined && v !== null);

      switch (agg.operation) {
        case 'sum':
          aggregated[alias] = values.reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
          break;
        case 'avg':
          aggregated[alias] = values.length > 0
            ? values.reduce((sum, v) => sum + (parseFloat(v) || 0), 0) / values.length : 0;
          break;
        case 'count':
          aggregated[alias] = data.length;
          break;
        case 'countDistinct':
          aggregated[alias] = new Set(values).size;
          break;
        case 'min':
          aggregated[alias] = values.length > 0 ? Math.min(...values.map(v => parseFloat(v) || 0)) : 0;
          break;
        case 'max':
          aggregated[alias] = values.length > 0 ? Math.max(...values.map(v => parseFloat(v) || 0)) : 0;
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

    // Post-processing: calcola avgPriceKg se esistono totaleValore e totaleKg
    if (aggregated.totaleValore !== undefined && aggregated.totaleKg !== undefined && aggregated.totaleKg > 0) {
      aggregated.avgPriceKg = aggregated.totaleValore / aggregated.totaleKg;
    }

    return [aggregated];
  }

  private applySort(data: any[], sortBy: { field: string; order: string }): any[] {
    const field = sortBy.field;
    const order = sortBy.order === 'desc' ? -1 : 1;

    return [...data].sort((a, b) => {
      const valA = a[field], valB = b[field];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') return (valA - valB) * order;
      return String(valA).localeCompare(String(valB)) * order;
    });
  }

  private applyPivotByYear(data: any[], groupBy: string[], aggregations: any[], pivotConfig: any): any[] {
    const { yearField, years, metrics } = pivotConfig;
    if (!yearField || !years || years.length < 2) return data;

    const keyFields = groupBy.filter(f => f !== yearField);
    const metricFields = metrics?.length > 0 ? metrics : aggregations.map(a => a.alias || a.field);
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
      metricFields.forEach((metric: string) => {
        if (row[metric] !== undefined) pivotRow[`${metric}_${year}`] = row[metric];
      });
    });

    const result = Array.from(pivotGroups.values());
    const [year1, year2] = years;

    result.forEach(row => {
      metricFields.forEach((metric: string) => {
        const val1 = row[`${metric}_${year1}`] || 0;
        const val2 = row[`${metric}_${year2}`] || 0;
        row[`${metric}_variazione`] = val2 !== 0 ? ((val1 - val2) / val2) * 100 : (val1 > 0 ? 100 : 0);
      });
    });

    if (metricFields.length > 0) {
      const sortField = `${metricFields[0]}_${year1}`;
      result.sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));
    }

    return result;
  }

  // ============================================
  // UTILITIES
  // ============================================

  t(id: number, defaultText: string): string {
    return this.translationService.getText(id, defaultText);
  }

  private showError(message: string): void {
    this.messageService.add({ severity: 'error', summary: 'Errore', detail: message, life: 5000 });
  }

  private showSuccess(message: string): void {
    this.messageService.add({ severity: 'success', summary: 'Successo', detail: message, life: 3000 });
  }
}
