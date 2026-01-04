/**
 * Dashboard Service
 *
 * Service per gestione dashboard dinamiche da metadati MongoDB
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================
// INTERFACES
// ============================================

export interface DashboardSection {
  sectionId: string;
  title?: string;
  columns: number;
  rowHeight: number;  // moltiplicatore dell'altezza base
  minItemWidth?: number;  // larghezza minima item in px (per auto-fill)
  maxItemWidth?: number;  // larghezza massima item in px
  items: string[];    // array di itemId
}

export interface DashboardLayout {
  gap: number;
  baseRowHeight?: number;  // default 100px
  sections?: DashboardSection[];
  // Manteniamo columns per retrocompatibilità
  columns?: number;
  responsive?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

/**
 * Dataset configuration per dashboard
 * Ogni dataset è associato a un dataAdapter GTSuite (adapterCode + dataSetCode)
 */
export interface DashboardDataset {
  datasetId: string;           // ID univoco del dataset (es. 'sales')
  adapterCode: string;         // Nome dataAdapter GTSuite (es. 'daSales')
  dataSetCode: string;         // Nome dataSet GTSuite (es. 'qSales')
  description?: string;        // Descrizione opzionale
  cacheKey?: string;           // Chiave per la cache (default: prjId_pageCode_datasetId)
  cacheTTL?: number;           // TTL cache in giorni (default: 30)
}

/**
 * Settings globali della dashboard
 */
export interface DashboardSettings {
  locale?: string;             // Locale per formattazione (es. 'it-IT')
  currency?: string;           // Valuta per formattazione (es. 'EUR')
  dateFormat?: string;         // Formato date (es. 'dd/MM/yyyy')
  numberFormat?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  };
}

export interface DashboardPosition {
  order: number;
  colSpan: number;
  rowSpan?: number;
}

export interface DashboardDataSource {
  type: 'dataAdapter' | 'api' | 'static';
  dataAdapterName?: string;
  apiEndpoint?: string;
  staticData?: any[];
}

export interface DashboardAggregation {
  field: string;
  operation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last' | 'concat';
  alias?: string;
  format?: string;
  separator?: string;
}

export interface DashboardFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'between';
  value: any;
}

export interface DashboardTransformation {
  field: string;
  operation: 'trim' | 'trimChars' | 'replace' | 'toUpperCase' | 'toLowerCase' | 'normalize' | 'sortWords';
  chars?: string;
  find?: string;
  replaceWith?: string;
}

export interface DashboardAggregationRule {
  groupBy?: string[];
  aggregations?: DashboardAggregation[];
  sortBy?: { field: string; order: 'asc' | 'desc' };
  filters?: DashboardFilter[];
  dataTransformations?: DashboardTransformation[];
  limit?: number;
  pivotByYear?: {
    yearField: string;
    years: number[];
    baseYear?: number;
    metrics?: string[];
  };
}

export interface DashboardCardConfig {
  icon?: string;
  iconColor?: string;
  accentColor?: string;
  valueField: string;
  format?: 'currency' | 'number' | 'percent' | 'integer';
  decimals?: number;
  label?: string;
  subtitleField?: string;
  subtitleFormat?: string;
  showTrend?: boolean;
  trendField?: string;
}

export interface DashboardChartSeries {
  field: string;
  label: string;
  color?: string;
  type?: 'line' | 'bar' | 'area';
}

export interface DashboardChartConfig {
  chartType: 'line' | 'bar' | 'horizontalBar' | 'pie' | 'doughnut' | 'area' | 'combo';
  xAxis?: { field: string; label?: string; format?: string };
  yAxis?: { label?: string; format?: string };
  series?: DashboardChartSeries[];
  labelField?: string;
  valueField?: string;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  showGrid?: boolean;
  stacked?: boolean;
  colors?: string[];
  height?: number;
}

export interface DashboardGridColumn {
  field: string;
  header: string;
  width?: string;
  format?: 'text' | 'currency' | 'number' | 'percent' | 'date' | 'integer';
  align?: 'left' | 'center' | 'right';
  decimals?: number;
  sortable?: boolean;
}

export interface DashboardGridConfig {
  columns: DashboardGridColumn[];
  showTotals?: boolean;
  totalsFields?: string[];
  pageSize?: number;
  showPagination?: boolean;
  rowClickable?: boolean;
  height?: string;
}

