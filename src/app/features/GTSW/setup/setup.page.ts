// src/app/features/GTSW/setup/setup.page.ts
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
import { GtsFileUploaderComponent } from '../../../core/gts-open-source/gts-file-uploader/gts-file-uploader.component';

@Component({
  selector: 'app-setup',
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
    GtsFileUploaderComponent
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
        @if (prjShowImages) {
          <div class="image-prj">
            <img [src]="prjImage" />
          </div>
        }
        @if (prjShowImages) {
          <div class="logo-prj">
            <img [src]="prjLogo" />
          </div>
        }
      </div>
      <app-gts-message
        [prjId]="prjId"
        [formId]="formId"
      ></app-gts-message>
    </ng-container>

    <app-gts-file-uploader
      [fileUploadPath]="uploadPath"
      uploaderTitle="Project Images"
      [fileUploadName]="uploadName"
      [allowedExtensions]="allowedExtensions"
      [maxFileSize]="maxFileSize"
    ></app-gts-file-uploader>
  `,
  styles: [`
    .pageFormat {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .image-prj,
    .logo-prj {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      margin: 8px;
    }

    .image-prj {
      grid-area: image-prj;
    }

    .logo-prj {
      grid-area: logo-prj;
    }

    .image-prj img,
    .logo-prj img {
      max-width: 100%;
      max-height: 280px;
      object-fit: contain;
      border-radius: 4px;
    }
  `]
})
export class GTSW_SetupComponent implements OnInit, OnDestroy {
  // Services
  private cd = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);

  // Page params
  prjId = 'GTSW';
  formId = 3;

  // Subscriptions
  appViewListenerSubs: Subscription | undefined;
  formReqListenerSubs: Subscription | undefined;
  pageCustomListenerSubs: Subscription | undefined;
  appLoaderListenerSubs: Subscription | undefined;
  fileLoaderListenerSubs: Subscription | undefined;

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
  prjArray: any[] = [];
  prjShowImages = false;
  prjImage = '';
  prjLogo = '';
  fileUploaderVisible = false;
  uploadName = '';
  allowedExtensions: string[] = ['.jpg', '.jpeg', '.gif', '.png'];
  maxFileSize = 5000000;
  uploadPath = 'Projects';

  ngOnInit(): void {
    // ======= All pages should check token =======
    if (this.authService.autoAuthUser()) {
      this.authService.checkToken();
    }

    // File Loader Listener
    this.fileLoaderListenerSubs = this.gtsDataService
      .getFileLoaderListener()
      .subscribe((status) => {
        if (status.result === true && status.fileUploadVisible === false) {
          // Auto-update the form field with the uploaded filename
          if (status.fileUploadedName) {
            const selPrj = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daSetup', 'qPrj');
            if (this.uploadName.endsWith('_home')) {
              this.gtsDataService.setPageFieldValue(this.prjId, this.formId, 'gtsFldqPrj_homeImage', status.fileUploadedName);
              // Clear cached image so it reloads
              const cachedPrj = this.prjArray.find(p => p.prjId === selPrj?.prjId);
              if (cachedPrj) {
                cachedPrj.homeImageFile = undefined;
              }
            } else if (this.uploadName.endsWith('_logo')) {
              this.gtsDataService.setPageFieldValue(this.prjId, this.formId, 'gtsFldqPrj_iconImage', status.fileUploadedName);
              // Clear cached image so it reloads
              const cachedPrj = this.prjArray.find(p => p.prjId === selPrj?.prjId);
              if (cachedPrj) {
                cachedPrj.logoImageFile = undefined;
              }
            }
          }
          this.gtsDataService.runAction(this.prjId, this.formId, 'prjRefreshDetail');
          this.gtsDataService.sendAppLoaderListener(false);
        }
      });

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
      .subscribe(async (event) => {
        //===== START CUSTOM CODE =====

        if (event.customCode === 'PRJ_DETAIL_SHOW') {
          const selPrj = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daSetup', 'qPrj');
          let prjData: any = {};
          if (this.prjArray.length > 0) {
            prjData = this.prjArray.filter((prj) => prj.prjId === selPrj.prjId)[0];
          }

          if (prjData === undefined || prjData === null) {
            prjData = {
              prjId: selPrj.prjId,
              description: selPrj.description,
              homeImage: selPrj.homeImage,
              iconImage: selPrj.iconImage,
            };
            this.prjArray.push(prjData);
          }

          if (prjData.homeImageFile === undefined || prjData === null) {
            if (selPrj.homeImage !== undefined) {
              const imageResult = await this.getProjectImage(selPrj.prjId, 'home', selPrj.homeImage);
              if (imageResult !== null && imageResult !== undefined && imageResult.valid) {
                prjData.homeImageFile = 'data:image;base64,' + imageResult.fileData;
              }
            }
            if (selPrj.iconImage !== undefined) {
              const imageResult = await this.getProjectImage(selPrj.prjId, 'logo', selPrj.iconImage);
              if (imageResult !== null && imageResult !== undefined && imageResult.valid) {
                prjData.logoImageFile = 'data:image;base64,' + imageResult.fileData;
              }
            }
          }

          this.prjImage = prjData.homeImageFile;
          this.prjLogo = prjData.logoImageFile;
          this.prjShowImages = true;
        }

        if (event.customCode === 'PRJ_DETAIL_EXIT') {
          this.gtsDataService.sendAppLoaderListener(false);
          this.prjShowImages = false;
        }

        if (event.customCode === 'UPLOAD_IMAGE') {
          const selPrj = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daSetup', 'qPrj');
          this.uploadName = selPrj.prjId + '_home';
          this.fileUploaderVisible = true;

          this.gtsDataService.sendFileLoaderListener({
            fileUploadVisible: this.fileUploaderVisible
          });
          this.gtsDataService.sendAppLoaderListener(false);
        }

        if (event.customCode === 'UPLOAD_LOGO') {
          const selPrj = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daSetup', 'qPrj');
          this.uploadName = selPrj.prjId + '_logo';
          this.fileUploaderVisible = true;

          this.gtsDataService.sendFileLoaderListener({
            fileUploadVisible: this.fileUploaderVisible
          });
          this.gtsDataService.sendAppLoaderListener(false);
        }

        if (event.customCode === 'PRJCONN_POST') {
          const selPrj = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daSetup', 'qPrj');
          const connRows = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daPrjConn', 'qPrjConn');
          selPrj.dbConnections = connRows;
          this.gtsDataService.setPageFieldValue(this.prjId, this.formId, 'gtsFldqPrj_dbConnections', connRows);
        }

        if (event.customCode === 'GET_PSSW') {
          const params = {
            "psswType": "mail",
            "psswKey": {
              "mailServiceName": this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daSetup', 'qMailServ').mailServiceName
            }
          };

          this.showPassw = false;
          const result = await this.gtsDataService.execMethod('setup', 'getPassword', params);
          this.gtsDataService.setPageFieldValue(this.prjId, this.formId, 'password', result.password);
        }

        if (event.customCode === 'SET_PSSW') {
          const password = this.gtsDataService.getFormFieldValue(this.prjId, this.formId, 'mailPsswDataForm', 'password');
          const params = {
            "psswType": "mail",
            "psswKey": {
              "mailServiceName": this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daSetup', 'qMailServ').mailServiceName
            },
            "password": password
          };
          const result = await this.gtsDataService.execMethod('setup', 'setPassword', params);
          this.metaData.customMsg = result.message;
        }

        if (event.customCode === 'PSSW_TOGGLE') {
          this.showPassw = !this.showPassw;
          const reply: any = {
            valid: true,
            message: 'PASSWORD',
            showPassw: this.showPassw
          };
          this.gtsDataService.sendFormReply(reply);
        }

        if (event.customCode === 'GET_DESKTOP_APP_DATA') {
          const params = {};
          const result = await this.gtsDataService.execMethod('data', 'getDesktopAppConfig', params);
          this.gtsDataService.setPageFieldValue(this.prjId, this.formId, 'gtsFldqUpload_serverURL', result.serverUrl);
          this.gtsDataService.setPageFieldValue(this.prjId, this.formId, 'gtsFldqUpload_desktopAppSecret', result.appSecret);
        }

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
    this.fileLoaderListenerSubs?.unsubscribe();
  }

  async getProjectImage(prjId: string, imageType: string, fileName: string) {
    const projectParams = {
      fileName: 'Projects/' + fileName
    };
    const result = await this.gtsDataService.execMethod('file', 'downloadfile', projectParams);
    return result;
  }
}
