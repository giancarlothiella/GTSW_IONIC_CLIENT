import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';
import { AppInfoService } from '../../services/app-info.service';
import {
  IonButton,
  IonIcon
} from '@ionic/angular/standalone';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

/**
 * GTS Actions Debug Component - Open Source Version
 *
 * Componente per il debug step-by-step delle azioni.
 * Mostra le azioni in esecuzione con possibilità di eseguirle una alla volta o tutte insieme.
 *
 * Sostituisce DevExtreme con:
 * - DxPopup → PrimeNG Dialog (non-modale, draggable)
 * - DxDataGrid → PrimeNG Table
 * - DxButton → PrimeNG Button / IonButton
 */
@Component({
  selector: 'app-gts-actions-debug',
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonIcon,
    TableModule,
    DialogModule,
    ButtonModule
  ],
  templateUrl: './gts-actions-debug.component.html',
  styleUrls: ['./gts-actions-debug.component.scss']
})
export class GtsActionsDebugComponent implements OnInit, OnDestroy {
  private gtsDataService = inject(GtsDataService);
  private appInfoService = inject(AppInfoService);

  actionsEventListenerSubs: Subscription = new Subscription();

  showPopup: boolean = false;
  debugTitle: string = 'Actions Debug';
  pageRules: any[] = [];
  status: string = '';
  canRun: boolean = true;

  actionObjectName: string = '';
  actionType: string = '';
  prjId: string = '';
  formId: number = 0;

  actions: any[] = [];
  lineNumber: number = 0;

  ngOnInit(): void {
    this.actionsEventListenerSubs = this.gtsDataService
      .getActionEventListener()
      .subscribe((data: any) => {
        if (data.debugLevel === 3) {
          const action = data.action;
          this.prjId = data.action.prjId;
          this.formId = data.action.formId;
          this.showPopup = data.visible;
          this.appInfoService.appActionsDebugShow();
          this.debugTitle = this.prjId + '/' + this.formId.toString() + ' - ' + action.objectName;
          this.actions = action.actions;
          this.pageRules = data.pageRules;
          this.status = 'Ready';

          this.actionObjectName = action.objectName;
          this.actionType = this.actions[0].actionType;

          this.actions.forEach((action: any, index: number) => {
            // set action rowIndex = array index
            action.rowIndex = index;
            action.status = 'Pending';
          });

          this.lineNumber = data.index;
        } else {
          this.lineNumber = data.index;

          if (data.actionCompleted) {
            this.status = 'Completed';
            this.actionType = '';
          } else {
            this.status = 'Running';
            this.actionType = this.actions[this.lineNumber].actionType;
          }

          this.actions.forEach((action: any) => {
            if (action.rowIndex < data.index) {
              if (action.status === 'Pending') {
                if (data.elementActive) {
                  action.status = 'Executed';
                } else {
                  action.status = 'Locked';
                }
              }
            }
          });

          this.canRun = data.actionCanRun;
          if (!this.canRun) {
            this.status = 'Completed';
            this.actionType = '';
            this.actions.forEach((action: any) => {
              if (action.status === 'Pending') {
                action.status = 'Locked';
              }
            });
          }
        }
      });
  }

  onExecLineButtonClick() {
    this.runAction(1);
  }

  onExecAllButtonClick() {
    this.runAction(2);
  }

  ngOnDestroy(): void {
    if (this.actionsEventListenerSubs) {
      this.actionsEventListenerSubs.unsubscribe();
    }
  }

  onPopupHiding() {
    if (this.canRun) {
      this.runAction(2);
    }
    this.showPopup = false;
    this.appInfoService.appActionsDebugHide();
  }

  getRowClass(rowData: any): string {
    switch (rowData.status) {
      case 'Executed':
        return 'row-executed';
      case 'Pending':
        return 'row-pending';
      case 'Locked':
        return 'row-locked';
      default:
        return '';
    }
  }

  runAction(level: number) {
    this.gtsDataService.runAction(
      this.prjId,
      this.formId,
      this.actionObjectName,
      this.lineNumber,
      level
    );
  }
}
