import { Component, OnInit, OnDestroy, Input, ViewEncapsulation } from '@angular/core';
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
  styleUrls: ['./gts-form-popup.component.scss'],
  encapsulation: ViewEncapsulation.None  // Required because dialog uses appendTo="body"
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
    // Base space: dialog header (50px + 6px margin) + toolbar (44px) + padding (66px) = 166px

    if (this.metaData.groupHeight && this.metaData.groupHeight > 0) {
      // Use fixed height from metadata
      this.formHeight = this.metaData.groupHeight + 166;
    } else {
      // Calculate based on row count: 42px per row
      this.formHeight = 166 + this.metaData.groupRows * 42;

      // Add extra height for TextArea fields with custom areaHeight
      // Standard row = 36px field + 10px gap = 46px
      // TextArea rendered height is less than metadata (has internal padding)
      if (this.metaData.fields && this.metaData.fields.length > 0) {
        const standardRowHeight = 46;
        this.metaData.fields.forEach((field: any) => {
          if (field.editorType === 'TextArea' && field.areaHeight && field.areaHeight > standardRowHeight) {
            // Rendered height ≈ areaHeight - 10 (for values around 120)
            // For larger values there's more reduction, use ~85% as approximation
            const renderedHeight = field.areaHeight <= 150
              ? field.areaHeight - 10
              : field.areaHeight * 0.85;
            this.formHeight += Math.max(0, renderedHeight - standardRowHeight);
          }
        });
      }
    }

    this.formWidth = this.metaData.groupWidth + 20;
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
