import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { Subscription } from 'rxjs';

// Import GTS Components
import { GtsToolbarComponent } from '../../../core/gts-open-source/gts-toolbar/gts-toolbar.component';
import { GtsTabsComponent } from '../../../core/gts-open-source/gts-tabs/gts-tabs.component';
import { GtsGridComponent } from '../../../core/gts-open-source/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts-open-source/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts-open-source/gts-form-popup/gts-form-popup.component';
import { GtsGridPopupComponent } from '../../../core/gts-open-source/gts-grid-popup/gts-grid-popup.component';
import { GtsMessageComponent } from '../../../core/gts-open-source/gts-message/gts-message.component';
import { GtsLoaderComponent } from '../../../core/gts-open-source/gts-loader/gts-loader.component';

@Component({
  selector: 'app-organisations',
  standalone: true,
  imports: [
    CommonModule,

    // GTS Components
    GtsToolbarComponent,
    GtsTabsComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsGridPopupComponent,
    GtsMessageComponent,
    GtsLoaderComponent
  ],
  templateUrl: './organisations.page.html',
  styleUrls: ['./organisations.page.scss']
})
export class WFS_OrganisationsComponent implements OnInit, OnDestroy {
  //========= PAGE PARAMS =================
  prjId: string = 'WFS';
  formId: number = 57;

  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);

  constructor() {
    addIcons({ arrowBackOutline });
  }

  appViewListenerSubs: Subscription | undefined;
  formReqListenerSubs: Subscription | undefined;
  pageCustomListenerSubs: Subscription | undefined;
  appLoaderListenerSubs: Subscription | undefined;
  toolbarListenerSubs: Subscription | undefined;

  ngOnInit(): void {
    // Loader Listener
    this.appLoaderListenerSubs = this.gtsDataService
    .getAppLoaderListener()
    .subscribe((loading) => {
      this.loading = loading;
    })

    // View Listener
    this.appViewListenerSubs = this.gtsDataService
    .getAppViewListener()
    .subscribe((actualView) => {
      if (actualView !== undefined && actualView !== '') {
        this.actualView = actualView;
        this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
        this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'all', 'all');
        if (this.metaData.views.filter((view: any) => view.viewName === actualView)[0] !== undefined)
          this.viewStyle = this.metaData.views.filter((view: any) => view.viewName === actualView)[0].viewStyle;
      }
    });

    // Form Req Listener
    this.formReqListenerSubs = this.gtsDataService
    .getFormReqListener()
    .subscribe((formRequest) => {
      let reply: any = {
        valid: true
      };

      //===== START FORM REQUEST CUSTOM CODE =====
      if (formRequest.typeRequest === 'form') {
        // Dispatch by formName (objectName from metadata)
        // if (formRequest.formName === 'myFormName') {
        //   this.calcMyForm(formRequest);
        // }
      }
      //===== END FORM REQUEST CUSTOM CODE =====
      this.gtsDataService.sendFormReply(reply);
    });

    // Custom Code Listener
    this.pageCustomListenerSubs = this.gtsDataService
    .getPageCustomListener()
    .subscribe(async (event) => {
      //===== START CUSTOM CODE =====

      // Riattiva il loader per il custom code
      this.gtsDataService.sendAppLoaderListener(true);

      await this.getCustomData(this.prjId, this.formId, event.customCode, this.actualView);

      // Disattiva il loader dopo il custom code
      setTimeout(() => {
        this.gtsDataService.sendAppLoaderListener(false);
      }, 300);

      // Run next action if specified
      if (event.actionName) {
        this.gtsDataService.runAction(this.prjId, this.formId, event.actionName);
      }

      //===== END CUSTOM CODE =====
    });

    // Toolbar Events Listener
    this.toolbarListenerSubs = this.gtsDataService
    .getToolbarEventListener()
    .subscribe((data) => {
      //===== START CUSTOM TOOLBAR EVENT CODE =====

      //===== END CUSTOM TOOLBAR EVENT CODE =====
    });

    // Run Page with hardcoded formId
    this.gtsDataService.runPage(this.prjId, this.formId);
  }

  ngOnDestroy(): void {
    this.appViewListenerSubs?.unsubscribe();
    this.pageCustomListenerSubs?.unsubscribe();
    this.appLoaderListenerSubs?.unsubscribe();
    this.formReqListenerSubs?.unsubscribe();
    this.toolbarListenerSubs?.unsubscribe();
  }

  //========= GLOBALS =================
  metaData: any = {};
  actualView: string = '';
  loading: boolean = true;
  pageData: any = {};
  viewStyle: string = '';
  customData: any[] = [];
  toolbarSelectedValue = '';

  //========= PAGE FUNCTIONS =================
  async getCustomData(prjId: string, formId: number, customCode: string, actualView: string) {
    //===== START CUSTOM CODE =====

    if (customCode === 'RUN_FPT_ORG_REQ') {
      await this.runFtpOrgRequest(prjId, formId);
    }

    if (customCode === 'CHECK_EDI_REP') {
      const repContent = this.gtsDataService.getPageFieldValue(prjId, formId, 'gtsFldGetFTP_FILE_REP') || '';
      if (!repContent) {
        // No response - keep the error message already set by runFtpOrgRequest
        this.gtsDataService.setPageRule(prjId, formId, 13, 1);
      } else if (repContent.includes('NDTS')) {
        this.gtsDataService.setPageRule(prjId, formId, 13, 1);
        this.gtsDataService.setCustomMsg(prjId, formId, 'No data to send');
      } else {
        this.gtsDataService.setPageRule(prjId, formId, 13, 2);
      }
    }

    //===== END CUSTOM CODE =====
  }

  /** EDI FTP Organisation Request - sends req file and receives rep file */
  private async runFtpOrgRequest(prjId: string, formId: number) {
    const getField = (name: string) => this.gtsDataService.getPageFieldValue(prjId, formId, name);
    const sessId = getField('gtsFldGetFTP_FPT_SESS');
    const params = {
      country: getField('gtsFldqOffices_COUNTRY_CODE'),
      reqFileName: 'SEND_' + sessId + '.req',
      reqContent: getField('gtsFldGetFTP_FILE_REQ'),
      repFileName: 'SEND_' + sessId + '.rep'
    };

    const result = await this.gtsDataService.execMethod('edi', 'sendRequest', params, true);

    if (!result.valid) {
      this.gtsDataService.setCustomMsg(prjId, formId, result.message);
      this.gtsDataService.setPageRule(prjId, formId, 13, 1);
      return;
    }

    // Build customMsg with message and log
    const logText = result.log ? result.log.join('\n') : '';
    this.gtsDataService.setCustomMsg(prjId, formId, result.message + (logText ? '\n\n' + logText : ''));

    if (result.repContent) {
      this.gtsDataService.setPageFieldValue(prjId, formId, 'gtsFldGetFTP_FILE_REP', result.repContent);
    }
  }

  //========= FORM CALCULATIONS =================

  /** Helper: get numeric value - tries formData first, falls back to pageData */
  private getFieldVal(fd: any[], name: string): number {
    const f = fd.find((f: any) => f.objectName === name);
    if (f?.value !== undefined && f?.value !== null) return parseFloat(f.value) || 0;
    // Fallback to pageData (field in a different form)
    const val = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, name);
    return parseFloat(val) || 0;
  }

  /** Helper: set field value in formData (if present) and always sync pageData */
  private setFieldVal(fd: any[], name: string, value: number) {
    const f = fd.find((f: any) => f.objectName === name);
    if (f) f.value = value;
    this.gtsDataService.setPageFieldValue(this.prjId, this.formId, name, value);
  }

}
