import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';
import { DxPopupModule } from 'devextreme-angular/ui/popup';
import { DxTextAreaModule } from 'devextreme-angular/ui/text-area';
import { DxToolbarModule } from 'devextreme-angular/ui/toolbar';

@Component({
  selector: 'app-gts-ai',
  standalone: true,
  imports: [CommonModule, DxPopupModule, DxTextAreaModule, DxToolbarModule],
  templateUrl: './gts-ai.component.html',
  styleUrls: ['./gts-ai.component.scss']
})
export class GtsAiComponent implements OnInit, OnDestroy {

  @Input()
  prjId: string = '';

  @Input()
  formId: number = 0;

  @Input()
  instrName: string = '';

  @Input()
  popUpTitle: string = '';

  @Input()
  popUpHeigth: number = 500;

  @Input()
  popUpWidth: number = 500;

  @Input()
  popUpVisible: boolean = true;

  constructor(
    public gtsDataService: GtsDataService
  ) { }
    
  ngOnInit() {
    this.popUpTitle = 'AI - ' + this.popUpTitle;
    
    const button: any = {
      name: 'aiSend',
      widget: 'dxButton',
      location: 'after',
      locateInMenu: 'auto',   
      visible: true,  
      options: {
        text: 'Send Query to AI',   
        icon: 'send',                 
        type: 'default',
        onClick: (el: any) => {
          this.getAIinstrAnswer();
          this.popUpVisible = false;
        }
      }            
    };

    this.itemsList.push(button);      
  }

  ngOnDestroy() { 

  }

  metaData: any = {};
  aiInstr: any = {};
  jsonDataString: string = '';
  systemQuery: string = '';
  userQuery: string = '';
  itemsList: any = [];
 
  onShown() {
    this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'all', 'all');    
    this.aiInstr = this.metaData.aiInstr.filter((data: any) => data.instrName === this.instrName)[0]; 
    this.jsonDataString = JSON.stringify(this.aiInstr.instructions, null, 2);
    this.systemQuery = this.aiInstr.systemRoleQuery;
  }

  onHidden() {
    this.popUpVisible = false;
    this.gtsDataService.sendFormRequest({typeRequest: 'POPUP_HIDDEN'});
  }

  async getAIinstrAnswer() {
    const getData = {
      prjId: this.prjId,
      instrName: this.instrName,
      data: this.userQuery
    };

    const response = await this.gtsDataService.execMethod('setup', 'getAIinstrAnswer', getData);

    if (response.valid) {
      const formRequest = {
        typeRequest: 'aiInstrAnswer',
        instrName: this.instrName,
        instrData: response.parsed
      }
      this.gtsDataService.sendFormRequest(formRequest);
    }
  }
}