import { Component, OnInit, OnDestroy, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { GtsItemsService } from './gts-items.service';
import { PageService } from '../../services/pages.service';
import { Subscription } from 'rxjs';
import { DxDataGridModule, DxListModule, DxResponsiveBoxModule, DxTabsModule } from 'devextreme-angular';
import { GtsPdfComponent } from '../gts-pdf/gts-pdf.component';
import DataSource from 'devextreme/data/data_source';
import ArrayStore from 'devextreme/data/array_store';

interface PageTabIcon {
  id: number;
  text: string;
  icon: string;
}

@Component({
  selector: 'app-gts-items',
  standalone: true,
  imports: [CommonModule, DxDataGridModule, DxListModule, DxResponsiveBoxModule, DxTabsModule, GtsPdfComponent],
  templateUrl: './gts-items.component.html',
  styleUrls: ['./gts-items.component.scss']
})

export class GtsItemsComponent implements OnInit {
  @Input()
  prjId: string = '';

  @Input()
  formId: number = 0;

  @Input()
  objectName: string = '';  

  @Input()
  itemsList: any[] = [];

  @Input()
  flagPdfRpt: string = 'pdf';

  @Input()
  rptParams: any = {};

  @Input()
  rptGroup: number = 0;

  screen(width: number) {
    return (width < 700) ? 'sm' : 'lg';
  }

  constructor(
    private gtsItemsService: GtsItemsService,
    private pageService: PageService
  ) { }
  
  loading: boolean = false;
  loadingText: string = 'Loading Report';
  listComponent: any;
  pdfFileName: string = '';
  showRpt: boolean = false;
  showDoc: boolean = false;
  pdfSelected: boolean = false;
  reportDataSource!: DataSource;
  reportCols: any[] = [];
  base64PdfStream: string = '';
  pageTitle: string = '';

  reportTabsIndex = 0;
  reportTabs: PageTabIcon[] = [
    { id: 0, text: 'PDF Report', icon: 'exportpdf' },
    { id: 1, text: 'Report Data', icon: 'detailslayout' },
  ];

  selectReportTab(e: any) {
    this.reportTabsIndex = e.itemIndex;
  }

  ngOnInit(): void { 
    this.loading = true;
    if (this.flagPdfRpt === 'pdf') {  
      this.showPdf();
      if (this.itemsList.length === 1) {
        this.pdfFileName = this.itemsList[0].file;
        this.pdfSelected = true;        
      }
      this.loading = false;
    } else {
      this.getReportList();
    }
  }

  async getReportList() {
    let reports = await this.gtsItemsService.getReportList(this.prjId, this.formId, this.rptGroup);
    this.itemsList = [];
    reports.forEach((report: any) => {
      this.itemsList.push({
        file: report.RPTHDR_CODE,
        text: report.RPTHDR_DESCR
      }); 
    }); 
    
    if (this.itemsList.length === 1) {
      this.loadingText = this.itemsList[0].text;
      if (await this.getReport(this.itemsList[0].file)) {
        this.showPdf();
        this.pdfSelected = true;   
        this.loading = false; 
      }
    }
  } 

  showPdf() {
    if (this.flagPdfRpt === 'pdf') {
      this.pageTitle = 'Documents';
      this.showRpt = false;
      this.showDoc = true;
    }
    else {
      this.pageTitle = 'Reports';
      this.showRpt = true;
      this.showDoc = false;
    }
  }

  async onItemClick(e: any) {
    if (this.flagPdfRpt === 'pdf') {
      this.pdfFileName = e.addedItems[0].file;
      this.pdfSelected = true;    
    } else {
      this.loadingText = e.addedItems[0].text;
      if (await this.getReport(e.addedItems[0].file)) {
        this.showPdf();
        this.pdfSelected = true;    
      }
    }
  }

  async getReport(rptCode: string) {
    this.loading = true;
    const responseData = await this.gtsItemsService.getReport(rptCode, this.rptParams);
    if (responseData.valid) {
      this.base64PdfStream = responseData.contents;
      // this.reportCols = this.pageService.getOraColumnsArray(
      //   responseData.fields
      // );
      this.reportDataSource = new DataSource({
        store: new ArrayStore({
          data: responseData.rows,
        }),
      });
    }
    this.loading = false;
    return responseData.valid;
  }

  onListInitialized(e: any) {
    this.listComponent = e.component;

    if (this.itemsList.length === 1) {
      this.listComponent.selectItem(this.itemsList[0]);
    }
  }
}
