import { Component, OnInit, OnDestroy, Input, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';
import { AppInfoService } from '../../services/app-info.service';
import DataSource from 'devextreme/data/data_source';
import ArrayStore from 'devextreme/data/array_store';
import {
  DxPopupModule,
  DxDataGridModule,
  DxButtonModule
} from 'devextreme-angular';

@Component({
  selector: 'app-gts-actions-debug',
  standalone: true,
  imports: [
    CommonModule,
    DxPopupModule,
    DxDataGridModule,
    DxButtonModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
  gridData: any = {
    dataStore: null,
    dataSource: null
  };
  focusedRowKey: any = null;
  lineNumber: number = 0;



  ngOnInit(): void {
    this.actionsEventListenerSubs = this.gtsDataService
    .getActionEventListener()
    .subscribe((data: any) => {
      if (data.debugLevel ===3) {
        const action = data.action;
        this.prjId = data.action.prjId;
        this.formId = data.action.formId;
        this.showPopup = data.visible;
        this.appInfoService.appActionsDebugShow();
        this.debugTitle = this.prjId+'/'+this.formId.toString()+' - '+action.objectName;
        this.actions = action.actions;
        this.pageRules = data.pageRules;
        this.status = 'Ready';
        
        this.actionObjectName = action.objectName;
        this.actionType = this.actions[0].actionType;
        
        let keys: any[] = [];
        keys.push('actionOrder');
        
        this.actions.forEach((action: any) => {
          // set action rowIndex = array index
          action.rowIndex = this.actions.indexOf(action);
          action.status = 'Pending';
        });
    
        const store = new ArrayStore({
          data: this.actions,
          key: keys
        });
    
        const dataSource = new DataSource({
          store: store
        });

        

        this.gridData = {
          dataStore: dataSource,
          dataSource: store,
        };

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

        this.gridComponent.refresh();
      }
    });

  }

  onDataChanged(e: any) {
    // Data changed event handler
  }

  onExecLineButtonClick(e: any) {
    this.runAction(1);
  }
  
  onExecAllButtonClick(e: any) {
    this.runAction(2);
  }

  ngOnDestroy(): void {   
    if (this.actionsEventListenerSubs) {
      this.actionsEventListenerSubs.unsubscribe();
    }
  }

  onPopupHiding(e: any) {
    if (this.canRun) {
      this.runAction(2);    
    }
    this.appInfoService.appActionsDebugHide();
  }

  onRowPrepared(e: any) {    
    if (e.rowType === 'data' && e.data) {
      this.applyRowStyling(e);
    }
  }

  private applyRowStyling(e: any) {
    // Reset degli stili
    e.rowElement.style.backgroundColor = '';
    
    // Applica nuovo stile basato su status
    switch (e.data.status) {
      case 'Executed':
        e.rowElement.style.backgroundColor = '#d0f0c0';
        break;
      case 'Pending':
        e.rowElement.style.backgroundColor = '#ffeb9c';
        break;
      case 'Locked':
        e.rowElement.style.backgroundColor = '#ffcccb';
        break;
    }
  }

  gridComponent: any = null;
  onGridInitialized(e: any) {
    this.gridComponent = e.component;
  }

  runAction(level:number) {
    this.gtsDataService.runAction(
      this.prjId,
      this.formId,
      this.actionObjectName,
      this.lineNumber,
      level
    );
  }

}
