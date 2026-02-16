import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectorRef, NgZone, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { AppInfoService } from '../../services/app-info.service';
import { Subscription } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent } from 'ag-grid-community';
import { IonToolbar, IonButtons, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-gts-lookup',
  standalone: true,
  imports: [CommonModule, DialogModule, AgGridAngular, IonToolbar, IonButtons, IonButton, IonSpinner, ToastModule],
  templateUrl: './gts-lookup.component.html',
  styleUrls: ['./gts-lookup.component.scss'],
  providers: [MessageService],
  encapsulation: ViewEncapsulation.None  // Required because dialog uses appendTo="body"
})

export class GtsLookupComponent implements OnInit, OnDestroy {
  constructor(
    private gtsDataService: GtsDataService,
    private appInfo: AppInfoService,
    private messageService: MessageService,
    private cd: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  @Input()
  prjId: string = '';

  @Input()
  formId: number = 0;

  @Input()
  formName: string = '';  // Nome della form per identificazione univoca

  @Input()
  gridName: string = '';

  @Input()
  editorTypeML: boolean = false;

  @Output() newLookUpEvent = new EventEmitter<any>();

  formLookUpListenerSubs: Subscription | undefined;

  stdMLTexts: any[] = [];
  languageId: string = this.appInfo.getLanguageId;
  textOK: string = 'OK';
  textCancel: string = 'Cancel';

  // STATIC flag shared across ALL instances to prevent multiple dialogs
  private static isAnyLookupProcessing = false;

  //========= ON INIT =================
  ngOnInit() {
    // Get Standard Multilanguage Texts
    this.stdMLTexts = this.appInfo.getStdMLTexts;

    // Set Standard Multilanguage Texts
    // for OK = -1, Cancel = -2 and Close = -3 buttons
    this.stdMLTexts
    .filter((item) => item.languageId == this.languageId)
    .forEach((item) => {
      if (item.txtId == -1) {
        this.textOK = item.text;
      } else if (item.txtId == -2) {
        this.textCancel = item.text;
      }
    });

    this.formLookUpListenerSubs = this.gtsDataService
    .getLookUpListener()
    .subscribe((field) => {
      // Filter: only process if this lookup belongs to our form (by formId AND formName)
      if (field.formId !== this.formId) {
        return;
      }

      // Filtra anche per formName se disponibile
      if (field.formName && field.formName !== this.formName) {
        return;
      }

      // Skip if ANY lookup is already processing (shared static flag)
      if (GtsLookupComponent.isAnyLookupProcessing) {
        return;
      }

      // IMPORTANT: Set STATIC flag IMMEDIATELY to prevent other instances from processing
      GtsLookupComponent.isAnyLookupProcessing = true;
      this.lookUpReady = true;

      // Run inside NgZone to ensure proper change detection in production
      this.ngZone.run(() => {
        this.lookUpField = field;
        this.columns = this.lookUpField.columns;
        this.lookUpTitle = this.lookUpField.caption;
        this.gridColumn = this.lookUpField.gridColumn;
        this.editorTypeML = this.lookUpField.editorTypeML || false;

        if (this.lookUpField.rows === undefined) {
          if (this.gridName !== "") {
            this.popUpVisible = false;
            this.lookUpReady = false; // Reset since we're not showing
            GtsLookupComponent.isAnyLookupProcessing = false; // Reset static flag
            this.cd.detectChanges();
          } else {
            this.loadingData = true;
            this.popUpVisible = true;
            document.body.classList.add('gts-lookup-active');
            this.cd.detectChanges();
            this.getLookUpData();
            this.gridData.grid = false;
            this.gridData.gridName = undefined
            this.gridData.gridColumn = undefined;
          }
        } else if (this.gridName !== undefined && this.gridColumn !== undefined && this.gridName !== "" && this.gridColumn !== "" &&
          ((this.gridData.gridName === undefined && this.gridData.gridColumn === undefined) || (this.gridData.gridName === this.gridName))) {
          this.lookUpData = this.lookUpField.rows;
          this.gridData = this.prepareGridData();
          this.gridData.grid = true;
          this.gridData.gridName = this.gridName;
          this.gridData.gridColumn = this.gridColumn;
          this.popUpVisible = true;
          this.lookUpReady = true;
          // Add class to body to block interactions with form behind
          document.body.classList.add('gts-lookup-active');
          console.log('[GtsLookup DEBUG] Opening popup, popUpVisible:', this.popUpVisible, 'lookUpReady:', this.lookUpReady);
          this.cd.detectChanges();
        }
      });
    });
  }

  //========= ON DESTROY =================
  ngOnDestroy() {
    if (this.formLookUpListenerSubs) {
      this.formLookUpListenerSubs.unsubscribe();
    }
    this.lookUpReady = false;
    // IMPORTANT: Reset static flag when component is destroyed (e.g., navigation)
    // This prevents blocking lookups on other pages
    GtsLookupComponent.isAnyLookupProcessing = false;
    // Also remove body class if it was set
    document.body.classList.remove('gts-lookup-active');
  }

  //========= GLOBAL DATA =================
  popUpVisible: boolean = false;
  columns: any = [];
  lookUpTitle: string = '';
  lookUpField: any = {};
  lookUpData: any = [];
  gridData: any = {};
  selectedRows: any = [];
  isSelected: boolean = false;
  gridColumn: string = '';
  lookUpReady: boolean = false;
  loadingData: boolean = false;

  // AG Grid specific
  gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true
  };

