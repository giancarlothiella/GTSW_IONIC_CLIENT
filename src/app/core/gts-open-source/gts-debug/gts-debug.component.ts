import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GtsDataService } from '../../services/gts-data.service';
import { AppInfoService } from '../../services/app-info.service';
import { Subscription } from 'rxjs';
import {
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { playCircle, stopCircle, codeOutline, documentTextOutline, copyOutline } from 'ionicons/icons';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';

// Register icons
addIcons({
  'play-circle': playCircle,
  'stop-circle': stopCircle,
  'code-outline': codeOutline,
  'document-text-outline': documentTextOutline,
  'copy-outline': copyOutline
});

/**
 * GTS Debug Component - Open Source Version
 *
 * Componente semplificato per visualizzare metadata, dati e log di debug.
 *
 * Struttura:
 * - Header con controlli debug (Start/Stop + Status)
 * - 3 Tab: MetaData, DB Data, DB Action Log
 * - Selector per le pagine
 * - Dialog per visualizzare SQL e JSON
 */
@Component({
  selector: 'app-gts-debug',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    TableModule,
    DialogModule
  ],
  templateUrl: './gts-debug.component.html',
  styleUrls: ['./gts-debug.component.scss']
})
export class GtsDebugComponent implements OnInit, OnChanges, OnDestroy {
  private gtsDataService = inject(GtsDataService);
  private appInfoService = inject(AppInfoService);

  @Input() prjId: string = '';
  @Input() metaData: any = {};
  @Input() pageData: any = {};
  @Input() dbLog: any = {};
  @Input() pageRules: any = {};

  @Output() debugStateChanged = new EventEmitter<boolean>();

  actionsDebugListenerSubs: Subscription | undefined;

  // UI State
  activeTabIndex: string = '0';
  pages: any[] = [];
  selectedPage: any = null;

  // MetaData Tab
  metaDataCategories = [
    { label: 'Actions', value: 'actions' },
    { label: 'Conditional Rules', value: 'condRules' },
    { label: 'DataSets', value: 'dataSets' },
    { label: 'Forms', value: 'forms' },
    { label: 'Grids', value: 'grids' },
    { label: 'Page Fields', value: 'pageFields' },
    { label: 'Tabs', value: 'tabs' },
    { label: 'Toolbars', value: 'toolbars' },
    { label: 'Views', value: 'views' }
  ];
  selectedMetaDataCategory: string = 'actions';
  metaDataRows: any[] = [];
  selectedMetaDataRow: any = null; // Riga selezionata per visualizzare il JSON

  // DB Data Tab
  selectedAdapter: any = null;
  selectedDataSet: any = null;
  dataSetRows: any[] = [];

  // DB Action Log Tab
  dbLogRows: any[] = [];

  // Actions Debug State
  actionDebugActive: boolean = false;
  actionDebugMessage: string = 'Debug Inactive';

  // Dialogs
  sqlPopupVisible: boolean = false;
  sqlPopupTitle: string = 'SQL Code';
  sqlCode: string = '';

  jsonVisible: boolean = false;
  jsonDataTitle: string = 'Row Data';
  jsonDataString: string = '';

