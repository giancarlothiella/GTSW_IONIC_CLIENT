import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { TranslationService } from '../../../core/services/translation.service';
import { Subscription } from 'rxjs';

// Import GTS Components
import { GtsToolbarComponent } from '../../../core/gts-open-source/gts-toolbar/gts-toolbar.component';
import { GtsTabsComponent } from '../../../core/gts-open-source/gts-tabs/gts-tabs.component';
import { GtsGridComponent } from '../../../core/gts-open-source/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts-open-source/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts-open-source/gts-form-popup/gts-form-popup.component';
import { GtsMessageComponent } from '../../../core/gts-open-source/gts-message/gts-message.component';
import { GtsLoaderComponent } from '../../../core/gts-open-source/gts-loader/gts-loader.component';
import { GtsDashboardComponent } from '../../../core/gts-open-source/gts-dashboard/gts-dashboard.component';
import { GtsHtmlViewComponent } from '../../../core/gts-open-source/gts-html-view/gts-html-view.component';
import { GtsFileUploaderComponent } from '../../../core/gts-open-source/gts-file-uploader/gts-file-uploader.component';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-salesDashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    // GTS Components
    GtsToolbarComponent,
    GtsTabsComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsMessageComponent,
    GtsLoaderComponent,
    GtsDashboardComponent,
    GtsHtmlViewComponent,
    GtsFileUploaderComponent,

    // PrimeNG
    ButtonModule,
    Dialog,
    Toast
  ],
  providers: [MessageService],
  templateUrl: './salesDashboard.page.html',
  styleUrls: ['./salesDashboard.page.scss']
})
export class DCW_SalesDashboardComponent implements OnInit, OnDestroy {
  //========= PAGE PARAMS =================
  prjId: string = 'DCW';
  formId: number = 51;

  public gtsDataService = inject(GtsDataService);
  private cdr = inject(ChangeDetectorRef);
  private ts = inject(TranslationService);
  private messageService = inject(MessageService);

  t(txtId: number, fallback: string = ''): string {
    return this.ts.getText(txtId, fallback);
  }

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

      //===== END FORM REQUEST CUSTOM CODE =====
      this.gtsDataService.sendFormReply(reply);
    });

    // Custom Code Listener
    this.pageCustomListenerSubs = this.gtsDataService
    .getPageCustomListener()
    .subscribe(async (event) => {
      //===== START CUSTOM CODE =====

      //===== END CUSTOM CODE =====

      // Run next action if specified
      if (event.actionName) {
        this.gtsDataService.runAction(this.prjId, this.formId, event.actionName);
      }
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

  //========= CONFIRM DIALOG =================
  showConfirmDialog: boolean = false;
  confirmDialogHeader: string = '';
  confirmDialogMessage: string = '';
  confirmDialogAcceptLabel: string = '';
  confirmDialogRejectLabel: string = '';
  private confirmDialogCallback: (() => void) | null = null;

  showConfirm(message: string, header: string, onAccept: () => void): void {
    this.confirmDialogMessage = message;
    this.confirmDialogHeader = header;
    this.confirmDialogAcceptLabel = this.t(1611, 'Elimina');
    this.confirmDialogRejectLabel = this.t(1612, 'Annulla');
    this.confirmDialogCallback = onAccept;
    this.showConfirmDialog = true;
    this.cdr.detectChanges();
  }

  onConfirmAccept(): void {
    this.showConfirmDialog = false;
    if (this.confirmDialogCallback) {
      this.confirmDialogCallback();
      this.confirmDialogCallback = null;
    }
  }

  onConfirmReject(): void {
    this.showConfirmDialog = false;
    this.confirmDialogCallback = null;
  }

  //========= TOAST MESSAGES =================

  showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: this.t(1554, 'Errore'),
      detail: message,
      life: 5000
    });
  }

  showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: this.t(1555, 'Successo'),
      detail: message,
      life: 3000
    });
  }

  showWarning(message: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: this.t(1556, 'Attenzione'),
      detail: message,
      life: 4000
    });
  }

  //========= GTS DASHBOARD =================

  onDashboardDataRequest(event: { dataset: any; callback: (data: any[]) => void }): void {
    const { dataset, callback } = event;

    const adapterCode = dataset.adapterCode;
    const dataSetCode = dataset.dataSetCode;

    if (!adapterCode || !dataSetCode) {
      callback([]);
      return;
    }

    const dataSetRows = this.gtsDataService.getDataSet(this.prjId, this.formId, adapterCode, dataSetCode);
    callback(dataSetRows && dataSetRows.length > 0 ? dataSetRows : []);
  }
}
