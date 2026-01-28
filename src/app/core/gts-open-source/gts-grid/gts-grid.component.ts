import { Component, OnInit, OnDestroy, Input, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonSpinner, AlertController } from '@ionic/angular/standalone';
import { GtsDataService } from '../../services/gts-data.service';
import { GtsGridService } from './gts-grid.service';
import { TranslationService } from '../../services/translation.service';
import { Subscription } from 'rxjs';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import {
  ColDef,
  GridReadyEvent,
  SelectionChangedEvent,
  RowDoubleClickedEvent,
  GridApi,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz
} from 'ag-grid-community';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { GtsSetFilterComponent } from './gts-set-filter.component';
import { GtsSetFloatingFilterComponent } from './gts-set-floating-filter.component';

// Register AG Grid modules at component level
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * GTS Grid Component - Open Source Version
 *
 * Componente grid usando AG Grid Community invece di DevExtreme.
 * Compatibile con i metadati GTS esistenti e gtsDataService.
 *
 * Funzionalità implementate:
 * - Visualizzazione dati da metadati
 * - Column definitions dai metadati
 * - Selection (single/multiple)
 * - Double click actions
 * - Paginazione
 * - Sorting
 * - Filtering
 * - Inline editing (cell editing)
 * - Insert/Update/Delete operations
 * - Boolean column value mapping
 *
 * Funzionalità future:
 * - Export Excel
 * - Lookup columns
 * - Row dragging
 * - Summary/totals
 */
@Component({
  selector: 'app-gts-grid',
  standalone: true,
  imports: [CommonModule, AgGridModule, IonSpinner],
  templateUrl: './gts-grid.component.html',
  styleUrls: ['./gts-grid.component.scss']
})
export class GtsGridComponent implements OnInit, OnDestroy {

  private gtsDataService = inject(GtsDataService);
  private gtsGridService = inject(GtsGridService);
  private ts = inject(TranslationService);
  private alertController = inject(AlertController);

  @Input() prjId: string = '';
  @Input() formId: number = 0;
  @Input() objectName: string = '';

  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  // Subscriptions
  appViewListenerSubs: Subscription | undefined;
  gridSelectListenerSubs: Subscription | undefined;
  gridReloadListenerSubs: Subscription | undefined;
  gridRowUpdateListenerSubs: Subscription | undefined;

  // Grid state
  metaData: any = {};
  pageData: any = {};
  gridReady: boolean = false;
  gridObject: any = { visible: true }; // Initialize with default visible:true
  gridTitle: string = '';
  showTitle: boolean = false;
  gridKey: string = ''; // Unique key to force grid recreation

