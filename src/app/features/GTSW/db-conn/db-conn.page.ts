// src/app/features/GTSW/db-conn/db-conn.page.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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

@Component({
  selector: 'app-db-conn',
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
    GtsReportsComponent
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
  `,
  styles: [`
    .pageFormat {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class GTSW_DbConnComponent implements OnInit, OnDestroy {
  // Services
  private cd = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);

  // Page params
  prjId = 'GTSW';
  formId = 5;

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
  showPassw = false;

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

        if (customCode === 'GET_PARAM') {
          const params = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daConn', 'qConn').connParams;
          this.gtsDataService.setPageFieldValue(this.prjId, this.formId, 'connParams', JSON.stringify(params, null, 2));
        }

        if (customCode === 'SET_PARAM') {
          this.gtsDataService.saveFormDataValues(this.prjId, this.formId, 3);

          const paramsValue = JSON.parse(this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'connParams'));
          this.gtsDataService.setDataSetFieldValue('daConn', 'qConn', 'connParams', paramsValue);
          this.gtsDataService.setPageFieldValue(this.prjId, this.formId, 'connParams', paramsValue);
          this.gtsDataService.setPageFieldValue(this.prjId, this.formId, 'gtsFldqConn_connParams', paramsValue);
        }

        if (customCode === 'GET_PSSW') {
          const params = {
            "psswType": "conn",
            "psswKey": {
              "connCode": this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daConn', 'qConn').connCode,
              "dbMode": this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daConn', 'qConn').dbMode
            }
          };

          this.showPassw = false;
          const result = await this.gtsDataService.execMethod('setup', 'getPassword', params);
          this.gtsDataService.setPageFieldValue(this.prjId, this.formId, 'password', result.password);
          this.gtsDataService.runAction(this.prjId, this.formId, 'connPsswShow');
        }

        if (customCode === 'SET_PSSW') {
          const password = this.gtsDataService.getFormFieldValue(this.prjId, this.formId, 'psswDataForm', 'password');
          const params = {
            "psswType": "conn",
            "psswKey": {
              "connCode": this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daConn', 'qConn').connCode,
              "dbMode": this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daConn', 'qConn').dbMode
            },
            "password": password
          };
          const result = await this.gtsDataService.execMethod('setup', 'setPassword', params);
          this.metaData.customMsg = result.message;
          this.gtsDataService.runAction(this.prjId, this.formId, 'connPsswMsg');
        }

        if (customCode === 'PSSW_TOGGLE') {
          this.showPassw = !this.showPassw;
          const reply: any = {
            valid: true,
            message: 'PASSWORD',
            showPassw: this.showPassw
          };
          this.gtsDataService.sendFormReply(reply);
        }

        if (customCode === 'TEST_CONN') {
          const params = {
            "connCode": this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daConn', 'qConn').connCode,
            "dbModeTest": this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daConn', 'qConn').dbMode
          };
          const result = await this.gtsDataService.execMethod('db', 'testConn', params);
          this.metaData.customMsg = result.message;
          if (!result.valid) {
            this.metaData.customMsg = this.metaData.customMsg + String.fromCharCode(13, 10) + result.error;
            this.gtsDataService.runAction(this.prjId, this.formId, 'connTestMsgError');
          } else {
            this.gtsDataService.runAction(this.prjId, this.formId, 'connTestMsg');
          }
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
