import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { Subscription } from 'rxjs';

// Import GTS Components
import { GtsLoaderComponent } from '../../../core/gts/gts-loader/gts-loader.component';
import { GtsToolbarComponent } from '../../../core/gts/gts-toolbar/gts-toolbar.component';
import { GtsTabsComponent } from '../../../core/gts/gts-tabs/gts-tabs.component';
import { GtsGridComponent } from '../../../core/gts/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts/gts-form-popup/gts-form-popup.component';
import { GtsReportsComponent } from '../../../core/gts/gts-reports/gts-reports.component';
import { GtsMessageComponent } from '../../../core/gts/gts-message/gts-message.component';

@Component({
  selector: 'app-fatture',
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
  templateUrl: './fatture.page.html',
  styleUrls: ['./fatture.page.scss']
})
export class GTR_FattureComponent implements OnInit, OnDestroy {
  //========= PAGE PARAMS =================
  prjId: string = 'GTR';
  formId: number = 1;

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
    });

    // Form Req Listener
    this.formReqListenerSubs = this.gtsDataService
    .getFormReqListener()
    .subscribe((formRequest) => {
      let reply: any = {
        valid: true
      };

      //===== START FORM REQUEST CUSTOM CODE  =====
      if (formRequest.typeRequest === 'form') {
        if (formRequest.field.customCode === 'REAS_CODE') {
          formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_UNMIS_ID')[0].disabled = false;
          formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_VAT_ID')[0].disabled = false;
          formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC_AMOUNT')[0].disabled = false;
          formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC')[0].disabled = false;
          formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_QTY')[0].disabled = false;
          formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PRICE')[0].disabled = false;

          const lookup_F_1_CAUS_FLAG_TIPO = formRequest.formData.filter((field: any) => field.objectName === 'lookup_F_1_CAUS_FLAG_TIPO')[0].value;

          if (lookup_F_1_CAUS_FLAG_TIPO === '1') {
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC')[0].disabled = true;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC_AMOUNT')[0].disabled = true;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC')[0].value = null;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC_AMOUNT')[0].value = null;
          } else if (lookup_F_1_CAUS_FLAG_TIPO === '2') {
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC')[0].disabled = true;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_QTY')[0].disabled = true;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PRICE')[0].disabled = true;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_UNMIS_ID')[0].disabled = true;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC')[0].value = null;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_QTY')[0].value = null;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PRICE')[0].value = null;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_UNMIS_ID')[0].value = null;
          } else if (lookup_F_1_CAUS_FLAG_TIPO === '3') {
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_QTY')[0].disabled = true;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PRICE')[0].disabled = true;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_QTY')[0].value = null;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PRICE')[0].value = null;
          } else if (lookup_F_1_CAUS_FLAG_TIPO === '0') {
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_UNMIS_ID')[0].disabled = true;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_VAT_ID')[0].disabled = true;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC_AMOUNT')[0].disabled = true;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC')[0].disabled = true;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_QTY')[0].disabled = true;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PRICE')[0].disabled = true;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_UNMIS_ID')[0].value = null;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_VAT_ID')[0].value = null;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC_AMOUNT')[0].value = null;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC')[0].value = null;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_QTY')[0].value = null;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PRICE')[0].value = null;
          }
        }

        if (formRequest.field.customCode === 'PERC_AMOUNT') {
          const lookup_F_1_CAUS_FLAG_TIPO = formRequest.formData.filter((field: any) => field.objectName === 'lookup_F_1_CAUS_FLAG_TIPO')[0].value;
          if (lookup_F_1_CAUS_FLAG_TIPO === '2') {
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_UNMIS_ID')[0].value = 'CORP';
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_QTY')[0].value = 1;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVDI_PRICE')[0].value = formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC_AMOUNT')[0].value;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_AMOUNT')[0].value = formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC_AMOUNT')[0].value;
          }
        }

        if (formRequest.field.customCode === 'PERC') {
          if (formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC_AMOUNT')[0].value !== null && formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC')[0].value !== null) {
            let fAmount = formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC_AMOUNT')[0].value * formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PERC')[0].value / 100;
            fAmount = Math.round(fAmount * 100) / 100;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_AMOUNT')[0].value = fAmount;
          }
        }

        if (formRequest.field.customCode === 'PRICE' || formRequest.field.customCode === 'QTY') {
          if (formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_QTY')[0].value !== null && formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PRICE')[0].value !== null) {
            let fAmount = formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_QTY')[0].value * formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_PRICE')[0].value;
            fAmount = Math.round(fAmount * 100) / 100;
            formRequest.formData.filter((field: any) => field.objectName === 'gtsFldqInvDet_INVD_AMOUNT')[0].value = fAmount;
          }
        }
      }

      if (formRequest.typeRequest === 'grid') {
        reply = {
          valid: true,
          fieldCode: formRequest.field,
          message: ''
        };

        // get Grid Object
        const grid = this.metaData.grids.filter((element: any) => element.objectName === formRequest.gridName)[0];
        const actualRow = this.pageData
        .filter((element: any) => element.dataAdapter === grid.dataAdapter)[0]
        .data
        .filter((dataSet: any) => dataSet.dataSetName === grid.dataSetName)[0]
        .rows[grid.actualRowIndex];

        if (formRequest.field === 'PRICE' || formRequest.field === 'QTY') {
          let fAmount = formRequest.data.INVD_QTY * formRequest.data.INVD_PRICE;
          fAmount = Math.round(fAmount * 100) / 100;
          formRequest.data.INVD_AMOUNT = fAmount;

          // set cell value
          actualRow.INVD_AMOUNT = fAmount;

          if (fAmount === 0) {
            reply = {
              valid: false,
              fieldCode: formRequest.field,
              message: 'Importo non valido'
            };
          }
        }
      }

      //===== END FORM REQUEST CODE           =====
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
      setTimeout(() => {
        this.filterCompany('gtsGridInvHdr', this.toolbarSelectedValue);
        // Disattiva il loader dopo che la griglia è stata filtrata e renderizzata
        setTimeout(() => {
          this.gtsDataService.sendAppLoaderListener(false);
        }, 500);
      }, 1);

      //===== END CUSTOM CODE =====
    });


    // Toolbar Events Listener
    this.toolbarListenerSubs = this.gtsDataService
    .getToolbarEventListener()
    .subscribe((data) => {
      //===== START CUSTOM TOOLBAR EVENT CODE =====

      this.filterCompany('gtsGridInvHdr', data.selectedValue);

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

  //========= PAGE FUNCTIONS =================
  async getCustomData(prjId: string, formId: number, customCode: string, actualView: string) {
    // INIT COMPANY CODE
    //==================================================================================================
    if (customCode === 'setCtxSoc') {
      this.toolbarSelectedValue = this.pageData
      .filter((element: any) => element.dataAdapter === 'daCtx')[0]
      .data[1]
      .rows[0].SOC_DEFAULT;

      const qCtxSoc = this.pageData
      .filter((element: any) => element.dataAdapter === 'daCtx')[0]
      .data[0]
      .rows;

      // save pageField Value
      this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'gtsFldqCtxSoc_SOC_CODE')[0].value = this.toolbarSelectedValue;

      this.customData.push({
        type: 'select',
        label: 'Società: ',
        items: qCtxSoc,
        value: this.toolbarSelectedValue,
        field: 'SOC_CODE',
      });
    }

    // SET INVOICE STATUS
    //==================================================================================================
    if (customCode === 'setStatusC') {
      const qInvHdr = this.pageData
      .filter((element: any) => element.dataAdapter === 'daInv')[0]
      .data
      .filter((dataSet: any) => dataSet.dataSetName === 'qInvHdr')[0];

      let selectedDSRow = qInvHdr.rows
      .filter((row: any) => row.INVH_ID === qInvHdr.selectedKeys[0].INVH_ID)[0];

      selectedDSRow.INVH_FLAG_INSERT_STATUS = 'C';
    }

    if (customCode === 'setStatusP') {
      const qInvHdr = this.pageData
      .filter((element: any) => element.dataAdapter === 'daInv')[0]
      .data
      .filter((dataSet: any) => dataSet.dataSetName === 'qInvHdr')[0];

      let selectedDSRow = qInvHdr.rows
      .filter((row: any) => row.INVH_ID === qInvHdr.selectedKeys[0].INVH_ID)[0];

      selectedDSRow.INVH_FLAG_INSERT_STATUS = 'P';
    }

    this.gtsDataService.sendAppLoaderListener(false);
  }

  companyFilterFunc = function (selectedCompany: string) {
    return ['SOC_CODE', '=', selectedCompany];
  }

  filterCompany(objectName: string, selectedValue: any) {
    const filterData = this.companyFilterFunc(selectedValue)

    this.metaData.grids
    .filter((element: any) => element.objectName === objectName)[0]
    .filterRule = filterData;

    this.metaData.grids
    .filter((element: any) => element.objectName === objectName)[0]
    .data.dataSource.filter(filterData);

    this.metaData.grids
    .filter((element: any) => element.objectName === objectName)[0]
    .data.dataSource.load();

  }

  goBack() {
    this.location.back();
  }

}