  // AG Grid configuration
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: false,
    minWidth: 100,
    maxWidth: 500,  // Evita colonne troppo larghe
    flex: 1  // Le colonne si espandono proporzionalmente
  };

  // Grid options
  gridApi!: GridApi;
  enablePagination: boolean = true;
  paginationPageSize: number = 20;
  paginationPageSizeSelector: number[] = [10, 20, 50, 100];

  // AG Grid v35+ Theme - base params without rowHeight (for dynamic height)
  private baseThemeParams = {
    backgroundColor: '#ffffff',
    foregroundColor: '#000000',
    headerBackgroundColor: '#f4f5f8',
    headerFontWeight: 600,
    oddRowBackgroundColor: '#ffffff',
    rowHoverColor: '#f0f0f0',
    selectedRowBackgroundColor: '#e3f2fd',
    borderColor: '#ddd',
    fontSize: 13,
    headerHeight: 36,
    floatingFiltersHeight: 32,  // Match row height for filter row
    cellHorizontalPadding: 8,
    borderRadius: 0,
    wrapperBorder: false,
    wrapperBorderRadius: 0
  };

  // Theme with fixed row height (default)
  theme = themeQuartz.withParams({
    ...this.baseThemeParams,
    rowHeight: 32
  });

  // Flag to track if grid has multiline columns
  hasMultilineColumns: boolean = false;

  // Row height - undefined allows autoHeight to work for multiline columns
  gridRowHeight: number | undefined = 32;

  // Selection (AG Grid v35+ format with checkboxes control)
  rowSelection: any = {
    mode: 'singleRow',
    checkboxes: false,  // No checkboxes for single selection
    headerCheckbox: false,
    enableClickSelection: true  // Enable click-based selection (AG Grid v35+)
  };
  selectedRows: any[] = [];
  focusedRowKey: any = null;

  // Store selected keys to restore after grid reload
  savedSelectedRowKeys: any[] = [];

  // Flag to prevent action execution during programmatic selection restore
  isRestoringSelection: boolean = false;

  // Editing properties
  allowInserting: boolean = false;
  allowUpdating: boolean = false;
  allowDeleting: boolean = false;

  // Track changes for batch editing (like DevExtreme)
  changeArray: any[] = [];
  editedRows: Map<any, any> = new Map(); // Map of row key -> edited data

  // Filter state tracking
  hasActiveFilters: boolean = false;

  // Initial load limit state
  limitApplied: boolean = false;          // True if server applied initial load limit
  limitInitialLoad: boolean = false;      // True if dataset has limit enabled
  initialLoadLimit: number = 0;           // Number of rows in initial load limit
  totalRowCount: number = 0;              // Total rows available on server

  // Search panel (Quick Filter)
  showSearchPanel: boolean = false;
  searchText: string = '';

  // Custom filter components for AG Grid
  filterComponents: any = {
    gtsSetFilter: GtsSetFilterComponent,
    gtsSetFloatingFilter: GtsSetFloatingFilterComponent
  };

  // Header filter visibility (Set Filter dropdown)
  headerFilterVisible: boolean = false;

  constructor() {}

  // ============================================
  // TRANSLATION HELPER
  // ============================================

  /**
   * Translation helper method
   * @param txtId Text ID from database
   * @param fallback Fallback text if translation not found
   */
  t(txtId: number, fallback: string = ''): string {
    return this.ts.getText(txtId, fallback);
  }

  async ngOnInit() {

    // Grid reload listener
    this.gridReloadListenerSubs = this.gtsDataService
      .getGridReloadListener()
      .subscribe(async (data) => {
        const dataArray = data.split(';');
        const dataSetName = dataArray[0];

        // Check for editing mode flags FIRST (like DevExtreme - no dataSetName check for these!)
        if (dataArray.length > 1) {
          const allowFlags = dataArray[1].split(':');
          if (allowFlags.length > 0) {
            if (allowFlags[0] === 'Edit') {
              this.allowUpdating = allowFlags[1] === 'true';
              if (this.gridApi && !this.gridApi.isDestroyed() && this.metaData?.data?.columns) {
                const columns = this.gridApi.getColumns();
                columns?.forEach((column: any) => {
                  const colId = column.getColId();
                  const colMetadata = this.metaData.data.columns.find((c: any) => (c.dataField || c.fieldName) === colId);
                  if (colMetadata && colMetadata.allowEditing !== false) {
                    const colDef = column.getColDef();
                    colDef.editable = this.allowUpdating;
                  }
                });
                this.gridApi.refreshCells({ force: true });
              }
              return;
            }
            if (allowFlags[0] === 'Insert') {
              this.allowInserting = allowFlags[1] === 'true';
              return;
            }
            if (allowFlags[0] === 'Delete') {
              this.allowDeleting = allowFlags[1] === 'true';
              return;
            }
            if (allowFlags[0] === 'Idle') {
              this.allowUpdating = false;
              this.allowInserting = false;
              this.allowDeleting = false;
              if (this.metaData?.data?.columns && this.gridApi && !this.gridApi.isDestroyed()) {
                this.convertColumnsToAGGrid(this.metaData.data.columns);
                this.gridApi.setGridOption('columnDefs', this.columnDefs);
              }
              return;
            }
          }
        }

        // Normal data reload - check dataSetName and visibility
        if (this.metaData?.dataSetName === dataSetName && this.metaData?.visible) {
          // Reload metadata to get updated filterRule from toolbar
          this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'grids', this.objectName);

          // If there's a toolbar filter (filterRule), reload data from server with that filter
          if (this.metaData?.filterRule && this.metaData.filterRule.length > 0) {
            await this.reloadWithToolbarFilter();
          } else {
            this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
            await this.prepareGridData();
          }
        }
      });

    // Grid select listener (per deselezionare)
    this.gridSelectListenerSubs = this.gtsDataService
      .getGridSelectListener()
      .subscribe((select) => {
        if (!select.isSelected && select.dataSetName === this.metaData?.dataSetName) {
          this.agGrid?.api?.deselectAll();
          this.focusedRowKey = null;
        }
      });

    // View change listener
    this.appViewListenerSubs = this.gtsDataService
      .getAppViewListener()
      .subscribe(async (actualView) => {
        const wasVisible = this.gridObject?.visible;

        this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
        this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'grids', this.objectName);

        if (this.metaData !== undefined) {
          const newVisible = this.metaData.visible;

          // Only reload data when grid transitions from hidden to visible
          // If already visible, don't reload (preserves selection)
          if (newVisible && !wasVisible) {
            await this.prepareGridData();
          } else if (newVisible && wasVisible) {
            // Just update metadata without reloading
            if (!this.gridObject) {
              this.gridObject = {};
            }
            this.gridObject.disabled = this.metaData.disabled || false;
            this.gridObject.visible = newVisible;
          } else {
            // Grid becoming hidden
            if (!this.gridObject) {
              this.gridObject = {};
            }
            this.gridObject.disabled = this.metaData.disabled || false;
            this.gridObject.visible = newVisible;
          }
        }
      });

    // Single row update listener - updates just one row without full grid reload
    this.gridRowUpdateListenerSubs = this.gtsDataService
      .getGridRowUpdateListener()
      .subscribe((update) => {
        // Only handle updates for this grid's dataSet
        if (this.metaData?.dataSetName !== update.dataSetName) {
          return;
        }

        if (!this.gridApi || this.gridApi.isDestroyed()) {
          return;
        }

        // Find and update the row using AG Grid's transaction API
        const rowNode = this.gridApi.getRowNode(String(update.keyValue));
        if (rowNode) {
          // Update the row data
          rowNode.setData({ ...update.rowData });
        } else {
          // Fallback: find the row by iterating
          this.gridApi.forEachNode((node: any) => {
            if (node.data && node.data[update.keyField] === update.keyValue) {
              node.setData({ ...update.rowData });
            }
          });
        }

        // Update this.selectedRows if the updated row is currently selected
        const selectedRowIndex = this.selectedRows.findIndex(
          (row: any) => row && row[update.keyField] === update.keyValue
        );
        if (selectedRowIndex !== -1) {
          // Update the selected row data with new values
          this.selectedRows[selectedRowIndex] = { ...update.rowData };

          // Also update selectedRows in pageData through the service
          const keyField = this.gridObject?.keys?.[0] || 'id';
          const selectedRowKeys = this.selectedRows.map((row: any) => {
            const keyObj: any = {};
            keyObj[keyField] = row[keyField];
            return keyObj;
          });

          this.gtsGridService.setGridObjectSelectedData(
            this.prjId,
            this.formId,
            this.metaData.dataAdapter,
            this.metaData.dataSetName,
            this.selectedRows,
            selectedRowKeys,
            '', // No action to execute
            this.gridObject
          );
        }

        // Refresh the cells to show the updated values
        this.gridApi.refreshCells({ force: true });
      });

    // Initial load
    this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
    this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'grids', this.objectName);

    // Only load data if grid is visible and not already ready
    if (this.metaData !== undefined && !this.gridReady && this.metaData.visible) {
      // If there's a toolbar filter (filterRule) at startup, reload data from server with that filter
      if (this.metaData?.filterRule && this.metaData.filterRule.length > 0) {
        await this.reloadWithToolbarFilter();
      } else {
        await this.prepareGridData();
      }
    }

    this.gridTitle = this.gridObject.caption || '';
    this.showTitle = this.gridTitle !== '';
  }

  ngOnDestroy(): void {
    this.appViewListenerSubs?.unsubscribe();
    this.gridSelectListenerSubs?.unsubscribe();
    this.gridReloadListenerSubs?.unsubscribe();
    this.gridRowUpdateListenerSubs?.unsubscribe();
  }

  async prepareGridData(): Promise<void> {
    if (!this.metaData) {
      console.warn('[gts-grid] No metadata found for', this.objectName);
      return;
    }

    // Save current selection before reload
    if (this.gridApi && this.selectedRows.length > 0) {
      const keyField = this.gridObject?.keys?.[0] || 'id';
      this.savedSelectedRowKeys = this.selectedRows
        .filter((row: any) => row !== undefined && row !== null)
        .map((row: any) => row[keyField]);
    }

    // Reset defaultColDef to base state (filter settings may vary per grid)
    this.defaultColDef = {
      sortable: true,
      filter: true,
      resizable: true,
      floatingFilter: false,
      minWidth: 100,
      maxWidth: 500,
      flex: 1
    };
    this.headerFilterVisible = false;

    // Keep grid hidden during data preparation
    this.gridReady = false;
    // Don't send loader notification here - let parent component handle it
    // this.gtsDataService.sendAppLoaderListener(true);

    // Use the grid service ONLY for now to keep compatibility
    // TODO Phase 2: Move all logic here and remove DevExtreme dependencies
    const data: any = await this.gtsGridService.getGridData(
      this.prjId,
      this.formId,
      this.metaData,
      this.pageData,
      null
    );

    // Extract columns and gridObject
    const columns = data.columns || [];
    const newGridObject = data.gridObject || {};

    // Set pagination from gridObject
    this.paginationPageSize = newGridObject.pageSize || 20;
    this.paginationPageSizeSelector = newGridObject.allowedPageSizes || [10, 20, 50, 100];

    // Set editing permissions from metaData
    this.allowInserting = this.metaData.allowInserting || false;
    this.allowUpdating = this.metaData.allowUpdating || false;
    this.allowDeleting = newGridObject.allowDeleting || false;

    // Debug: console.log('[gts-grid] Editing permissions:', { allowInserting, allowUpdating, allowDeleting });

    // Set selection mode (AG Grid v35+ format with checkboxes control)
    const isMultiple = newGridObject.selectionMode === 'multiple';
    this.rowSelection = {
      mode: isMultiple ? 'multiRow' : 'singleRow',
      checkboxes: isMultiple,  // Show checkboxes only for multiple selection
      headerCheckbox: isMultiple,  // Show header checkbox only for multiple selection
      enableClickSelection: true  // Enable click-based selection (AG Grid v35+)
    };

    // Update defaultColDef based on grid metadata BEFORE converting columns
    if (newGridObject.filterRowVisible) {
      this.defaultColDef = { ...this.defaultColDef, floatingFilter: true };
    }

    // Enable custom Set Filter when allowHeaderFiltering is true OR when filterRowVisible is true
    // (filterRowVisible implies the user wants filtering, so use our custom filter for better UX)
    if (newGridObject.allowHeaderFiltering || newGridObject.filterRowVisible) {
      // Enable custom Set Filter (dropdown with distinct values) for all columns
      // Also enable the floating filter component for text search
      // suppressFloatingFilterButton: false ensures the dropdown button is always visible
      this.defaultColDef = {
        ...this.defaultColDef,
        filter: GtsSetFilterComponent,
        floatingFilterComponent: GtsSetFloatingFilterComponent,
        suppressFloatingFilterButton: false
      };
      this.headerFilterVisible = true;
    }

    // Enable search panel (Quick Filter)
    this.showSearchPanel = newGridObject.searchPanelFlag || false;

    // Convert columns to AG Grid format (AFTER setting filter options)
    this.convertColumnsToAGGrid(columns);

    // Extract row data - simple array for AG Grid
    // IMPORTANT: Create a deep copy of the data to ensure AG Grid detects changes
    // when dsRefreshSel updates rows in place (same array/object references)
    const sourceData = (data.dataSource && data.dataSource._store && data.dataSource._store._array)
      ? data.dataSource._store._array
      : [];
    const newRowData = sourceData.map((row: any) => ({ ...row }));

    // No warning for empty data - it's normal for detail grids before master selection

    // Update gridObject with all data
    this.gridObject = newGridObject;

    // Update initial load limit state from server response
    this.limitApplied = newGridObject.limitApplied || false;
    this.limitInitialLoad = newGridObject.limitInitialLoad || false;
    this.initialLoadLimit = newGridObject.initialLoadLimit || 0;
    this.totalRowCount = newGridObject.totalCount || newRowData.length;


    // Generate unique key based on selection mode and multiline flag to force grid recreation
    // when these settings change. Don't use Date.now() as it forces grid recreation on every data reload
    const newGridKey = `${this.objectName}-${this.rowSelection.mode}-${this.hasMultilineColumns}`;
    const gridKeyChanged = this.gridKey !== newGridKey;

    if (gridKeyChanged) {
      this.gridKey = newGridKey;
      this.rowData = newRowData; // Full data replacement when grid is recreated
    } else if (this.gridApi && !this.gridApi.isDestroyed()) {
      // Grid already exists, just update the data without recreating it
      this.gridApi.setGridOption('rowData', newRowData);
      // Don't update this.rowData here, AG Grid manages it
    } else {
      // First load, no grid API yet
      this.rowData = newRowData;
    }

    this.gridReady = true;

    // Don't send loader notification here - causes ExpressionChangedAfterItHasBeenCheckedError
    // Let the parent component handle loader state
    // this.gtsDataService.sendAppLoaderListener(false);
  }

  convertColumnsToAGGrid(columns: any[]): void {
    this.columnDefs = [];

    // Check if any column has columnType 'B' (multiline)
    // Also check nested columns in bands
    const checkMultiline = (cols: any[]): boolean => {
      return cols.some((col: any) => {
        if (col.columnType === 'B') return true;
        if (col.columns && Array.isArray(col.columns)) {
          return checkMultiline(col.columns);
        }
        return false;
      });
    };

    this.hasMultilineColumns = checkMultiline(columns);

    // Update theme and rowHeight based on multiline columns
    if (this.hasMultilineColumns) {
      this.theme = themeQuartz.withParams(this.baseThemeParams);
      this.gridRowHeight = undefined; // Allow autoHeight to work
    } else {
      this.theme = themeQuartz.withParams({
        ...this.baseThemeParams,
        rowHeight: 32
      });
      this.gridRowHeight = 32;
    }

    // AG Grid v35+ usa rowSelection.checkboxes in GridOptions invece di colonne separate
    // Non serve più aggiungere colonne checkbox manualmente

    // Convert DevExtreme columns to AG Grid format
    columns.forEach((col: any, index: number) => {
      // Handle column bands (column groups)
      if (col.columns && Array.isArray(col.columns)) {

        // This is a column group (band)
        const groupDef: any = {
          headerName: col.caption,
          children: []
        };

        // Process each child column in the band
        col.columns.forEach((childCol: any) => {
          const childColDef = this.createColumnDef(childCol);
          if (childColDef) {
            groupDef.children.push(childColDef);
          }
        });

        this.columnDefs.push(groupDef);
        return;
      }

      // Regular column (not in a band)
      const colDef = this.createColumnDef(col);
      if (colDef) {
        this.columnDefs.push(colDef);
      }
    });
  }

  /**
   * Create a single column definition for AG Grid
   */
  private createColumnDef(col: any): ColDef | null {
    // Skip non-data columns (buttons, etc.) and hidden columns
    if (col.visible === false) {
      return null;
    }
    if (col.type === 'buttons') {
      return null;
    }
    // Support both dataField and fieldName properties
    const fieldName = col.dataField || col.fieldName;
    if (!fieldName) {
      console.warn(`[gts-grid] ${this.objectName} - Skipping column without dataField/fieldName:`, col);
      return null;
    }

    const colDef: ColDef = {
      field: fieldName,
      headerName: col.caption || col.text,
      minWidth: col.minWidth || 100,
      hide: col.visible === false,
      sortable: col.allowSorting !== false,
      editable: col.allowEditing !== false && this.allowUpdating, // Editable if column allows and grid allows updates
    };

    // Set filter - if headerFilterVisible is true, use the custom set filter
    // Otherwise, use the standard AG Grid filter based on column metadata
    if (this.headerFilterVisible) {
      // Use custom set filter unless column explicitly disables filtering
      if (col.allowFiltering === false) {
        colDef.filter = false;
      } else {
        // Use the GtsSetFilterComponent class directly (AG Grid v35+ approach)
        // Also use the custom floating filter for text search input
        // suppressFloatingFilterButton ensures the dropdown button is always visible
        colDef.filter = GtsSetFilterComponent;
        colDef.floatingFilterComponent = GtsSetFloatingFilterComponent;
        colDef.suppressFloatingFilterButton = false;
      }
    } else {
      // Use standard AG Grid filter
      colDef.filter = col.allowFiltering !== false;
    }

    // Se la colonna ha una larghezza specifica, usala; altrimenti usa flex
    if (col.width) {
      colDef.width = col.width;
      colDef.maxWidth = col.width * 2; // Max 2x la larghezza specificata
    } else {
      colDef.flex = 1; // Espande proporzionalmente
      colDef.maxWidth = 400; // Max width ragionevole
    }

    // Normalize column type (supports both dataType and colType properties, case-insensitive)
    // Priority: colType over dataType (colType is more specific, e.g. "DateTime" vs "date")
    const columnType = (col.colType || col.dataType || '').toLowerCase();

    // Handle specific column types
    if (columnType === 'boolean') {
      // For editable boolean columns, use checkbox editor
      if (colDef.editable) {
        colDef.cellEditor = 'agCheckboxCellEditor';
        colDef.cellRenderer = 'agCheckboxCellRenderer';
      } else {
        colDef.cellRenderer = (params: any) => {
          return params.value ? '✓' : '';
        };
      }
    }

    // Handle date columns
    if (columnType === 'date' || columnType === 'datetime') {
      colDef.valueFormatter = (params: any) => {
        if (!params.value) return '';
        const date = new Date(params.value);
        if (isNaN(date.getTime())) return params.value;

        if (columnType === 'datetime') {
          return this.formatDateTime(date);
        } else {
          return this.formatDate(date);
        }
      };
    }

    // Handle image columns
    if (col.cellTemplate === 'cellTemplate') {
      colDef.cellRenderer = (params: any) => {
        if (!params.value) return '';

        // Se la colonna ha immagini definite nei metadati, usa quelle
        if (col.images && col.images.length > 0) {
          const image = col.images.find((img: any) => img.imgValue === params.value);
          if (image) {
            // Use larger icon (without _16 suffix) for better quality on HiDPI screens
            return `<img src="/assets/icons/stdImage_${image.stdImageId}.png"
                         style="height: 24px; width: 24px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;"
                         alt="${params.value}" />`;
          }
        }

        // Altrimenti prova con il path standard
        return `<img src="${this.getImagePath(params.value)}"
                     style="height: 24px; width: 24px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;"
                     alt="${params.value}"
                     onerror="this.style.display='none'; this.nextSibling.style.display='inline';"
                /><span style="display:none;">${params.value}</span>`;
      };
    }

    // Handle multiline text columns (columnType: "B" in metadata)
    if (col.columnType === 'B') {
      colDef.wrapText = true;
      colDef.autoHeight = true;
      // cellStyle for multiline - ensure proper display
      colDef.cellStyle = {
        'white-space': 'pre-wrap',
        'word-wrap': 'break-word',
        'line-height': '1.4',
        'padding-top': '8px',
        'padding-bottom': '8px'
      };
      // Custom cell renderer to preserve line breaks
      colDef.cellRenderer = (params: any) => {
        if (!params.value) return '';
        // Convert \n and \r\n to <br> for HTML display
        const escapedValue = String(params.value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\r\n/g, '<br>')
          .replace(/\n/g, '<br>')
          .replace(/\r/g, '<br>');
        return `<div class="gts-multiline-cell">${escapedValue}</div>`;
      };
      // Remove maxWidth constraint for multiline columns
      delete colDef.maxWidth;
    }

    return colDef;
  }


  getValueFormatter(col: any): any {
    // Add custom formatting based on column type
    return undefined; // Default formatter
  }

  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatDateTime(date: Date): string {
    const dateStr = this.formatDate(date);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}:${seconds}`;
  }

  getImagePath(iconId: string): string {
    if (iconId.includes('.')) {
      return `/assets/icons/${iconId}`;
    }
    return `/assets/icons/icon_${iconId}.svg`;
  }

  // AG Grid Events
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    // Listen for filter changes to update hasActiveFilters
    params.api.addEventListener('filterChanged', () => {
      this.checkActiveFilters();
    });

    // Initial grid setup
    setTimeout(() => {
      // Go to first page to ensure rows are displayed
      params.api.paginationGoToFirstPage();

      // Auto-size all columns to fit their content (best fit) on first load
      params.api.autoSizeAllColumns(false); // false = don't skip header

      // Restore selection if there was one saved
      this.restoreSelection();

      // Check initial filter state
      this.checkActiveFilters();
    }, 100); // Small delay to ensure gridObject is set
  }

  /**
   * Check if there are any active filters in the grid
   */
  checkActiveFilters(): void {
    if (!this.gridApi || this.gridApi.isDestroyed()) return;

    const filterModel = this.gridApi.getFilterModel();
    this.hasActiveFilters = Object.keys(filterModel).length > 0;
  }

  /**
   * Clear all filters from the grid
   */
  clearAllFilters(): void {
    if (!this.gridApi || this.gridApi.isDestroyed()) return;
    this.gridApi.setFilterModel(null);
    this.searchText = '';
    this.gridApi.setGridOption('quickFilterText', '');
    this.hasActiveFilters = false;
  }

  /**
   * Apply quick filter (global search across all columns)
   */
  onQuickFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText = input.value;

    if (!this.gridApi || this.gridApi.isDestroyed()) return;

    this.gridApi.setGridOption('quickFilterText', this.searchText);
  }

  /**
   * Convert AG Grid filter model to array format for server
   * AG Grid filter model format:
   * {
   *   "columnName": { filterType: "text", type: "contains", filter: "value" },
   *   "anotherCol": { filterType: "number", type: "greaterThan", filter: 100 }
   * }
   */
  getGridFiltersForServer(): any[] {
    if (!this.gridApi || this.gridApi.isDestroyed()) return [];

    const filterModel = this.gridApi.getFilterModel();
    const filters: any[] = [];

    Object.keys(filterModel).forEach(columnName => {
      const colFilter = filterModel[columnName];

      // Handle custom Set Filter (gtsSet) - values array and/or floating text filter
      if (colFilter.filterType === 'gtsSet') {
        // Add checkbox selection filter (values array)
        if (colFilter.values && colFilter.values.length > 0) {
          filters.push({
            field: columnName,
            filterType: 'gtsSet',
            type: 'in',
            filter: colFilter.values
          });
        }

        // Add floating filter text (contains search)
        if (colFilter.floatingFilterText && colFilter.floatingFilterText.trim() !== '') {
          filters.push({
            field: columnName,
            filterType: 'text',
            type: 'contains',
            filter: colFilter.floatingFilterText.trim()
          });
        }
        return; // Skip other checks for this filter
      }

      // Handle simple filter (single condition)
      if (colFilter.filter !== undefined || colFilter.dateFrom !== undefined) {
        filters.push({
          field: columnName,
          filterType: colFilter.filterType || 'text',
          type: colFilter.type || 'contains',
          filter: colFilter.filter || colFilter.dateFrom
        });
      }

      // Handle combined filter (condition1 AND/OR condition2)
      if (colFilter.condition1) {
        filters.push({
          field: columnName,
          filterType: colFilter.condition1.filterType || 'text',
          type: colFilter.condition1.type || 'contains',
          filter: colFilter.condition1.filter || colFilter.condition1.dateFrom
        });
      }
      if (colFilter.condition2) {
        filters.push({
          field: columnName,
          filterType: colFilter.condition2.filterType || 'text',
          type: colFilter.condition2.type || 'contains',
          filter: colFilter.condition2.filter || colFilter.condition2.dateFrom
        });
      }
    });

    return filters;
  }

  /**
   * Load all data (bypassing initial load limit)
   * If filters are active, load all filtered data
   * If no filters, load everything
   */
  async loadAllData(): Promise<void> {
    if (!this.metaData?.dataSetName || !this.metaData?.dataAdapter) {
      console.warn('[gts-grid] Cannot load all data - missing metadata');
      return;
    }

    // Get current grid filters
    const gridFilters = this.getGridFiltersForServer();

    // Add toolbar filter (filterRule) if present - it's always priority
    if (this.metaData.filterRule && this.metaData.filterRule.length > 0) {
      const filterRule = this.metaData.filterRule;
      // Simple format: ['fieldName', 'operator', 'value']
      if (filterRule.length === 3 && typeof filterRule[0] === 'string' && typeof filterRule[1] === 'string') {
        gridFilters.push({
          field: filterRule[0],
          filterType: 'text',
          type: filterRule[1] === '=' ? 'equals' : filterRule[1],
          filter: filterRule[2],
          isExternal: true // Mark as external filter (toolbar)
        });
      }
    }

    // Show loading state
    this.gridReady = false;

    try {
      // Call server with skipInitialLimit=true and current grid filters
      const response = await this.gtsDataService.reloadDataWithFilters(
        this.prjId,
        this.formId,
        this.metaData.dataAdapter,
        this.metaData.dataSetName,
        gridFilters,
        true // skipInitialLimit
      );

      if (response && response.valid) {
        this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
        await this.prepareGridData();
      } else {
        // Show error message if response is invalid
        this.gridReady = true;
        const errorMsg = response?.message || response?.data?.[0]?.message || 'Errore nel caricamento dati';
        await this.showErrorAlert('Errore', errorMsg);
      }
    } catch (error: any) {
      this.gridReady = true;
      const errorMsg = error?.message || 'Errore nel caricamento dati';
      await this.showErrorAlert('Errore', errorMsg);
    }
  }

  /**
   * Show an error alert to the user
   */
  private async showErrorAlert(title: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: title,
      message: message,
      buttons: ['OK'],
      cssClass: 'gts-error-alert'
    });
    await alert.present();
  }

  /**
   * Reload data from server with toolbar filter (filterRule)
   * This is called when toolbar filter changes and we need fresh data from server
   */
  async reloadWithToolbarFilter(): Promise<void> {
    if (!this.metaData?.dataSetName || !this.metaData?.dataAdapter) {
      console.warn('[gts-grid] Cannot reload with toolbar filter - missing metadata');
      return;
    }

    // Convert filterRule to server filter format
    const toolbarFilters: any[] = [];
    const filterRule = this.metaData.filterRule;

    // Simple format: ['fieldName', '=', 'value']
    if (filterRule.length === 3 && typeof filterRule[0] === 'string' && typeof filterRule[1] === 'string') {
      toolbarFilters.push({
        field: filterRule[0],
        filterType: 'text',
        type: filterRule[1] === '=' ? 'equals' : filterRule[1],
        filter: filterRule[2],
        isExternal: true
      });
    }

    // Show loading state
    this.gridReady = false;

    try {
      // Call server with toolbar filter, respecting initial limit (skipInitialLimit=false)
      const response = await this.gtsDataService.reloadDataWithFilters(
        this.prjId,
        this.formId,
        this.metaData.dataAdapter,
        this.metaData.dataSetName,
        toolbarFilters,
        false // Keep initial limit - toolbar filter should still show limited rows
      );

      if (response && response.valid) {
        this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
        await this.prepareGridData();
      } else {
        this.gridReady = true;
        const errorMsg = response?.message || response?.data?.[0]?.message || 'Errore nel caricamento dati';
        await this.showErrorAlert('Errore', errorMsg);
      }
    } catch (error: any) {
      this.gridReady = true;
      const errorMsg = error?.message || 'Errore nel caricamento dati';
      await this.showErrorAlert('Errore', errorMsg);
    }
  }

  /**
   * Reset to initial limited load (when limit is configured on dataset)
   */
  async resetToLimitedLoad(): Promise<void> {
    if (!this.metaData?.dataSetName || !this.metaData?.dataAdapter) {
      console.warn('[gts-grid] Cannot reset - missing metadata');
      return;
    }

    // Clear grid filters first (but keep toolbar filter)
    if (this.gridApi && !this.gridApi.isDestroyed()) {
      this.gridApi.setFilterModel(null);
      this.hasActiveFilters = false;
    }

    // Build filters array - include toolbar filter (filterRule) if present
    const filters: any[] = [];
    if (this.metaData.filterRule && this.metaData.filterRule.length > 0) {
      const filterRule = this.metaData.filterRule;
      // Simple format: ['fieldName', 'operator', 'value']
      if (filterRule.length === 3 && typeof filterRule[0] === 'string' && typeof filterRule[1] === 'string') {
        filters.push({
          field: filterRule[0],
          filterType: 'text',
          type: filterRule[1] === '=' ? 'equals' : filterRule[1],
          filter: filterRule[2],
          isExternal: true // Mark as external filter (toolbar)
        });
      }
    }

    // Show loading state
    this.gridReady = false;

    try {
      // Call server with skipInitialLimit=false (use limit) and toolbar filter if present
      const response = await this.gtsDataService.reloadDataWithFilters(
        this.prjId,
        this.formId,
        this.metaData.dataAdapter,
        this.metaData.dataSetName,
        filters, // Include toolbar filter if present
        false // Don't skip limit - use initial load limit
      );

      if (response && response.valid) {
        this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
        await this.prepareGridData();
      } else {
        this.gridReady = true;
        const errorMsg = response?.message || response?.data?.[0]?.message || 'Errore nel reset dati';
        await this.showErrorAlert('Errore', errorMsg);
      }
    } catch (error: any) {
      this.gridReady = true;
      const errorMsg = error?.message || 'Errore nel reset dati';
      await this.showErrorAlert('Errore', errorMsg);
    }
  }

  restoreSelection(): void {
    if (!this.gridApi || this.gridApi.isDestroyed()) {
      return;
    }

    const keyField = this.gridObject?.keys?.[0] || 'id';
    let keysToSelect: any[] = [];

    // First, check if we have saved selection keys from previous state
    if (this.savedSelectedRowKeys && this.savedSelectedRowKeys.length > 0) {
      keysToSelect = this.savedSelectedRowKeys;
    }
    // If no saved keys, check gridObject.selectedRowKeys (set after INSERT)
    else if (this.gridObject?.selectedRowKeys && this.gridObject.selectedRowKeys.length > 0) {
      // gridObject.selectedRowKeys is array of objects: [{fieldName: value}]
      keysToSelect = this.gridObject.selectedRowKeys.map((keyObj: any) => keyObj[keyField]);
    }

    if (keysToSelect.length === 0) {
      return;
    }

    // Set flag to prevent action execution during restore
    this.isRestoringSelection = true;

    const nodesToSelect: any[] = [];

    // Find nodes matching the keys
    this.gridApi.forEachNode((node: any) => {
      if (node.data && keysToSelect.includes(node.data[keyField])) {
        nodesToSelect.push(node);
      }
    });

    // Select the nodes
    if (nodesToSelect.length > 0) {
      this.gridApi.setNodesSelected({ nodes: nodesToSelect, newValue: true });

      // Ensure the selected row is visible (scroll to it)
      if (nodesToSelect[0]) {
        this.gridApi.ensureNodeVisible(nodesToSelect[0], 'middle');
      }
    }

    // Clear saved keys and flag after restoring
    this.savedSelectedRowKeys = [];

    // Clear flag after a small delay to ensure selectionChanged event has completed
    setTimeout(() => {
      this.isRestoringSelection = false;
    }, 50);
  }

  onSelectionChanged(event: SelectionChangedEvent): void {
    // If grid is disabled, prevent selection change by restoring previous selection
    if (this.gridObject?.disabled && !this.isRestoringSelection) {
      // Store the previous selection keys before the change
      const previousKeys = this.selectedRows;

      // Restore previous selection
      setTimeout(() => {
        this.isRestoringSelection = true;
        event.api.deselectAll();
        if (previousKeys.length > 0) {
          const keyField = this.gridObject?.keys?.[0] || 'id';
          event.api.forEachNode((node: any) => {
            if (node.data && previousKeys.some((prevRow: any) => prevRow[keyField] === node.data[keyField])) {
              node.setSelected(true);
            }
          });
        }
        this.isRestoringSelection = false;
      }, 0);
      return;
    }

    this.selectedRows = event.api.getSelectedRows();

    // Get the key field from gridObject.keys (which comes from metadata sqlKeys)
    const keyField = this.gridObject?.keys?.[0] || this.metaData?.dataAdapterIdField || 'id';

    // Create selectedRowKeys as array of objects (like DevExtreme) instead of simple values
    // DevExtreme format: [{prjId: "GTSW"}]
    // Previous bug: ["GTSW"] caused Object.keys() to return ['0','1','2','3']
    const selectedRowKeys = this.selectedRows.map((row: any) => {
      const keyObj: any = {};
      keyObj[keyField] = row[keyField];
      return keyObj;
    });

    // Skip action execution if we're restoring selection programmatically
    if (this.isRestoringSelection) {
      return;
    }

    if (this.metaData?.dataSetName) {
      this.gtsGridService.setGridObjectSelectedData(
        this.prjId,
        this.formId,
        this.metaData.dataAdapter,
        this.metaData.dataSetName,
        this.selectedRows,
        selectedRowKeys,
        this.metaData.actionOnSelectedRows || '', // Execute action defined in metadata
        this.gridObject
      );
    }
  }

  onRowDoubleClicked(event: RowDoubleClickedEvent): void {
    if (this.metaData?.actionOnDoubleClickedRow) {
      this.gtsDataService.runAction(
        this.prjId,
        this.formId,
        this.metaData.actionOnDoubleClickedRow
      );
    }
  }

  /**
   * AG Grid cell editing event - called when a cell value changes
   * Tracks changes for batch editing (like DevExtreme onSaved)
   */
  onCellValueChanged(event: any): void {
    // Get the row key
    const keyField = this.gridObject?.keys?.[0] || 'id';
    const rowKey = event.data[keyField];

    // Track the edited row
    if (!this.editedRows.has(rowKey)) {
      this.editedRows.set(rowKey, { ...event.data });
    } else {
      // Update existing edited row
      const existingEdit = this.editedRows.get(rowKey);
      this.editedRows.set(rowKey, { ...existingEdit, ...event.data });
    }
  }

  /**
   * Handle cell clicks to enable single-click editing for all cells (not just empty ones)
   */
  onCellClicked(event: any): void {
    // Only start editing if:
    // 1. We're in edit mode (allowUpdating is true)
    // 2. The column is editable
    // 3. Not already editing
    if (this.allowUpdating && event.colDef.editable && !this.gridApi.getEditingCells().length) {
      this.gridApi.startEditingCell({
        rowIndex: event.rowIndex,
        colKey: event.column.getId()
      });
    }
  }

  /**
   * Save all pending edits - mimics DevExtreme onSaved behavior
   * This is called by the Save button in the toolbar
   */
  saveEdits(): void {
    if (this.editedRows.size === 0) {
      return;
    }

    this.changeArray = [];
    const keyField = this.gridObject?.keys?.[0] || 'id';

    // Build change array like DevExtreme
    this.editedRows.forEach((editedData, rowKey) => {
      // Find original row
      const originalRow = this.gridObject.dataSet.find((row: any) => row[keyField] === rowKey);

      if (originalRow) {
        // Update type - row existed before
        const key: any = {};
        this.gridObject.keys.forEach((k: string) => {
          key[k] = originalRow[k];
        });

        // Map boolean values from UI to storage values (like DevExtreme)
        const mappedRow = this.mapBooleanValues(editedData, 'toStorage');

        this.changeArray.push({
          type: 'update',
          key: key,
          data: mappedRow,
          dataParams: this.buildParams(mappedRow, 'P_')
        });

        // Update the dataSet with new values
        Object.assign(originalRow, mappedRow);
      }
    });

    // Store changes in metadata (like DevExtreme)
    this.metaData.changeArray = this.changeArray;

    // Update backupDataSet to reflect saved state (so Cancel won't revert saved changes)
    if (this.gridObject.dataSet) {
      this.gridObject.backupDataSet = this.gridObject.dataSet.map((row: any) => ({ ...row }));
    }

    // Clear edited rows BEFORE executing action (toolbar will hide)
    this.editedRows.clear();

    // Exit edit mode (like DevExtreme) - disable editing on all columns
    this.allowUpdating = false;
    if (this.gridApi && !this.gridApi.isDestroyed() && this.metaData?.data?.columns) {
      const columns = this.gridApi.getColumns();
      columns?.forEach((column: any) => {
        const colDef = column.getColDef();
        colDef.editable = false;
      });
      this.gridApi.refreshCells({ force: true });
    }

    // Execute action if defined
    if (this.metaData.actionOnEditPost) {
      this.gtsDataService.runAction(
        this.prjId,
        this.formId,
        this.metaData.actionOnEditPost
      );
    }
  }

  /**
   * Cancel all pending edits - mimics DevExtreme onEditCanceled behavior
   * This is called by the Revert button in the toolbar
   */
  cancelEdits(): void {
    // Clear edited rows FIRST (toolbar will hide immediately)
    this.editedRows.clear();
    this.changeArray = [];

    // Restore from backup
    if (this.gridObject.backupDataSet && this.gridObject.dataSet) {
      for (let i = 0; i < this.gridObject.backupDataSet.length; i++) {
        this.gridObject.dataSet[i] = { ...this.gridObject.backupDataSet[i] };
      }
    }

    // Refresh grid to show original values
    if (this.gridApi && !this.gridApi.isDestroyed()) {
      this.gridApi.setGridOption('rowData', this.gridObject.dataSet);
    }

    // Exit edit mode (like DevExtreme) - disable editing on all columns
    this.allowUpdating = false;
    if (this.gridApi && !this.gridApi.isDestroyed() && this.metaData?.data?.columns) {
      const columns = this.gridApi.getColumns();
      columns?.forEach((column: any) => {
        const colDef = column.getColDef();
        colDef.editable = false;
      });
      this.gridApi.refreshCells({ force: true });
    }

    // Execute rollback action if defined
    if (this.metaData.actionOnEditRollback) {
      this.gtsDataService.runAction(
        this.prjId,
        this.formId,
        this.metaData.actionOnEditRollback
      );
    }
  }

  /**
   * Get all row data (for compatibility with auth-details component)
   * Returns all rows including edited ones
   */
  getAllRowData(): any[] {
    if (this.gridApi && !this.gridApi.isDestroyed()) {
      const allRows: any[] = [];
      this.gridApi.forEachNode(node => {
        if (node.data) {
          allRows.push(node.data);
        }
      });
      return allRows;
    }
    return this.gridObject?.dataSet || [];
  }

  /**
   * Map boolean values between UI (true/false) and storage (checkedValue/uncheckedValue)
   */
  private mapBooleanValues(rowData: any, direction: 'toStorage' | 'toUI'): any {
    const mapped = { ...rowData };

    this.columnDefs.forEach((colDef: any) => {
      const field = colDef.field;
      if (!field) return;

      // Find column metadata
      const colMetadata = this.metaData?.data?.columns?.find((c: any) => (c.dataField || c.fieldName) === field);
      if (!colMetadata) return;
      // Normalize column type (supports both dataType and colType properties, case-insensitive)
      // Priority: colType over dataType (colType is more specific)
      const metaColumnType = (colMetadata.colType || colMetadata.dataType || '').toLowerCase();
      if (metaColumnType !== 'boolean') return;

      const value = mapped[field];
      if (value === null || value === undefined) return;

      if (direction === 'toStorage') {
        // UI (true/false) -> Storage (checkedValue/uncheckedValue)
        if (colMetadata.checkedValue !== undefined && colMetadata.uncheckedValue !== undefined) {
          mapped[field] = value === true ? colMetadata.checkedValue : colMetadata.uncheckedValue;
        }
      } else {
        // Storage (checkedValue/uncheckedValue) -> UI (true/false)
        if (colMetadata.checkedValue !== undefined && colMetadata.uncheckedValue !== undefined) {
          mapped[field] = value === colMetadata.checkedValue;
        }
      }
    });

    return mapped;
  }

  /**
   * Build params object with prefix (like DevExtreme buildParams)
   */
  private buildParams(data: any, prefix: string): any {
    return Object.keys(data).reduce((obj: any, key: any) => {
      obj[prefix + key] = data[key];
      return obj;
    }, {});
  }

  /**
   * Export grid data to Excel using ExcelJS (like DevExtreme)
   * File name comes from metadata.exportFileName, or gridTitle, or objectName
   */
  async exportToExcel(): Promise<void> {
    if (!this.gridApi || this.gridApi.isDestroyed()) {
      console.warn('[gts-grid] Cannot export - grid API not ready or destroyed');
      return;
    }

    // Determine file name from metadata, title, or object name
    const fileName = this.gridObject?.exportFileName
      || this.gridTitle
      || this.objectName
      || 'export';

    // Create workbook and worksheet
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Flatten columnDefs to get leaf columns and track groups
    const flatColumns: { col: ColDef; groupName: string | null }[] = [];
    this.columnDefs.forEach((colDef: any) => {
      if (colDef.children && Array.isArray(colDef.children)) {
        // This is a column group - add its children
        colDef.children.forEach((childCol: ColDef) => {
          if (!childCol.hide) {
            flatColumns.push({ col: childCol, groupName: colDef.headerName || null });
          }
        });
      } else if (!colDef.hide && colDef.field) {
        // Regular column
        flatColumns.push({ col: colDef, groupName: null });
      }
    });

    // Check if we have any column groups
    const hasGroups = flatColumns.some(fc => fc.groupName !== null);

    if (hasGroups) {
      // Add group header row - only put group name in first cell of each group
      const groupHeaders: string[] = [];
      let lastGroup: string | null = null;
      flatColumns.forEach((fc, idx) => {
        if (fc.groupName && fc.groupName !== lastGroup) {
          groupHeaders.push(fc.groupName);
          lastGroup = fc.groupName;
        } else if (fc.groupName && fc.groupName === lastGroup) {
          groupHeaders.push(''); // Empty for subsequent columns in same group
        } else {
          groupHeaders.push('');
          lastGroup = null;
        }
      });

      const groupRow = worksheet.addRow(groupHeaders);

      // Find group spans and apply formatting only to group cells
      let i = 0;
      while (i < flatColumns.length) {
        const groupName = flatColumns[i].groupName;
        if (groupName) {
          // Find how many columns this group spans
          let groupEnd = i;
          while (groupEnd < flatColumns.length - 1 && flatColumns[groupEnd + 1].groupName === groupName) {
            groupEnd++;
          }

          // Apply formatting to all cells in this group (1-indexed for Excel)
          for (let col = i; col <= groupEnd; col++) {
            const cell = worksheet.getCell(1, col + 1);
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF1E293B' }
            };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          }

          // Merge if group spans more than one column
          if (groupEnd > i) {
            worksheet.mergeCells(1, i + 1, 1, groupEnd + 1);
          }

          // Center align the merged cell
          worksheet.getCell(1, i + 1).alignment = { horizontal: 'center' };

          i = groupEnd + 1;
        } else {
          i++;
        }
      }
    }

    // Add column header row
    const headerRow = worksheet.addRow(flatColumns.map(fc => fc.col.headerName || fc.col.field));
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Get all rows (respecting filters if active)
    const allRows: any[] = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node: any) => {
      if (node.data) {
        allRows.push(node.data);
      }
    });

    // Add data rows
    allRows.forEach((rowData: any) => {
      const row = flatColumns.map(fc => {
        const col = fc.col;
        const value = rowData[col.field!];

        // Format dates
        const colMetadata = this.metaData?.data?.columns?.find((c: any) => (c.dataField || c.fieldName) === col.field);
        if (colMetadata) {
          // Normalize column type (supports both dataType and colType properties, case-insensitive)
          // Priority: colType over dataType (colType is more specific)
          const metaColumnType = (colMetadata.colType || colMetadata.dataType || '').toLowerCase();

          if (metaColumnType === 'date' || metaColumnType === 'datetime') {
            if (value) {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                return metaColumnType === 'datetime'
                  ? this.formatDateTime(date)
                  : this.formatDate(date);
              }
            }
          }

          // Format booleans
          if (metaColumnType === 'boolean') {
            return value ? 'Yes' : 'No';
          }

          // Format numbers
          if (metaColumnType === 'number' && typeof value === 'number') {
            return value;
          }
        }

        return value !== null && value !== undefined ? String(value) : '';
      });

      worksheet.addRow(row);
    });

    // Auto-size columns
    worksheet.columns.forEach((column: any, index: number) => {
      let maxLength = 10;
      column.eachCell!({ includeEmpty: false }, (cell: any) => {
        const cellValue = cell.value ? String(cell.value) : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(maxLength + 2, 50); // Max 50 characters wide
    });

    // Generate Excel file and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Add .xlsx extension if not present
    const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    saveAs(blob, finalFileName);
  }
}
