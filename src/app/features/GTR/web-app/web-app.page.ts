import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { Subscription } from 'rxjs';

// Ionic
import {
  IonAccordion,
  IonAccordionGroup,
  IonItem,
  IonLabel,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon
} from '@ionic/angular/standalone';
import { closeOutline } from 'ionicons/icons';

// PrimeNG (solo per Chart)
import { ChartModule } from 'primeng/chart';

// Import GTS Components - Open Source Versions
// import { GtsLoaderComponent } from '../../../core/gts-open-source/gts-loader/gts-loader.component'; // DevExtreme version
import { GtsLoaderComponent } from '../../../core/gts-open-source/gts-loader/gts-loader.component'; // Ionic version ✨
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
// import { GtsReportsComponent } from '../../../core/gts-open-source/gts-reports/gts-reports.component'; // DevExtreme version
import { GtsReportsComponent } from '../../../core/gts-open-source/gts-reports/gts-reports.component'; // Open-source version ✨
// import { GtsMessageComponent } from '../../../core/gts-open-source/gts-message/gts-message.component'; // DevExtreme version
import { GtsMessageComponent } from '../../../core/gts-open-source/gts-message/gts-message.component'; // Ionic version ✨
// import { GtsPdfComponent } from '../../../core/gts/gts-pdf/gts-pdf.component'; // Old location
import { GtsPdfComponent } from '../../../core/gts-open-source/gts-pdf/gts-pdf.component'; // Open-source location ✨

@Component({
  selector: 'app-web-app',
  standalone: true,
  imports: [
    CommonModule,

    // Ionic
    IonAccordion,
    IonAccordionGroup,
    IonItem,
    IonLabel,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,

    // PrimeNG (solo per Chart)
    ChartModule,

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
    addIcons({ arrowBackOutline, closeOutline });
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
    .subscribe(async (event) => {
      //===== START CUSTOM CODE =====

      if (event.customCode === 'SHOW_CHART') {
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

        // Build Chart.js data structure for PrimeNG Chart
        this.buildChartData();

        this.gtsDataService.sendAppLoaderListener(false);
      }
      if (event.customCode === 'PDF_GO_BACK') {
        this.showPdf = false;
        this.pdfFileData = '';
      }

      if (event.customCode === 'GET_FATTURA_PDF') {
        const fileName = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqFatture_INV_FILE_NAME');
        const result = await this.gtsDataService.execMethod('file', 'downloadfile', { fileName: 'Repository/GTR/FATTURE/'+fileName });
        console.log('fileName: ', result);
        if (result.valid) {
          this.pdfFileData = result.fileData;
          this.showPdf = true;
        }
        this.gtsDataService.sendAppLoaderListener(false);
      }

      if (event.customCode === 'GET_TARIFFA_PDF') {
        const fileName = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqFatture_TARIF_FILE_NAME');
        const result = await this.gtsDataService.execMethod('file', 'downloadfile', { fileName: 'Repository/GTR/TARIFFE/'+fileName });
        console.log('fileName: ', result);
        if (result.valid) {
          this.pdfFileData = result.fileData;
          this.showPdf = true;
        }
        this.gtsDataService.sendAppLoaderListener(false);
      }

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

  // Chart.js configuration for PrimeNG Chart
  chartData: any = {};
  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  showAccordion: boolean = false;
  selectedItemIndex: number = 0;
  selectedRow: any = {};
  pages: any[] = [];

  showPdf: boolean = false;
  pdfFileData: string = '';

  /**
   * Handler per cambio accordion (Ionic)
   */
  async onAccordionChange(event: any) {
    const value = event.detail.value;
    if (!value) return;

    this.pageReady = false;
    const selectedPage = this.pages.find((page: any) => page.UTENZA_CODE === value);
    if (!selectedPage) return;

    this.selectedRow = selectedPage;

    this.gtsDataService.setSelectedRows(this.prjId, this.formId, 'daUtenze', 'qUtenze', [this.selectedRow], [{UTENZA_CODE: this.selectedRow.UTENZA_CODE}]);
    await this.gtsDataService.runAction(this.prjId, this.formId, 'utenzeDS');
    this.pages.forEach((page: any) => {
      page.dataVisible = false;
    });
    selectedPage.dataVisible = true;
    const socLogo = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daUtenze', 'qSocLogo')[0].SOC_LOGO;
    this.socRagioneSociale = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daUtenze', 'qSocLogo')[0].SOC_RAGSOC;
    // Convert Oracle BLOB object socLogo to base64 string
    const arrayBuffer = socLogo.data;
    const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    this.socImage = 'data:image;base64,' + base64String;
    this.pageReady = true;
  }

  /**
   * Build Chart.js data structure for PrimeNG Chart
   */
  buildChartData() {
    const labels = this.chartDS.map(item => item.MESE_CONSUMO);
    const datasets: any[] = [];

    if (this.showACS) {
      datasets.push({
        label: 'Riscaldamento',
        data: this.chartDS.map(item => item.RIS_KWH),
        backgroundColor: '#66bb6a'
      });
      datasets.push({
        label: 'Acqua Calda Sanitaria',
        data: this.chartDS.map(item => item.ACS_KWH),
        backgroundColor: '#66bbff'
      });
    }

    datasets.push({
      label: 'Totale Consumi',
      data: this.chartDS.map(item => item.TOT_KWH),
      backgroundColor: '#ffaa66'
    });

    this.chartData = {
      labels: labels,
      datasets: datasets
    };
  }

  socImage: string = '';

  goBack() {
    this.location.back();
  }
}