  ngOnInit(): void {
    this.actionsDebugListenerSubs = this.appInfoService
      .getAppActionsDebugListener()
      .subscribe((debug) => {
        this.actionDebugActive = debug;
        this.actionDebugMessage = debug ? 'Debug Active' : 'Debug Inactive';
      });

    this.initializeDebugData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metaData'] || changes['pageData'] || changes['dbLog'] || changes['pageRules']) {
      this.initializeDebugData();
    }
  }

  ngOnDestroy(): void {
    if (this.actionsDebugListenerSubs) {
      this.actionsDebugListenerSubs.unsubscribe();
    }
  }

  private initializeDebugData(): void {
    this.pages = [];

    if (!this.metaData || this.metaData.length === 0) {
      return;
    }

    this.metaData.forEach((page: any) => {
      // Prepare metadata categories
      const metadata = {
        actions: page.pageData.actions || [],
        condRules: page.pageData.condRules || [],
        dataSets: page.pageData.dataSets || [],
        forms: page.pageData.forms || [],
        grids: page.pageData.grids || [],
        pageFields: page.pageData.pageFields || [],
        tabs: page.pageData.tabs || [],
        toolbars: page.pageData.toolbars || [],
        views: page.pageData.views || []
      };

      // Add condValue from pageRules
      metadata.condRules.forEach((rule: any) => {
        const condValue = this.pageRules.find((data: any) =>
          data.prjId === page.prjId && data.formId === page.formId && data.condId === rule.condId
        );
        if (condValue) {
          rule.condValue = condValue.condValue;
        }
      });

      // Prepare adapters and datasets
      const adapters: any[] = [];
      this.pageData
        .filter((data: any) => data.prjId === page.prjId && data.formId === page.formId)
        .forEach((adapter: any) => {
          const dataSets: any[] = [];
          adapter.data.forEach((data: any) => {
            dataSets.push({
              dataAdapter: adapter.dataAdapter,
              dataSetName: data.dataSetName,
              rows: data.rows,
              sqlKeys: data.sqlKeys,
              selectedRows: data.selectedRows
            });
          });

          adapters.push({
            dataAdapter: adapter.dataAdapter,
            dataSets: dataSets
          });
        });

      // Prepare DB log
      const dbLog = this.dbLog.filter((data: any) =>
        data.prjId === page.prjId && data.formId === page.formId
      );

      this.pages.push({
        prjId: page.prjId,
        formId: page.formId,
        title: `${page.prjId}/${page.formId} - ${page.pageData.formName}`,
        metadata: metadata,
        adapters: adapters,
        dbLog: dbLog
      });
    });

    if (this.pages.length > 0) {
      this.selectedPage = this.pages[0];
      this.loadMetaDataCategory();
      this.loadDbLog();
    }

    this.actionDebugActive = this.appInfoService.appActionsDebug;
    this.actionDebugMessage = this.actionDebugActive ? 'Debug Active' : 'Debug Inactive';
  }

  onPageChange(): void {
    this.loadMetaDataCategory();
    this.loadDbLog();
  }

  onTabChange(): void {
    // Tab changed, no special action needed
  }

  onMetaDataCategoryChange(): void {
    this.loadMetaDataCategory();
  }

  private loadMetaDataCategory(): void {
    if (!this.selectedPage || !this.selectedMetaDataCategory) {
      this.metaDataRows = [];
      this.selectedMetaDataRow = null;
      return;
    }
    this.metaDataRows = this.selectedPage.metadata[this.selectedMetaDataCategory] || [];
    // Seleziona automaticamente la prima riga se disponibile
    this.selectedMetaDataRow = this.metaDataRows.length > 0 ? this.metaDataRows[0] : null;
  }

  onMetaDataRowSelect(row: any): void {
    this.selectedMetaDataRow = row;
  }

  onAdapterChange(): void {
    this.selectedDataSet = null;
    this.dataSetRows = [];
  }

  onDataSetSelect(dataSet: any): void {
    this.selectedDataSet = dataSet;
    this.dataSetRows = dataSet.rows || [];
  }

  private loadDbLog(): void {
    if (!this.selectedPage) {
      this.dbLogRows = [];
      return;
    }
    this.dbLogRows = this.selectedPage.dbLog || [];
  }

  // Actions Debug Controls
  onActionDebugStart(): void {
    this.appInfoService.appActionsDebugShow();
    this.actionDebugActive = true;
    this.actionDebugMessage = 'Debug Active';
    this.debugStateChanged.emit(true);
  }

  onActionDebugStop(): void {
    this.appInfoService.appActionsDebugHide();
    this.actionDebugActive = false;
    this.actionDebugMessage = 'Debug Inactive';
    this.debugStateChanged.emit(false);
  }

  // SQL Dialog
  async showMetaDataSQL(row: any): Promise<void> {
    if (!row || !row.sqlId) {
      return;
    }

    this.gtsDataService.sendAppLoaderListener(true);

    try {
      const connCode = this.gtsDataService.getActualConnCode();
      const params = {
        prjId: this.prjId,
        sqlId: row.sqlId,
        connCode: connCode,
        getConnCode: true
      };
      const result = await this.gtsDataService.execMethod('data', 'getSQLSpec', params);

      if (result.valid) {
        this.sqlCode = result.sql.sqlCode;
        this.sqlPopupTitle = `SQL Code - ID: ${row.sqlId}`;
        this.sqlPopupVisible = true;
      }
    } finally {
      this.gtsDataService.sendAppLoaderListener(false);
    }
  }

  async showDataSetSQL(dataSet: any): Promise<void> {
    if (!dataSet) {
      return;
    }

    const sqlId = this.selectedPage.metadata.dataSets.find((ds: any) =>
      ds.dataSetName === dataSet.dataSetName
    )?.sqlId;

    if (!sqlId) {
      return;
    }

    this.gtsDataService.sendAppLoaderListener(true);

    try {
      const connCode = this.gtsDataService.getActualConnCode();
      const params = {
        prjId: this.prjId,
        sqlId: sqlId,
        connCode: connCode,
        getConnCode: true
      };
      const result = await this.gtsDataService.execMethod('data', 'getSQLSpec', params);

      if (result.valid) {
        this.sqlCode = result.sql.sqlCode;
        this.sqlPopupTitle = `SQL Code - DataSet: ${dataSet.dataSetName}`;
        this.sqlPopupVisible = true;
      }
    } finally {
      this.gtsDataService.sendAppLoaderListener(false);
    }
  }

  async showDbLogSQL(row: any): Promise<void> {
    if (!row || !row.sqlId) {
      return;
    }

    this.gtsDataService.sendAppLoaderListener(true);

    try {
      const connCode = this.gtsDataService.getActualConnCode();
      const params = {
        prjId: this.prjId,
        sqlId: row.sqlId,
        connCode: connCode,
        getConnCode: true
      };
      const result = await this.gtsDataService.execMethod('data', 'getSQLSpec', params);

      if (result.valid) {
        this.sqlCode = result.sql.sqlCode;
        this.sqlPopupTitle = `SQL Code - DB Log (${row.action})`;
        this.sqlPopupVisible = true;
      }
    } finally {
      this.gtsDataService.sendAppLoaderListener(false);
    }
  }

  copySQLToClipboard(): void {
    if (this.sqlCode) {
      navigator.clipboard.writeText(this.sqlCode).then(() => {
        console.log('SQL copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy SQL:', err);
      });
    }
  }

  // JSON Dialog
  showRowJson(event: any): void {
    const row = event.data || event;
    this.jsonDataString = JSON.stringify(row, null, 2);
    this.jsonDataTitle = 'Row Data';
    this.jsonVisible = true;
  }
}
