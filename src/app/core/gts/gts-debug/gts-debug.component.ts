import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, Input, Output, EventEmitter, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { AppInfoService } from '../../services/app-info.service';
import { Subscription } from 'rxjs';
import DataSource from 'devextreme/data/data_source';
import ArrayStore from 'devextreme/data/array_store';
import {
  DxTabsModule,
  DxAccordionModule,
  DxListModule,
  DxDataGridModule,
  DxButtonModule,
  DxTextAreaModule,
  DxPopupModule,
  DxFormModule,
  DxScrollViewModule
} from 'devextreme-angular';

@Component({
  selector: 'app-gts-debug',
  standalone: true,
  imports: [
    CommonModule,
    DxTabsModule,
    DxAccordionModule,
    DxListModule,
    DxDataGridModule,
    DxButtonModule,
    DxTextAreaModule,
    DxPopupModule,
    DxFormModule,
    DxScrollViewModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './gts-debug.component.html',
  styleUrls: ['./gts-debug.component.scss']
})

export class GtsDebugComponent implements OnInit, OnChanges, OnDestroy {
  private gtsDataService = inject(GtsDataService);
  private appInfoService = inject(AppInfoService);

  @Input()
  prjId: string ='';

  @Input()
  metaData: any = {};

  @Input()
  pageData: any = {};

  @Input()
  dbLog: any = {};

  @Input()
  pageRules: any = {};

  @Output()
  debugStateChanged = new EventEmitter<boolean>();

  actionsDebugListenerSubs: Subscription | undefined;

  ngOnInit(): void {
    this.actionsDebugListenerSubs = this.appInfoService
    .getAppActionsDebugListener()
    .subscribe((debug) => {
      this.actionDebugActive = debug;
    });

    this.initializeDebugData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Quando cambiano i dati di input (metaData, pageData, dbLog, pageRules)
    // reinizializziamo i dati del debug
    if (changes['metaData'] || changes['pageData'] || changes['dbLog'] || changes['pageRules']) {
      this.initializeDebugData();
    }
  }

  private initializeDebugData(): void {
    // Reset di tutti i dati
    this.pages = [];
    this.dataSetRow = null;
    this.dataSet = null;
    this.actionRow = null;
    this.formRow = null;
    this.gridRow = null;
    this.tabsRow = null;
    this.toolbarRow = null;
    this.viewRow = null;
    this.dbLogRow = null;
    this.metaDataGroupRow = null;
    this.metaDataRows = null;
    this.isDataGridVisible = false;
    this.sqlPopupVisible = false;

    if (!this.metaData || this.metaData.length === 0) {
      return;
    }

    this.metaData.forEach((page: any) => {
      let details: any[] = [];      
      
      details.push({
        group: 'actions',
        size: page.pageData.actions.length,
        data: page.pageData.actions
      });
      details.push({
        group: 'condRules',
        size: page.pageData.condRules.length,
        data: page.pageData.condRules
      });
      details.push({
        group: 'dataSets',
        size: page.pageData.dataSets.length,
        data: page.pageData.dataSets
      });
      details.push({
        group: 'forms',
        size: page.pageData.forms.length,
        data: page.pageData.forms
      });
      details.push({
        group: 'grids',
        size: page.pageData.grids.length,
        data: page.pageData.grids
      });
      details.push({
        group: 'pageFields',
        size: page.pageData.pageFields.length,
        data: page.pageData.pageFields
      });
      details.push({
        group: 'tabs',
        size: page.pageData.tabs.length,
        data: page.pageData.tabs
      });
      details.push({
        group: 'toolbars',
        size: page.pageData.toolbars.length,
        data: page.pageData.toolbars
      });
      details.push({
        group: 'views',
        size: page.pageData.views.length,
        data: page.pageData.views
      });

      let adapters: any[] = [];
      let i = 0;
      this.pageData
      .filter((data: any) => data.prjId === page.prjId && data.formId === page.formId)
      .forEach((adapter: any) => {
        i = i + 1;
        let dataSets: any[] = [];        
        adapter.data.forEach((data: any) => {
          dataSets.push({
            dataAdapter: adapter.dataAdapter,
            dataSetName: data.dataSetName,
            size: data.rows.length,
            data: data.rows,
            sqlKeys: data.sqlKeys,
            selectedRows: data.selectedRows,
          }); 
        });

        adapters.push({
          dataAdapter: adapter.dataAdapter,
          size: i,
          dataSets: dataSets
        });
      });

      let pageMeta = {
        prjId: page.prjId,
        formId: page.formId,
        title: page.pageData.formName,
        metadata: details,
        adapters: adapters,
        dbLog: this.dbLog.filter((data: any) => data.prjId === page.prjId && data.formId === page.formId),
      }

      // get condValue from pageRules and change pages.metadata condRules data
      let condRules = pageMeta.metadata.filter((data: any) => data.group === 'condRules')[0].data;
      condRules.forEach((rule: any) => {
        let condValue = this.pageRules.filter((data: any) => data.prjId === page.prjId && data.formId === page.formId && data.condId === rule.condId)[0];
        if (condValue) {
          rule.condValue = condValue.condValue;
        }
      });
     
      this.pages.push(pageMeta);
      
      this.actionDebugActive = this.appInfoService.appActionsDebug;
      this.actionDebugMessage = this.actionDebugActive ? 'Debug Active' : 'Debug Inactive';

      this.metaDataGroupRow = this.pages[0];
      this.metaDataGroup = 'actions';
      this.metaDataRows = this.pages[0].metadata.filter((data: any) => data.group === this.metaDataGroup)[0].data;
    });
    
    // wrap index in timeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.selectedItemIndex = 0;
      this.selectedAdapterIndex = 0;
      this.showAccordion = true;
    }, 10);     
  }

  ngOnDestroy(): void {
    if (this.actionsDebugListenerSubs) {
      this.actionsDebugListenerSubs.unsubscribe();
    }
  }

  tabsIndex: number = 0;
  pages: any[] = [];
  selectedPageIndex: number = 0;
  selectedItemIndex: number = 0;

  selectedAdapterIndex: number = 0;

  showAccordion: boolean = false;
    
  metaDataGroupRow: any = null;
  onSelectionChanged(event: any) {
    this.dataSetRow = null;
    this.dataSet = null;
    this.metaDataGroupRow = event.addedItems[0];
    this.metaDataRows = [];
  }

  onSelectionAdapterChanged(event: any) {
    this.dataSetRow = null
  }

  dataSetRow: any = null
  dataSet: any = null
  rowSelectedCaption: string = '';
  isRowSelected: boolean = false;
  onDataSetClick(event: any) {    
    this.dataSet = event.itemData;
    if (event.itemData.selectedRows !== undefined && event.itemData.selectedRows.length > 0) {
      this.isRowSelected = true;
      this.dataSetRow = event.itemData.selectedRows[0];
      this.rowSelectedCaption = 'Show Row Selected';
    } else {     
      this.rowSelectedCaption = 'Show First Row';
      this.isRowSelected = false;
      this.dataSetRow = event.itemData.data[0];
    }
  }

  isDataGridVisible: boolean = false;
  dataSetSelectedRowKeys: any[] = [];
  sqlCode: string = '';
  sqlPopupVisible: boolean = false;
  sqlPopupTitle: string = 'SQL Code';

  async onMetaDataDataSetButtonClick() {
    if (!this.dataSetFocusedRow || !this.dataSetFocusedRow.sqlId) {
      console.warn('No dataset row selected or sqlId missing');
      return;
    }
    const connCode = this.gtsDataService.getActualConnCode();
    const params =  {
      prjId: this.prjId,
      sqlId: this.dataSetFocusedRow.sqlId,
      connCode: connCode,
      getConnCode: true
    };
    const result = await this.gtsDataService.execMethod('data', 'getSQLSpec', params);

    if (result.valid) {
      this.sqlCode = result.sql.sqlCode;
      this.sqlPopupTitle = `SQL Code - ID: ${this.dataSetFocusedRow.sqlId}`;
      this.sqlPopupVisible = true;
    }
  }

  async onDataSetSQLButtonClick() {
    const connCode = this.gtsDataService.getActualConnCode();
    const sqlId =
    this.pages
    .filter((data: any) => data.prjId === this.metaDataGroupRow.prjId && data.formId === this.metaDataGroupRow.formId)[0]
    .metadata.filter((data: any) => data.group === 'dataSets')[0].
    data.filter((data: any) => data.dataSetName === this.dataSet.dataSetName)[0].sqlId;

    const params =  {
      prjId: this.prjId,
      sqlId: sqlId,
      connCode: connCode,
      getConnCode: true
    };
    const result = await this.gtsDataService.execMethod('data', 'getSQLSpec', params);

    if (result.valid) {
      this.sqlCode = result.sql.sqlCode;
      this.sqlPopupTitle = `SQL Code - DataSet: ${this.dataSet.dataSetName}`;
      this.sqlPopupVisible = true;
    }
  }

  gridData: any = null;
  async onDataSetButtonClick() {
    let keys: any[] = [];
    
    this.dataSet
    .sqlKeys
    .forEach((key: any) => {
      keys.push(key.keyField);
    });

    const store = new ArrayStore({
      data: this.dataSet.data,
      key: keys
    });

    const dataSource = new DataSource({
      store: store
    });

    this.gridData = {
      dataStore: dataSource,
      dataSource: store,
    };

    // get conn Code from local storage
    if (this.dataSet !== null) {
      this.isDataGridVisible = true;
    } else {
      this.isDataGridVisible = false;
    }
  }
  
  actionRow: any = null;
  onActionFocusedRowChanged(event: any) {
    this.actionRow = event.row.data;    
  }

  dataSetFocusedRow: any = null;
  onDataSetFocusedRowChanged(event: any) {
    this.dataSetFocusedRow = event.row.data;
  }

  formRow: any = null;
  onFormFocusedRowChanged(event: any) {
    this.formRow = event.row.data;
  }

  gridRow: any = null;
  onGridFocusedRowChanged(event: any) {
    this.gridRow = event.row.data;
  } 

  tabsRow: any = null;
  onTabsFocusedRowChanged(event: any) {
    this.tabsRow = event.row.data;    
  }

  toolbarRow: any = null;
  onToolbarsFocusedRowChanged(event: any) {
    this.toolbarRow = event.row.data;
  }

  viewRow: any = null;
  onViewsFocusedRowChanged(event: any) {
    this.viewRow = event.row.data;
  }

  actionDetRow: any = null;
  onActionDetFocusedRowChanged(event: any) {
    this.actionDetRow = event.row.data;
  }

  metaDataGroup: string = '';
  metaDataRows: any = null
  onMetaDataClick(event: any) {
    this.metaDataGroup = event.itemData.group;
    this.metaDataRows = this.metaDataGroupRow.metadata.filter((data: any) => data.group === event.itemData.group)[0].data;
  }
  
  jsonDataString: string = '';
  jsonVisible: boolean = false;
  jsonDataTitle: string = 'Selected Row Data';
  onCellDblClick(event: any) {
    this.jsonDataString = JSON.stringify(event.row.data, null, 2);
    this.jsonVisible = true;
  }

  dbLogRow: any = null;
  onDBLogFocusedRowChanged(event: any) {
    this.dbLogRow = event.row.data;
  }

  async onDBLogSQLButtonClick() {
    const connCode = this.gtsDataService.getActualConnCode();
    const sqlId = this.dbLogRow.sqlId;
    if (sqlId !== undefined && sqlId !== null) {
      const params =  {
        prjId: this.prjId,
        sqlId: sqlId,
        connCode: connCode,
        getConnCode: true
      };
      const result = await this.gtsDataService.execMethod('data', 'getSQLSpec', params);

      if (result.valid) {
        this.sqlCode = result.sql.sqlCode;
        this.sqlPopupTitle = `SQL Code - DB Log (${this.dbLogRow.action})`;
        this.sqlPopupVisible = true;
      }
    }
  }

  async onGridSQLButtonClick() {
    const connCode = this.gtsDataService.getActualConnCode();
    const sqlId = this.gridRow.sqlId;
    if (sqlId !== undefined && sqlId !== null) {
      const params =  {
        prjId: this.prjId,
        sqlId: sqlId,
        connCode: connCode,
        getConnCode: true
      };
      const result = await this.gtsDataService.execMethod('data', 'getSQLSpec', params);

      if (result.valid) {
        this.sqlCode = result.sql.sqlCode;
        this.sqlPopupTitle = `SQL Code - Grid: ${this.gridRow.objectName}`;
        this.sqlPopupVisible = true;
      }
    }
  }

  actionDebugActive: boolean = false;
  actionDebugMessage: string = '';
  onActionDebugStartButtonClick() {
    this.appInfoService.appActionsDebugShow();
    this.actionDebugActive = true;
    this.actionDebugMessage = 'Debug Active';
    this.debugStateChanged.emit(true);
  }

  onActionDebugStopButtonClick() {
    this.appInfoService.appActionsDebugHide();
    this.actionDebugActive = false;
    this.actionDebugMessage = 'Debug Inactive';
    this.debugStateChanged.emit(false);
  }

  copySQLToClipboard() {
    if (this.sqlCode) {
      navigator.clipboard.writeText(this.sqlCode).then(() => {
        console.log('SQL copied to clipboard successfully!');
      }).catch(err => {
        console.error('Failed to copy SQL to clipboard:', err);
      });
    }
  }
}