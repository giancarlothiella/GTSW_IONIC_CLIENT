// src/app/features/GTSW/languages/languages.page.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { AiReportsService } from '../../../core/services/ai-reports.service';

// PrimeNG
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { Dialog } from 'primeng/dialog';
import { Textarea } from 'primeng/textarea';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Checkbox } from 'primeng/checkbox';

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
  selector: 'app-languages',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GtsLoaderComponent,
    GtsToolbarComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsMessageComponent,
    GtsTabsComponent,
    GtsReportsComponent,
    GtsFileUploaderComponent,
    // PrimeNG
    TableModule,
    TabsModule,
    Dialog,
    Textarea,
    Button,
    InputText,
    Toast,
    Checkbox
  ],
  providers: [MessageService],
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
        @for (element of metaData.tabs; track element.objectName) {
          @if (element.visible) {
            <app-gts-tabs
              [style]="'grid-area: '+element.gridArea"
              [prjId]="prjId"
              [formId]="formId"
              [objectName]="element.objectName"
            ></app-gts-tabs>
          }
        }
        @for (element of metaData.reports; track element.fieldGrpId) {
          @if (element.visible) {
            <app-gts-reports
              [style]="'grid-area: '+element.gridArea"
              [prjId]="prjId"
              [formId]="formId"
              [fieldGrpId]="element.fieldGrpId"
            ></app-gts-reports>
          }
        }
        @for (element of metaData.toolbars; track element.objectName) {
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
        @for (element of metaData.grids; track element.objectName) {
          @if (element.visible) {
            <app-gts-grid
              [style]="'grid-area: '+element.gridArea"
              [prjId]="prjId"
              [formId]="formId"
              [objectName]="element.objectName"
            ></app-gts-grid>
          }
        }
        @for (element of metaData.forms; track element.objectName) {
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
        <div class="translations-container">
          <!-- Languages List Table -->
          <div class="languages-section">
            <div class="section-header">
              <span>Languages</span>
            </div>
            <p-table
              [value]="languages"
              [scrollable]="true"
              scrollHeight="200px"
              [rowHover]="true"
              [stripedRows]="true"
              styleClass="p-datatable-sm p-datatable-gridlines"
              [style]="{ width: '350px' }"
            >
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 50px">Icon</th>
                  <th style="width: 80px">Id</th>
                  <th>Language</th>
                  <th style="width: 80px">Selected</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-lang>
                <tr>
                  <td><img [src]="lang.flag" style="height: 20px" /></td>
                  <td>{{ lang.languageId }}</td>
                  <td>{{ lang.description }}</td>
                  <td style="text-align: center"><p-checkbox [ngModel]="lang.selected" [binary]="true" [disabled]="true"></p-checkbox></td>
                </tr>
              </ng-template>
            </p-table>
          </div>

          <!-- Language Tabs -->
          <div class="texts-section">
            <p-tabs [value]="languageIndex" (valueChange)="onLanguageTabChange($event)">
              <p-tablist>
                @for (tab of languageTabs; track tab.id; let i = $index) {
                  <p-tab [value]="i">
                    <img [src]="tab.icon" style="height: 16px; margin-right: 8px" />
                    {{ tab.text }}
                  </p-tab>
                }
              </p-tablist>
            </p-tabs>

            <!-- Texts Table with inline editing -->
            <p-table
              [value]="textsData"
              [scrollable]="true"
              scrollHeight="400px"
              [rowHover]="true"
              [stripedRows]="true"
              [globalFilterFields]="['txtId', 'text']"
              styleClass="p-datatable-sm p-datatable-gridlines"
              dataKey="txtId"
              editMode="cell"
            >
              <ng-template pTemplate="caption">
                <div class="table-header">
                  <span class="p-input-icon-left">
                    <i class="pi pi-search"></i>
                    <input
                      pInputText
                      type="text"
                      [(ngModel)]="searchText"
                      (input)="filterTexts()"
                      placeholder="Search..."
                      style="width: 300px"
                    />
                  </span>
                  @if (!isDefaultLanguage()) {
                    <p-button
                      icon="pi pi-file-excel"
                      label="Export Excel"
                      severity="success"
                      size="small"
                      (onClick)="exportTextsToExcel()"
                    ></p-button>
                  }
                </div>
              </ng-template>
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 100px">Id</th>
                  <th>Text</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-text let-editing="editing">
                <tr>
                  <td>{{ text.txtId }}</td>
                  <td [pEditableColumn]="text.text" pEditableColumnField="text">
                    @if (!isDefaultLanguage()) {
                      <p-cellEditor>
                        <ng-template pTemplate="input">
                          <input
                            pInputText
                            type="text"
                            [(ngModel)]="text.text"
                            (blur)="onTextEdited(text)"
                            style="width: 100%"
                          />
                        </ng-template>
                        <ng-template pTemplate="output">
                          {{ text.text }}
                        </ng-template>
                      </p-cellEditor>
                    } @else {
                      {{ text.text }}
                    }
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </div>
      }

      <app-gts-file-uploader
        fileUploadPath="Temp"
        uploaderTitle="Multilingual Texts"
        [fileUploadName]="textImportFileName"
        [allowedExtensions]="allowedExtensions"
        [maxFileSize]="maxFileSize"
      ></app-gts-file-uploader>

      <!-- JSON Editor Dialog -->
      <p-dialog
        header="Multilingual Texts"
        [(visible)]="jsonMLVisible"
        [modal]="true"
        [style]="{ width: '800px', height: '600px' }"
        [closable]="false"
        [contentStyle]="{ 'flex': '1', 'display': 'flex', 'padding': '0', 'overflow': 'hidden' }"
      >
        <textarea
          pTextarea
          [(ngModel)]="textMLDataString"
          style="width: 100%; flex: 1; font-family: monospace; font-size: 13px; resize: none; border: none; border-radius: 0; padding: 10px;"
        ></textarea>
        <ng-template pTemplate="footer">
          <p-button
            label="Cancel"
            severity="danger"
            (onClick)="onCancelTextMLData()"
            class="mr-2"
          ></p-button>
          @if (!isDefaultLanguage()) {
            <p-button
              [label]="'AI Translate to: ' + getActiveLanguageId()"
              icon="pi pi-sparkles"
              severity="info"
              (onClick)="onAITranslate()"
              [loading]="aiTranslating"
              [disabled]="aiTranslating"
              class="mr-2"
            ></p-button>
            <p-button
              label="Save"
              severity="success"
              (onClick)="onSaveTextMLData()"
            ></p-button>
          }
        </ng-template>
      </p-dialog>

      <p-toast></p-toast>
    </ng-container>
  `,
  styles: [`
    .translations-container {
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .languages-section {
      padding: 10px;
    }
    .section-header {
      height: 35px;
      padding-top: 5px;
      font-weight: bold;
    }
    .texts-section {
      padding: 10px;
    }
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .tab-label {
      display: flex;
      align-items: center;
    }
    .mr-2 {
      margin-right: 0.5rem;
    }
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      padding: 0.6rem 0.75rem;
    }
    :host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
      padding: 0.6rem 0.75rem;
    }
    :host ::ng-deep .p-dialog .p-dialog-content {
      display: flex;
      flex-direction: column;
    }
  `]
})
export class GTSW_LanguagesComponent implements OnInit, OnDestroy {
  // Services
  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);
  private messageService = inject(MessageService);
  private aiReportsService = inject(AiReportsService);

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
  languages: any[] = [];

  languageTabs: any[] = [];
  languageIndex = 0;

  mlTextData: any = { data: [] };
  textsData: any[] = [];
  textsDataOriginal: any[] = [];
  searchText = '';
  textExportFileName = 'mlTextExport';
  allowedExtensions: string[] = ['.xlsx'];
  maxFileSize = 5000000;
  textImportFileName = 'mlTextImport';

  jsonMLVisible = false;
  textMLDataString = '';
  aiTranslating = false;

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
      .subscribe(async (event) => {
        //===== START CUSTOM CODE =====

        if (event.customCode === 'SHOW_TRANS') {
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

        if (event.customCode ==='TRANS_GET_TEXTS') {
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

        }

        if (event.customCode ==='TRANS_DOWNLOAD') {
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
            .then((buffer: BlobPart) => {
              saveAs(new Blob([buffer], { type: 'application/octet-stream' }), fileName);
            });

          this.textMLDataString = JSON.stringify(exportTexts, null, 2);
          this.jsonMLVisible = true;
          this.gtsDataService.sendAppLoaderListener(false);
        }

        if (event.customCode ==='TRANS_UPLOAD') {
          this.gtsDataService.sendAppLoaderListener(false);
          this.gtsDataService.sendFileLoaderListener({
            fileUploadVisible: true
          });
        }

        if (event.customCode ==='EXCEL_DOWNLOAD') {
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
          this.gtsDataService.sendAppLoaderListener(false);
        }

        if (event.customCode ==='SHOW_LANG') {
          this.showTrans = false;
        }

        // Run next action if specified
        if (event.actionName) {
          this.gtsDataService.runAction(this.prjId, this.formId, event.actionName);
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
      this.textsDataOriginal = [...languageData.texts];
      this.textsData = [...languageData.texts];
    }
  }

  filterTexts() {
    if (!this.searchText) {
      this.textsData = [...this.textsDataOriginal];
    } else {
      const search = this.searchText.toLowerCase();
      this.textsData = this.textsDataOriginal.filter(
        (t: any) => t.txtId.toString().includes(search) || (t.text && t.text.toLowerCase().includes(search))
      );
    }
  }

  isDefaultLanguage(): boolean {
    return this.mlTextData.data?.[this.languageIndex]?.default || false;
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
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Translations saved successfully',
        life: 3000
      });
    }
    this.jsonMLVisible = false;
  }

  onCancelTextMLData() {
    this.jsonMLVisible = false;
  }

  onLanguageTabChange(index: string | number | undefined) {
    if (index === undefined) return;
    this.languageIndex = Number(index);
    const languageId = this.languageTabs[this.languageIndex].id;
    this.prepareTexts(languageId);
    this.textExportFileName = 'mlTextExport_' + this.toolbarSelectedValue + '_' + languageId;
    this.searchText = '';
  }

  async onTextEdited(text: any) {
    // Save the edited text
    const changes = [{
      txtId: text.txtId,
      text: text.text,
      languageId: this.languageTabs[this.languageIndex].id
    }];
    await this.gtsDataService.execMethod('data', 'saveMLText', {
      prjId: this.toolbarSelectedValue,
      mlTexts: changes
    });
  }

  exportTextsToExcel() {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Main sheet');
    const fileName = this.textExportFileName + '.xlsx';

    // Add header
    worksheet.addRow(['Txt Id', 'Text']);
    worksheet.getCell(1, 1).font = { bold: true };
    worksheet.getCell(1, 2).font = { bold: true };

    // Add data
    this.textsData.forEach((text: any) => {
      worksheet.addRow([text.txtId, text.text]);
    });

    // Set column widths
    worksheet.getColumn(1).width = 10;
    worksheet.getColumn(2).width = 100;

    workbook.xlsx.writeBuffer()
      .then((buffer: BlobPart) => {
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), fileName);
      });
  }

  getActiveLanguageId(): string {
    if (this.languageTabs && this.languageTabs.length > this.languageIndex) {
      return this.languageTabs[this.languageIndex].id.toUpperCase();
    }
    return '';
  }

  async onAITranslate() {
    try {
      this.aiTranslating = true;
      const targetLanguage = this.languageTabs[this.languageIndex].id;

      // Parse current JSON from textarea
      const textsToTranslate = JSON.parse(this.textMLDataString);

      // Find source language (first language that has text, usually 'it')
      const sourceLanguage = this.mlTextData.data.find((lang: any) => lang.default)?.languageId || 'it';

      // Call AI Reports service for translation (uses /api/ai-reports/translate)
      this.aiReportsService.translateTexts({
        texts: textsToTranslate,
        targetLanguage: targetLanguage,
        sourceLanguage: sourceLanguage
      }).subscribe({
        next: (result) => {
          if (result.valid && result.texts) {
            // Update textarea with translated texts
            this.textMLDataString = JSON.stringify(result.texts, null, 2);
            this.messageService.add({
              severity: 'success',
              summary: 'AI Translation',
              detail: `Translated ${result.translatedCount || textsToTranslate.length} texts to ${targetLanguage.toUpperCase()}`,
              life: 3000
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Translation Error',
              detail: result.message || 'Failed to translate texts',
              life: 5000
            });
          }
          this.aiTranslating = false;
        },
        error: (error) => {
          this.aiTranslating = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Translation Error',
            detail: error.error?.message || 'Failed to translate texts',
            life: 5000
          });
        }
      });
    } catch (e: any) {
      this.aiTranslating = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: e.message || 'Invalid JSON format',
        life: 5000
      });
    }
  }
}
