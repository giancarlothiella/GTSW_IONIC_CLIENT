import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { Subscription } from 'rxjs';

// DevExtreme
import { DxAccordionModule, DxPopupModule, DxChartModule } from 'devextreme-angular';

// Import GTS Components
import { GtsLoaderComponent } from '../../../core/gts/gts-loader/gts-loader.component';
import { GtsToolbarComponent } from '../../../core/gts/gts-toolbar/gts-toolbar.component';
import { GtsTabsComponent } from '../../../core/gts/gts-tabs/gts-tabs.component';
import { GtsGridComponent } from '../../../core/gts/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts/gts-form-popup/gts-form-popup.component';
import { GtsReportsComponent } from '../../../core/gts/gts-reports/gts-reports.component';
import { GtsMessageComponent } from '../../../core/gts/gts-message/gts-message.component';
import { GtsPdfComponent } from '../../../core/gts/gts-pdf/gts-pdf.component';

@Component({
  selector: 'app-web-app',
  standalone: true,
  imports: [
    CommonModule,

    // DevExtreme
    DxAccordionModule,
    DxPopupModule,
    DxChartModule,

    // GTS Components
    GtsLoaderComponent,
    GtsToolbarComponent,
    GtsTabsComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsReportsComponent,
    GtsMessageComponent,
    GtsPdfComponent
  ],
  templateUrl: './web-app.page.html',
  styleUrls: ['./web-app.page.scss']
})
export class GTR_WebAppComponent implements OnInit, OnDestroy {
  //========= PAGE PARAMS =================
  prjId: string = 'GTR';
  formId: number = 92;

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

      if (actualView === 'mainView') {
        if (this.pages.length === 0) {
          this.pages = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daUtenze', 'qUtenze');
          this.showAccordion = this.pages.length > 0;
          if (this.showAccordion) {
            this.pages.forEach((page: any) => {
              page.dataVisible = false;
            });
            this.pages[0].dataVisible = true;
          }
        }
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

      if (customCode === 'SHOW_CHART') {
        this.chartVisible = true;
        this.chartDS = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daConsumiStag', 'qConsumi');
        const tipoForn = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqUtenze_UTENZA_COD_TIPO_FORNITURA');

        // check if tipoForn contains 'ACS'
        if (tipoForn && tipoForn.includes('ACS')) {
          this.showACS = true;
        } else {
          this.showACS = false;
        }

        this.chartDS.forEach((item: any) => {
          item.RIS_KWH = Number(item.RIS_KWH);
          item.ACS_KWH = Number(item.ACS_KWH);
          item.TOT_KWH = Number(item.TOT_KWH);
        });
        // map only STAG_CODE, MESE_CONSUMO and TOT_KWH
        this.chartDS = this.chartDS.map((item: any) => {
          return {
            STAG_CODE: item.STAG_CODE,
            MESE_CONSUMO: item.MESE_CONSUMO,
            RIS_KWH: item.RIS_KWH,
            ACS_KWH: item.ACS_KWH,
            TOT_KWH: item.TOT_KWH
          };
        });

        this.chartTitle = 'Stagione: '+ this.chartDS[0].STAG_CODE;
        this.gtsDataService.sendAppLoaderListener(false);
      }
      if (customCode === 'PDF_GO_BACK') {
        this.showPdf = false;
        this.pdfFileData = '';
      }

      if (customCode === 'GET_FATTURA_PDF') {
        const fileName = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqFatture_INV_FILE_NAME');
        const result = await this.gtsDataService.execMethod('file', 'downloadfile', { fileName: 'Repository/GTR/FATTURE/'+fileName });
        console.log('fileName: ', result);
        if (result.valid) {
          this.pdfFileData = result.fileData;
          this.showPdf = true;
        }
        this.gtsDataService.sendAppLoaderListener(false);
      }

      if (customCode === 'GET_TARIFFA_PDF') {
        const fileName = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqFatture_TARIF_FILE_NAME');
        const result = await this.gtsDataService.execMethod('file', 'downloadfile', { fileName: 'Repository/GTR/TARIFFE/'+fileName });
        console.log('fileName: ', result);
        if (result.valid) {
          this.pdfFileData = result.fileData;
          this.showPdf = true;
        }
        this.gtsDataService.sendAppLoaderListener(false);
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


    // Run Page
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
  pageReady: boolean = false;

  //========= PAGE FUNCTIONS =================
  chartVisible: boolean = false;
  chartTitle: string = '';
  chartDS: any[] = [];
  socRagioneSociale: string = '';
  showACS: boolean = false;

  showAccordion: boolean = false;
  selectedItemIndex: number = 0;
  selectedRow: any = {};
  pages: any[] = [];

  showPdf: boolean = false;
  pdfFileData: string = '';

  async onSelectionChanged(event: any) {
    this.pageReady = false;
    this.selectedRow = event.addedItems[0];

    this.gtsDataService.setSelectedRows(this.prjId, this.formId, 'daUtenze', 'qUtenze', [this.selectedRow], [{UTENZA_CODE: this.selectedRow.UTENZA_CODE}]);
    await this.gtsDataService.runAction(this.prjId, this.formId, 'utenzeDS');
    this.pages.forEach((page: any) => {
      page.dataVisible = false;
    });
    this.pages.filter((page: any) => page.UTENZA_CODE === this.selectedRow.UTENZA_CODE)[0].dataVisible = true;
    const socLogo = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daUtenze', 'qSocLogo')[0].SOC_LOGO;
    this.socRagioneSociale = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daUtenze', 'qSocLogo')[0].SOC_RAGSOC;
    // Convert Oracle BLOB object socLogo to base64 string
    // Assuming socLogo is an object with a property 'data' that contains the array buffer
    const arrayBuffer = socLogo.data; // Adjust this based on the actual structure of socLogo
    const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    this.socImage = 'data:image;base64,' + base64String;
    this.pageReady = true;
  }

  utenzeComponent: any = {};
  onAccordionInitialized(event: any) {
    this.utenzeComponent = event.component;
  }

  socImage: string = '';

  goBack() {
    this.location.back();
  }
}
