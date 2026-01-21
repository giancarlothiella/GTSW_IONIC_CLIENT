import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { AppInfoService } from '../../services/app-info.service';
import { DialogModule } from 'primeng/dialog';
import { GtsFormComponent } from '../gts-form/gts-form.component';
import { Subscription } from 'rxjs';

/**
 * GTS Form Popup Component - Open Source Version
 *
 * Wrapper component that displays GTS Form in a PrimeNG Dialog instead of DevExtreme Popup.
 * Maintains full compatibility with existing GTS metadata and services.
 */
@Component({
  selector: 'app-gts-form-popup',
  standalone: true,
  imports: [CommonModule, DialogModule, GtsFormComponent],
  templateUrl: './gts-form-popup.component.html',
  styleUrls: ['./gts-form-popup.component.scss']
})
export class GtsFormPopupComponent implements OnInit, OnDestroy {

  constructor(
    private gtsDataService: GtsDataService,
    private appInfoService: AppInfoService
  ) { }

  @Input() prjId: string = '';
  @Input() formId: number = 0;
  @Input() objectName: string = '';

  private actionsDebugSubs: Subscription | undefined;

  //========= GLOBALS =================
  metaData: any = {};
  formHeight: number = 0;
  formWidth: number = 0;
  formTitle: string = '';
  focusComponent: any = {};
  actionsDebugActive: boolean = false;
  visible: boolean = true;

  ngOnInit() {
    this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'forms', this.objectName);

    // Calculate dialog dimensions
    // 42px per row (32px field height + 10px gap between rows)
    // Base space: dialog header (50px) + toolbar (44px) + padding (56px) = 150px

    if (this.metaData.groupHeight && this.metaData.groupHeight > 0) {
      // Use fixed height from metadata
      this.formHeight = this.metaData.groupHeight + 150;
    } else {
      // Calculate based on row count: 42px per row
      this.formHeight = 150 + this.metaData.groupRows * 42;
    }

    this.formWidth = this.metaData.groupWidth + 40;
    this.formTitle = this.metaData.groupCaption;

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
    // Dialog shown - set form focus
    this.gtsDataService.setFormFocus();
  }

  onHide() {
    // Dialog hidden - notify service
    this.gtsDataService.sendFormReply({ message: 'POPUP_HIDDEN', valid: true });
  }
}
