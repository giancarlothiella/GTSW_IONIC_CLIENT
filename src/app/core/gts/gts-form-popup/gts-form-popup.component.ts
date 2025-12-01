import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { AppInfoService } from '../../services/app-info.service';
import { DxPopupModule } from 'devextreme-angular';
import { GtsFormComponent } from '../gts-form/gts-form.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-gts-form-popup',
  standalone: true,
  imports: [CommonModule, DxPopupModule, GtsFormComponent],
  templateUrl: './gts-form-popup.component.html',
  styleUrls: ['./gts-form-popup.component.scss']
})
export class GtsFormPopupComponent implements OnInit, OnDestroy {

  constructor(
    private gtsDataService: GtsDataService,
    private appInfoService: AppInfoService
  ) { }

  @Input()
  prjId: string = '';

  @Input()
  formId: number = 0;

  @Input()
  objectName: string = '';

  private actionsDebugSubs: Subscription | undefined;

  ngOnInit() {
    this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'forms', this.objectName);

    if (this.metaData.groupHeight === 0 || this.metaData.groupHeight === undefined || this.metaData.groupHeight === null) {
      this.formHeight = 130 + this.metaData.groupRows * 42  + (this.metaData.labelMode === 'outside' && this.metaData.stylingMode === 'outlined' ? 12 : 5);
    } else {
      this.formHeight = this.metaData.groupHeight + 80;
    }

    this.formWidth = this.metaData.groupWidth + 32;
    this.formTitle = this.metaData.groupCaption;

    // Inizializza lo stato del debug e sottoscrivi ai cambiamenti
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

  //========= GLOBALS =================
  metaData: any = {};
  formHeight: number = 0;
  formWidth: number = 0;
  formTitle: string = '';
  focusComponent: any = {};
  actionsDebugActive: boolean = false;

  onFormContentReady(event: any) {
    this.gtsDataService.setFormFocus();
  }

  onFormInitialized(event: any) {
    event.component.registerKeyHandler("escape", function (arg: any) {
      arg.component.option("visible", false);
    });
  }
}
