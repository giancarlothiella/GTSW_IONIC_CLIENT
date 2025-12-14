import { Component, OnInit, OnDestroy, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { PageService } from '../../services/pages.service';
import { Subscription } from 'rxjs';
import { DxDataGridModule, DxRadioGroupModule, DxTabsModule, DxToolbarModule } from 'devextreme-angular';
import { GtsLoaderComponent } from '../gts-loader/gts-loader.component';
import DataSource from 'devextreme/data/data_source';
import ArrayStore from 'devextreme/data/array_store';
import { exportDataGrid } from 'devextreme/excel_exporter';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import type { ExportingEvent } from 'devextreme/ui/data_grid';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

@Component({
  selector: 'app-gts-reports',
  standalone: true,
  imports: [
    CommonModule,
    DxDataGridModule,
    DxRadioGroupModule,
    DxTabsModule,
    DxToolbarModule,
    GtsLoaderComponent,
    NgxExtendedPdfViewerModule
  ],
  templateUrl: './gts-reports.component.html',
  styleUrls: ['./gts-reports.component.scss']
})
export class GtsReportsComponent implements OnInit,  OnDestroy {
  constructor(
    private gtsDataService: GtsDataService,
  ) { }

  @Input()
  prjId: string ='';

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
  report:  any = {};

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
  reportTabs: any[] = [];
  tabsIndex: number = 0;
  base64PdfStream: string = '';
  grids: any[] = [];
  gridsTabsList: any[] = [];
  gridsTabsIndex: number = 0;
  gridsTabsWidth: number = 0;
  //==================================

  onGridsTabsClick(e: any) {
    this.gridsTabsIndex = e.itemIndex;
    this.grids.forEach((grid: any) => {
      grid.visible = false;
    });
    this.grids[this.gridsTabsIndex].visible = true;
  }

  onGridExporting(e: ExportingEvent) {
    const workbook = new Workbook();    
    const worksheet = workbook.addWorksheet('Main sheet');
    const fileName = this.grids[this.gridsTabsIndex].fileName;
    exportDataGrid({
        component: e.component,
        worksheet: worksheet,
        customizeCell: function(options) {
            options.excelCell.font = { name: 'Arial', size: 12 };
            options.excelCell.alignment = { horizontal: 'left' };
        } 
    }).then(function() {
        workbook.xlsx.writeBuffer()
            .then(function(buffer: BlobPart) {
                saveAs(new Blob([buffer], { type: 'application/octet-stream' }), fileName);
            });
    });  
  }

  async prepareReports() {
    console.log('prepareReports ', this.metaData);
    this.reportTabs.push({
      id: 'reportPdf',
      text: 'PDF',
      icon: 'pdffile',          
      visible: true,
      tabIndex: 0
    });

    this.reportTabs.push({
      id: 'reportData',
      text: 'DATA',
      icon: 'detailslayout',          
      visible: true,
      tabIndex: 1
    });

    this.reportTitle = this.metaData.fieldGrpDescr;
    this.reportsGroups.gridArea = 'grid-area: ' + this.metaData.gridArea;
    this.reportsGroups.cssClass = 'report001'
    this.reportsGroups.cssToolbar = 'rptToolbar001' 

    if (this.reportCode === '') {
      // Remove from reports array invisible reports (default visible = true if not specified)
      const visibleReports = this.metaData.reports.filter((report: any) => report.visible !== false);
      this.reportsGroups.radioValues = visibleReports.map((report: any) => {return report.reportDescr;});
      this.selectedValue = this.reportsGroups.radioValues[0];
      this.reportsGroups.radioIndex = 0;
    } else {
      const visibleReports = this.metaData.reports.filter((report: any) => report.reportCode === this.reportCode && report.visible !== false);
      this.reportsGroups.radioValues = visibleReports.map((report: any) => {return report.reportDescr;});
      this.selectedValue = this.reportsGroups.radioValues[0];
      this.reportsGroups.radioIndex = 0;
    }

    if (Object.keys(this.report).length !== 0) {
      await this.showReportData(this.report);
      this.showReport = true;
    } else {    
      this.reportsGroups.itemsList = [];
      this.reportsGroups.itemsList.push({
        id: 'reportOkBtn',
        name: 'reportOkBtn',
        widget: 'dxButton',
        location: 'before',
        visible: true,  
        options: {
          stylingMode: 'contained',            
          text: 'PRINT',        
          icon: '/assets/icons/stdImage_43.png',
          type: 'normal',
          onClick: async (el: any) => {
            this.gtsDataService.sendAppLoaderListener(true);
            this.selectedReport = this.metaData.reports.filter((report: any) => {return report.reportDescr === this.selectedValue;})[0];          
            const reportResponse = await this.gtsDataService.getReportData(this.prjId, this.formId, this.selectedReport, this.params, this.connCode);
            if (reportResponse !== undefined && reportResponse !== null && reportResponse.valid === true) {   
              await this.showReportData(reportResponse);       
            }     
            this.gtsDataService.sendAppLoaderListener(false);        
          }
        }            
      });
    }
  }

  async showReportData(reportResponse: any) {
    // loop on outBinds obj properties for preparing grids arrays
    Object.keys(reportResponse.procResult.outBinds).forEach((key: any) => {
      // push tab name to tabs list from third char length 4  
      this.gridsTabsList.push({
        id: key,
        text: key.substring(2, 6),
      });
      
      let columns: any = [];
      reportResponse.procResult['fields_' + key]
      .filter((field: any) => {return field.dbTypeName === 'NUMBER' || field.dbTypeName === 'DATE' || field.dbTypeName === 'VARCHAR2' || field.dbTypeName === 'CHAR';})
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
      
      let dataStore = new ArrayStore({
        data: reportResponse.procResult['rows_' + key],
        key: 'id'        
      })
      
      let dataSource = new DataSource({
        store: dataStore
      });

      this.grids.push({
        id: key,
        columns: columns,
        dataSource: dataSource,
        visible: false,
        fileName: key + '.xlsx'
      });
    });

    this.gridsTabsWidth = 80 * this.gridsTabsList.length;
    this.grids[0].visible = true;
    
    this.base64PdfStream = reportResponse.reportPdf;     
    
    this.showReport = true;    
  }
}
