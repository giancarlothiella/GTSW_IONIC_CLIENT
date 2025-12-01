import { Component, OnInit, OnDestroy, OnChanges, Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';
import { PageService } from '../../services/pages.service';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

@Component({
  selector: 'app-gts-pdf',
  standalone: true,
  imports: [CommonModule, NgxExtendedPdfViewerModule],
  templateUrl: './gts-pdf.component.html',
  styleUrls: ['./gts-pdf.component.scss']
})
export class GtsPdfComponent implements OnInit, OnChanges {

  @Input()
  fileName: string = '';

  @Input()
  base64PdfStream: string = '';

  visible: boolean = false;
  
  constructor(
    private pageService: PageService
  ) { }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges) {  
    if (this.fileName !== '') {  
      this.getPDFFile(this.fileName).then((data: any) => {
        this.base64PdfStream = data;
        this.visible = true;
      });
    } else if (this.base64PdfStream !== '') {
      this.visible = true;
    } 
  }

  async getPDFFile(file: string) {
    // let responseData: any = await this.pageService.getFile({
    //   file: file,
    // });
    // return responseData.contents;
  }
}
