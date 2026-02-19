// src/app/features/GTSW/logs/logs.page.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
// Import GTS Components - Open Source Versions
import { GtsLoaderComponent } from '../../../core/gts-open-source/gts-loader/gts-loader.component';
import { GtsToolbarComponent } from '../../../core/gts-open-source/gts-toolbar/gts-toolbar.component';
import { GtsGridComponent } from '../../../core/gts-open-source/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts-open-source/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts-open-source/gts-form-popup/gts-form-popup.component';
import { GtsMessageComponent } from '../../../core/gts-open-source/gts-message/gts-message.component';
import { GtsTabsComponent } from '../../../core/gts-open-source/gts-tabs/gts-tabs.component';
import { GtsReportsComponent } from '../../../core/gts-open-source/gts-reports/gts-reports.component';
// Ionic imports
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton
} from '@ionic/angular/standalone';
// PrimeNG imports
import { TableModule } from 'primeng/table';

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
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    TableModule
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

    <!-- JSON Modal -->
    <ion-modal [isOpen]="jsonVisible" (didDismiss)="jsonVisible = false" class="json-modal">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ jsonDataTitle }}</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="jsonVisible = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div class="json-content">
            <pre>{{ jsonDataString }}</pre>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- Mail HTML Modal -->
    <ion-modal [isOpen]="showMailHtml" (didDismiss)="showMailHtml = false" class="mail-html-modal">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>Mail text</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="showMailHtml = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div class="mail-html-content" [innerHTML]="mailTextHtml"></div>
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- Report Modal -->
    <ion-modal [isOpen]="showReport" (didDismiss)="showReport = false" class="report-modal">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>Report</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="showReport = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          @if (showReport) {
            <app-gts-reports
              [prjId]="reportPrjId"
              [formId]="reportFormId"
              [fieldGrpId]="reportFieldGrpId"
              [reportCode]="reportCode"
              [params]="reportParams"
              [connCode]="reportConnCode"
              [report]="report"
            ></app-gts-reports>
          }
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- Data Adapter Modal -->
    <ion-modal [isOpen]="showDataAdapter" (didDismiss)="showDataAdapter = false" class="data-adapter-modal">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ dataAdapterTitle }}</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="showDataAdapter = false">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p-table
            [value]="dataAdapterData"
            [tableStyle]="{'min-width': '50rem'}"
            [(selection)]="dataAdapterSelectedRow"
            selectionMode="single"
            (onRowDblclick)="onDataAdapterRowDblClick($event)"
          >
            <ng-template pTemplate="header">
              <tr>
                <th>Data Set</th>
                <th>Select SQL Id</th>
                <th>Insert SQL Id</th>
                <th>Update SQL Id</th>
                <th>Delete SQL Id</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr [pSelectableRow]="row">
                <td>{{ row.dataSetName }}</td>
                <td>{{ row.sqlId }}</td>
                <td>{{ row.sqlInsertId }}</td>
                <td>{{ row.sqlUpdateId }}</td>
                <td>{{ row.sqlDeleteId }}</td>
              </tr>
            </ng-template>
          </p-table>
        </ion-content>
      </ng-template>
    </ion-modal>

  `,
  styles: [`
    .pageFormat {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .json-modal,
    .mail-html-modal {
      --width: 800px;
      --height: 80vh;
      --max-width: 90vw;
      --max-height: 90vh;
    }

    .report-modal {
      --width: 95vw;
      --height: 90vh;
      --max-width: 1500px;
    }

    .data-adapter-modal {
      --width: 900px;
      --height: 80vh;
      --max-width: 90vw;
    }

    .json-content {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
    }

    .json-content pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.4;
    }

    .mail-html-content {
      padding: 16px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      min-height: 400px;
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
  dataAdapterData: any[] = [];
  dataAdapterSelectedRow: any = null;
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
      .subscribe(async (event) => {
        //===== START CUSTOM CODE =====

        if (event.customCode === 'INIT_LOG') {
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

        if (event.customCode ==='SHOW_JSON') {
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

        if (event.customCode ==='SHOW_MAIL') {
          this.mailTextHtml = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daMailsLog','qMailsLog').mailTextHtml;
          this.showMailHtml = true;
        }

        if (event.customCode ==='SHOW_REPORT') {
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
            // Show error message to user
            alert('Error getting report data: ' + errorMessage);
          }
        }

        if (event.customCode ==='SHOW_RPTDATA') {
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
          this.report = await this.gtsDataService.getReportData(this.reportPrjId, this.reportFormId, report, this.reportParams, this.reportConnCode, false, false);
          if (this.report !== undefined && this.report !== null && this.report.valid) {
            // const dataRows = report with only keys beginnig with rows
            const dataRows: any = {};
            Object.keys(this.report).forEach((key: any) => {
              if (key.startsWith('rows_')) {  
                dataRows[key] = this.report[key];
              }
            });
            this.jsonDataTitle = this.reportCode + ' - Data Rows';
            this.jsonDataString = JSON.stringify(dataRows, null, 2);
            this.jsonVisible = true;
          } else {
            const errorMessage = this.report.message;
            this.gtsDataService.sendAppLoaderListener(false);
            // Show error message to user
            alert('Error getting report data: ' + errorMessage);
          }
        }

        if (event.customCode ==='SHOW_RPT_METADATA') {
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
          this.report = await this.gtsDataService.getReportData(this.reportPrjId, this.reportFormId, report, this.reportParams, this.reportConnCode, false, false);
          if (this.report !== undefined && this.report !== null && this.report.valid) {
            // const dataRows = report with only keys beginnig with rows
            const dataRows: any = {};
            Object.keys(this.report).forEach((key: any) => {
              if (key.startsWith('fields_')) {  
                dataRows[key] = this.report[key];
              }
            });
            this.jsonDataTitle = this.reportCode + ' - Data Fields';
            this.jsonDataString = JSON.stringify(dataRows, null, 2);
            console.log('dataRows', dataRows);
            this.jsonVisible = true;
          } else {
            const errorMessage = this.report.message;
            this.gtsDataService.sendAppLoaderListener(false);
            // Show error message to user
            alert('Error getting report data: ' + errorMessage);
          }
        }

        if (event.customCode ==='SHOW_SQL') {
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
            this.dataAdapterData = dataAdapter;

            this.dataAdapterTitle = 'Data Adapter : ' + row.dataAdapterName;
            this.dataAdapterPrjId = row.prjId;
            this.showDataAdapter = true;
          }
        }

        this.gtsDataService.sendAppLoaderListener(false);

        // Run next action if specified
        if (event.actionName) {
          this.gtsDataService.runAction(this.prjId, this.formId, event.actionName);
        }

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

  async onDataAdapterRowDblClick(event: any) {
    const row = event.data;
    const columnIndex = event.originalEvent.target.cellIndex;

    // Skip if clicked on first column (dataSetName)
    if (columnIndex === 0) {
      return;
    }

    let sqlId: number | null = null;
    let columnName = '';

    // Determine which column was clicked
    switch (columnIndex) {
      case 1:
        sqlId = row.sqlId;
        columnName = 'Select SQL Id';
        break;
      case 2:
        sqlId = row.sqlInsertId;
        columnName = 'Insert SQL Id';
        break;
      case 3:
        sqlId = row.sqlUpdateId;
        columnName = 'Update SQL Id';
        break;
      case 4:
        sqlId = row.sqlDeleteId;
        columnName = 'Delete SQL Id';
        break;
    }

    if (sqlId) {
      const params = {
        prjId: this.dataAdapterPrjId,
        sqlId: sqlId
      };

      const SQL = await this.gtsDataService.execMethod('data', 'getSQLSpec', params);

      if (SQL.sql.mongoId !== null) {
        this.jsonDataString = JSON.stringify(SQL.sql.mongoOp, null, 2);
      } else {
        this.jsonDataString = SQL.sql.sqlCode;
      }
      this.jsonDataTitle = row.dataSetName + ' - ' + columnName + ': ' + sqlId + ' - ' + SQL.sql.sqlDescription;
      this.showDataAdapter = false;
      this.jsonVisible = true;
    }
  }
}