  // Row selection configuration (will be set dynamically)
  rowSelectionConfig: any = {
    mode: 'singleRow',
    checkboxes: false,
    headerCheckbox: false,
    enableClickSelection: true
  };


  //========= FUNCTIONS =================
  async getLookUpData() {
    const responseData = await this.gtsDataService.getExportedDSData(this.prjId, this.formId, this.lookUpField.groupId, this.lookUpField.fieldName, this.lookUpField.formData, this.lookUpField.objectName);
    this.lookUpData = responseData.data[0].rows;
    this.gridData = this.prepareGridData();

    // Run inside NgZone to ensure change detection in production builds
    this.ngZone.run(() => {
      this.loadingData = false;
      this.cd.detectChanges();
    });
  }

  prepareGridData() {
    let data: any = {};

    // Configure row selection based on editorTypeML
    if (this.editorTypeML) {
      // Multiple selection with checkboxes
      this.rowSelectionConfig = {
        mode: 'multiRow',
        checkboxes: true,
        headerCheckbox: true,
        enableClickSelection: true
      };
    } else {
      // Single selection without checkboxes
      this.rowSelectionConfig = {
        mode: 'singleRow',
        checkboxes: false,
        headerCheckbox: false,
        enableClickSelection: true
      };
    }

    // Prepare AG Grid column definitions
    this.columnDefs = [];

    this.columns.forEach((col: any) => {
      let column: ColDef = {
        field: col.fieldName,
        headerName: col.text,
        flex: 1,
        minWidth: 100
      };

      // Group by configuration
      if (col.flagGroupBy) {
        column.rowGroup = true;
        column.hide = true;
      }

      // Data type specific settings
      if (col.colType === 'DateTime' || col.colType === 'Date') {
        column.filter = 'agDateColumnFilter';
        column.valueFormatter = (params) => {
          if (!params.value) return '';
          const date = new Date(params.value);
          return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };
      } else if (col.colType === 'Boolean') {
        column.cellRenderer = (params: any) => {
          return params.value ? '✓' : '';
        };
      } else if (col.colType === 'Float') {
        column.filter = 'agNumberColumnFilter';
        column.type = 'numericColumn';
        const format = col.maskEdit && col.maskEdit !== '' ? col.maskEdit : '#,###.00';
        column.valueFormatter = (params) => {
          if (params.value == null) return '';
          return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(params.value);
        };
      } else if (col.colType === 'Integer') {
        column.filter = 'agNumberColumnFilter';
        column.type = 'numericColumn';
        column.valueFormatter = (params) => {
          if (params.value == null) return '';
          return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(params.value);
        };
      }

      this.columnDefs.push(column);
    });

    // Set row data
    this.rowData = this.lookUpData;

    return data;
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;

    // Best fit columns (auto-size all columns based on content)
    setTimeout(() => {
      if (this.gridApi) {
        const allColumnIds = this.columnDefs.map(col => col.field!);
        this.gridApi.autoSizeColumns(allColumnIds, false);
      }
    }, 100);
  }

  onSelectionChanged(event: SelectionChangedEvent) {
    this.selectedRows = event.api.getSelectedRows();
    this.isSelected = this.selectedRows.length > 0;
  }

  onRowDoubleClicked(event: any) {
    // In modalità multi-line, il doppio click non chiude la lookup
    if (!this.editorTypeML) {
      this.onOKClick();
    }
  }

  onOKClick() {
    if (!this.isSelected) {
      this.messageService.add({
        severity: 'error',
        summary: 'Selection Required',
        detail: 'Please select a row!',
        life: 3000
      });
      return;
    }

    this.buttonOKClick();
  }

  buttonOKClick() {
    let fieldValue: any;
    let rowData: any;

    if (this.editorTypeML) {
      // Multi-line: ritorna solo le chiavi separate da ";"
      const keys: string[] = [];
      this.selectedRows.forEach((row: any) => {
        keys.push(row[this.lookUpField.fieldName]);
      });
      fieldValue = keys.join(';');
      rowData = null; // Non ritorna altri campi in modalità ML
    } else {
      // Single-line: comportamento normale
      fieldValue = this.selectedRows[0][this.lookUpField.fieldName];
      rowData = this.selectedRows[0];
    }

    const data: any = {
      formName: this.lookUpField.formName,  // Identifica la form destinataria
      lookUpName: this.lookUpField.lookUpName,
      fieldName: this.lookUpField.fieldName,
      fieldValue: fieldValue,
      data: rowData
    };

    this.closeLookup();
    this.newLookUpEvent.emit(data);
  }

  /**
   * Cancel button click - close lookup without emitting data
   */
  onCancelClick() {
    this.closeLookup();
  }

  /**
   * Called when dialog is hidden (by any means)
   */
  onDialogHide() {
    // Reset state when dialog closes
    this.lookUpReady = false;
    this.selectedRows = [];
    this.isSelected = false;
    // Reset static flag so other lookups can be opened
    GtsLookupComponent.isAnyLookupProcessing = false;
    // Remove body class
    document.body.classList.remove('gts-lookup-active');
  }

  /**
   * Properly close and reset the lookup dialog
   */
  private closeLookup() {
    this.popUpVisible = false;
    this.lookUpReady = false;
    this.loadingData = false;
    this.selectedRows = [];
    this.isSelected = false;
    this.rowData = [];
    this.columnDefs = [];
    // Reset static flag so other lookups can be opened
    GtsLookupComponent.isAnyLookupProcessing = false;
    // Remove body class
    document.body.classList.remove('gts-lookup-active');
    this.cd.detectChanges();
  }
}
