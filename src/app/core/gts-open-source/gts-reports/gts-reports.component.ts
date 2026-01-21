import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { GtsLoaderComponent } from '../gts-loader/gts-loader.component';
import { GtsGridComponent } from '../gts-grid/gts-grid.component';
import { IonSegment, IonSegmentButton, IonLabel, IonRadioGroup, IonRadio, IonItem, IonButton } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-gts-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GtsLoaderComponent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonRadioGroup,
    IonRadio,
    IonItem,
    IonButton,
    NgxExtendedPdfViewerModule
  ],
  templateUrl: './gts-reports.component.html',
  styleUrls: ['./gts-reports.component.scss']
})
export class GtsReportsComponent implements OnInit, OnDestroy {
  constructor(
    private gtsDataService: GtsDataService
  ) { }

  @Input()
  prjId: string = '';

  @Input()
  formId: number = 0;

  @Input()
  fieldGrpId: number = 0;

  @Input()
  reportCode: string = '';

  @Input()
  params: any = {};

  @Input()
  connCode: string = '';

  @Input()
  report: any = {};

  async ngOnInit() {
    const objectName = this.fieldGrpId.toString();
    this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'reportsGroups', objectName);

    this.prepareReports();
  }

  ngOnDestroy() {

  }

  //========= GLOBALS =================
  metaData: any = {};
  reportsGroups: any = {};
  reportTitle: string = '';
  selectedValue: string = '';
  selectedReport: any = {};
  reportCSSTitle: string = 'reportTitle001';
  showReport: boolean = false;

  // Tabs
  mainTabIndex: string = 'pdf'; // 'pdf' or 'data'

  base64PdfStream: string = '';
  grids: any[] = [];
  gridsTabsIndex: number = 0;
  //==================================

  onGridsTabClick(index: number) {
    this.gridsTabsIndex = index;
    this.grids.forEach((grid: any) => {
      grid.visible = false;
    });
    this.grids[this.gridsTabsIndex].visible = true;
  }

  async prepareReports() {
    console.log('prepareReports ', this.metaData);

    this.reportTitle = this.metaData.fieldGrpDescr;
    this.reportsGroups.gridArea = 'grid-area: ' + this.metaData.gridArea;
    this.reportsGroups.cssClass = 'report001'
    this.reportsGroups.cssToolbar = 'rptToolbar001'

    if (this.reportCode === '') {
      // Remove from reports array invisible reports (default visible = true if not specified)
      const visibleReports = this.metaData.reports.filter((report: any) => report.visible !== false);
      this.reportsGroups.radioValues = visibleReports;
      this.selectedValue = visibleReports[0]?.reportDescr || '';
    } else {
      const visibleReports = this.metaData.reports.filter((report: any) => report.reportCode === this.reportCode && report.visible !== false);
      this.reportsGroups.radioValues = visibleReports;
      this.selectedValue = visibleReports[0]?.reportDescr || '';
    }

    if (Object.keys(this.report).length !== 0) {
      await this.showReportData(this.report);
      this.showReport = true;
    }
  }

  async onPrintClick() {
    this.gtsDataService.sendAppLoaderListener(true);
    this.selectedReport = this.metaData.reports.filter((report: any) => { return report.reportDescr === this.selectedValue; })[0];

    try {
      await this.generateReport();
    } catch (error) {
      console.error('Error generating report:', error);
    }

    this.gtsDataService.sendAppLoaderListener(false);
  }

  /**
   * Genera il report - il server decide automaticamente se usare Fast Report o HTML Template
   * basandosi sulla configurazione del reportServiceName
   */
  async generateReport(): Promise<void> {
    const reportResponse = await this.gtsDataService.getReportData(
      this.prjId,
      this.formId,
      this.selectedReport,
      this.params,
      this.connCode
    );

    if (reportResponse !== undefined && reportResponse !== null && reportResponse.valid === true) {
      await this.showReportData(reportResponse);
    }
  }

  async showReportData(reportResponse: any) {
    // loop on outBinds obj properties for preparing grids arrays
    Object.keys(reportResponse.procResult.outBinds).forEach((key: any) => {
      let columns: any = [];
      reportResponse.procResult['fields_' + key]
        .filter((field: any) => { return field.dbTypeName === 'NUMBER' || field.dbTypeName === 'DATE' || field.dbTypeName === 'VARCHAR2' || field.dbTypeName === 'CHAR'; })
        .forEach((field: any) => {
          let columnsData: any = {
            dataField: field.name,
            caption: field.name,
          };

          if (field.dbTypeName === 'NUMBER') {
            columnsData['dataType'] = 'number';
            columnsData['format'] = '#,###.00';
          } else if (field.dbTypeName === 'DATE') {
            columnsData['dataType'] = 'date';
            columnsData['format'] = 'dd/MM/yyyy';
          } else {
            columnsData['dataType'] = 'string';
          }

          columns.push(columnsData);
        });

      // add property id to each row for grid
      reportResponse.procResult['rows_' + key].forEach((row: any, index: number) => {
        row.id = index;
      });

      this.grids.push({
        id: key,
        name: key.substring(2, 6),
        columns: columns,
        rows: reportResponse.procResult['rows_' + key],
        visible: false,
        fileName: key + '.xlsx'
      });
    });

    this.grids[0].visible = true;

    this.base64PdfStream = reportResponse.reportPdf;

    this.showReport = true;
  }

  exportGridToExcel(grid: any) {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Main sheet');

    // Add headers
    const headers = grid.columns.map((col: any) => col.caption);
    worksheet.addRow(headers);

    // Add data rows
    grid.rows.forEach((row: any) => {
      const rowData = grid.columns.map((col: any) => row[col.dataField]);
      worksheet.addRow(rowData);
    });

    // Auto-size columns
    worksheet.columns.forEach((column: any, index: number) => {
      column.width = Math.max(
        headers[index].length + 2,
        ...grid.rows.map((row: any) => {
          const value = row[grid.columns[index].dataField];
          return value ? value.toString().length : 0;
        })
      );
    });

    // Save file
    workbook.xlsx.writeBuffer().then((buffer: BlobPart) => {
      saveAs(new Blob([buffer], { type: 'application/octet-stream' }), grid.fileName);
    });
  }
}
