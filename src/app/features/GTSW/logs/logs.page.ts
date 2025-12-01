// src/app/features/GTSW/logs/logs.page.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, throwError } from 'rxjs';
import DataSource from 'devextreme/data/data_source';
import ArrayStore from 'devextreme/data/array_store';
import { DxPopupModule, DxHtmlEditorModule, DxDataGridModule } from 'devextreme-angular';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { GtsLoaderComponent } from '../../../core/gts/gts-loader/gts-loader.component';
import { GtsToolbarComponent } from '../../../core/gts/gts-toolbar/gts-toolbar.component';
import { GtsGridComponent } from '../../../core/gts/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts/gts-form-popup/gts-form-popup.component';
import { GtsMessageComponent } from '../../../core/gts/gts-message/gts-message.component';
import { GtsTabsComponent } from '../../../core/gts/gts-tabs/gts-tabs.component';
import { GtsReportsComponent } from '../../../core/gts/gts-reports/gts-reports.component';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [
    CommonModule,
    GtsLoaderComponent,
    GtsToolbarComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsMessageComponent,
    GtsTabsComponent,
    GtsReportsComponent,
    DxPopupModule,
    DxHtmlEditorModule,
    DxDataGridModule
  ],
  template: `
    <ng-container class="pageFormat">
      <app-gts-toolbar
        [prjId]="prjId"
        [formId]="formId"
        [objectName]="'mainToolbar'"
        [customData]="customData"
        (newValueEvent)="gtsDataService.toolbarSelectEvent($event)"
      ></app-gts-toolbar>
      <div [style]="viewStyle">
        @if (loading) {
          <app-gts-loader></app-gts-loader>
        }
        @for (element of metaData.tabs; track element) {
          @if (element.visible) {
            <app-gts-tabs
              [style]="'grid-area: '+element.gridArea"
              [prjId]="prjId"
              [formId]="formId"
              [objectName]="element.objectName"
            ></app-gts-tabs>
          }
        }
        @for (element of metaData.reports; track element) {
          @if (element.visible) {
            <app-gts-reports
              [style]="'grid-area: '+element.gridArea"
              [prjId]="prjId"
              [formId]="formId"
              [fieldGrpId]="element.fieldGrpId"
            ></app-gts-reports>
          }
        }
        @for (element of metaData.toolbars; track element) {
          @if (element.visible && element.objectName != 'mainToolbar' && !element.toolbarFlagSubmit) {
            <app-gts-toolbar
              [style]="'grid-area: '+element.gridArea"
              [prjId]="prjId"
              [formId]="formId"
              [objectName]="element.objectName"
              [customCssClass]="element.customCssClass"
              (newValueEvent)="gtsDataService.toolbarSelectEvent($event)"
            ></app-gts-toolbar>
          }
        }
        @for (element of metaData.grids; track element) {
          @if (element.visible) {
            <app-gts-grid
              [style]="'grid-area: '+element.gridArea"
              [prjId]="prjId"
              [formId]="formId"
              [objectName]="element.objectName"
            ></app-gts-grid>
          }
        }
        @for (element of metaData.forms; track element) {
          @if (element.visible && !element.groupShowPopUp) {
            <app-gts-form
              [style]="'grid-area: '+element.gridArea"
              [prjId]="prjId"
              [formId]="formId"
              [objectName]="element.objectName"
            ></app-gts-form>
          }
          @if (element.visible && element.groupShowPopUp) {
            <app-gts-form-popup
              [prjId]="prjId"
              [formId]="formId"
              [objectName]="element.objectName"
            ></app-gts-form-popup>
          }
        }
      </div>
      <app-gts-message
        [prjId]="prjId"
        [formId]="formId"
      ></app-gts-message>
    </ng-container>

    <dx-popup
      [hideOnOutsideClick]="true"
      [showCloseButton]="true"
      [(visible)]="jsonVisible"
      [title]="jsonDataTitle"
      [height]="800"
      [width]="800"
    >
      <div class="multiline">
        <pre>{{jsonDataString}}</pre>
      </div>
    </dx-popup>

    <dx-popup
      [hideOnOutsideClick]="true"
      [showCloseButton]="true"
      [(visible)]="showMailHtml"
      title="Mail text"
      [height]="800"
      [width]="800"
    >
      <dx-html-editor
        [readOnly]="true"
        [height]="724"
        [width]="768"
        [value]="mailTextHtml"
      ></dx-html-editor>
    </dx-popup>

    @if (showReport) {
      <dx-popup
        [hideOnOutsideClick]="true"
        [showCloseButton]="true"
        [(visible)]="showReport"
        title="Report"
        [height]="900"
        [width]="1500"
      >
        <app-gts-reports
          [prjId]="reportPrjId"
          [formId]="reportFormId"
          [fieldGrpId]="reportFieldGrpId"
          [reportCode]="reportCode"
          [params]="reportParams"
          [connCode]="reportConnCode"
          [report]="report"
        ></app-gts-reports>
      </dx-popup>
    }

    <dx-popup
      [hideOnOutsideClick]="true"
      [showCloseButton]="true"
      [(visible)]="showDataAdapter"
      [title]="dataAdapterTitle"
      [height]="800"
      [width]="800"
    >
      <dx-data-grid
        [repaintChangesOnly]="true"
        [visible]="true"
        [dataSource]="dataAdapterDataSource"
        [showBorders]="true"
        [columnAutoWidth]="true"
        [showRowLines]="true"
        [showColumnLines]="true"
        [rowAlternationEnabled]="true"
        [focusedRowEnabled]="true"
        [(focusedRowIndex)]="dataSetFocusedRowIndex"
        (onCellDblClick)="onDataSetCellDblClick($event)"
      >
        <dxi-column dataField="dataSetName" caption="Data Set"></dxi-column>
        <dxi-column dataField="sqlId" caption="Select SQL Id"></dxi-column>
        <dxi-column dataField="sqlInsertId" caption="Insert SQL Id"></dxi-column>
        <dxi-column dataField="sqlUpdateId" caption="Update SQL Id"></dxi-column>
        <dxi-column dataField="sqlDeleteId" caption="Delete SQL Id"></dxi-column>
      </dx-data-grid>
    </dx-popup>
  `,
  styles: [`
    .pageFormat {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .multiline {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  `]
})
export class GTSW_LogsComponent implements OnInit, OnDestroy {
  // Services
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);
  private router = inject(Router);

  // Page params
  prjId = 'GTSW';
  formId = 11;

  // Subscriptions
  appViewListenerSubs: Subscription | undefined;
  formReqListenerSubs: Subscription | undefined;
  pageCustomListenerSubs: Subscription | undefined;
  appLoaderListenerSubs: Subscription | undefined;

  // Component state
  metaData: any = {};
  actualView = '';
  loading = true;
  pageData: any = {};
  viewStyle = '';
  customData: any[] = [];
  toolbarSelectedValue = '';

  // Page-specific state
  paramLog = '';
  jsonVisible = false;
  jsonDataString = '';
  jsonDataTitle = '';

  showMailHtml = false;
  mailTextHtml = '';

  showReport = false;
  reportCode = '';
  reportFieldGrpId = 0;
  reportPrjId = '';
  reportFormId = 0;
  reportParams: any = {};
  reportConnCode = '';
  report: any = {};

  showDataAdapter = false;
  dataAdapterTitle = '';
  dataSetFocusedRowIndex = 0;

  dataAdapterDataStore: any = {};
  dataAdapterDataSource: any = {};
  dataAdapterPrjId = '';

  ngOnInit(): void {
    // ======= All pages should check token =======
    if (this.authService.autoAuthUser()) {
      this.authService.checkToken();
    }

    // IMPORTANT: Read route parameter FIRST before anything else
    // This ensures paramLog is set before runPage is called
    const params = this.route.snapshot.queryParams;
    if (params['param']) {
      this.paramLog = params['param'];
    }

    // Loader Listener
    this.appLoaderListenerSubs = this.gtsDataService
      .getAppLoaderListener()
      .subscribe((loading) => {
        this.loading = loading;
      });

    // View Listener
    this.appViewListenerSubs = this.gtsDataService
      .getAppViewListener()
      .subscribe((actualView) => {
        this.actualView = actualView;
        this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
        this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'all', 'all');
        if (this.metaData.views.filter((view: any) => view.viewName === actualView) !== undefined &&
            this.metaData.views.filter((view: any) => view.viewName === actualView).length > 0) {
          this.viewStyle = this.metaData.views.filter((view: any) => view.viewName === actualView)[0].viewStyle;
        }
      });

    // Watch for param changes (when navigating between different log types)
    this.route.queryParams.subscribe(async params => {
      if (params['param']) {
        const oldParam = this.paramLog;
        this.paramLog = params['param'];

        // If parameter changed, force page reload
        if (oldParam !== '' && oldParam !== this.paramLog) {
          // Navigate away and back to force component recreation
          await this.router.navigate(['/home']);
          setTimeout(() => {
            this.router.navigate(['/GTSW/logs'], { queryParams: { param: this.paramLog } });
          }, 50);
        }
      }
    });

    // Form Req Listener
    this.formReqListenerSubs = this.gtsDataService
      .getFormReqListener()
      .subscribe((formRequestField) => {
        const reply: any = {
          valid: true,
          message: ''
        };
        //===== START FORM REQUEST CUSTOM CODE =====

        //===== END FORM REQUEST CODE =====
        if (formRequestField.typeRequest !== 'EXIT') {
          this.gtsDataService.sendFormReply(reply);
        }
      });

    // Custom Code Listener
    this.pageCustomListenerSubs = this.gtsDataService
      .getPageCustomListener()
      .subscribe(async (customCode) => {
        //===== START CUSTOM CODE =====

        if (customCode === 'INIT_LOG') {
          if (this.paramLog === 'reports') {
            this.gtsDataService.setPageRule(this.prjId, this.formId, 1, 1);
          } else if (this.paramLog === 'errors') {
            this.gtsDataService.setPageRule(this.prjId, this.formId, 1, 2);
          } else if (this.paramLog === 'db') {
            this.gtsDataService.setPageRule(this.prjId, this.formId, 1, 3);
          } else if (this.paramLog === 'auth') {
            this.gtsDataService.setPageRule(this.prjId, this.formId, 1, 4);
          } else if (this.paramLog === 'mails') {
            this.gtsDataService.setPageRule(this.prjId, this.formId, 1, 5);
          } else if (this.paramLog === 'tasks') {
            this.gtsDataService.setPageRule(this.prjId, this.formId, 1, 6);
          }
        }

        if (customCode === 'SHOW_JSON') {
          if (this.paramLog === 'reports') {
            const row = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daRptLog','qRptLog');
            this.jsonDataTitle = row.reportCode + ' - ' + row.reportName;
            this.jsonDataString = JSON.stringify(row, null, 2);
          } else if (this.paramLog === 'errors') {
            const row = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daErrorsLog','qErrorsLog');
            this.jsonDataTitle = row.module + ' - Number: ' + row.errorNumber;
            this.jsonDataString = JSON.stringify(row, null, 2);
          } else if (this.paramLog === 'db') {
            const row = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daDBLog','qDBLog');
            this.jsonDataTitle = row.prjId + ' - Form: ' + row.formId;
            this.jsonDataString = JSON.stringify(row, null, 2);
          } else if (this.paramLog === 'auth') {
            const row = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daAuthLog','qAuthLog');
            this.jsonDataTitle = row.action + ' - ' + row.email;
            this.jsonDataString = JSON.stringify(row, null, 2);
          } else if (this.paramLog === 'mails') {
            const row = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daMailsLog','qMailsLog');
            this.jsonDataTitle = row.mailCode + ' - ' + row.mailSubject;
            this.jsonDataString = JSON.stringify(row, null, 2);
          }  else if (this.paramLog === 'tasks') {
            const row = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daTaskLog','qTaskLog');
            this.jsonDataTitle = row.taskCode + ' - ' + row.taskType;
            this.jsonDataString = JSON.stringify(row, null, 2);
          }
          this.gtsDataService.sendAppLoaderListener(false);
          this.jsonVisible = !this.jsonVisible;
        }

        if (customCode === 'SHOW_MAIL') {
          this.mailTextHtml = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daMailsLog','qMailsLog').mailTextHtml;
          this.showMailHtml = true;
        }

        if (customCode === 'SHOW_REPORT') {
          this.gtsDataService.sendAppLoaderListener(true);
          const row = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daRptLog','qRptLog');
          this.reportCode = row.reportCode;
          this.reportFieldGrpId = row.fieldGrpId;
          this.reportPrjId = row.prjId;
          this.reportFormId = row.formId;
          this.reportParams = row.params;
          this.reportConnCode = row.connCode;
          const report = {
            sessionId: row.sessionId,
            fieldGrpId: row.fieldGrpId,
            reportCode: row.reportCode,
            reportName: row.reportName,
            sqlId: row.sqlId,
          };
          await this.gtsDataService.getOtherPageData(this.reportPrjId, this.reportFormId);
          this.report = await this.gtsDataService.getReportData(this.reportPrjId, this.reportFormId, report, this.reportParams, this.reportConnCode, false);
          if (this.report !== undefined && this.report !== null && this.report.valid) {
            this.showReport = true;
          } else {
            const errorMessage = this.report.message;
            this.gtsDataService.sendAppLoaderListener(false);
            console.error('Error getting report data:', errorMessage);
            // Show error message to user
            alert('Error getting report data: ' + errorMessage);
          }
        }

        if (customCode === 'SHOW_SQL') {
          const row = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daDBLog','qDBLog');
          let SQL: any = {};
          let sqlId: number = 0;
          let params: any = {};

          if (row.sqlId !== null && row.sqlId !== undefined) {
            params = {
              prjId: row.prjId,
              sqlId: row.sqlId
            }
          }

          if (row.lookUp !== undefined) {
            sqlId = row.lookUp.lookupSqlId;
            params = {
              prjId: row.prjId,
              sqlId: row.lookUp.lookupSqlId
            }
          }

          if (Object.keys(params).length > 0) {
            SQL = await this.gtsDataService.execMethod('data', 'getSQLSpec', params);
            this.jsonDataString = SQL.sql.sqlCode;
            this.jsonVisible = !this.jsonVisible;
          } else {
            this.gtsDataService.sendAppLoaderListener(true);
            await this.gtsDataService.getOtherPageData(row.prjId, row.formId);

            const dataAdapter = this.gtsDataService.getPageMetaData(row.prjId, row.formId, 'dataAdapter', row.dataAdapterName);

            this.dataAdapterDataStore = new ArrayStore({
              data: dataAdapter,
              key: ['dataSetName']
            });

            this.dataAdapterDataSource = new DataSource({
              store: this.dataAdapterDataStore
            });

            this.dataAdapterTitle = 'Data Adapter : ' + row.dataAdapterName;
            this.dataAdapterPrjId = row.prjId;
            this.showDataAdapter = true;
          }
        }

        this.gtsDataService.sendAppLoaderListener(false);

        //===== END CUSTOM CODE =====
      });

    // Run Page
    this.gtsDataService.runPage(this.prjId, this.formId);
  }

  ngOnDestroy(): void {
    this.appViewListenerSubs?.unsubscribe();
    this.pageCustomListenerSubs?.unsubscribe();
    this.appLoaderListenerSubs?.unsubscribe();
    this.formReqListenerSubs?.unsubscribe();
  }

  async onDataSetCellDblClick(event: any) {
    if (event.rowType === 'data' && event.columnIndex > 0) {
      const params = {
        prjId: this.dataAdapterPrjId,
        sqlId: event.values[event.columnIndex]
      }

      const SQL = await this.gtsDataService.execMethod('data', 'getSQLSpec', params);

      if (SQL.sql.mongoId !== null) {
        this.jsonDataString = JSON.stringify(SQL.sql.mongoOp, null, 2);
      } else {
        this.jsonDataString = SQL.sql.sqlCode;
      }
      this.jsonDataTitle = event.values[0] +' - SQL Id: ' + event.text+' - '+SQL.sql.sqlDescription;
      this.jsonVisible = !this.jsonVisible;
    }
  }
}
