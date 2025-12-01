import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';
import { DxDataGridModule, DxPopupModule, DxToolbarModule } from 'devextreme-angular';
import DataSource from 'devextreme/data/data_source';
import ArrayStore from 'devextreme/data/array_store';
import notify from 'devextreme/ui/notify';
import { AppInfoService } from '../../services/app-info.service';

@Component({
  selector: 'app-gts-lookup',
  standalone: true,
  imports: [CommonModule, DxDataGridModule, DxPopupModule, DxToolbarModule],
  templateUrl: './gts-lookup.component.html',
  styleUrls: ['./gts-lookup.component.scss']
})

export class GtsLookupComponent implements OnInit, OnDestroy {
  constructor(
    private gtsDataService: GtsDataService,
    private appInfo: AppInfoService
  ) { }

  @Input()
  prjId: string = '';

  @Input()
  formId: number = 0;

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
      this.lookUpField = field;
      this.columns = this.lookUpField.columns;
      this.lookUpTitle = this.lookUpField.caption;
      this.gridColumn = this.lookUpField.gridColumn;
      this.editorTypeML = this.lookUpField.editorTypeML || false;

      if (this.lookUpField.rows === undefined) {
        if (this.gridName !== "") {
          this.popUpVisible = false;
        } else {
          this.getLookUpData();
          this.gridData.grid = false;
          this.gridData.gridName = undefined
          this.gridData.gridColumn = undefined;
          this.popUpVisible = true;
        }
      } else if (this.gridName !== undefined && this.gridColumn !== undefined && this.gridName !== "" && this.gridColumn !== "" &&
        ((this.gridData.gridName === undefined && this.gridData.gridColumn === undefined) || (this.gridData.gridName === this.gridName))) {
        this.lookUpData = this.lookUpField.rows;
        this.gridData = this.prepareGridData();
        this.gridData.grid = true;
        this.gridData.gridName = this.gridName;
        this.gridData.gridColumn = this.gridColumn;
        this.popUpVisible = true;
      }
    });
  }

  //========= ON DESTROY =================
  ngOnDestroy() {
    if (this.formLookUpListenerSubs) {
      this.formLookUpListenerSubs.unsubscribe();
    }
    this.lookUpReady = false;
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
  lookUpGridClass: string = 'gts-lookup-grid';
  lookupToolbarItems: any = [];
  lookupToolbarClass: string = 'gts-lookup-toolbar';
  gridColumn: string = '';
  lookUpReady: boolean = false;

  //========= FUNCTIONS =================
  async getLookUpData() {
    const responseData = await this.gtsDataService.getExportedDSData(this.prjId, this.formId, this.lookUpField.groupId, this.lookUpField.fieldName, this.lookUpField.formData, this.lookUpField.objectName);
    this.lookUpData = responseData.data[0].rows;
    this.gridData = this.prepareGridData();
    this.popUpVisible = true;
    this.lookUpReady = true;
  }

  prepareGridData() {    
    let data: any = {};
    data.columns = [];

    this.columns
    .forEach((col: any) => {
      let column: any = {};
      column.dataField = col.fieldName;
      column.caption = col.text;
      column.width = 'auto';
      if (col.flagGroupBy) {
        column.groupIndex = '0';
      }
      if (col.colType === 'DateTime') {
        column.dataType = 'date';
        column.format = 'dd/MM/yyyy';
      } else if (col.colType === 'Date') {
        column.dataType = 'date';
        column.format = 'dd/MM/yyyy';
      } else if (col.colType === 'Boolean') {
        column.dataType = 'boolean';
      } else if (col.colType === 'String') {
        column.dataType = 'string';
      } else if (col.colType === 'Float') {
        column.dataType = 'number';
        column.precision = 2;
        if (col.maskEdit && col.maskEdit !== '') {
          column.format = col.maskEdit;
        } else {
          column.format = '#,###.00';
        }
      } else if (col.colType === 'Integer') {
        column.dataType = 'integer';
      }
      data.columns.push(column);
    });

    let keys: any[] = [];
    this.lookUpField
    .keys
    .forEach((key: any) => {
      keys.push(key.keyField);
    });


    data.dataSource = new DataSource({
      store: new ArrayStore({
        data: this.lookUpData,
        key: keys
      })
    });
    
    data.allowColumnResizing = true;
    data.allowColumnReordering = true;
    data.searchPanelFlag = true;
    data.headerFilterVisible = true;
    data.filterRowVisible = true;
    data.pageSize = 10;
    data.pageSelectorOptions = [10, 20, 50];
    data.showPageSizeSelector = true;

    this.lookupToolbarItems = [];    

    this.lookupToolbarItems.push({
      objectName: 'CANCEL',
      submitBehavior: false,
      widget: 'dxButton',
      location: 'after',
      locateInMenu: 'auto',   
      options: {
        stylingMode: 'contained',          
        text: this.textCancel,
        width: 120,
        icon: '/assets/icons/stdImage_57.png',     
        onClick: () => {
          this.popUpVisible = false;
        }
      }            
    });

    this.lookupToolbarItems.push({
      objectName: 'OK',
      submitBehavior: false,
      widget: 'dxButton',
      location: 'after',
      locateInMenu: 'auto',   
      options: {
        stylingMode: 'contained',          
        text: this.textOK,
        width: 120,
        icon: '/assets/icons/stdImage_43.png',  
        onClick: () => {
          if (this.isSelected) {
            this.buttonOKClick();
          } else {
            notify({
              message: 'Please select a row!',
              height: 45,
              width: 200,
              minWidth: 200,
              type: 'error',
              displayTime: 3000,
              animation: {
                show: {
                  type: 'fade', duration: 400, from: 0, to: 1,
                },
                hide: { type: 'fade', duration: 40, to: 0 },
              },
            });
          }
        }
      }            
    });
    
    return data;
  } 

  selectionChangedHandler(e: any) {
    this.selectedRows = e.selectedRowsData;
    this.isSelected = this.selectedRows.length > 0;
  }

  dblClickHandler(e: any) {
    // In modalità multi-line, il doppio click non chiude la lookup
    if (!this.editorTypeML) {
      this.buttonOKClick();
    }
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
      lookUpName: this.lookUpField.lookUpName,
      fieldName: this.lookUpField.fieldName,
      fieldValue: fieldValue,
      data: rowData
    };

    this.popUpVisible = false;
    this.lookUpReady = false;
    this.newLookUpEvent.emit(data);
  }

}
