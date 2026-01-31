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
   * Sposta l'alert a livello body per apparire sopra i dialog PrimeNG
   */
  async showMessage() {
    const msgType = this.message.msgType || 'I';
    const title = this.message.msgTitle || '';
    const message = this.text || '';

    if (msgType === 'Q') {
      // Question: mostra dialog con OK e Cancel
      // Cancel è il default (safe option) - focus su Cancel, Enter per confermare
      const alert = await this.alertController.create({
        header: title,
        message: message,
        cssClass: 'gts-message-alert gts-message-question gts-body-alert',
        backdropDismiss: false,
        buttons: [
          {
            text: this.textCancel,
            role: 'cancel',
            cssClass: 'gts-btn-cancel',
            handler: () => {
              document.body.classList.remove('gts-alert-active');
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
              document.body.classList.remove('gts-alert-active');
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
      this.moveAlertToBody(alert);

      // Focus Cancel button by default (safe option)
      // User must Tab+Enter to confirm OK (prevents accidental destructive actions)
      this.focusCancelButton();
    } else {
      // Info/Warning/Error: mostra dialog con solo Close
      const cssClass = `gts-message-alert gts-message-${msgType.toLowerCase()} gts-body-alert`;

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
              document.body.classList.remove('gts-alert-active');
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
      this.moveAlertToBody(alert);

      // Focus Close button so Enter key works
      this.focusAlertButton();
    }
  }

  /**
   * Sposta l'alert a livello body per evitare problemi di stacking context
   */
  private moveAlertToBody(alert: any): void {
    // Usa setTimeout per assicurarsi che l'elemento sia nel DOM
    setTimeout(() => {
      const alertElement = document.querySelector('ion-alert.gts-message-alert:not(.overlay-hidden)');
      if (alertElement && alertElement.parentElement !== document.body) {
        document.body.appendChild(alertElement);
        document.body.classList.add('gts-alert-active');
      }
    }, 50);
  }

  // Store reference to keyboard handler for cleanup
  private currentKeyHandler: ((event: KeyboardEvent) => void) | null = null;

  /**
   * Setup keyboard navigation for Question dialogs
   * - Cancel button is focused by default (safe option)
   * - Enter clicks the focused button
   * - Tab navigates between buttons
   */
  private focusCancelButton(): void {
    setTimeout(() => {
      const alertElement = document.querySelector('ion-alert.gts-message-question') as HTMLElement;
      if (!alertElement) return;

      const buttons = alertElement.querySelectorAll('.alert-button-group button.alert-button');

      // Find Cancel and OK buttons
      let cancelButton: HTMLButtonElement | null = null;
      let okButton: HTMLButtonElement | null = null;

      buttons.forEach((btn: Element) => {
        const button = btn as HTMLButtonElement;
        if (button.classList.contains('gts-btn-cancel')) {
          cancelButton = button;
        } else if (button.classList.contains('gts-btn-ok')) {
          okButton = button;
        }
      });

      // Fallback: first button is Cancel, second is OK
      if (!cancelButton && buttons.length > 0) {
        cancelButton = buttons[0] as HTMLButtonElement;
      }
      if (!okButton && buttons.length > 1) {
        okButton = buttons[1] as HTMLButtonElement;
      }

      // Track which button is "selected" (Cancel by default)
      let selectedButton: HTMLButtonElement | null = cancelButton;

      // Add visual selection class
      if (cancelButton) {
        cancelButton.classList.add('button-selected');
      }

      // Remove any previous handler
      if (this.currentKeyHandler) {
        document.removeEventListener('keydown', this.currentKeyHandler, true);
      }

      // Handle keyboard events at document level with capture
      this.currentKeyHandler = (event: KeyboardEvent) => {
        // Only handle if alert is still visible
        if (!document.querySelector('ion-alert.gts-message-question')) {
          document.removeEventListener('keydown', this.currentKeyHandler!, true);
          this.currentKeyHandler = null;
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          if (selectedButton) {
            selectedButton.click();
          }
          document.removeEventListener('keydown', this.currentKeyHandler!, true);
          this.currentKeyHandler = null;
        } else if (event.key === 'Tab') {
          event.preventDefault();
          event.stopPropagation();

          // Toggle selection between Cancel and OK
          if (selectedButton === cancelButton && okButton) {
            cancelButton?.classList.remove('button-selected');
            okButton.classList.add('button-selected');
            selectedButton = okButton;
          } else if (selectedButton === okButton && cancelButton) {
            okButton?.classList.remove('button-selected');
            cancelButton.classList.add('button-selected');
            selectedButton = cancelButton;
          }
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          if (cancelButton) {
            cancelButton.click();
          }
          document.removeEventListener('keydown', this.currentKeyHandler!, true);
          this.currentKeyHandler = null;
        }
      };

      document.addEventListener('keydown', this.currentKeyHandler, true);
    }, 150);
  }

  /**
   * Setup keyboard navigation for Info/Warning/Error dialogs
   * - Close button is focused, Enter clicks it
   */
  private focusAlertButton(): void {
    setTimeout(() => {
      const alertElement = document.querySelector('ion-alert.gts-message-alert:not(.gts-message-question)') as HTMLElement;
      if (!alertElement) return;

      const button = alertElement.querySelector('.alert-button-group button.alert-button') as HTMLButtonElement;
      if (!button) return;

      button.classList.add('button-selected');

      // Remove any previous handler
      if (this.currentKeyHandler) {
        document.removeEventListener('keydown', this.currentKeyHandler, true);
      }

      // Handle keyboard events at document level with capture
      this.currentKeyHandler = (event: KeyboardEvent) => {
        // Only handle if alert is still visible
        if (!document.querySelector('ion-alert.gts-message-alert:not(.gts-message-question)')) {
          document.removeEventListener('keydown', this.currentKeyHandler!, true);
          this.currentKeyHandler = null;
          return;
        }

        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          button.click();
          document.removeEventListener('keydown', this.currentKeyHandler!, true);
          this.currentKeyHandler = null;
        }
      };

      document.addEventListener('keydown', this.currentKeyHandler, true);
    }, 150);
  }
}
