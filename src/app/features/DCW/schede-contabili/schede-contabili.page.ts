import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { Subscription } from 'rxjs';

// Import GTS Components
import { GtsLoaderComponent } from '../../../core/gts-open-source/gts-loader/gts-loader.component';
// import { GtsToolbarComponent } from '../../../core/gts-open-source/gts-toolbar/gts-toolbar.component'; // DevExtreme version
import { GtsToolbarComponent } from '../../../core/gts-open-source/gts-toolbar/gts-toolbar.component'; // Ionic version ✨
// import { GtsTabsComponent } from '../../../core/gts-open-source/gts-tabs/gts-tabs.component'; // DevExtreme version
import { GtsTabsComponent } from '../../../core/gts-open-source/gts-tabs/gts-tabs.component'; // Ionic version ✨
// import { GtsGridComponent } from '../../../core/gts-open-source/gts-grid/gts-grid.component'; // DevExtreme version
import { GtsGridComponent } from '../../../core/gts-open-source/gts-grid/gts-grid.component'; // AG Grid version ✨
// import { GtsFormComponent } from '../../../core/gts-open-source/gts-form/gts-form.component'; // DevExtreme version
import { GtsFormComponent } from '../../../core/gts-open-source/gts-form/gts-form.component'; // PrimeNG version ✨
// import { GtsFormPopupComponent } from '../../../core/gts-open-source/gts-form-popup/gts-form-popup.component'; // DevExtreme version
import { GtsFormPopupComponent } from '../../../core/gts-open-source/gts-form-popup/gts-form-popup.component'; // PrimeNG version ✨
import { GtsReportsComponent } from '../../../core/gts-open-source/gts-reports/gts-reports.component';
// import { GtsMessageComponent } from '../../../core/gts-open-source/gts-message/gts-message.component'; // DevExtreme version
import { GtsMessageComponent } from '../../../core/gts-open-source/gts-message/gts-message.component'; // Ionic version ✨

@Component({
  selector: 'app-schede-contabili',
  standalone: true,
  imports: [
    CommonModule,

    // GTS Components
    GtsLoaderComponent,
    GtsToolbarComponent,
    GtsTabsComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsReportsComponent,
    GtsMessageComponent
  ],
  templateUrl: './schede-contabili.page.html',
  styleUrls: ['./schede-contabili.page.scss']
})
export class DCW_SchedeContabiliComponent implements OnInit, OnDestroy {
  //========= PAGE PARAMS =================
  prjId: string = 'DCW';
  formId: number = 11;

  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);
  private location = inject(Location);

  constructor() {
    addIcons({ arrowBackOutline });
  }

  appViewListenerSubs: Subscription | undefined;
  formReqListenerSubs: Subscription | undefined;
  pageCustomListenerSubs: Subscription | undefined;
  appLoaderListenerSubs: Subscription | undefined;

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

      //===== START FORM REQUEST CUSTOM CODE  =====

      //===== END FORM REQUEST CODE           =====
      this.gtsDataService.sendFormReply(reply);
    });

    // Custom Code Listener
    this.pageCustomListenerSubs = this.gtsDataService
    .getPageCustomListener()
    .subscribe(async (customCode) => {
      //===== START CUSTOM CODE =====

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

  //========= GLOBALS =================
  metaData: any = {};
  actualView: string = '';
  loading: boolean = true;
  pageData: any = {};
  viewStyle: string = '';
  customData: any[] = [];
  toolbarSelectedValue = '';

  nestedFormActive: boolean = false;
  nestedFormId: number = 0;
  nestedFormCargo: any = {};

  //========= PAGE FUNCTIONS =================
  goBack() {
    this.location.back();
  }
}