export interface DashboardItem {
  itemId: string;
  type: 'card' | 'chart' | 'grid';
  position: DashboardPosition;
  level: number;
  parentItemId?: string;
  drillDownFilter?: string;
  dataSource: DashboardDataSource;
  // Dataset reference (alternativo a dataSource per integrazione GTSuite)
  datasetId?: string;          // Riferimento a DashboardDataset.datasetId
  aggregationRule?: DashboardAggregationRule;
  cardConfig?: DashboardCardConfig;
  chartConfig?: DashboardChartConfig;
  gridConfig?: DashboardGridConfig;
  title?: string;
  subtitle?: string;
  visible?: boolean;
  refreshOnFilter?: boolean;
}

export interface DashboardTools {
  aiAnalyzer?: boolean;
  export?: boolean;
  refresh?: boolean;
  fullscreen?: boolean;
}

/**
 * Opzione filtro con supporto traduzioni
 */
export interface DashboardFilterOption {
  label: string;                    // Label di fallback
  value: any;                       // Valore dell'opzione
  txtId?: number;                   // ID traduzione (opzionale)
}

/**
 * Configurazione filtri dashboard
 */
export interface DashboardFilterConfig {
  field: string;                    // Campo da filtrare (es. 'anno')
  datasetId: string;                // Dataset da filtrare
  type: 'select' | 'multiselect' | 'daterange' | 'text';
  label: string;                    // Label di fallback
  labelTxtId?: number;              // ID traduzione per label (opzionale)
  options?: 'auto' | DashboardFilterOption[];  // 'auto' = ricava unique values
  defaultValue?: any;               // Valore default (es. 'all')
  dependsOn?: string;               // Filtro dipende da altro filtro (es. 'Anno')
  placeholder?: string;             // Placeholder per input
  placeholderTxtId?: number;        // ID traduzione per placeholder (opzionale)
}

export interface Dashboard {
  _id?: string;
  prjId: string;
  connCode?: string;
  dashboardCode: string;
  title: string;
  description?: string;
  layout: DashboardLayout;
  items: DashboardItem[];
  // Dataset e settings
  datasets?: DashboardDataset[];  // Array di dataset disponibili
  settings?: DashboardSettings;   // Settings globali (locale, currency, etc.)
  filters?: DashboardFilterConfig[];  // Configurazione filtri dashboard
  tools?: DashboardTools;
  status?: 'active' | 'draft' | 'archived';
  author?: string;
  version?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DashboardListItem {
  _id: string;
  dashboardCode: string;
  title: string;
  description?: string;
  layout: { columns: number };
  status: string;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /**
   * Carica una dashboard specifica
   */
  getDashboard(prjId: string, dashboardCode: string, connCode?: string): Observable<Dashboard> {
    const params: any = {};
    if (connCode !== undefined) {
      params.connCode = connCode;
    }
    return this.http.get<Dashboard>(`${this.apiUrl}/${prjId}/${dashboardCode}`, { params });
  }

  /**
   * Carica dashboard per ID MongoDB
   */
  getDashboardById(id: string): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.apiUrl}/byId/${id}`);
  }

  /**
   * Lista tutte le dashboard di un progetto
   */
  listDashboards(prjId: string, options?: { connCode?: string; status?: string }): Observable<DashboardListItem[]> {
    const params: any = { ...options };
    return this.http.get<DashboardListItem[]>(`${this.apiUrl}/list/${prjId}`, { params });
  }

  /**
   * Salva o aggiorna una dashboard (upsert)
   */
  saveDashboard(dashboard: Dashboard): Observable<{
    success: boolean;
    dashboardId: string;
    updated?: boolean;
    created?: boolean;
    version: number;
    message: string;
  }> {
    return this.http.post<any>(`${this.apiUrl}/save`, dashboard);
  }

  /**
   * Aggiorna un singolo item della dashboard
   */
  updateItem(dashboardId: string, itemId: string, itemData: Partial<DashboardItem>): Observable<{
    success: boolean;
    item: DashboardItem;
    message: string;
  }> {
    return this.http.put<any>(`${this.apiUrl}/${dashboardId}/item`, { itemId, itemData });
  }

  /**
   * Aggiunge un nuovo item alla dashboard
   */
  addItem(dashboardId: string, item: DashboardItem): Observable<{
    success: boolean;
    item: DashboardItem;
    message: string;
  }> {
    return this.http.post<any>(`${this.apiUrl}/${dashboardId}/item`, item);
  }

  /**
   * Rimuove un item dalla dashboard
   */
  removeItem(dashboardId: string, itemId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`${this.apiUrl}/${dashboardId}/item/${itemId}`);
  }

  /**
   * Archivia una dashboard
   */
  archiveDashboard(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.put<any>(`${this.apiUrl}/${id}/archive`, {});
  }

  /**
   * Elimina definitivamente una dashboard
   */
  deleteDashboard(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
