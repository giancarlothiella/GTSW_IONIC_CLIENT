import { Component, ChangeDetectorRef, OnInit, OnDestroy, Input, ViewChild, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { GtsGridService } from './gts-grid.service';
import { Subscription } from 'rxjs';
import { DxDataGridModule, DxDataGridComponent } from 'devextreme-angular';
import DataSource from 'devextreme/data/data_source';
import ArrayStore from 'devextreme/data/array_store';
import { exportDataGrid } from 'devextreme/excel_exporter';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import type { ExportingEvent, RowDraggingAddEvent } from 'devextreme/ui/data_grid';
import type DxDataGridTypes from 'devextreme/ui/data_grid';
import { GtsLookupComponent } from '../gts-lookup/gts-lookup.component';

@Component({
  selector: 'app-gts-grid',
  standalone: true,
  imports: [CommonModule, DxDataGridModule, GtsLookupComponent],
  templateUrl: './gts-grid.component.html',
  styleUrls: ['./gts-grid.component.scss']
})

export class GtsGridComponent implements OnInit, OnDestroy {
  constructor(
    private gtsGridService: GtsGridService,
    private gtsDataService: GtsDataService,
    private changeDetector: ChangeDetectorRef,
    private elementRef: ElementRef
  ) { }

  @HostListener('window:resize')
  onWindowResize() {
    this.calculateGridWidth();
  }

  @Input()
  prjId: string ='';

  @Input()
  formId: number = 0;

  @Input()
  objectName: string = '';

  status: number = 0;  

  appViewListenerSubs: Subscription | undefined; 
  gridSelectListenerSubs: Subscription | undefined; 
  gridReloadListenerSubs: Subscription | undefined; 
  formRepListenerSubs: Subscription | undefined; 

  async ngOnInit() {  
    this.gridSelectListenerSubs = this.gtsDataService
    .getGridSelectListener()
    .subscribe((select) => {
      if (!select.isSelected && select.dataSetName === this.metaData.dataSetName) {
        this.gridComponent.clearSelection();
        this.prepareGridData();    
        this.focusedRowKey = null;
      }
    });

    // Form Req Listener
    this.formRepListenerSubs = this.gtsDataService
    .getFormRepListener()
    .subscribe((reply) => {   
      this.gridEditReply = reply;  

      if (reply.fieldCode !== undefined && reply.fieldCode === null && reply.fieldCode === '') {
        let decodeResult = this.customDecodeResult.filter((result: any) => result.fieldCode === reply.fieldCode)[0];
        decodeResult.valid = reply.valid;
        decodeResult.message = reply.message;        
      }
    });

    this.gridReloadListenerSubs = this.gtsDataService
    .getGridReloadListener()
    .subscribe(async (data) => {
      this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);      

      const dataArray = data.split(';');
      const dataSetName = dataArray[0];
      if (dataArray.length > 1) {
        const allowFlags = dataArray[1].split(':');
        if (allowFlags.length > 0) {
          if (allowFlags[0] === 'Edit') {
            this.allowUpdating = allowFlags[1] === 'true' ? true : false;                 
          }
          if (allowFlags[0] === 'Insert') {
            this.allowInserting = allowFlags[1] === 'true' ? true : false;
          }
          if (allowFlags[0] === 'Delete') {
            this.allowDeleting = allowFlags[1] === 'true' ? true : false;
          }
          
          if (allowFlags[0] === 'Idle') {
            this.allowUpdating = false;
            this.allowInserting = false;
            // set unvisible to all columns lookup Buttons
            this.lookUps.forEach((lookUp: any) => {
              lookUp.visible = false;
              this.gridComponent.columnOption(lookUp.name, 'visible', false);
            });
            this.gridComponent.columnOption('delete', 'visible', false);
          } else {
            this.lookUps.forEach((lookUp: any) => {
              this.gridComponent.columnOption(lookUp.name, 'visible', this.allowUpdating || this.allowInserting);
            });  
            
            if (this.allowDeleting) {
              this.gridComponent.columnOption('delete', 'visible', true);
            }            
          }
        }        
      } else {
        if (dataSetName !== undefined ) {
          if (this.metaData !== undefined) {
            // if (dataSetName !== this.metaData.dataSetName) {
              await this.prepareGridData();
            // } else {
              
            // }
          }
        }
      }
      // set focus on grid
      this.gridComponent.focus();
    });

    this.appViewListenerSubs = this.gtsDataService
    .getAppViewListener()
    .subscribe(async (actualView) => {
      this.changeDetector.detectChanges();
      this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
      this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'grids', this.objectName);

      // Check if metaData is defined before accessing properties
      if (this.metaData !== undefined) {
        const disabled = this.metaData.disabled !== undefined ? this.metaData.disabled : false;
        if (this.gridObject.disabled !== disabled) {
          this.gridObject.disabled = disabled;
        }
        if (!this.gridObject.visible && this.metaData.visible) {
          await this.prepareGridData()
        }

        this.gridObject.disabled = disabled;
        this.gridObject.visible = this.metaData.visible;
      }
    });

    this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId); 
    this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'grids', this.objectName);   
    if (this.metaData !== undefined && this.gridReady === false) { 
      await this.prepareGridData() 
    };

    this.gridTitle = this.gridObject.caption;
    this.showTitle = this.gridTitle !== undefined && this.gridTitle !== null ? true : false;   
  }

  ngOnDestroy(): void {
    this.appViewListenerSubs?.unsubscribe();    
    this.gridSelectListenerSubs?.unsubscribe();
    this.gridReloadListenerSubs?.unsubscribe();
    this.formRepListenerSubs?.unsubscribe();
  }


  //========= GLOBALS =================
  metaData: any = {};
  actualView: string = '';
  pageData: any = {}; 

  //========= GRIDS DATA =================
  dataSource!: DataSource;
  dataStore!:  ArrayStore;
  dataSetName: string = '';
  dataColumns: any = [];
  lookUps: any = [];
  summaryColumns: any = [];
  gridObject: any = {};
  selectedRows: any = [];
  gridReady: boolean = false;
  gridWidth: number | string = '100%';

  calculateGridWidth() {
    // Usa semplicemente la larghezza dai metadati
    if (this.gridObject && this.gridObject.width) {
      this.gridWidth = this.gridObject.width;
    }
  }
  gridTitle: string = '';
  showTitle: boolean = false;
  selectedRowKeys: any = [];
  focusedRowKey: any = null;
  gridComponent: any;
  allowUpdating: boolean = false;
  allowInserting: boolean = false;
  allowDeleting: boolean = false;
  lookUpField: any = {};
  actualLookUpFieldName: string = '';
  actualLookUpColIndex: number = 0;
  actualLookUpRowIndex: number = 0;  
  customDecodeResult: any = []; 
  lookUpColName: string = '';
  showLookUp: boolean = false;

  gridEditReply: any = {};

  DDdata: any = {};
  
  //========= GRIDS EVENTS =================  
  gridInitialized(e: any) {
    this.gridComponent = e.component;
    this.metaData.gridComponent = e.component;

    // add onLookupClick event
    this.gridComponent.onLookupClick = this.onLookupClick.bind(this);    
  }

  dblClickHandler(e: any) {
    if (this.metaData.actionOnDoubleClickedRow !== undefined && this.metaData.actionOnDoubleClickedRow !== null && this.metaData.actionOnDoubleClickedRow !== '') {
      this.gtsDataService.runAction(
        this.prjId, 
        this.formId, 
        this.metaData.actionOnDoubleClickedRow
      );
    };
  }

  async getCustomVerifyResult(e: any) {
    return new Promise((resolve) => {
      // Wait for Custom Decode Loop        
      setTimeout(async () => {
        let decodeResult = this.customDecodeResult.filter((result: any) => result.fieldCode === e.column.fieldCode)[0];
        resolve(decodeResult.valid);        
      }, 1);          
    });
  };   

  selectionChangedHandler(e: any) {
    this.selectedRowKeys = e.selectedRowKeys;
    this.gtsGridService.setGridObjectSelectedData(
      this.prjId, 
      this.formId, 
      this.metaData.dataAdapter, 
      this.metaData.dataSetName, 
      e.selectedRowsData, 
      e.selectedRowKeys, 
      this.metaData.actionOnSelectedRows,
      this.gridObject
    );    
  }

  async prepareGridData(): Promise<void> {
    this.gridReady = false;
    const data: any = await this.gtsGridService.getGridData(this.prjId, this.formId, this.metaData, this.pageData, this.getCustomVerifyResult.bind(this));
    this.dataColumns = data.columns;  
    this.allowDeleting = data.allowDeleting;
    this.lookUps = data.lookUps;
    
    this.dataColumns
    .filter((col: any) => col.fieldCode !== undefined && col.fieldCode !== null && col.fieldCode !== '')
    .forEach((col: any) => {
      const data = {
        valid: true,
        fieldCode: col.fieldCode,
        message: ''
      }
      this.customDecodeResult.push(data);
    });

    this.summaryColumns = data.summary;   
    this.gridObject = data.gridObject;
    this.allowDeleting = this.gridObject.allowDeleting;
    this.dataSource = data.dataSource;
    this.dataStore = data.dataStore;
    this.dataSetName = data.dataSetName;
    this.calculateGridWidth();    
   
    if (this.gridObject.selectedRowKeys  !== undefined && this.gridObject.selectedRowKeys.length > 0) { 
      this.focusedRowKey = this.gridObject.selectedRowKeys[0];
    }

    if (this.gridObject.DDStatus > 0) {
      this.DDdata = { 
        DDStatus: this.gridObject.DDStatus,
        DDTasksGroup: this.gridObject.DDTasksGroup,
        DDActionFrom: this.gridObject.DDActionFrom,
        DDActionTo: this.gridObject.DDActionTo,
        dataSetName: this.gridObject.dataSetName,
      };

      this.gtsGridService.setDDRules(
        this.prjId, 
        this.formId, 
        this.objectName,        
        this.DDdata
      );
    }

    this.gridReady = true;
  }

  onExporting(e: ExportingEvent) {
    const workbook = new Workbook();    
    const worksheet = workbook.addWorksheet('Main sheet');
    const fileName = this.gridObject.exportFileName;
    exportDataGrid({
        component: e.component,
        worksheet: worksheet,
        customizeCell: function(options) {
            options.excelCell.font = { name: 'Arial', size: 12 };
            options.excelCell.alignment = { horizontal: 'left' };
        } 
    }).then(function() {
        workbook.xlsx.writeBuffer()
            .then(function(buffer: BlobPart) {
                saveAs(new Blob([buffer], { type: 'application/octet-stream' }), fileName);
            });
    });  
  }

  onEditorPreparing(e: any) {
    if (e.parentType === 'dataRow') {
      this.metaData['actualRowIndex'] = e.row.rowIndex;      
    }

    if (e.checkedValue !== undefined) {
      if (e.parentType === 'dataRow') {
        if (e.value === e.checkedValue || e.value === true) {
          e.editorOptions.value = true;
        } else {
          e.editorOptions.value = false;
        } 
      }
    }

    if (e.row !== undefined) {
      const reqData = {
        typeRequest: 'GRID_ROW_DATA',
        prjId: this.prjId,
        formId: this.formId,
        objectName: this.objectName,
        fieldName: e.dataField,
        row: e.row
      }
      this.gtsDataService.getGridRowData(reqData);

      if (this.gridEditReply.fieldName !== undefined) {
        if (e.dataField === this.gridEditReply.fieldName) {
          e.editorOptions.disabled = this.gridEditReply.disabled;
        }
      }      
    } 
  }

  getImage(data: any) {
    return this.gtsGridService.getImage(this.metaData, data);
  }

  onSaved(e: any) {
    if (e.changes.length) {
      let changeArray: any[] = [];  
      let rowData: any = {};
      
      for (let i = 0; i < e.changes.length; i++) {
        let key: any = e.changes[i].key;
        let data: any = e.changes[i].data;
        const type: string = e.changes[i].type;
        
        let row: any = {};
        
        // get row from dataSet filtered by key object properties
        if (type === 'update') {
          row = this.gridObject.dataSet.filter((row: any) => { 
            return Object.keys(key).every((k: any) => row[k] === key[k]);
          })[0];
        };
        
        if (type === 'insert') {
          row = data;
          this.dataColumns.forEach((col: any) => {
            if (col.dataType === 'boolean' && data[col.dataField] !== null) {
              row[col.dataField] = data[col.dataField] === true ? col.checkedValue : col.uncheckedValue;
              row[col.dataField] = data[col.dataField] === true ? col.checkedValue : col.uncheckedValue;

              if (col.checkedValue === 'true' || col.checkedValue === 'false') {
                row[col.dataField] = data[col.dataField] === true ? true : false;
              }
            } else {
              row[col.dataField] = data[col.dataField];
            }
          });
        }  
        
        if (row !== undefined && type === 'update') {
          // loop on Object.keys(data) and apply changes to row
          Object.keys(data).forEach((key: any) => {
            // change check box value from related column checked unchecked values
            if (this.dataColumns.filter((col: any) => col.dataField === key)[0] !== undefined) {
              if (this.dataColumns.filter((col: any) => col.dataField === key)[0].dataType === 'boolean') {
                if (data[key] !== 'true' && data[key] !== 'false') {
                  row[key] = data[key] === true ? this.dataColumns.filter((col: any) => col.dataField === key)[0].checkedValue : this.dataColumns.filter((col: any) => col.dataField === key)[0].uncheckedValue;
                } else {
                  row[key] = data[key] === 'true' ? true : false;
                }
              } else {
                row[key] = data[key];
              }
            } 
          });

          rowData = {
            key: key,
            data: row,
            type: type
          }
        } 
        
        if (row !== undefined && type !== 'delete') {
          rowData = {
            key: key,
            data: row,
            type: type
          };
        } else {
          rowData = {
            key: key,
            data: {},
            type: 'delete'
          }
        }
        changeArray.push(rowData);
      }

      // rows
      changeArray.forEach((row: any) => {
        let rowParams: any = {};
        if (row.type !== 'delete') {
          rowParams.params = Object.keys(row.data).reduce((obj: any, key: any) => {
            obj['P_' + key] = row.data[key];
            return obj;
          } , {});  
        
          row['dataParams'] = rowParams.params;  
        } else {
          rowParams.params = Object.keys(row.key).reduce((obj: any, key: any) => {
            obj['P_' + key] = row.key[key];
            return obj;
          } , {}); 

          row['keyParams'] = rowParams.params;  
        }
      });

      this.metaData['changeArray'] = changeArray;
      
      if (this.metaData.actionOnEditPost !== undefined && this.metaData.actionOnEditPost !== null && this.metaData.actionOnEditPost !== '') {
        this.gtsDataService.runAction(
          this.prjId, 
          this.formId, 
          this.metaData.actionOnEditPost
        );
      }
    } else {
      this.gridComponent.cancelEditData();
    } 
  }

  onToolbarPreparing(e: any) {
    const toolbarItems = e.toolbarOptions.items;
    toolbarItems.forEach(function(item: any) {
      if (item.name === "revertButton") {
        item.options.onClick = function(args: any){  
          e.component.cancelEditData();
        };
      }
    });
  }

  onEditCanceled(e: any) {
    if (this.metaData.actionOnEditRollback !== undefined && this.metaData.actionOnEditRollback !== null && this.metaData.actionOnEditRollback !== '') {
      this.gtsDataService.runAction(
        this.prjId, 
        this.formId, 
        this.metaData.actionOnEditRollback
      );
    }

    //save data for rollback
    this.gridObject.backupDataSet
    for (let i = 0; i < this.gridObject.backupDataSet.length; i++) {
      const row = this.gridObject.backupDataSet[i];
      // update all key of dataset row with new values and the same index
      this.gridObject.dataSet[i] = row;        
    };    

    this.lookUps.forEach((lookUp: any) => {lookUp.visible = false});
    this.showLookUp = false;
  }

  onLookupClick(e: any) {
    const dbField = this.dataColumns[e.column.index - 1].dataField;   
    const value = e.row.data[dbField];
    const rowIndex = e.row.dataIndex;
    const formField = this.gridObject.groupData.filter((field: any) => field.dbFieldName === dbField)[0];
    
    this.lookUpColName = 'lookup_' + dbField;
    this.actualLookUpFieldName = dbField;
    this.actualLookUpColIndex = e.column.index - 1;
    this.actualLookUpRowIndex = rowIndex;

    this.lookUpField = {
      gridName: this.objectName,
      gridColumn: this.lookUpColName,
      groupId: this.gridObject.groupId,
      sqlId: null,
      fieldName: formField.fieldName,
      formName: null,
      columns: formField.columns,
      keys: formField.sqlKeys,
      caption: formField.lookUpFormCaption,
      value: value,
      formData: null,
      rows: formField.rows,
    }

    this.lookUps.filter((lookUp: any) => lookUp.fieldName === dbField)[0].visible = true;
    this.showLookUp = true;
    this.gtsDataService.showLookUp(this.lookUpField);    
  }

  lookUpSubmitEvent(event: any) {    
    if (event !== null) {
      const fieldValue = event.fieldValue;
      // Assign the selected value to the grid cell   
      const rowIndex = this.actualLookUpRowIndex ? this.actualLookUpRowIndex : 0;
      this.gridComponent.cellValue(this.actualLookUpRowIndex, this.actualLookUpColIndex, fieldValue);
      this.gridComponent.refresh();
      this.showLookUp = false;
    }    
  }

  onKeyDown(e: any) {
    if (e.event.originalEvent.key === 'F2') {
      console.log('F2 - Show Grid Menu'); 
    }
  }

  onAdd = (e: RowDraggingAddEvent) => {
    // Handle the drag and drop add event
    this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);    
    
    const DDdataFrom = this.gtsDataService.getDDRules(this.prjId, this.formId)
    .filter((dd: any) => dd.DDdata.DDTasksGroup === this.DDdata.DDTasksGroup && dd.DDdata.DDStatus === e.fromData)[0];

    let DDdataSetFrom = '';
    let isSelected = false;
    let selectedKeys: any = [];
    this.pageData
    .forEach((da: any) => {
      da.data
      .forEach((data: any) => {
        if (data.dataSetName === DDdataFrom.DDdata.dataSetName) {
          DDdataSetFrom = data.dataSetName;
          isSelected = data.isSelected;
          selectedKeys = data.selectedKeys;
        }
      });
    }); 

    let ok:boolean = false;
    if (isSelected) {
      // look an all keys of selectedKeys Object
      // if any key of selectedKeys is equal to the e.itemData key
      // then ok = true
      selectedKeys.forEach((rowKey: any) => {
        Object.keys(rowKey).forEach((key: string) => {
          if (rowKey[key] !== undefined && e.itemData[key] !== undefined && rowKey[key] === e.itemData[key]) {
            ok = true;
          }
        });
      });

      if (ok) {
        const DDdata = this.gtsDataService.getDDRules(this.prjId, this.formId)
        .filter((dd: any) => dd.DDdata.DDTasksGroup === this.DDdata.DDTasksGroup && (dd.DDdata.DDStatus === e.fromData || dd.DDdata.DDStatus === e.toData) && dd.DDdata.DDActionTo !== null)[0];
      
        let action = '';
        if (DDdata.DDdata.DDStatus == e.toData) {
          action = DDdata.DDdata.DDActionTo;
        } else {
          action = DDdata.DDdata.DDActionFrom;
        }
        
        this.gtsDataService.runAction(
          this.prjId, 
          this.formId, 
          action
        );
      } else {
        this.gtsDataService.runAction(
          this.prjId, 
          this.formId, 
          this.DDdata.DDTasksGroup
        );
      }
    } else {
      this.gtsDataService.runAction(
        this.prjId, 
        this.formId, 
        this.DDdata.DDTasksGroup
      );
    }
  }

}
