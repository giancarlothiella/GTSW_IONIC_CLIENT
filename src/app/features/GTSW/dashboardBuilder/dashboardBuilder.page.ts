import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { Subscription } from 'rxjs';

// Import GTS Components - Open Source Versions
import { GtsToolbarComponent } from '../../../core/gts-open-source/gts-toolbar/gts-toolbar.component';
import { GtsTabsComponent } from '../../../core/gts-open-source/gts-tabs/gts-tabs.component';
import { GtsGridComponent } from '../../../core/gts-open-source/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts-open-source/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts-open-source/gts-form-popup/gts-form-popup.component';
import { GtsMessageComponent } from '../../../core/gts-open-source/gts-message/gts-message.component';
import { GtsLoaderComponent } from '../../../core/gts-open-source/gts-loader/gts-loader.component';
import { GtsDashboardBuilderComponent } from '../../../core/gts-open-source/gts-dashboard/gts-dashboard-builder.component';

@Component({
  selector: 'app-dashboardBuilder',
  standalone: true,
  imports: [
    CommonModule,

    // GTS Components
    GtsToolbarComponent,
    GtsTabsComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsMessageComponent,
    GtsLoaderComponent,
    GtsDashboardBuilderComponent
  ],
  templateUrl: './dashboardBuilder.page.html',
  styleUrls: ['./dashboardBuilder.page.scss']
})
export class GTSW_DashboardBuilderComponent implements OnInit, OnDestroy {
  //========= PAGE PARAMS =================
  prjId: string = 'GTSW';
  formId: number = 13;

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

      //===== END FORM REQUEST CUSTOM CODE =====
      this.gtsDataService.sendFormReply(reply);
    });

    // Custom Code Listener
    this.pageCustomListenerSubs = this.gtsDataService
    .getPageCustomListener()
    .subscribe(async (customCode) => {
      //===== START CUSTOM CODE =====

      // Riattiva il loader per il custom code
      this.gtsDataService.sendAppLoaderListener(true);

      await this.getCustomData(this.prjId, this.formId, customCode, this.actualView);

      // Disattiva il loader dopo il custom code
      setTimeout(() => {
        this.gtsDataService.sendAppLoaderListener(false);
      }, 300);

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

  // Dashboard Builder state
  showBuilder: boolean = false;
  selectedDashboardPrjId: string = '';
  selectedDashboardConnCode: string = '';
  selectedDashboardCode: string = '';

  //========= PAGE FUNCTIONS =================
  async getCustomData(prjId: string, formId: number, customCode: string, actualView: string) {
    //===== START CUSTOM CODE =====

    if (customCode === 'GET_DASHBOARD') {
      // Stop loader immediately - builder has its own loader
      this.gtsDataService.sendAppLoaderListener(false);

      // Get individual field values from pageFields (from grid selection)
      this.selectedDashboardPrjId = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqDashboards_prjId') || '';
      this.selectedDashboardConnCode = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqDashboards_connCode') || '';
      this.selectedDashboardCode = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqDashboards_dashboardCode') || '';

      if (this.selectedDashboardCode) {
        this.showBuilder = true;
      }
    }

    if (customCode === 'HIDE_DASHBOARD') {
      this.showBuilder = false;
      this.selectedDashboardPrjId = '';
      this.selectedDashboardConnCode = '';
      this.selectedDashboardCode = '';
    }

    //===== END CUSTOM CODE =====
  }

  // Called when builder is closed
  onBuilderBack(): void {
    this.showBuilder = false;
    this.selectedDashboardPrjId = '';
    this.selectedDashboardConnCode = '';
    this.selectedDashboardCode = '';
  }

  // Called when builder saves successfully
  onBuilderSave(dashboard: any): void {
    // Optionally refresh the grid
    this.gtsDataService.runAction(this.prjId, this.formId, 'dashboardDS');
  }

}
