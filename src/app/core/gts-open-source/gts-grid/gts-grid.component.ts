import { Component, OnInit, OnDestroy, Input, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonSpinner } from '@ionic/angular/standalone';
import { GtsDataService } from '../../services/gts-data.service';
import { GtsGridService } from './gts-grid.service';
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

  @Input() prjId: string = '';
  @Input() formId: number = 0;
  @Input() objectName: string = '';

  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  // Subscriptions
  appViewListenerSubs: Subscription | undefined;
  gridSelectListenerSubs: Subscription | undefined;
  gridReloadListenerSubs: Subscription | undefined;

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

  // AG Grid v35+ Theme
  theme = themeQuartz.withParams({
    backgroundColor: '#ffffff',
    foregroundColor: '#000000',
    headerBackgroundColor: '#f4f5f8',
    headerFontWeight: 600,
    oddRowBackgroundColor: '#ffffff',
    rowHoverColor: '#f0f0f0',
    selectedRowBackgroundColor: '#e3f2fd',
    borderColor: '#ddd',
    fontSize: 13,
    rowHeight: 32,
    headerHeight: 36,
    cellHorizontalPadding: 8,
    borderRadius: 0,
    wrapperBorder: false,
    wrapperBorderRadius: 0
  });

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

  constructor() {}

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
              console.log('[gts-grid]', this.objectName, '- Edit mode set to:', this.allowUpdating);

              // Update editable state on existing columns without recreating them
              if (this.gridApi && !this.gridApi.isDestroyed() && this.metaData?.data?.columns) {
                const columns = this.gridApi.getColumns();
                columns?.forEach((column: any) => {
                  const colId = column.getColId();
                  // Find metadata for this column
                  const colMetadata = this.metaData.data.columns.find((c: any) => c.dataField === colId);
                  if (colMetadata && colMetadata.allowEditing !== false) {
                    // Update editable property directly on the column
                    const colDef = column.getColDef();
                    colDef.editable = this.allowUpdating;
                  }
                });
                // Refresh cells to apply new editable state
                this.gridApi.refreshCells({ force: true });
                console.log('[gts-grid]', this.objectName, '- Columns updated for editing (editable state changed)');
              }
              return; // Don't reload data, just update editing mode
            }
            if (allowFlags[0] === 'Insert') {
              this.allowInserting = allowFlags[1] === 'true';
              console.log('[gts-grid]', this.objectName, '- Insert mode set to:', this.allowInserting);
              return;
            }
            if (allowFlags[0] === 'Delete') {
              this.allowDeleting = allowFlags[1] === 'true';
              console.log('[gts-grid]', this.objectName, '- Delete mode set to:', this.allowDeleting);
              return;
            }
            if (allowFlags[0] === 'Idle') {
              this.allowUpdating = false;
              this.allowInserting = false;
              this.allowDeleting = false;
              console.log('[gts-grid]', this.objectName, '- Idle mode - all editing disabled');
              // Recreate columns with editing disabled
              if (this.metaData?.data?.columns && this.gridApi && !this.gridApi.isDestroyed()) {
                this.convertColumnsToAGGrid(this.metaData.data.columns);
                this.gridApi.setGridOption('columnDefs', this.columnDefs);
                // Don't call autoSizeAllColumns here - preserve existing column widths
              }
              return;
            }
          }
        }

        // Normal data reload - check dataSetName and visibility
        if (this.metaData?.dataSetName === dataSetName && this.metaData?.visible) {
          this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
          await this.prepareGridData();
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

    // Initial load
    this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
    this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'grids', this.objectName);

    // Only load data if grid is visible and not already ready
    if (this.metaData !== undefined && !this.gridReady && this.metaData.visible) {
      await this.prepareGridData();
    }

    this.gridTitle = this.gridObject.caption || '';
    this.showTitle = this.gridTitle !== '';
  }

  ngOnDestroy(): void {
    this.appViewListenerSubs?.unsubscribe();
    this.gridSelectListenerSubs?.unsubscribe();
    this.gridReloadListenerSubs?.unsubscribe();
  }

  async prepareGridData(): Promise<void> {
    if (!this.metaData) {
      console.warn('[gts-grid] No metadata found for', this.objectName);
      return;
    }

    // Save current selection before reload
    if (this.gridApi && this.selectedRows.length > 0) {
      const keyField = this.gridObject?.keys?.[0] || 'id';
      this.savedSelectedRowKeys = this.selectedRows.map((row: any) => row[keyField]);
      console.log('[gts-grid] Saving selection before reload:', this.savedSelectedRowKeys);
    }

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

    // Convert columns to AG Grid format
    this.convertColumnsToAGGrid(columns);

    // Extract row data - simple array for AG Grid
    const newRowData = (data.dataSource && data.dataSource._store && data.dataSource._store._array)
      ? data.dataSource._store._array
      : [];

    // No warning for empty data - it's normal for detail grids before master selection

    // Update gridObject with all data
    this.gridObject = newGridObject;

    // Generate unique key based on selection mode to force grid recreation ONLY when selection mode changes
    // Don't use Date.now() as it forces grid recreation on every data reload, losing selection state
    const newGridKey = `${this.objectName}-${this.rowSelection.mode}`;
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

    // console.log(`[gts-grid] ${this.objectName} - Converting ${columns.length} columns`);

    // AG Grid v35+ usa rowSelection.checkboxes in GridOptions invece di colonne separate
    // Non serve più aggiungere colonne checkbox manualmente

    // Convert DevExtreme columns to AG Grid format
    columns.forEach((col: any, index: number) => {
      // Handle column bands (column groups)
      if (col.columns && Array.isArray(col.columns)) {
        console.log(`[gts-grid] ${this.objectName} - Processing column band:`, col.caption);

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
      console.log(`[gts-grid] ${this.objectName} - Skipping hidden column:`, col.dataField || col.caption);
      return null;
    }
    if (col.type === 'buttons') {
      console.log(`[gts-grid] ${this.objectName} - Skipping buttons column:`, col.name || col.caption);
      return null;
    }
    if (!col.dataField) {
      console.warn(`[gts-grid] ${this.objectName} - Skipping column without dataField:`, col);
      return null;
    }

    const colDef: ColDef = {
      field: col.dataField,
      headerName: col.caption,
      minWidth: col.minWidth || 100,
      hide: col.visible === false,
      sortable: col.allowSorting !== false,
      filter: col.allowFiltering !== false,
      editable: col.allowEditing !== false && this.allowUpdating, // Editable if column allows and grid allows updates
    };

    // Se la colonna ha una larghezza specifica, usala; altrimenti usa flex
    if (col.width) {
      colDef.width = col.width;
      colDef.maxWidth = col.width * 2; // Max 2x la larghezza specificata
    } else {
      colDef.flex = 1; // Espande proporzionalmente
      colDef.maxWidth = 400; // Max width ragionevole
    }

    // Handle specific column types
    if (col.dataType === 'boolean' || col.dataType === 'Boolean') {
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
    if (col.dataType === 'date' || col.dataType === 'datetime') {
      colDef.valueFormatter = (params: any) => {
        if (!params.value) return '';
        const date = new Date(params.value);
        if (isNaN(date.getTime())) return params.value;

        if (col.dataType === 'datetime') {
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

    console.log('[gts-grid] Grid ready for', this.objectName);
    console.log('[gts-grid] Row count:', params.api.getDisplayedRowCount());
    console.log('[gts-grid] Column count:', params.api.getColumns()?.length);
    console.log('[gts-grid] Grid height:', this.gridObject?.height);
    console.log('[gts-grid] Grid visible:', this.gridObject?.visible);

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
    console.log('[gts-grid] Active filters:', this.hasActiveFilters, filterModel);
  }

  /**
   * Clear all filters from the grid
   */
  clearAllFilters(): void {
    if (!this.gridApi || this.gridApi.isDestroyed()) return;

    console.log('[gts-grid] Clearing all filters');
    this.gridApi.setFilterModel(null);
    this.hasActiveFilters = false;
  }

  restoreSelection(): void {
    if (!this.gridApi || this.gridApi.isDestroyed() || !this.savedSelectedRowKeys || this.savedSelectedRowKeys.length === 0) {
      return;
    }

    console.log('[gts-grid] Restoring selection:', this.savedSelectedRowKeys);

    // Set flag to prevent action execution during restore
    this.isRestoringSelection = true;

    const keyField = this.gridObject?.keys?.[0] || 'id';
    const nodesToSelect: any[] = [];

    // Find nodes matching the saved keys
    this.gridApi.forEachNode((node: any) => {
      if (node.data && this.savedSelectedRowKeys.includes(node.data[keyField])) {
        nodesToSelect.push(node);
      }
    });

    // Select the nodes
    if (nodesToSelect.length > 0) {
      this.gridApi.setNodesSelected({ nodes: nodesToSelect, newValue: true });
      console.log('[gts-grid] Selection restored:', nodesToSelect.length, 'rows');
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
      console.log('[gts-grid] Grid is disabled, restoring previous selection');
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

    // Notify GTS grid service about selection and execute action if defined
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
    console.log('[gts-grid] Cell value changed:', event);
    console.log('[gts-grid] Field:', event.colDef.field);
    console.log('[gts-grid] Old value:', event.oldValue);
    console.log('[gts-grid] New value:', event.newValue);
    console.log('[gts-grid] Row data:', event.data);

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

    console.log('[gts-grid] Edited rows count:', this.editedRows.size);
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
      console.log('[gts-grid] No edits to save');
      return;
    }

    console.log('[gts-grid] Saving edits, edited rows count:', this.editedRows.size);

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

    console.log('[gts-grid] Changes to save:', this.changeArray);

    // Store changes in metadata (like DevExtreme)
    this.metaData.changeArray = this.changeArray;

    // Update backupDataSet to reflect saved state (so Cancel won't revert saved changes)
    if (this.gridObject.dataSet) {
      this.gridObject.backupDataSet = this.gridObject.dataSet.map((row: any) => ({ ...row }));
      console.log('[gts-grid] BackupDataSet updated after save');
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
      console.log('[gts-grid] Edit mode disabled after save');
    }

    // Execute action if defined (like DevExtreme onSaved -> actionOnEditPost)
    if (this.metaData.actionOnEditPost) {
      console.log('[gts-grid] Executing actionOnEditPost:', this.metaData.actionOnEditPost);
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
    console.log('[gts-grid] Canceling edits, edited rows count:', this.editedRows.size);

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
      console.log('[gts-grid] Edit mode disabled after revert');
    }

    // Execute rollback action if defined (like DevExtreme onEditCanceled -> actionOnEditRollback)
    if (this.metaData.actionOnEditRollback) {
      console.log('[gts-grid] Executing actionOnEditRollback:', this.metaData.actionOnEditRollback);
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
      const colMetadata = this.metaData?.data?.columns?.find((c: any) => c.dataField === field);
      if (!colMetadata || colMetadata.dataType !== 'boolean') return;

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

    console.log('[gts-grid] Exporting to Excel...');

    // Determine file name from metadata, title, or object name
    const fileName = this.gridObject?.exportFileName
      || this.gridTitle
      || this.objectName
      || 'export';

    // Create workbook and worksheet
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Get visible columns (excluding hidden ones)
    const visibleColumns = this.columnDefs.filter(col => !col.hide);

    // Add header row
    const headerRow = worksheet.addRow(visibleColumns.map(col => col.headerName || col.field));
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
      const row = visibleColumns.map(col => {
        const value = rowData[col.field!];

        // Format dates
        const colMetadata = this.metaData?.data?.columns?.find((c: any) => c.dataField === col.field);
        if (colMetadata) {
          if (colMetadata.dataType === 'date' || colMetadata.dataType === 'datetime') {
            if (value) {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                return colMetadata.dataType === 'datetime'
                  ? this.formatDateTime(date)
                  : this.formatDate(date);
              }
            }
          }

          // Format booleans
          if (colMetadata.dataType === 'boolean') {
            return value ? 'Yes' : 'No';
          }

          // Format numbers
          if (colMetadata.dataType === 'number' && typeof value === 'number') {
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

    console.log('[gts-grid] Excel export complete:', finalFileName);
  }
}
