import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { DxTabsModule } from 'devextreme-angular';

@Component({
  selector: 'app-gts-tabs',
  standalone: true,
  imports: [CommonModule, DxTabsModule],
  templateUrl: './gts-tabs.component.html',
  styleUrls: ['./gts-tabs.component.scss']
})
export class GtsTabsComponent implements OnInit {

  @Input()
  prjId: string = '';

  @Input()
  formId: number = 0;

  @Input()
  objectName: string = '';  

  

  constructor(
    private gtsDataService: GtsDataService
  ) {}

  ngOnInit(): void {
    this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'tabs', this.objectName);
    this.prepareTabs();
    
    if (this.metaData.tabIndex === undefined) {
      this.tabsIndex = 0;
      this.metaData.tabIndex = this.tabsIndex;
    } else {
      this.tabsIndex = this.metaData.tabIndex;
    }
    
    if (this.tabsList[this.tabsIndex].actionName !== undefined && this.tabsList[this.tabsIndex].actionName !== null && this.tabsList[this.tabsIndex].actionName !== '') { 
      this.gtsDataService.runAction(this.prjId, this.formId, this.tabsList[this.tabsIndex].actionName);
    }
  }

  //========= GLOBALS =================
  metaData: any = {};
  actualView: string = '';
  pageData: any = {}; 

  //========= TOOLBAR DATA =================  
  tabsList: any[] = [];
  tabsIndex: number = -1;
  tabsWidth: number = 0;
  
  //========= TOOLBAR METHODS =================
  prepareTabs() {
    this.tabsList = [];
    this.metaData.tabsData.forEach((tab: any) => {
      this.tabsList.push({
        id: tab.id,
        text: tab.text,
        icon: '/assets/icons/icon_'+tab.iconId+'.svg',          
        visible: tab.visible,
        disabled: tab.disabled,  
        actionName: tab.actionName,
        tabIndex: 0
      });
    });

    this.tabsWidth = 200 * this.tabsList.length;
  }

  onTabClick(e: any) {
    if (this.tabsIndex !== e.itemIndex) {
      this.tabsIndex = e.itemIndex;
      this.metaData.tabIndex = this.tabsIndex;
      if (this.tabsList[this.tabsIndex].actionName !== undefined && this.tabsList[this.tabsIndex].actionName !== null && this.tabsList[this.tabsIndex].actionName !== '') { 
        this.gtsDataService.runAction(this.prjId, this.formId, this.tabsList[this.tabsIndex].actionName);
      } else {
        this.gtsDataService.refreshActualView(this.prjId, this.formId);
      }
    }    
  }
}
