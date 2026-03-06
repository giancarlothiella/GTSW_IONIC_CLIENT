import { Component, OnInit, OnDestroy, AfterViewChecked, Input, ViewChild, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-gts-html-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gts-html-view.component.html',
  styleUrls: ['./gts-html-view.component.scss']
})
export class GtsHtmlViewComponent implements OnInit, OnDestroy, AfterViewChecked {

  @Input() prjId: string = '';
  @Input() formId: number = 0;
  @Input() objectName: string = '';

  @ViewChild('htmlFrame') htmlFrame!: ElementRef<HTMLIFrameElement>;

  private gtsDataService = inject(GtsDataService);
  private cdr = inject(ChangeDetectorRef);

  metaData: any = {};
  hasContent: boolean = false;

  private htmlViewSubs: Subscription | undefined;
  private pendingHtml: string = '';
  private applied: boolean = false;

  ngOnInit() {
    this.metaData = this.gtsDataService.getPageMetaData(
      this.prjId, this.formId, 'forms', this.objectName
    );

    this.htmlViewSubs = this.gtsDataService
      .getHtmlViewListener()
      .subscribe((data: any) => {
        if (data.groupId === this.metaData?.groupId) {
          this.pendingHtml = data.html;
          this.hasContent = true;
          this.applied = false;
          this.cdr.detectChanges();
        }
      });
  }

  ngAfterViewChecked() {
    if (!this.applied && this.pendingHtml && this.htmlFrame?.nativeElement) {
      this.htmlFrame.nativeElement.srcdoc = this.pendingHtml;
      this.applied = true;
    }
  }

  ngOnDestroy() {
    this.htmlViewSubs?.unsubscribe();
  }
}
