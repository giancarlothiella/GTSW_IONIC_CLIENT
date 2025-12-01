import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';
import { DxPopupModule, DxToolbarModule } from 'devextreme-angular';
import { AppInfoService } from '../../services/app-info.service';

@Component({
  selector: 'app-gts-message',
  standalone: true,
  imports: [CommonModule, DxPopupModule, DxToolbarModule],
  templateUrl: './gts-message.component.html',
  styleUrls: ['./gts-message.component.scss']
})
export class GtsMessageComponent implements OnInit, OnDestroy {
  constructor(
    private gtsDataService: GtsDataService,    
    private appInfo: AppInfoService
  ) { }

  @Input()
  prjId: string ='';

  @Input()
  formId: number = 0;

  messageListenerSubs: Subscription | undefined; 
  stdMLTexts: any[] = [];
  languageId: string = this.appInfo.getLanguageId;

  textOK: string = 'OK';
  textCancel: string = 'Cancel';
  textClose: string = 'Close';

  //========= ON INIT =================
  ngOnInit() {    

    // Show Message Listener
    this.messageListenerSubs = this.gtsDataService
    .getMessageListener()
    .subscribe((action) => {
      this.action = action;
    
      this.message = this.action.messages[0];

      // Get Standard Multilanguage Texts
      this.stdMLTexts = this.appInfo.getStdMLTexts;

      // Set Standard Multilanguage Texts 
      // for OK = -1, Cancel = -2 and Close = -3 buttons
      this.stdMLTexts
      .filter((item) => item.languageId == this.languageId)
      .forEach((item) => {
        if (item.txtId == -1) {
          this.textOK = item.text;
        } else if (item.txtId == -2) {
          this.textCancel = item.text;
        } else if (item.txtId == -3) {
          this.textClose = item.text;
        }
      });

      this.prepareToolbarData();   
      
      if (this.message.msgText === '@CUSTOM') {
        this.text = this.action.customMsg;
      } else {
        this.text = this.message.msgText;
      }
      this.text = this.text.replace(/\n/g, '<br>');
      
      this.visible = true;  
    });  
  }

  //========= ON DESTROY =================
  ngOnDestroy(): void {
    this.messageListenerSubs?.unsubscribe();
  }

  //========= GLOBALS =================
  itemsList: any[] = [];
  formHeight: number = 400;
  formWidth: number = 500;
  message: any = {};
  text: string = '';
  visible: boolean = false;
  action: any = '';
  messageImage: string = '';
  
  prepareToolbarData(): void {
    this.itemsList = [];
    this.messageImage = '/assets/images/msg_' + this.message.msgType + '.png'; // Default image

    if (this.message.msgType == 'Q') {
      this.itemsList.push({
        objectName: 'cancelButton',
        widget: 'dxButton',
        location: 'after',
        locateInMenu: 'auto',   
        options: {
          stylingMode: 'contained',            
          text: this.textCancel,
          width: 120,
          icon: '/assets/icons/stdImage_57.png',
          onClick: () => {
            this.visible = false;
            this.gtsDataService.setMessageStatus('Cancel');
            this.gtsDataService.runAction(this.prjId, this.formId, this.action.objectName, 0, this.action.debugLevel);            
          }
        }            
      });

      this.itemsList.push({
        objectName: 'okButton',
        widget: 'dxButton',
        location: 'after',
        locateInMenu: 'auto',   
        options: {
          stylingMode: 'contained',            
          text: this.textOK,
          width: 120,
          icon: '/assets/icons/stdImage_43.png',
          onClick: () => {
            this.visible = false;
            this.gtsDataService.setMessageStatus('OK');
            this.gtsDataService.runAction(this.prjId, this.formId, this.action.objectName, 0, this.action.debugLevel);
          }
        }                    
      });

    } else {
      this.itemsList = [];
      this.itemsList.push( {
        objectName: 'closeButton',
        widget: 'dxButton',
        location: 'after',
        locateInMenu: 'auto',   
        options: {
          stylingMode: 'contained',            
          text: this.textClose,
          width: 120,
          icon: '/assets/icons/stdImage_6.png',
          onClick: () => {
            this.visible = false;
            this.gtsDataService.setMessageStatus('Close');
            this.gtsDataService.runAction(this.prjId, this.formId, this.action.objectName, 0, this.action.debugLevel);            
          }
        }            
      });
    }   
  }
}
