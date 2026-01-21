// src/app/features/GTSW/scheduler/scheduler.page.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import DataSource from 'devextreme/data/data_source';
import ArrayStore from 'devextreme/data/array_store';
import notify from 'devextreme/ui/notify';
import { DxDataGridModule, DxPopupModule } from 'devextreme-angular';
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
import { GtsAiComponent } from '../../../core/gts/gts-ai/gts-ai.component';

@Component({
  selector: 'app-scheduler',
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
    GtsAiComponent,
    DxDataGridModule,
    DxPopupModule
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
          @if (element.visible && element.objectName !== 'mainToolbar' && !element.toolbarFlagSubmit) {
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
      <app-gts-ai
        [prjId]="prjId"
        [formId]="formId"
        [popUpTitle]="aiPopUpTitle"
        [instrName]="aiInstrName"
        [popUpHeigth]="450"
        [popUpWidth]="700"
        [popUpVisible]="aiPopUpVisible"
      ></app-gts-ai>
      <dx-popup
        [hideOnOutsideClick]="true"
        [showCloseButton]="true"
        [(visible)]="showCronList"
        [title]="cronStatus"
        [height]="600"
        [width]="1200"
      >
        <dx-data-grid
          [repaintChangesOnly]="true"
          [visible]="showCronList"
          [dataSource]="cronDataSource"
          [showBorders]="true"
          [columnAutoWidth]="true"
          [showRowLines]="true"
          [showColumnLines]="true"
          [rowAlternationEnabled]="true"
          [focusedRowEnabled]="true"
        >
          <dxi-column dataField="taskActive" caption="Active"></dxi-column>
          <dxi-column dataField="taskCode" caption="Code"></dxi-column>
          <dxi-column dataField="taskSchedule" caption="Schedule"></dxi-column>
          <dxi-column dataField="taskURL" caption="Method Route"></dxi-column>
          <dxi-column dataField="taskType" caption="Task Type"></dxi-column>
          <div *dxTemplate="let data of 'cellTemplate'">
            <img [src]="data.value" />
          </div>
        </dx-data-grid>
      </dx-popup>
    </ng-container>
  `,
  styles: []
})
export class GTSW_SchedulerComponent implements OnInit, OnDestroy {
  // Services
  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);

  // Page params
  prjId = 'GTSW';
  formId = 7;

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

  // AI Popup state
  aiPopUpVisible = false;
  aiInstrName = 'CronPeriod';
  aiPopUpTitle = 'Build Cron Period';

  // Cron/Scheduler state
  showCronList = false;
  cronList: any[] = [];
  cronDataStore: any = {};
  cronDataSource: any = {};
  cronStatus = '';

  ngOnInit(): void {
    // ======= All pages should check token =======
    if (this.authService.autoAuthUser()) {
      this.authService.checkToken();
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

    // Form Req Listener
    this.formReqListenerSubs = this.gtsDataService
      .getFormReqListener()
      .subscribe((formRequestField) => {
        const reply: any = {
          valid: true,
          message: ''
        };
        //===== START FORM REQUEST CUSTOM CODE =====
        if (formRequestField.typeRequest !== 'POPUP_HIDDEN') {
          this.aiPopUpVisible = false;
          this.gtsDataService.sendFormReply(reply);
        }

        if (formRequestField.typeRequest !== 'EXIT') {
          reply.message = 'POPUP_HIDDEN';
          this.aiPopUpVisible = false;
          this.gtsDataService.sendFormReply(reply);
        }

        if (formRequestField.typeRequest === 'aiInstrAnswer') {
          this.aiPopUpVisible = false;
          reply.message = formRequestField.typeRequest;
          reply.data = formRequestField.instrData;
          this.gtsDataService.sendFormReply(reply);
        }
        //===== END FORM REQUEST CODE =====
      });

    // Custom Code Listener
    this.pageCustomListenerSubs = this.gtsDataService
      .getPageCustomListener()
      .subscribe(async (customCode) => {
        //===== START CUSTOM CODE =====
        const position: any = 'top center';
        const direction: any = 'down-push';
        let message = '';
        let valid = false;

        if (customCode === 'AI_QUERY') {
          this.aiPopUpVisible = true;
        }

        if (customCode === 'CRON_GET_TASK') {
          const response = await this.gtsDataService.execMethod('task', 'getTasksList', {});

          this.cronDataStore = new ArrayStore({
            data: response.taskList,
            key: ['taskCode']
          });

          this.cronDataSource = new DataSource({
            store: this.cronDataStore
          });

          this.cronStatus = 'SERVER CRON STATUS: ' + (response.cronActive === 'Y' ? 'ACTIVE' : 'INACTIVE');

          this.gtsDataService.sendAppLoaderListener(false);
          this.showCronList = true;
        }

        if (customCode === 'CRON_START') {
          const taskCode = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqSchedule_taskCode');
          const response = await this.gtsDataService.execMethod('task', 'activateTask', { taskCode: taskCode });
          valid = response.valid;
          message = response.message;
        }

        if (customCode === 'CRON_STOP') {
          const taskCode = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqSchedule_taskCode');
          const response = await this.gtsDataService.execMethod('task', 'deactivateTask', { taskCode: taskCode });
          valid = response.valid;
          message = response.message;
        }

        if (customCode === 'CRON_LOAD') {
          const data = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daSchedule', 'qSchedule');
          const response = await this.gtsDataService.execMethod('task', 'loadTask', data);
          valid = response.valid;
          message = response.message;
        }

        if (customCode === 'CRON_UNLOAD') {
          const taskCode = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqSchedule_taskCode');
          const response = await this.gtsDataService.execMethod('task', 'unloadTask', { taskCode: taskCode });
          valid = response.valid;
          message = response.message;
        }

        if (customCode === 'CRON_RUN') {
          const data = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daSchedule', 'qSchedule');
          const response = await this.gtsDataService.execMethod('task', 'runTask', data);
          valid = response.valid;
          message = response.message;
        }

        if (customCode === 'CRON_UNLOAD' || customCode === 'CRON_LOAD' || customCode === 'CRON_START' ||
            customCode === 'CRON_STOP' || customCode === 'CRON_RUN') {
          notify(
            {
              message: message,
              height: 45,
              width: 200,
              minWidth: 200,
              type: valid ? 'success' : 'error',
              displayTime: 3000,
              animation: {
                show: {
                  type: 'fade', duration: 200, from: 0, to: 1,
                },
                hide: { type: 'fade', duration: 40, to: 0 },
              },
            },
            { position, direction }
          );
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
}
