import { Component, OnInit, OnDestroy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';
import { AppInfoService } from '../../services/app-info.service';
import { AlertController } from '@ionic/angular/standalone';

/**
 * GTS Message Component - Open Source Version
 *
 * Componente per mostrare messaggi/dialog usando Ionic Alert e Modal.
 * Supporta messaggi di tipo Question (Q), Info (I), Warning (W), Error (E).
 *
 * Compatibile con i metadati GTS esistenti e gtsDataService.
 */
@Component({
  selector: 'app-gts-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gts-message.component.html',
  styleUrls: ['./gts-message.component.scss']
})
export class GtsMessageComponent implements OnInit, OnDestroy {

  @Input() prjId: string = '';
  @Input() formId: number = 0;

  private gtsDataService = inject(GtsDataService);
  private appInfo = inject(AppInfoService);
  private alertController = inject(AlertController);

  messageListenerSubs: Subscription | undefined;
  stdMLTexts: any[] = [];
  languageId: string = this.appInfo.getLanguageId;

  textOK: string = 'OK';
  textCancel: string = 'Cancel';
  textClose: string = 'Close';

  // Globals
  message: any = {};
  text: string = '';
  visible: boolean = false;
  action: any = '';

  constructor() {}

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

        // Prepare message text
        if (this.message.msgText === '@CUSTOM') {
          this.text = this.action.customMsg;
        } else {
          this.text = this.message.msgText;
        }

        // Show the message
        this.showMessage();
      });
  }

  ngOnDestroy(): void {
    this.messageListenerSubs?.unsubscribe();
  }

  /**
   * Mostra il messaggio usando Ionic Alert
   */
  async showMessage() {
    const msgType = this.message.msgType || 'I';
    const title = this.message.msgTitle || '';
    const message = this.text || '';

    if (msgType === 'Q') {
      // Question: mostra dialog con OK e Cancel
      const alert = await this.alertController.create({
        header: title,
        message: message,
        cssClass: 'gts-message-alert gts-message-question',
        backdropDismiss: false,
        buttons: [
          {
            text: this.textCancel,
            role: 'cancel',
            cssClass: 'gts-btn-cancel',
            handler: () => {
              this.gtsDataService.setMessageStatus('Cancel');
              this.gtsDataService.runAction(
                this.prjId,
                this.formId,
                this.action.objectName,
                0,
                this.action.debugLevel
              );
            }
          },
          {
            text: this.textOK,
            cssClass: 'gts-btn-ok',
            handler: () => {
              this.gtsDataService.setMessageStatus('OK');
              this.gtsDataService.runAction(
                this.prjId,
                this.formId,
                this.action.objectName,
                0,
                this.action.debugLevel
              );
            }
          }
        ]
      });

      await alert.present();
    } else {
      // Info/Warning/Error: mostra dialog con solo Close
      const cssClass = `gts-message-alert gts-message-${msgType.toLowerCase()}`;

      const alert = await this.alertController.create({
        header: title,
        message: message,
        cssClass: cssClass,
        backdropDismiss: false,
        buttons: [
          {
            text: this.textClose,
            cssClass: 'gts-btn-close',
            handler: () => {
              this.gtsDataService.setMessageStatus('Close');
              this.gtsDataService.runAction(
                this.prjId,
                this.formId,
                this.action.objectName,
                0,
                this.action.debugLevel
              );
            }
          }
        ]
      });

      await alert.present();
    }
  }
}
