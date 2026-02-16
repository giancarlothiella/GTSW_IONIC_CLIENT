import { Component, OnInit, OnDestroy, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { AppInfoService } from '../../services/app-info.service';
import { DialogModule } from 'primeng/dialog';
import { GtsGridComponent } from '../gts-grid/gts-grid.component';
import { GtsToolbarComponent } from '../gts-toolbar/gts-toolbar.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-gts-grid-popup',
  standalone: true,
  imports: [CommonModule, DialogModule, GtsGridComponent, GtsToolbarComponent],
  templateUrl: './gts-grid-popup.component.html',
  styleUrls: ['./gts-grid-popup.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GtsGridPopupComponent implements OnInit, OnDestroy {

  constructor(
    public gtsDataService: GtsDataService,
    private appInfoService: AppInfoService
  ) { }

  @Input() prjId: string = '';
  @Input() formId: number = 0;
  @Input() objectName: string = '';

  private actionsDebugSubs: Subscription | undefined;

  metaData: any = {};
  gridHeight: number = 0;
  gridWidth: number = 0;
  gridTitle: string = '';
  showToolbar: boolean = false;
  actionsDebugActive: boolean = false;
  visible: boolean = true;

  ngOnInit() {
    this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'grids', this.objectName);

    // Dialog dimensions from grid metadata
    // Add space for: dialog header (56px) + toolbar (44px if present) + padding (20px)
    const toolbarMeta = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'toolbars', this.objectName);
    this.showToolbar = !!(toolbarMeta && toolbarMeta.itemsList && toolbarMeta.itemsList.length > 0);

    const headerSpace = 56;
    const toolbarSpace = this.showToolbar ? 44 : 0;
    const padding = 20;

    this.gridHeight = (this.metaData.height || 400) + headerSpace + toolbarSpace + padding;
    this.gridWidth = (this.metaData.width || 600) + 20;
    this.gridTitle = this.metaData.caption || '';

    // Subscribe to debug mode changes
    this.actionsDebugActive = this.appInfoService.appActionsDebug;
    this.actionsDebugSubs = this.appInfoService.getAppActionsDebugListener().subscribe((active) => {
      this.actionsDebugActive = active;
    });
  }

  ngOnDestroy() {
    if (this.actionsDebugSubs) {
      this.actionsDebugSubs.unsubscribe();
    }
  }

  onShow() {
    // Dialog shown
  }

  onHide() {
    // Dialog hidden - notify service
    this.gtsDataService.sendFormReply({ message: 'POPUP_HIDDEN', valid: true });
  }
}
