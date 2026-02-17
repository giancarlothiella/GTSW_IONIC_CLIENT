import { Component, OnInit, OnDestroy, Input, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

// PrimeNG components for grid menu
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';

// GTS AI Chat
import { GtsAiChatComponent, AiChatConfig } from '../gts-ai-chat/gts-ai-chat.component';

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
  imports: [CommonModule, FormsModule, AgGridModule, IonSpinner, Menu, Dialog, Select, GtsAiChatComponent],
  templateUrl: './gts-grid.component.html',
  styleUrls: ['./gts-grid.component.scss']
})
export class GtsGridComponent implements OnInit, OnDestroy {

  private gtsDataService = inject(GtsDataService);
  private gtsGridService = inject(GtsGridService);
  private ts = inject(TranslationService);
  private alertController = inject(AlertController);
  private cdr = inject(ChangeDetectorRef);

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
  gridCaptionColor: string = '';
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
    headerHeight: 30,
    floatingFiltersHeight: 28,  // Match row height for filter row
    cellHorizontalPadding: 8,
    borderRadius: 0,
    wrapperBorder: false,
    wrapperBorderRadius: 0
  };

  // Theme with fixed row height (default)
  theme = themeQuartz.withParams({
    ...this.baseThemeParams,
    rowHeight: 28
  });

  // Flag to track if grid has multiline columns
  hasMultilineColumns: boolean = false;

  // Row height - undefined allows autoHeight to work for multiline columns
  gridRowHeight: number | undefined = 28;

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

  // Flag to prevent action execution during AI data loading
  isLoadingAiData: boolean = false;

  // Flag to lock row selection (gridLockRows/gridUnLockRows actions)
  rowsLocked: boolean = false;

  // Store initial column state for reset functionality
  initialColumnState: any[] | null = null;

  // Store current column state to preserve during reloads (after user resizes columns)
  savedColumnState: any[] | null = null;

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
  paginationMode: number = 1;            // 1=Unlimited, 2=Limited with totalCount, 3=Limited without totalCount

  // Summary / Pinned Bottom Row
  pinnedBottomRowData: any[] = [];
  summaryColumns: any[] = [];            // Columns with summaryType defined

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

  // Grid Menu
  @ViewChild('gridMenu') gridMenu!: Menu;
  gridMenuItems: MenuItem[] = [];

  // Show Original Data Dialog
  showOriginalDataDialog: boolean = false;
  originalDataFields: any[] = [];
  originalDataSqlId: number = 0;
  originalDataSqlCode: string = '';
  showSqlCode: boolean = false;
  sqlCopied: boolean = false;

  // Icons Legend Dialog
  showIconsLegendDialog: boolean = false;
  iconsLegendData: any[] = [];

  // Column Chooser Dialog
  showColumnChooserDialog: boolean = false;
  columnChooserData: any[] = [];

  // AI Assist Dialog
  showAiAssistDialog: boolean = false;
  aiChatConfigs: any[] = [];
  selectedAiChatCode: string = '';
  loadingAiConfigs: boolean = false;

  // AI Chat
  showAiChat: boolean = false;
  aiChatConfig: any = { prjId: '', chatCode: '' };

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

        // Check for editing mode flags - only process if dataSetName matches THIS grid
        if (dataArray.length > 1 && this.metaData?.dataSetName === dataSetName) {
          const allowFlags = dataArray[1].split(':');
          if (allowFlags.length > 0) {
            if (allowFlags[0] === 'Edit') {
              this.allowUpdating = allowFlags[1] === 'true';
              // Also enable delete if grid has canDelete capability
              if (this.allowUpdating && this.gridObject?.canDelete) {
                this.allowDeleting = true;
                this.addDeleteColumn();
              }
              if (this.gridApi && !this.gridApi.isDestroyed()) {
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
              // Trigger Angular change detection to update toolbar buttons
              this.cdr.detectChanges();
              return;
            }
            if (allowFlags[0] === 'Insert') {
              this.allowInserting = allowFlags[1] === 'true';
              this.cdr.detectChanges();
              return;
            }
            if (allowFlags[0] === 'Delete') {
              const wasDeleting = this.allowDeleting;
              this.allowDeleting = allowFlags[1] === 'true';
              // Add or remove delete column without rebuilding all columns
              if (this.allowDeleting && !wasDeleting) {
                this.addDeleteColumn();
              } else if (!this.allowDeleting && wasDeleting) {
                this.removeDeleteColumn();
              }
              this.cdr.detectChanges();
              return;
            }
            if (allowFlags[0] === 'Lock') {
              this.rowsLocked = allowFlags[1] === 'true';
              this.cdr.detectChanges();
              return;
            }
            if (allowFlags[0] === 'Idle') {
              this.allowUpdating = false;
              this.allowInserting = false;
              this.allowDeleting = false;
              // Remove delete column and disable editing without rebuilding all columns
              this.removeDeleteColumn();
              if (this.gridApi && !this.gridApi.isDestroyed()) {
                const columns = this.gridApi.getColumns();
                columns?.forEach((column: any) => {
                  const colDef = column.getColDef();
                  colDef.editable = false;
                });
                this.gridApi.refreshCells({ force: true });
              }
              this.cdr.detectChanges();
              return;
            }
          }
        }

        // Normal data reload - check dataSetName and visibility
        if (this.metaData?.dataSetName === dataSetName && this.metaData?.visible) {

          // Save current column state before reload (preserves user's column widths)
          if (this.gridApi && !this.gridApi.isDestroyed()) {
            this.savedColumnState = this.gridApi.getColumnState();
          }

          // Reload metadata to get updated filterRule from toolbar
          this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'grids', this.objectName);

          // If there's a toolbar filter (filterRule), reload data from server with that filter
          if (this.metaData?.filterRule && this.metaData.filterRule.length > 0) {
            await this.reloadWithToolbarFilter();
          } else {
            this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
            await this.prepareGridData();
          }

          // Restore column state after reload (preserves column widths)
          // Use setTimeout to ensure AG Grid has finished processing new columnDefs
          if (this.savedColumnState) {
            const stateToRestore = this.savedColumnState;
            setTimeout(() => {
              if (this.gridApi && !this.gridApi.isDestroyed()) {
                this.gridApi.applyColumnState({
                  state: stateToRestore,
                  applyOrder: true
                });
              }
            }, 100);
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
    // Supports composite keys via keyFields object
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

        // Helper function to match a row against all key fields (composite key support)
        const matchesAllKeys = (rowData: any, keyFields: { [key: string]: any }): boolean => {
          if (!rowData || !keyFields) return false;
          return Object.keys(keyFields).every(keyField => rowData[keyField] === keyFields[keyField]);
        };

        // Find and update the row by iterating (supports composite keys)
        let rowUpdated = false;
        this.gridApi.forEachNode((node: any) => {
          if (node.data && matchesAllKeys(node.data, update.keyFields)) {
            node.setData({ ...update.rowData });
            rowUpdated = true;
          }
        });

        // Update this.selectedRows if the updated row is currently selected
        const selectedRowIndex = this.selectedRows.findIndex(
          (row: any) => row && matchesAllKeys(row, update.keyFields)
        );
        if (selectedRowIndex !== -1) {
          // Update the selected row data with new values
          this.selectedRows[selectedRowIndex] = { ...update.rowData };

          // Also update selectedRows in pageData through the service
          // Build composite key object for all key fields defined in grid
          const keys = this.gridObject?.keys || [];
          const selectedRowKeys = this.selectedRows.map((row: any) => {
            const keyObj: any = {};
            keys.forEach((keyField: string) => {
              keyObj[keyField] = row[keyField];
            });
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
    this.gridCaptionColor = this.gridObject.cssClass || '';
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

    // Grid starts in IDLE mode - editing is disabled until explicitly enabled via action
    this.allowInserting = false;  // Will be set via listener
    this.allowUpdating = false;   // Will be set via listener
    this.allowDeleting = false;   // Will be set via listener

    // Store capabilities on newGridObject (will be copied to this.gridObject later)
    newGridObject.canInsert = this.metaData.allowInserting || false;
    newGridObject.canUpdate = this.metaData.allowUpdating || false;
    newGridObject.canDelete = this.metaData.allowDeleting || newGridObject.allowDeleting || false;

    // Extract primary key field names from sqlKeys array
    // sqlKeys is array of objects like [{keyField: "FIELD1"}, {keyField: "FIELD2"}]
    // Check both newGridObject and this.metaData for sqlKeys
    const sqlKeys = newGridObject.sqlKeys || this.metaData?.sqlKeys;
    if (sqlKeys && Array.isArray(sqlKeys)) {
      newGridObject.keys = sqlKeys.map((k: any) => k.keyField || k.fieldName || k.dataField);
      newGridObject.sqlKeys = sqlKeys; // Ensure sqlKeys is copied to gridObject
    } else {
      newGridObject.keys = [];
    }


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

    // Extract columns with summaryType for pinned bottom row calculation
    // Also look inside band (grouped) columns
    this.summaryColumns = [];
    columns.forEach((col: any) => {
      if (col.summaryType) {
        this.summaryColumns.push(col);
      }
      if (col.columns && Array.isArray(col.columns)) {
        col.columns.forEach((childCol: any) => {
          if (childCol.summaryType) {
            this.summaryColumns.push(childCol);
          }
        });
      }
    });

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
    this.paginationMode = newGridObject.paginationMode || 1;


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

    // Calculate summary row (pinned bottom) if any columns have summaryType
    this.calculateSummaryRow();

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
        rowHeight: 28
      });
      this.gridRowHeight = 28;
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

    // Always add delete column at the end (hidden by default)
    // Will be shown/hidden via addDeleteColumn/removeDeleteColumn without rebuilding columns
    this.columnDefs.push({
      headerName: '',
      field: '__delete__',
      width: 50,
      minWidth: 50,
      maxWidth: 50,
      sortable: false,
      filter: false,
      resizable: false,
      pinned: 'right',
      hide: true,  // Hidden by default
      cellRenderer: (params: any) => {
        const button = document.createElement('button');
        button.innerHTML = '🗑️';
        button.style.cssText = 'background: none; border: none; cursor: pointer; font-size: 16px; padding: 2px 6px;';
        button.title = 'Delete row';
        button.onclick = (e) => {
          e.stopPropagation();
          this.deleteRow(params.node.data);
        };
        return button;
      }
    });
  }

  /**
   * Show the delete column (make it visible)
   * Uses setColumnsVisible to avoid resetting column widths
   */
  private addDeleteColumn(): void {

    if (this.gridApi && !this.gridApi.isDestroyed()) {
      // Just show the column - it's already in columnDefs but hidden
      this.gridApi.setColumnsVisible(['__delete__'], true);
    }
  }

  /**
   * Hide the delete column
   * Uses setColumnsVisible to avoid resetting column widths
   */
  private removeDeleteColumn(): void {

    if (this.gridApi && !this.gridApi.isDestroyed()) {
      // Just hide the column
      this.gridApi.setColumnsVisible(['__delete__'], false);
    }
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
      colDef.cellStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center' };
      if (colDef.editable) {
        colDef.cellEditor = 'agCheckboxCellEditor';
      }
      colDef.cellRenderer = (params: any) => {
        const checked = params.value ? 'checked' : '';
        return `<input type="checkbox" ${checked} style="appearance: auto; width: 16px; height: 16px; pointer-events: ${colDef.editable ? 'auto' : 'none'};" />`;
      };
    }

    // Handle date columns
    if (columnType === 'date' || columnType === 'datetime') {
      colDef.cellStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center' };
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
      colDef.cellStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center' };
      colDef.cellRenderer = (params: any) => {
        if (params.value === null || params.value === undefined || params.value === '') return '';

        // Se la colonna ha immagini definite nei metadati, usa quelle
        if (col.images && col.images.length > 0) {
          const image = col.images.find((img: any) => String(img.imgValue) === String(params.value));
          if (image) {
            // Use larger icon (without _16 suffix) for better quality on HiDPI screens
            return `<img src="/assets/icons/stdImage_${image.stdImageId}.png"
                         style="height: 24px; width: 24px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;"
                         alt="${params.value}" />`;
          }
          // Se images è definito ma non trova il valore, mostra il testo
          return `<span>${params.value}</span>`;
        }

        // Altrimenti prova con il path standard (solo se il valore sembra un nome file)
        const val = String(params.value);
        if (val.includes('.') || val.startsWith('stdImage_') || val.startsWith('icon_')) {
          return `<img src="${this.getImagePath(val)}"
                       style="height: 24px; width: 24px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;"
                       alt="${params.value}"
                       onerror="this.style.display='none'; this.nextSibling.style.display='inline';"
                  /><span style="display:none;">${params.value}</span>`;
        }
        // Valore numerico o testo generico - mostra come testo
        return `<span>${params.value}</span>`;
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

    // Handle numeric columns - right align and format with mask
    const numericTypes = ['number', 'int', 'integer', 'decimal', 'float', 'double', 'numeric', 'money', 'currency', 'smallint'];
    if (numericTypes.includes(columnType)) {
      colDef.cellClass = 'gts-cell-right';
      colDef.headerClass = 'gts-header-right';

      // Apply number formatting from column mask/format
      const format = col.format || col.mask;
      if (format) {
        const decimals = this.getDecimalPlacesFromMask(format);
        const useThousands = format.includes(',');
        colDef.valueFormatter = (params: any) => {
          if (params.value === null || params.value === undefined || params.value === '') return '';
          const num = Number(params.value);
          if (isNaN(num)) return params.value;
          if (useThousands) {
            return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
          }
          return num.toFixed(decimals);
        };
      }
    }

    return colDef;
  }


  private getDecimalPlacesFromMask(mask: string): number {
    const dotIndex = mask.lastIndexOf('.');
    if (dotIndex < 0) return 0;
    // Count chars after last dot (e.g. "#,###.00" → 2, "#.0" → 1)
    return mask.length - dotIndex - 1;
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

  getImagePath(iconId: any): string {
    const id = String(iconId);
    if (id.includes('.')) {
      return `/assets/icons/${id}`;
    }
    return `/assets/icons/icon_${id}.svg`;
  }

  // AG Grid Events
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    // Listen for filter changes to update hasActiveFilters and recalculate summaries
    params.api.addEventListener('filterChanged', () => {
      this.checkActiveFilters();
      this.calculateSummaryRow();
    });

    // Expose test method on window for easy console access
    // Usage: window.testGridAI([{field: 'value'}], 'append')
    (window as any).testGridAI = (data: any[], mode: 'append' | 'replace' = 'append') => {
      this.testAiDataMerge(data, mode);
    };
    (window as any).gtsGrid = this; // Full access to grid component

    // Initial grid setup
    setTimeout(() => {
      // Go to first page to ensure rows are displayed
      params.api.paginationGoToFirstPage();

      // Auto-size all columns to fit their content (best fit) on first load
      params.api.autoSizeAllColumns(false); // false = don't skip header

      // Save initial column state for reset functionality (only on first load)
      if (!this.initialColumnState) {
        this.initialColumnState = params.api.getColumnState();
      }

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
   * Calculate summary row (pinned bottom) based on column summaryType metadata.
   * Supports: sum, count, avg (simple), avg with summaryProductCol/summaryWeightCol (weighted).
   * Uses only currently visible (after filter) rows when grid API is available.
   */
  calculateSummaryRow(): void {
    if (this.summaryColumns.length === 0) {
      this.pinnedBottomRowData = [];
      return;
    }

    // Get the rows currently displayed (respects grid filters)
    let rows: any[] = [];
    if (this.gridApi && !this.gridApi.isDestroyed()) {
      this.gridApi.forEachNodeAfterFilter((node: any) => {
        if (node.data) rows.push(node.data);
      });
    } else {
      rows = this.rowData || [];
    }

    if (rows.length === 0) {
      this.pinnedBottomRowData = [];
      return;
    }

    const summaryRow: any = {};

    for (const col of this.summaryColumns) {
      const field = col.dataField || col.fieldName;
      const type = (col.summaryType || '').toLowerCase();

      if (type === 'sum') {
        let total = 0;
        for (const row of rows) {
          const val = Number(row[field]);
          if (!isNaN(val)) total += val;
        }
        summaryRow[field] = total;

      } else if (type === 'count') {
        summaryRow[field] = rows.length;

      } else if (type === 'min') {
        let min: number | null = null;
        for (const row of rows) {
          const val = Number(row[field]);
          if (!isNaN(val) && (min === null || val < min)) min = val;
        }
        summaryRow[field] = min;

      } else if (type === 'max') {
        let max: number | null = null;
        for (const row of rows) {
          const val = Number(row[field]);
          if (!isNaN(val) && (max === null || val > max)) max = val;
        }
        summaryRow[field] = max;

      } else if (type === 'avg') {
        if (col.summaryProductCol && col.summaryWeightCol) {
          // Weighted average: SUM(productCol) / SUM(weightCol)
          let sumProduct = 0;
          let sumWeight = 0;
          for (const row of rows) {
            const product = Number(row[col.summaryProductCol]);
            const weight = Number(row[col.summaryWeightCol]);
            if (!isNaN(product)) sumProduct += product;
            if (!isNaN(weight)) sumWeight += weight;
          }
          summaryRow[field] = sumWeight !== 0 ? sumProduct / sumWeight : 0;
        } else {
          // Simple arithmetic average
          let total = 0;
          let count = 0;
          for (const row of rows) {
            const val = Number(row[field]);
            if (!isNaN(val)) {
              total += val;
              count++;
            }
          }
          summaryRow[field] = count > 0 ? total / count : 0;
        }
      }
    }

    this.pinnedBottomRowData = [summaryRow];

    // If grid API exists, update pinned row directly
    if (this.gridApi && !this.gridApi.isDestroyed()) {
      this.gridApi.setGridOption('pinnedBottomRowData', this.pinnedBottomRowData);
    }
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

    // In singleRow mode, only select the first node to avoid AG Grid warning #130
    if (nodesToSelect.length > 1 && this.rowSelection.mode !== 'multiRow') {
      nodesToSelect.splice(1);
    }

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
    // If grid is disabled or rows are locked, prevent selection change by restoring previous selection
    if ((this.gridObject?.disabled || this.rowsLocked) && !this.isRestoringSelection) {
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

    // Get ALL key fields from gridObject.keys for composite key support
    // gridObject.keys comes from metadata sqlKeys: ['connCode', 'dbMode']
    const keyFields = this.gridObject?.keys || [this.metaData?.dataAdapterIdField || 'id'];

    // Create selectedRowKeys with ALL key fields for composite key support
    // Format: [{connCode: 'WFS_MOD', dbMode: 'P'}] for composite keys
    const selectedRowKeys = this.selectedRows.map((row: any) => {
      const keyObj: any = {};
      keyFields.forEach((keyField: string) => {
        keyObj[keyField] = row[keyField];
      });
      return keyObj;
    });

    // Skip action execution if we're restoring selection programmatically or loading AI data
    if (this.isRestoringSelection || this.isLoadingAiData) {
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
    // Check if there are any changes to save (edits, deletes, OR inserts)
    const hasDeletes = this.changeArray.some((c: any) => c.type === 'delete');
    const hasInserts = this.changeArray.some((c: any) => c.type === 'insert');
    const hasEdits = this.editedRows.size > 0 && !this.editedRows.has('__ai_changes__');

    if (!hasEdits && !hasDeletes && !hasInserts) {
      return;
    }


    // Preserve existing delete AND insert records, only rebuild updates
    const deleteRecords = this.changeArray.filter((c: any) => c.type === 'delete');
    const insertRecords = this.changeArray.filter((c: any) => c.type === 'insert');
    this.changeArray = [...deleteRecords, ...insertRecords];  // Start with delete + insert records

    const keyField = this.gridObject?.keys?.[0] || 'id';

    // Build change array for updates (manual cell edits, not AI marker)
    this.editedRows.forEach((editedData, rowKey) => {
      // Skip the AI changes marker - it's just a flag, not actual row data
      if (rowKey === '__ai_changes__') {
        return;
      }

      // Find original row
      const originalRow = this.gridObject?.dataSet?.find((row: any) => row[keyField] === rowKey);

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


    // Store changes in the correct location for dataSetPost to read
    this.metaData.changeArray = this.changeArray;
    this.gtsDataService.setGridChangeArray(this.prjId, this.formId, this.objectName, this.changeArray);

    // Update backupDataSet to reflect saved state (so Cancel won't revert saved changes)
    if (this.gridObject?.dataSet) {
      this.gridObject.backupDataSet = this.gridObject.dataSet.map((row: any) => ({ ...row }));
    }

    // Clear edited rows BEFORE executing action (toolbar will hide)
    this.editedRows.clear();

    // Exit edit mode - disable editing on all columns and hide delete column
    this.allowUpdating = false;
    this.allowDeleting = false;
    this.removeDeleteColumn();

    if (this.gridApi && !this.gridApi.isDestroyed() && this.metaData?.data?.columns) {
      const columns = this.gridApi.getColumns();
      columns?.forEach((column: any) => {
        const colDef = column.getColDef();
        colDef.editable = false;
      });
      this.gridApi.refreshCells({ force: true });
    }

    // Trigger change detection to update toolbar
    this.cdr.detectChanges();

    // Execute action if defined
    if (this.metaData.actionOnEditPost) {
      this.gtsDataService.runAction(
        this.prjId,
        this.formId,
        this.metaData.actionOnEditPost
      );
    } else {
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
   * Delete a row from the grid
   * Removes row from display and adds DELETE record to changeArray
   */
  deleteRow(rowData: any): void {
    if (!rowData) return;

    // Get primary key fields
    const keyFields = this.gridObject?.keys || [];

    // Build key and keyParams for delete record
    const key: any = {};
    const keyParams: any = {};
    keyFields.forEach((keyField: string) => {
      key[keyField] = rowData[keyField];
      keyParams['P_' + keyField] = rowData[keyField];
    });

    // Add delete record to changeArray
    this.changeArray.push({
      type: 'delete',
      key: key,
      keyParams: keyParams
    });


    // Remove from rowData array
    const index = this.rowData.findIndex(row => {
      return keyFields.every((keyField: string) => row[keyField] === rowData[keyField]);
    });
    if (index > -1) {
      this.rowData.splice(index, 1);
    }

    // Remove from gridObject.dataSet if it exists
    if (this.gridObject?.dataSet) {
      const dsIndex = this.gridObject.dataSet.findIndex((row: any) => {
        return keyFields.every((keyField: string) => row[keyField] === rowData[keyField]);
      });
      if (dsIndex > -1) {
        this.gridObject.dataSet.splice(dsIndex, 1);
      }
    }

    // Update grid display using applyTransaction (doesn't reset column widths)
    if (this.gridApi && !this.gridApi.isDestroyed()) {
      this.gridApi.applyTransaction({ remove: [rowData] });
    }

    // Store changes in the correct location for dataSetPost to read
    // dataSetPost reads from: metaData[page].pageData.grids[grid].changeArray
    this.metaData.changeArray = this.changeArray;
    this.gtsDataService.setGridChangeArray(this.prjId, this.formId, this.objectName, this.changeArray);

    // Mark that we have unsaved changes (show save button)
    this.editedRows.set('__deleted__', true);

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

  // ============================================
  // GRID MENU
  // ============================================

  /**
   * Build the grid menu items based on available features
   */
  buildGridMenu(): void {
    this.gridMenuItems = [];

    // Export section
    this.gridMenuItems.push({
      label: this.t(1820, 'Export to Excel'),
      icon: 'pi pi-file-excel',
      command: () => this.exportToExcel()
    });
    this.gridMenuItems.push({
      label: this.t(1821, 'Export to CSV'),
      icon: 'pi pi-file',
      command: () => this.exportToCSV()
    });
    this.gridMenuItems.push({
      label: this.t(1822, 'Copy to Clipboard'),
      icon: 'pi pi-copy',
      command: () => this.copyToClipboard()
    });
    this.gridMenuItems.push({
      label: this.t(1823, 'Print'),
      icon: 'pi pi-print',
      command: () => this.printGrid()
    });

    // Separator
    this.gridMenuItems.push({ separator: true });

    // AI Assist (if enabled)
    this.gridMenuItems.push({
      label: this.t(1824, 'AI Assist'),
      icon: 'pi pi-sparkles',
      command: () => this.openAiAssist()
    });

    // Separator
    this.gridMenuItems.push({ separator: true });

    // Column management
    this.gridMenuItems.push({
      label: this.t(1825, 'Column Chooser'),
      icon: 'pi pi-th-large',
      command: () => this.openColumnChooser()
    });
    this.gridMenuItems.push({
      label: this.t(1826, 'Reset Columns'),
      icon: 'pi pi-replay',
      command: () => this.resetColumns()
    });

    // Icons Legend (only if grid has icon columns)
    if (this.hasIconColumns()) {
      this.gridMenuItems.push({ separator: true });
      this.gridMenuItems.push({
        label: this.t(1827, 'Icons Legend'),
        icon: 'pi pi-info-circle',
        command: () => this.openIconsLegend()
      });
    }

    // Separator and Debug section
    this.gridMenuItems.push({ separator: true });
    this.gridMenuItems.push({
      label: this.t(1828, 'Show Original Data'),
      icon: 'pi pi-database',
      command: () => this.openOriginalData()
    });
  }

  /**
   * Toggle the grid menu
   */
  toggleGridMenu(event: Event): void {
    this.buildGridMenu();
    this.gridMenu.toggle(event);
  }

  /**
   * Check if grid has columns with icons
   */
  hasIconColumns(): boolean {
    if (!this.metaData?.data?.columns) return false;
    return this.metaData.data.columns.some((col: any) =>
      col.images && col.images.length > 0
    );
  }

  /**
   * Export grid data to CSV
   */
  exportToCSV(): void {
    if (!this.gridApi || this.gridApi.isDestroyed()) return;

    const fileName = this.gridObject?.exportFileName || this.gridTitle || this.objectName || 'export';

    // Get visible columns
    const visibleCols = this.columnDefs.filter((col: any) => !col.hide && col.field);

    // Build CSV header
    const headers = visibleCols.map((col: any) => `"${col.headerName || col.field}"`).join(',');

    // Build CSV rows
    const rows: string[] = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node: any) => {
      if (node.data) {
        const row = visibleCols.map((col: any) => {
          const value = node.data[col.field];
          if (value === null || value === undefined) return '""';
          // Escape quotes and wrap in quotes
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
        rows.push(row);
      }
    });

    // Combine and download
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }); // BOM for Excel
    const finalFileName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
    saveAs(blob, finalFileName);
  }

  /**
   * Copy grid data to clipboard
   */
  async copyToClipboard(): Promise<void> {
    if (!this.gridApi || this.gridApi.isDestroyed()) return;

    // Get visible columns
    const visibleCols = this.columnDefs.filter((col: any) => !col.hide && col.field);

    // Build tab-separated data (for Excel paste)
    const headers = visibleCols.map((col: any) => col.headerName || col.field).join('\t');

    const rows: string[] = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node: any) => {
      if (node.data) {
        const row = visibleCols.map((col: any) => {
          const value = node.data[col.field];
          return value === null || value === undefined ? '' : String(value);
        }).join('\t');
        rows.push(row);
      }
    });

    const text = [headers, ...rows].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      // Show success message
      const alert = await this.alertController.create({
        header: this.t(1829, 'Copied'),
        message: this.t(1830, 'Data copied to clipboard'),
        buttons: ['OK'],
        cssClass: 'gts-alert-success'
      });
      await alert.present();
      setTimeout(() => alert.dismiss(), 1500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }

  /**
   * Print grid data
   */
  printGrid(): void {
    if (!this.gridApi || this.gridApi.isDestroyed()) return;

    // Get visible columns
    const visibleCols = this.columnDefs.filter((col: any) => !col.hide && col.field);

    // Build HTML table
    let html = `
      <html>
      <head>
        <title>${this.gridTitle || this.objectName}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f5f8; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          h1 { font-size: 16px; margin-bottom: 10px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${this.gridTitle || this.objectName}</h1>
        <table>
          <thead><tr>${visibleCols.map((col: any) => `<th>${col.headerName || col.field}</th>`).join('')}</tr></thead>
          <tbody>
    `;

    this.gridApi.forEachNodeAfterFilterAndSort((node: any) => {
      if (node.data) {
        html += '<tr>';
        visibleCols.forEach((col: any) => {
          const value = node.data[col.field];
          html += `<td>${value === null || value === undefined ? '' : value}</td>`;
        });
        html += '</tr>';
      }
    });

    html += '</tbody></table></body></html>';

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }

  /**
   * Open AI Assist - shows dialog to select chat code
   */
  async openAiAssist(): Promise<void> {

    this.loadingAiConfigs = true;
    this.aiChatConfigs = [];
    this.selectedAiChatCode = '';
    this.showAiAssistDialog = true;

    try {
      // Load available chat configs for this project (type = grid)
      const configs = await this.gtsDataService.getAiChatConfigs(this.prjId, 'grid');
      this.aiChatConfigs = configs || [];
    } catch (error) {
      console.error('[gts-grid] Error loading AI chat configs:', error);
      this.aiChatConfigs = [];
    } finally {
      this.loadingAiConfigs = false;
    }
  }

  /**
   * Start AI Chat with selected config
   */
  startAiChat(): void {
    if (!this.selectedAiChatCode) return;

    // Build grid columns info for AI context
    const gridColumns = this.metaData?.columns?.map((col: any) => ({
      fieldName: col.fieldName || col.dataField,
      caption: col.text || col.caption,
      dataType: col.colType || col.dataType || 'String',
      required: false
    })) || [];

    this.aiChatConfig = {
      prjId: this.prjId,
      chatCode: this.selectedAiChatCode,
      useTemplateMode: true,
      contextType: 'grid',
      formId: this.formId,
      gridName: this.objectName,
      gridColumns: gridColumns
    };


    this.showAiAssistDialog = false;

    // Small delay to ensure config is propagated before dialog opens
    setTimeout(() => {
      this.showAiChat = true;
    }, 50);
  }

  /**
   * Handle data received from AI Chat
   * @param event Contains type, data array, and mode ('append' or 'replace')
   */
  async onAiDataReceived(event: { type: 'grid' | 'form', data: any, mode?: 'append' | 'replace' }): Promise<void> {

    if (event.type === 'grid' && event.data && Array.isArray(event.data)) {
      // Set flag to prevent action execution during AI data loading
      this.isLoadingAiData = true;
      // Save original rows BEFORE any changes (needed for DELETE in replace mode and for rollback)
      const originalRows = [...this.rowData];

      // Save backup for rollback (so Cancel button can restore original state)
      this.gridObject.backupDataSet = this.rowData.map((row: any) => ({ ...row }));
      if (this.gridObject.dataSet) {
        this.gridObject.dataSet = [...this.rowData];
      }

      // Get hidden fields from first existing row (fields not in grid columns)
      const hiddenFields = this.getHiddenFieldsFromExistingData();

      // Merge hidden fields into each AI row (only AI values that are not null/undefined)
      const enrichedData = event.data.map((row: any) => {
        const mergedRow = { ...hiddenFields };  // Start with hidden fields

        // Only copy AI values that are not null/undefined/empty string
        Object.keys(row).forEach((key) => {
          const value = row[key];
          if (value !== null && value !== undefined && value !== '') {
            mergedRow[key] = value;
          }
        });

        return mergedRow;
      });


      // Build changeArray
      this.changeArray = [];

      // Get primary key fields from gridObject
      const keyFields = this.gridObject?.keys || [];

      if (event.mode === 'replace') {
        // REPLACE MODE: First DELETE all existing rows, then INSERT new ones

        // Build DELETE records for all original rows
        originalRows.forEach((row: any) => {
          const key: any = {};
          const keyParams: any = {};

          // Build key and keyParams using primary key fields
          keyFields.forEach((keyField: string) => {
            key[keyField] = row[keyField];
            keyParams['P_' + keyField] = row[keyField];
          });

          this.changeArray.push({
            type: 'delete',
            key: key,
            keyParams: keyParams
          });
        });


        // Update grid data
        this.rowData = [...enrichedData];
      } else {
        // APPEND MODE: Just insert new rows
        this.rowData = [...this.rowData, ...enrichedData];
      }

      // Build INSERT records for new rows
      enrichedData.forEach((row: any) => {
        // Map boolean values from UI to storage values
        const mappedRow = this.mapBooleanValues(row, 'toStorage');

        this.changeArray.push({
          type: 'insert',
          key: {},
          data: mappedRow,
          dataParams: this.buildParams(mappedRow, 'P_')
        });
      });


      // Update grid display with new rows only
      if (this.gridApi && !this.gridApi.isDestroyed()) {
        this.gridApi.setGridOption('rowData', this.rowData);

        // Verify the data was set correctly
        const currentRowCount = this.gridApi.getDisplayedRowCount();

        // Auto-size columns after loading new data (especially important if grid was empty)
        setTimeout(() => {
          if (this.gridApi && !this.gridApi.isDestroyed()) {
            this.gridApi.autoSizeAllColumns(false);
            // Update initial column state so Reset Columns works correctly
            this.initialColumnState = this.gridApi.getColumnState();
          }
        }, 50);
      }

      // Store changeArray in the correct location for dataSetPost (same as grid edit)
      this.metaData.changeArray = this.changeArray;
      this.gtsDataService.setGridChangeArray(this.prjId, this.formId, this.objectName, this.changeArray);

      // Mark that we have unsaved changes (shows Save button)
      this.editedRows.set('__ai_changes__', true);

      // Put grid in edit mode directly (instead of relying on async sendGridReload)
      this.allowUpdating = true;
      if (this.gridObject?.canDelete) {
        this.allowDeleting = true;
        this.addDeleteColumn();
      }

      // Trigger change detection to update toolbar buttons
      this.cdr.detectChanges();

      // Also notify via service for consistency
      this.gtsDataService.sendGridReload(this.metaData.dataSetName + ';Edit:true');


      // Reset flag after a short delay to allow all events to settle
      setTimeout(() => {
        this.isLoadingAiData = false;
      }, 100);
    }

    this.showAiChat = false;
  }

  /**
   * Get hidden fields (not displayed in grid) from first existing row or dataset metadata
   * These fields need to be copied to new AI rows (e.g., parent ID, fixed values)
   */
  private getHiddenFieldsFromExistingData(): Record<string, any> {
    const hiddenFields: Record<string, any> = {};

    // Build set of visible column field names from AG Grid columnDefs
    const visibleColumns = new Set<string>();

    // Helper function to extract field names from column definitions (including nested groups)
    const extractFieldNames = (cols: ColDef[]): void => {
      cols.forEach((col: any) => {
        if (col.field) {
          visibleColumns.add(col.field);
        }
        // Handle column groups (bands)
        if (col.children && Array.isArray(col.children)) {
          extractFieldNames(col.children);
        }
      });
    };

    extractFieldNames(this.columnDefs);

    // Also check metaData.data.columns as fallback (server metadata)
    if (visibleColumns.size === 0 && this.metaData?.data?.columns) {
      this.metaData.data.columns.forEach((col: any) => {
        const fieldName = col.dataField || col.fieldName;
        if (fieldName) {
          visibleColumns.add(fieldName);
        }
      });
    }


    // Get first row from current grid data
    const firstRow = this.rowData.length > 0 ? this.rowData[0] : null;

    if (firstRow) {
      // OPTION 1: Get hidden fields from existing row data

      // Get all fields from first row that are NOT in visible columns
      Object.keys(firstRow).forEach((fieldName) => {
        if (!visibleColumns.has(fieldName)) {
          hiddenFields[fieldName] = firstRow[fieldName];
        }
      });
    } else {
      // OPTION 2: No existing rows - get values from sqlParams definitions
      // sqlParams defines WHERE clause parameters but values come from pageFields or other datasets

      const dataSetName = this.metaData?.dataSetName;
      if (dataSetName) {
        // Get dataset from pageData
        const dataSetInfo = this.gtsDataService.getDataSetAdapter(this.prjId, this.formId, dataSetName);

        if (dataSetInfo?.data) {
          const dataSet = dataSetInfo.data.find((ds: any) => ds.dataSetName === dataSetName);

          // sqlParams defines the WHERE clause parameters
          // Each param either has:
          // - paramObjectName: field name to look up in pageFields
          // - paramDataSetName + paramDataSetField: reference to another dataset's selected row
          if (dataSet?.sqlParams && Array.isArray(dataSet.sqlParams)) {
            dataSet.sqlParams.forEach((param: any) => {

              // Get the target field name (remove P_ prefix from paramName)
              let fieldName = param.paramName || param.name;
              if (fieldName && fieldName.startsWith('P_')) {
                fieldName = fieldName.substring(2);
              }

              // Skip if it's a visible column
              if (!fieldName || visibleColumns.has(fieldName)) {
                return;
              }

              let value = null;

              // Option 1: paramObjectName points to a pageField
              if (param.paramObjectName) {
                value = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, param.paramObjectName);
              }
              // Option 2: paramDataSetName + paramDataSetField points to another dataset's selected row
              else if (param.paramDataSetName && param.paramDataSetField) {
                const sourceDataSetInfo = this.gtsDataService.getDataSetAdapter(this.prjId, this.formId, param.paramDataSetName);
                if (sourceDataSetInfo?.data) {
                  const sourceDataSet = sourceDataSetInfo.data.find((ds: any) => ds.dataSetName === param.paramDataSetName);
                  if (sourceDataSet?.selectedRows && sourceDataSet.selectedRows.length > 0) {
                    value = sourceDataSet.selectedRows[0][param.paramDataSetField];
                  }
                }
              }

              if (value !== null && value !== undefined && hiddenFields[fieldName] === undefined) {
                hiddenFields[fieldName] = value;
              }
            });
          }
        }
      }
    }

    return hiddenFields;
  }

  /**
   * Handle AI Chat visibility change
   */
  onAiChatVisibleChange(visible: boolean): void {
    this.showAiChat = visible;
  }

  /**
   * TEST METHOD - Call from browser console to test AI data merge without making AI requests
   * Usage: Find the grid component instance and call testAiDataMerge(yourArray, 'append' or 'replace')
   *
   * Example from console:
   *   const grid = document.querySelector('app-gts-grid').__ngContext__[8];
   *   grid.testAiDataMerge([{INVD_RN: 1, INVREAS_CODE: 'TEST'}], 'append');
   *
   * Or use window.testGridAI if exposed
   */
  testAiDataMerge(data: any[], mode: 'append' | 'replace' = 'append'): void {
    this.onAiDataReceived({ type: 'grid', data, mode });
  }

  /**
   * Open Column Chooser dialog
   */
  openColumnChooser(): void {
    this.columnChooserData = this.columnDefs
      .filter((col: any) => col.field) // Only columns with field
      .map((col: any) => ({
        field: col.field,
        headerName: col.headerName || col.field,
        visible: !col.hide
      }));
    this.showColumnChooserDialog = true;
  }

  /**
   * Toggle column visibility from Column Chooser
   */
  toggleColumnVisibility(field: string, visible: boolean): void {
    if (!this.gridApi) return;
    this.gridApi.setColumnsVisible([field], visible);

    // Update columnChooserData
    const colData = this.columnChooserData.find(c => c.field === field);
    if (colData) colData.visible = visible;
  }

  /**
   * Reset columns to original state (as displayed on first load after autoSize)
   */
  resetColumns(): void {
    if (!this.gridApi || this.gridApi.isDestroyed()) return;

    if (this.initialColumnState) {
      // Restore to the saved initial state (after autoSizeAllColumns)
      this.gridApi.applyColumnState({
        state: this.initialColumnState,
        applyOrder: true
      });
    } else {
      // Fallback: auto-size columns if no initial state saved
      this.gridApi.autoSizeAllColumns(false);
    }
  }

  /**
   * Open Icons Legend dialog
   */
  openIconsLegend(): void {
    this.iconsLegendData = [];

    if (!this.metaData?.data?.columns) return;

    // Find columns with images
    this.metaData.data.columns.forEach((col: any) => {
      if (col.images && col.images.length > 0) {
        const fieldName = col.dataField || col.fieldName;
        const caption = col.caption || col.text || fieldName;
        this.iconsLegendData.push({
          columnName: `${caption} (${fieldName})`,
          icons: col.images.map((img: any) => ({
            value: img.imgValue,
            image: `stdImage_${img.stdImageId}.png`,
            description: img.imgText || img.imgValue
          }))
        });
      }
    });

    this.showIconsLegendDialog = true;
  }

  /**
   * Open Show Original Data dialog
   * Shows all fields from the selected row with DB field names, types, and values
   */
  openOriginalData(): void {
    this.originalDataFields = [];
    this.originalDataSqlCode = '';
    this.showSqlCode = false;

    // Get sqlId from dataset metadata using the grid's dataSetName
    const dataSetName = this.metaData?.dataSetName;
    const dataSetMeta = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'dataSets', dataSetName);
    this.originalDataSqlId = dataSetMeta?.sqlId || 0;

    // Get selected row data
    const selectedRow = this.selectedRows.length > 0 ? this.selectedRows[0] : null;

    // Build a map of grid columns for quick lookup (fieldName -> column metadata)
    const columnMap = new Map<string, any>();
    if (this.metaData?.data?.columns) {
      this.metaData.data.columns.forEach((col: any) => {
        const fieldName = col.dataField || col.fieldName;
        columnMap.set(fieldName, col);
      });
    }

    // Get ALL fields from the selected row (not just grid columns)
    if (selectedRow) {
      // Get all keys from the row data
      const allFields = Object.keys(selectedRow);

      this.originalDataFields = allFields.map((fieldName: string) => {
        // Check if this field has column metadata
        const colMeta = columnMap.get(fieldName);

        return {
          fieldName: fieldName,
          caption: colMeta ? (colMeta.caption || colMeta.text || fieldName) : fieldName,
          dataType: colMeta ? (colMeta.colType || colMeta.dataType || 'String') : this.inferDataType(selectedRow[fieldName]),
          value: selectedRow[fieldName],
          visible: colMeta ? (colMeta.visible !== false) : true,
          isPK: colMeta?.isPK || false,
          isInGrid: !!colMeta  // Flag to show if field is displayed in grid
        };
      });

      // Sort: PK fields first, then grid columns, then other fields
      this.originalDataFields.sort((a, b) => {
        if (a.isPK && !b.isPK) return -1;
        if (!a.isPK && b.isPK) return 1;
        if (a.isInGrid && !b.isInGrid) return -1;
        if (!a.isInGrid && b.isInGrid) return 1;
        return a.fieldName.localeCompare(b.fieldName);
      });
    }

    this.showOriginalDataDialog = true;
  }

  /**
   * Infer data type from value
   */
  private inferDataType(value: any): string {
    if (value === null || value === undefined) return 'String';
    if (typeof value === 'number') return Number.isInteger(value) ? 'Integer' : 'Float';
    if (typeof value === 'boolean') return 'Boolean';
    if (value instanceof Date) return 'Date';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return 'Date';
    return 'String';
  }

  /**
   * Get SQL code for the current dataset
   */
  async getSqlCode(): Promise<void> {
    if (!this.originalDataSqlId) {
      this.originalDataSqlCode = 'No SQL ID available';
      this.showSqlCode = true;
      return;
    }

    try {
      // Call service to get SQL code
      const sqlCode = await this.gtsDataService.getSqlCode(this.prjId, this.originalDataSqlId);
      this.originalDataSqlCode = sqlCode || 'SQL code not available';
    } catch (error) {
      this.originalDataSqlCode = 'Error retrieving SQL code';
      console.error('[gts-grid] Error getting SQL code:', error);
    }

    this.showSqlCode = true;
  }

  /**
   * Copy SQL code to clipboard
   */
  async copySqlToClipboard(): Promise<void> {
    if (!this.originalDataSqlCode) return;

    try {
      await navigator.clipboard.writeText(this.originalDataSqlCode);
      this.sqlCopied = true;
      setTimeout(() => {
        this.sqlCopied = false;
      }, 2000);
    } catch (err) {
      console.error('[gts-grid] Failed to copy SQL:', err);
    }
  }
}
