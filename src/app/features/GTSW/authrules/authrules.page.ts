// src/app/features/GTSW/authrules/authrules.page.ts
import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
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
import { AuthDetailsComponent } from '../auth-details/auth-details.component';
import { webInfo } from '../../../../environments/environment';
import {
  DxPopupModule,
  DxListModule,
  DxTextBoxModule,
  DxButtonModule,
  DxHtmlEditorModule
} from 'devextreme-angular';

@Component({
  selector: 'app-authrules',
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
    AuthDetailsComponent,
    DxPopupModule,
    DxListModule,
    DxTextBoxModule,
    DxButtonModule,
    DxHtmlEditorModule
  ],
  template: `
    @if (!nestedFormActive) {
      <div class="authrules-container">
        <app-gts-toolbar
          [prjId]="prjId"
          [formId]="formId"
          [objectName]="'mainToolbar'"
          [customData]="customData"
          (newValueEvent)="gtsDataService.toolbarSelectEvent($event)">
        </app-gts-toolbar>

        <app-gts-loader *ngIf="loading"></app-gts-loader>

        <div [style]="viewStyle">
          @for (element of metaData.tabs; track element.objectName) {
            @if (element.visible) {
              <app-gts-tabs
                [style]="'grid-area: ' + element.gridArea"
                [prjId]="prjId"
                [formId]="formId"
                [objectName]="element.objectName">
              </app-gts-tabs>
            }
          }

          @for (element of metaData.reports; track element.fieldGrpId) {
            @if (element.visible) {
              <app-gts-reports
                [style]="'grid-area: ' + element.gridArea"
                [prjId]="prjId"
                [formId]="formId"
                [fieldGrpId]="element.fieldGrpId">
              </app-gts-reports>
            }
          }

          @for (element of metaData.toolbars; track element.objectName) {
            @if (element.visible && element.objectName != 'mainToolbar' && !element.toolbarFlagSubmit) {
              <app-gts-toolbar
                [style]="'grid-area: ' + element.gridArea"
                [prjId]="prjId"
                [formId]="formId"
                [objectName]="element.objectName"
                [customCssClass]="element.customCssClass"
                (newValueEvent)="gtsDataService.toolbarSelectEvent($event)">
              </app-gts-toolbar>
            }
          }

          @for (element of metaData.grids; track element.objectName) {
            @if (element.visible) {
              <app-gts-grid
                [style]="'grid-area: ' + element.gridArea"
                [prjId]="prjId"
                [formId]="formId"
                [objectName]="element.objectName">
              </app-gts-grid>
            }
          }

          @for (element of metaData.forms; track element.objectName) {
            @if (element.visible && !element.groupShowPopUp) {
              <app-gts-form
                [style]="'grid-area: ' + element.gridArea"
                [prjId]="prjId"
                [formId]="formId"
                [objectName]="element.objectName">
              </app-gts-form>
            }

            @if (element.visible && element.groupShowPopUp) {
              <app-gts-form-popup
                [prjId]="prjId"
                [formId]="formId"
                [objectName]="element.objectName">
              </app-gts-form-popup>
            }
          }
        </div>

        <app-gts-message
          [prjId]="prjId"
          [formId]="formId">
        </app-gts-message>
      </div>
    }

    @if (nestedFormActive && nestedFormId === 99) {
      <app-auth-details
        [nestedFormCargo]="nestedFormCargo">
      </app-auth-details>
    }

    <!-- Email edit List -->
    <dx-popup
      [(visible)]="showMailList"
      [title]="mailPopupTitle"
      [width]="400"
      [height]="400"
      [showTitle]="true"
      [hideOnOutsideClick]="false"
      [showCloseButton]="true">
      <dx-list
        id="emailList"
        [dataSource]="emailList"
        [selectByClick]="true"
        [allowItemDeleting]="true"
        [height]="280"
        (onItemDeleted)="deleteMail($event)">
        <div *dxTemplate="let item of 'item'">
          <div>{{item.email}}</div>
        </div>
      </dx-list>

      <dx-text-box
        [(value)]="newEmail"
        [placeholder]="'Enter new email'"
        (onEnterKey)="saveMail()">
      </dx-text-box>
    </dx-popup>

    <!-- Email Send List -->
    <dx-popup
      [(visible)]="showMailSendList"
      [title]="mailPopupTitle"
      [width]="600"
      [height]="400"
      [showTitle]="true"
      [hideOnOutsideClick]="false"
      [showCloseButton]="true">
      <dx-list
        id="emailList"
        [dataSource]="emailList"
        [selectByClick]="true"
        [allowItemDeleting]="true"
        [height]="280"
        [visible]="!showMailSentResult">
        <div *dxTemplate="let item of 'item'">
          <div>{{item.email}}</div>
        </div>
      </dx-list>

      <dx-list
        id="emailResult"
        [dataSource]="sentMailResult"
        [selectByClick]="true"
        [allowItemDeleting]="true"
        [height]="280"
        [visible]="showMailSentResult">
        <div *dxTemplate="let item of 'item'">
          <div><b>{{item.message}}</b></div>
        </div>
      </dx-list>

      <dx-button
        text="Send"
        icon="send"
        (onClick)="sendMail($event)">
      </dx-button>
    </dx-popup>

    <!-- HTML Preview -->
    <dx-popup
      [hideOnOutsideClick]="true"
      [showCloseButton]="false"
      [(visible)]="showHtml"
      title="Preview MailMerge result"
      [height]="800"
      [width]="800">
      <dx-html-editor
        [readOnly]="true"
        [height]="724"
        [width]="768"
        [value]="testValueContent">
      </dx-html-editor>
    </dx-popup>
  `,
  styles: [`
    .authrules-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class GTSW_AuthrulesComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);
  private cd = inject(ChangeDetectorRef);

  // Page params
  prjId = 'GTSW';
  formId = 4;

  // Subscriptions
  private appViewListenerSubs?: Subscription;
  private formReqListenerSubs?: Subscription;
  private pageCustomListenerSubs?: Subscription;
  private appLoaderListenerSubs?: Subscription;
  private messageListenerSubs?: Subscription;

  // State
  metaData: any = {};
  actualView = '';
  viewStyle = '';
  loading = true;
  pageData: any = {};
  action: any = {};
  customData: any[] = [];
  toolbarSelectedValue = '';

  nestedFormActive = false;
  nestedFormId = 0;
  nestedFormCargo: any = {};

  // Email management
  showMailList = false;
  mailPopupTitle = 'Linked Emails';
  newEmail = '';
  showMailSendList = false;
  emailList: any[] = [];
  authKey = '';
  showHtml = false;
  testValueContent = 'Test Value Content';
  sentMailResult: any[] = [];
  showMailSentResult = false;

  ngOnInit(): void {
    // ======= All pages should check token =======
    if (this.authService.autoAuthUser()) {
      this.authService.checkToken();
    }

    // Loader Listener
    this.appLoaderListenerSubs = this.gtsDataService
      .getAppLoaderListener()
      .subscribe((loading: boolean) => {
        this.loading = loading;
      });

    // View Listener
    this.appViewListenerSubs = this.gtsDataService
      .getAppViewListener()
      .subscribe((actualView: string) => {
        this.actualView = actualView;
        this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
        this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'all', 'all');

        if (this.metaData.views?.filter((view: any) => view.viewName === actualView).length > 0) {
          this.viewStyle = this.metaData.views.filter((view: any) => view.viewName === actualView)[0].viewStyle;
        }
      });

    // Form Req Listener
    this.formReqListenerSubs = this.gtsDataService
      .getFormReqListener()
      .subscribe((formRequestField: any) => {
        let reply: any = {
          valid: true,
          message: ''
        };

        // Handle EXIT request
        if (formRequestField.typeRequest === 'EXIT') {
          if (formRequestField.formId === this.nestedFormId && this.nestedFormActive) {
            this.closeNestedForm();
          }
        }

        if (formRequestField.typeRequest !== 'EXIT') {
          this.gtsDataService.sendFormReply(reply);
        }
      });

    // Custom Code Listener
    this.pageCustomListenerSubs = this.gtsDataService
      .getPageCustomListener()
      .subscribe(async (customCode: string) => {
        // Riattiva il loader per il custom code
        this.gtsDataService.sendAppLoaderListener(true);

        await this.handleCustomCode(customCode);

        // Disattiva il loader dopo che i dati sono stati elaborati
        setTimeout(() => {
          this.gtsDataService.sendAppLoaderListener(false);
        }, 500);
      });

    // Run Page
    this.gtsDataService.runPage(this.prjId, this.formId);
  }

  ngOnDestroy(): void {
    this.appViewListenerSubs?.unsubscribe();
    this.pageCustomListenerSubs?.unsubscribe();
    this.appLoaderListenerSubs?.unsubscribe();
    this.formReqListenerSubs?.unsubscribe();
    this.messageListenerSubs?.unsubscribe();
  }

  private async handleCustomCode(customCode: string): Promise<void> {
    switch (customCode) {
      case 'PROFILE_DET':
        this.openProfileDetails();
        break;

      case 'RENEW_KEY':
        this.handleRenewKey();
        break;

      case 'KEY_ADD':
        await this.handleKeyAdd();
        break;

      case 'KEY_DET':
        this.openKeyDetails();
        break;

      case 'KEY_GET_MAILS':
        this.handleGetMails();
        break;

      case 'KEY_SEND_MAILS':
        await this.handleSendMails();
        break;

      case 'KEY_PREVIEW_MAIL':
        await this.handlePreviewMail();
        break;
    }
  }

  private openProfileDetails(): void {
    const cargo: any = {
      dataSource: 'Profile',
      authProfileCode: this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daAuth', 'qProfiles').authProfileCode
    };

    this.nestedFormCargo = cargo;
    this.nestedFormId = 99;
    this.nestedFormActive = true;
  }

  closeNestedForm(): void {
    this.nestedFormActive = false;
    this.nestedFormId = 0;
    this.cd.detectChanges();
  }

  private handleRenewKey(): void {
    const key = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daAuth', 'qAuthKey').authKey;
    this.gtsDataService.execMethod('setup', 'renewAuthKey', { authKey: key });
  }

  private async handleKeyAdd(): Promise<void> {
    this.gtsDataService.saveFormDataValues(this.prjId, this.formId, 4);
    const profileCode = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqAuthKey_authProfileCode');
    const authKeyType = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqAuthKey_authKeyType');
    const languageId = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqAuthKey_languageId');
    const data = {
      authProfileCode: profileCode,
      languageId: languageId,
      authKeyType: authKeyType
    };
    await this.gtsDataService.execMethod('setup', 'createAuthKey', data);
  }

  private openKeyDetails(): void {
    const cargo: any = {
      dataSource: 'Key',
      authKey: this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daAuth', 'qAuthKey').authKey
    };

    this.nestedFormCargo = cargo;
    this.nestedFormId = 99;
    this.nestedFormActive = true;
  }

  private handleGetMails(): void {
    this.showMailList = true;
    const dbMailList = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daMails', 'qMails');
    this.newEmail = '';
    // Get copy array of mail list
    this.emailList = [...dbMailList];
    this.gtsDataService.sendAppLoaderListener(false);
  }

  private async handleSendMails(): Promise<void> {
    await this.prepareKeyData();
    this.showMailSendList = true;
    this.showMailSentResult = false;
    this.emailList = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daMails', 'qMails');
  }

  private async handlePreviewMail(): Promise<void> {
    await this.prepareKeyData();
    this.showHtml = true;
  }

  async saveMail(): Promise<void> {
    // Prepare email data and save to db if not exists
    const data = {
      email: this.newEmail
    };
    const emailExists = this.emailList.filter((email: any) => email.email === this.newEmail).length > 0;
    if (!emailExists) {
      this.emailList.push(data);
    }

    this.authKey = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daAuth', 'qAuthKey').authKey;
    this.gtsDataService.setFormFieldValue(this.prjId, this.formId, 'mailDataForm', 'gtsFldqAuthKey_authKey', this.authKey);
    this.gtsDataService.setFormFieldValue(this.prjId, this.formId, 'mailDataForm', 'gtsFldqAuthKey_emails', this.emailList);
    this.gtsDataService.saveFormData(this.prjId, this.formId, 5, true, 'qAuthKey');

    await this.gtsDataService.runAction(this.prjId, this.formId, 'keySave');
    this.gtsDataService.sendAppLoaderListener(false);
  }

  async deleteMail(event: any): Promise<void> {
    this.authKey = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daAuth', 'qAuthKey').authKey;
    this.gtsDataService.setFormFieldValue(this.prjId, this.formId, 'mailDataForm', 'gtsFldqAuthKey_authKey', this.authKey);
    this.gtsDataService.setFormFieldValue(this.prjId, this.formId, 'mailDataForm', 'gtsFldqAuthKey_emails', this.emailList);
    this.gtsDataService.saveFormData(this.prjId, this.formId, 5, true, 'qAuthKey');

    await this.gtsDataService.runAction(this.prjId, this.formId, 'keySave');
    this.gtsDataService.sendAppLoaderListener(false);
  }

  async sendMail(event: any): Promise<void> {
    this.sentMailResult = [];
    const mailToArray = this.emailList.map((email: any) => email.email);
    const sendResult: any[] = [];
    this.showMailSentResult = true;
    mailToArray.forEach(async (email: any) => {
      const data = {
        mailCode: 'SignUp',
        mailTo: email,
        textHtml: this.testValueContent,
      };
      const result = await this.gtsDataService.execMethod('mail', 'sendAuthMail', data);
      this.sentMailResult.push({
        message: result.message
      });
    });
  }

  async prepareKeyData(): Promise<void> {
    const htmlParams: any = {
      authKey: this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daAuth', 'qAuthKey').authKey,
      appTitle: webInfo.appTitle,
      signUpURL: window.location.origin + '/register',
    };

    const htmlArray: any[] = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daAuth', 'qAuthKey').projects;
    const projects: any[] = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daAuth', 'qProjects');
    const htmlArrayProfile: any[] = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daAuth', 'qProfiles')
      .filter((profile: any) => profile.authProfileCode === this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daAuth', 'qAuthKey')
        .authProfileCode)[0].projects;

    // add profile data to htmlArray
    htmlArrayProfile.forEach((profile: any) => {
      projects.forEach((project: any) => {
        if (profile.prjId === project.prjId) {
          profile.description = project.description;
        }
      });

      // add profile data to htmlArray only if not already in htmlArray
      const profileExists = htmlArray.filter((data: any) => data.prjId === profile.prjId).length > 0;
      if (!profileExists) {
        htmlArray.push(profile);
      }
    });

    const mailMergeData = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daMailMerge', 'qMailMerge');
    const languageId = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daAuth', 'qAuthKey').languageId;
    const htmlRow = mailMergeData.filter((data: any) => data.languageId === languageId)[0];
    const mailMergeFields = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daMailMerge', 'qMailFields');

    // Prepare htmlArray data with only properties in mailMergeFields and remove all other properties
    const arrayData: any[] = [];
    htmlArray.forEach((row: any) => {
      const newRow: any = {};
      mailMergeFields.forEach((field: any) => {
        if (row[field.fieldName] !== undefined)
          newRow[field.fieldName] = row[field.fieldName];
      });

      arrayData.push(newRow);
    });

    const previewResult = {
      htmlString: htmlRow.text,
      htmlParams: htmlParams,
      htmlArray: arrayData,
      titleColor: htmlRow.titleColor,
      rowHeight: htmlRow.rowHeight,
    };

    const resultData = await this.gtsDataService.execMethod('data', 'getMailMergeHtml', previewResult);
    this.testValueContent = resultData.htmlString;
    this.gtsDataService.sendAppLoaderListener(false);
  }
}
