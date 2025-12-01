// src/app/features/GTSW/languages/languages.page.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import DataSource from 'devextreme/data/data_source';
import ArrayStore from 'devextreme/data/array_store';
import { exportDataGrid } from 'devextreme/excel_exporter';
import { ExportingEvent } from 'devextreme/ui/data_grid';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { DxDataGridModule, DxTabsModule, DxPopupModule, DxTextAreaModule, DxButtonModule } from 'devextreme-angular';
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
import { GtsFileUploaderComponent } from '../../../core/gts/gts-file-uploader/gts-file-uploader.component';

@Component({
  selector: 'app-languages',
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
    GtsFileUploaderComponent,
    DxDataGridModule,
    DxTabsModule,
    DxPopupModule,
    DxTextAreaModule,
    DxButtonModule
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
          @if (element.visible && element.objectName !== 'mainToolbar' && !element.toolbarFlagSubmit) {
            <app-gts-toolbar
              [style]="'grid-area: '+element.gridArea"
              [prjId]="prjId"
              [formId]="formId"
              [objectName]="element.objectName"
              [customCssClass]="element.customCssClass"
              [customData]="customData"
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
      @if (showTrans) {
        <div>
          <div class="languages">
            <div style="height: 35px; padding-top: 5px;">
              <span>Languages</span>
            </div>
            <dx-data-grid
              [repaintChangesOnly]="true"
              [visible]="true"
              [dataSource]="languagesDataSource"
              [showBorders]="true"
              [columnAutoWidth]="true"
              [showRowLines]="true"
              [showColumnLines]="true"
              [rowAlternationEnabled]="true"
              [width]="325"
            >
              <dxi-column dataField="flag" caption="Icon" cellTemplate="cellTemplate"></dxi-column>
              <dxi-column dataField="languageId" caption="Id"></dxi-column>
              <dxi-column dataField="description" caption="Language"></dxi-column>
              <dxi-column dataField="selected" caption="Selected"></dxi-column>
              <div *dxTemplate="let data of 'cellTemplate'">
                <img [src]="data.value" />
              </div>
            </dx-data-grid>
          </div>
          <dx-tabs
            id="languages"
            [width]="languageTabsWidth"
            [dataSource]="languageTabsDataSource"
            iconPosition="start"
            stylingMode="secondary"
            [(selectedIndex)]="languageIndex"
            (onItemClick)="onLanguageTabClick($event)"
            (onInitialized)="onLanguageTabsInitialized($event)"
          ></dx-tabs>
          <dx-data-grid
            [visible]="true"
            [dataSource]="textsDataSource"
            [showBorders]="true"
            [columnAutoWidth]="true"
            [showRowLines]="true"
            [showColumnLines]="true"
            [rowAlternationEnabled]="true"
            [focusedRowEnabled]="true"
            [(focusedRowIndex)]="textFocusedRowIndex"
            (onSaved)="onTextSaved($event)"
            (onExporting)="onTextExporting($event)"
          >
            <dxi-column dataField="txtId" caption="Id"></dxi-column>
            <dxi-column dataField="text" caption="Text"></dxi-column>
            <dxo-editing
              mode="batch"
              [allowUpdating]="!mlTextData.data?.[languageIndex]?.default"
            ></dxo-editing>
            <dxo-filter-panel [visible]="true"></dxo-filter-panel>
            <dxo-search-panel
              [visible]="true"
              [highlightCaseSensitive]="true"
            ></dxo-search-panel>
            <dxo-export
              [enabled]="!mlTextData.data?.[languageIndex]?.default"
              [formats]="['xlsx']"
              [fileName]="textExportFileName"
            ></dxo-export>
          </dx-data-grid>
        </div>
      }
      <app-gts-file-uploader
        fileUploadPath="Temp"
        uploaderTitle="Multilingual Texts"
        [fileUploadName]="textImportFileName"
        [allowedExtensions]="allowedExtensions"
        [maxFileSize]="maxFileSize"
      ></app-gts-file-uploader>
      <dx-popup
        [hideOnOutsideClick]="false"
        [showCloseButton]="false"
        [(visible)]="jsonMLVisible"
        title="Test Data Object"
        [height]="570"
        [width]="800"
      >
        <div style="padding-bottom: 10px;">
          <dx-text-area
            [(value)]="textMLDataString"
            height="450"
          ></dx-text-area>
        </div>
        <dx-button
          class="saveButton"
          text="Save"
          type="success"
          [width]="100"
          (onClick)="onSaveTextMLData()"
        ></dx-button>
        <dx-button
          class="saveButton"
          text="Cancel"
          type="danger"
          [width]="100"
          (onClick)="onCancelTextMLData()"
        ></dx-button>
      </dx-popup>
    </ng-container>
  `,
  styles: [`
    .languages {
      padding: 10px;
    }
    .saveButton {
      margin-right: 10px;
    }
  `]
})
export class GTSW_LanguagesComponent implements OnInit, OnDestroy {
  // Services
  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);

  // Page params
  prjId = 'GTSW';
  formId = 6;

  // Subscriptions
  appViewListenerSubs: Subscription | undefined;
  fileLoaderListenerSubs: Subscription | undefined;
  formReqListenerSubs: Subscription | undefined;
  pageCustomListenerSubs: Subscription | undefined;
  appLoaderListenerSubs: Subscription | undefined;
  toolbarListenerSubs: Subscription | undefined;

  // Component state
  metaData: any = {};
  actualView = '';
  loading = true;
  pageData: any = {};
  viewStyle = '';
  toolbarSelectedValue = '';
  toolbarEventData: any = {};

  // Translations state
  showTrans = false;
  dataLanguages: any = [];
  languages: any = [];
  languagesDataStore: any = {};
  languagesDataSource: any = {};

  languageTabs: any[] = [];
  languageTabsComponent: any = {};
  languageTabsDataStore: any = {};
  languageTabsDataSource: any = {};
  languageIndex = 0;
  languageTabsWidth = 600;

  mlTextData: any = { data: [] };
  textsDataStore: any = {};
  textsDataSource: any = {};
  textFocusedRowIndex = -1;
  textExportFileName = 'mlTextExport';
  allowedExtensions: string[] = ['.xlsx'];
  maxFileSize = 5000000;
  textImportFileName = 'mlTextImport';

  jsonMLVisible = false;
  textMLDataString = '';

  customData: any[] = [{
    type: 'select',
    label: 'Project: ',
    items: null,
    value: null,
    field: 'prjId'
  }];

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

    // File Uploader Listener
    this.fileLoaderListenerSubs = this.gtsDataService
      .getFileLoaderListener()
      .subscribe(async (loading) => {
        if (!loading.fileUploadVisible && loading.result) {
          const response = await this.gtsDataService.execMethod('data', 'saveMLExcel', {
            prjId: this.toolbarSelectedValue,
            filePath: 'Temp/' + loading.fileUploadedName
          });
          if (response.valid) {
            this.metaData.customMsg = response.message;
            this.gtsDataService.runAction(this.prjId, this.formId, 'transGetTextsMsg');
            this.gtsDataService.runAction(this.prjId, this.formId, 'showTrans');
          }
        }
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

        if (customCode === 'SHOW_TRANS') {
          this.dataLanguages = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daLang', 'qLang');
          this.languages = [];

          this.dataLanguages.forEach((language: any) => {
            this.languages.push({
              flag: '/assets/icons/stdImage_' + language.stdImageId + '.png',
              languageId: language.languageId,
              description: language.description,
              selected: language.active
            });
          });

          this.languagesDataStore = new ArrayStore({
            data: this.languages,
            key: ['languageId']
          });

          this.languagesDataSource = new DataSource({
            store: this.languagesDataStore
          });

          this.languageTabs = [];
          this.dataLanguages
            .filter((row: any) => row.active)
            .forEach((language: any) => {
              this.languageTabs.push({
                id: language.languageId,
                icon: '/assets/icons/stdImage_' + language.stdImageId + '.png',
                text: language.languageId,
                visible: true
              });
            });

          this.languageTabsWidth = this.languageTabs.length * 150;

          this.languageTabsDataStore = new ArrayStore({
            data: this.languageTabs,
            key: ['id']
          });

          this.languageTabsDataSource = new DataSource({
            store: this.languageTabsDataStore
          });

          const qProjects = this.pageData
            .filter((element: any) => element.dataAdapter === 'daLang')[0]
            .data[1]
            .rows;
          this.customData[0].value = qProjects[0].prjId;
          this.customData[0].items = qProjects;

          this.toolbarSelectedValue = qProjects[0].prjId;

          this.mlTextData = await this.gtsDataService.execMethod('data', 'getSavedMLText', { prjId: qProjects[0].prjId });
          this.prepareTexts(this.languageTabs[this.languageIndex].id);
          this.textExportFileName = 'mlTextExport_' + qProjects[0].prjId + '_' + this.languageTabs[this.languageIndex].id;

          this.showTrans = true;
        }

        if (customCode === 'TRANS_GET_TEXTS') {
          const result = await this.gtsDataService.execMethod('data', 'getStdMLText', { prjId: this.toolbarSelectedValue });
          this.metaData.customMsg = result.message;

          if (result && result.valid) {
            if (result.missingTxtIdCount > 0) {
              this.metaData.customMsg += '  -  N.: ' + result.missingTxtIdCount;
              this.mlTextData = await this.gtsDataService.execMethod('data', 'getSavedMLText', { prjId: this.toolbarSelectedValue });
              this.prepareTexts(this.languageTabs[this.languageIndex].id);
              this.textExportFileName = 'mlTextExport_' + this.toolbarSelectedValue + '_' + this.languageTabs[this.languageIndex].id;
            }
          }

          this.gtsDataService.runAction(this.prjId, this.formId, 'transGetTextsMsg');
        }

        if (customCode === 'TRANS_DOWNLOAD') {
          // Build an array of objects with one row for each txtId and one column for each languageId
          let exportTexts: any[] = [];
          this.mlTextData.data.forEach((language: any) => {
            language.texts.forEach((text: any) => {
              let existingText = exportTexts.find((t: any) => t.txtId === text.txtId);
              if (!existingText) {
                existingText = { txtId: text.txtId };
                exportTexts.push(existingText);
              }
              existingText[language.languageId] = text.text;
            });
          });
          this.textExportFileName = this.toolbarSelectedValue + '_All_Languages';

          // Filter to show only rows that are missing a language text
          exportTexts = exportTexts.filter((text: any) => {
            return Object.keys(text).length < this.mlTextData.data.length + 1;
          });

          const workbook = new Workbook();
          const worksheet = workbook.addWorksheet('Main sheet');
          const fileName = this.textExportFileName + '.xlsx';

          // Add Project Id
          worksheet.addRow(['Project', this.toolbarSelectedValue]);
          worksheet.getCell(1, 2).font = { bold: true, size: 16 };

          // Add header row
          const headerRow = ['Txt Id', ...this.mlTextData.data.map((language: any) => language.languageId)];
          worksheet.addRow(headerRow);

          // Format header
          headerRow.forEach((cell: any, index: number) => {
            worksheet.getCell(2, index + 1).font = { bold: true };
            worksheet.getCell(2, index + 1).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'D3D3D3' }
            };
          });

          // Set column widths
          worksheet.columns.forEach((column: any) => {
            if (column._number === 1) {
              column.width = 10;
            } else {
              column.width = 200;
            }
          });

          // Add data rows
          exportTexts.forEach((text: any) => {
            const row = [text.txtId, ...this.mlTextData.data.map((language: any) => text[language.languageId] || '')];
            worksheet.addRow(row);
          });

          workbook.xlsx.writeBuffer()
            .then(function (buffer: BlobPart) {
              saveAs(new Blob([buffer], { type: 'application/octet-stream' }), fileName);
            });

          this.textMLDataString = JSON.stringify(exportTexts, null, 2);
          this.jsonMLVisible = true;
          this.loading = false;
        }

        if (customCode === 'TRANS_UPLOAD') {
          this.gtsDataService.sendFileLoaderListener({
            fileUploadVisible: true
          });
        }

        if (customCode === 'EXCEL_DOWNLOAD') {
          const result = await this.gtsDataService.execMethod('data', 'downloadMLExcel', {
            prjId: this.toolbarSelectedValue,
            filePath: 'Temp/excel_download_' + this.toolbarSelectedValue + '.xlsx'
          });
          if (result.valid) {
            // Save excel file from base64 result.fileData
            const byteCharacters = atob(result.fileData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const fileName = 'MLTextExport_' + this.toolbarSelectedValue + '.xlsx';
            saveAs(new Blob([byteArray], { type: 'application/octet-stream' }), fileName);
          }
          this.loading = false;
        }

        if (customCode === 'SHOW_LANG') {
          this.showTrans = false;
        }

        //===== END CUSTOM CODE =====

        // Toolbar Events Listener
        this.toolbarListenerSubs = this.gtsDataService
          .getToolbarEventListener()
          .subscribe(async (data) => {
            //===== START CUSTOM_TOOLBAR_EVENT_CODE =====

            if (data !== undefined && this.toolbarEventData !== data) {
              this.toolbarEventData = data;
              this.toolbarSelectedValue = data.selectedValue;
              this.customData[0].value = this.toolbarSelectedValue;

              const prjDescription = this.pageData
                .filter((element: any) => element.dataAdapter === 'daLang')[0].data
                .filter((dataSet: any) => dataSet.dataSetName === 'qProjects')[0].rows
                .filter((row: any) => row.prjId === this.toolbarSelectedValue)[0].description;

              this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'gtsFldqProjects_prjId')[0].value = this.toolbarSelectedValue;
              this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'gtsFldqProjects_description')[0].value = prjDescription;
              this.customData[0].value = this.toolbarSelectedValue;
              this.gtsDataService.refreshActualView(this.prjId, this.formId);

              this.mlTextData = await this.gtsDataService.execMethod('data', 'getSavedMLText', { prjId: this.toolbarSelectedValue });
              this.prepareTexts(this.languageTabs[this.languageIndex].id);
              this.textExportFileName = 'mlTextExport_' + this.toolbarSelectedValue + '_' + this.languageTabs[this.languageIndex].id;
            }

            //===== END CUSTOM_TOOLBAR_EVENT_CODE =====
          });
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
    this.fileLoaderListenerSubs?.unsubscribe();
  }

  prepareTexts(languageId: string) {
    const languageData = this.mlTextData.data.filter((text: any) => text.languageId === languageId)[0];
    if (languageData) {
      this.textsDataStore = new ArrayStore({
        data: languageData.texts,
        key: 'txtId'
      });
      this.textsDataSource = new DataSource({
        store: this.textsDataStore
      });
    }
  }

  async onSaveTextMLData() {
    const mlTexts = JSON.parse(this.textMLDataString);
    let exportTexts: any[] = [];

    // Convert to array format expected by server
    mlTexts.forEach((text: any) => {
      Object.keys(text).forEach((key: string) => {
        if (key !== 'txtId') {
          exportTexts.push({
            text: text[key].trim(),
            languageId: key,
            txtId: parseInt(text.txtId, 10)
          });
        }
      });
    });

    const result = await this.gtsDataService.execMethod('data', 'saveMLText', {
      prjId: this.toolbarSelectedValue,
      mlTexts: exportTexts
    });
    if (result.valid) {
      this.mlTextData = await this.gtsDataService.execMethod('data', 'getSavedMLText', { prjId: this.toolbarSelectedValue });
      this.prepareTexts(this.languageTabs[this.languageIndex].id);
    }
    this.jsonMLVisible = false;
  }

  onCancelTextMLData() {
    this.jsonMLVisible = false;
  }

  onLanguageTabClick(event: any) {
    const languageId = this.languageTabs[this.languageIndex].id;
    this.prepareTexts(languageId);
    this.textExportFileName = 'mlTextExport_' + this.toolbarSelectedValue + '_' + languageId;
  }

  onLanguageTabsInitialized(event: any) {
    this.languageTabsComponent = event.component;
  }

  async onTextSaved(event: any) {
    const changes = event.changes.map((change: any) => change.data);
    await this.gtsDataService.execMethod('data', 'saveMLText', {
      prjId: this.toolbarSelectedValue,
      mlTexts: changes
    });
  }

  onTextExporting(e: ExportingEvent) {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Main sheet');
    const fileName = this.textExportFileName;

    exportDataGrid({
      component: e.component,
      worksheet: worksheet,
      customizeCell: function (options) {
        options.excelCell.font = { name: 'Arial', size: 12 };
        options.excelCell.alignment = { horizontal: 'left' };
      }
    }).then(function () {
      workbook.xlsx.writeBuffer()
        .then(function (buffer: BlobPart) {
          saveAs(new Blob([buffer], { type: 'application/octet-stream' }), fileName);
        });
    });
  }
}
