import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { IonApp, IonRouterOutlet, AlertController } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';

// GTS Services and Components
import { GtsDataService } from './core/services/gts-data.service';
import { GtsAiChatComponent, AiChatConfig } from './core/gts-open-source/gts-ai-chat/gts-ai-chat.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, GtsAiChatComponent],
})
export class AppComponent implements OnInit, OnDestroy {

  private gtsDataService = inject(GtsDataService);
  private cdr = inject(ChangeDetectorRef);
  private alertController = inject(AlertController);

  // AI Chat state
  aiChatVisible: boolean = false;
  aiChatConfig: AiChatConfig = { prjId: '', chatCode: '' };

  // Subscriptions
  private aiChatListenerSub: Subscription | undefined;
  private dbErrorListenerSub: Subscription | undefined;

  constructor() {}

  ngOnInit(): void {
    // Subscribe to AI Chat requests from actions
    this.aiChatListenerSub = this.gtsDataService.getAiChatListener().subscribe((request) => {
      this.handleAiChatRequest(request);
    });

    // Subscribe to database errors
    this.dbErrorListenerSub = this.gtsDataService.getDbErrorListener().subscribe((error) => {
      this.showDbErrorAlert(error.title, error.message);
    });
  }

  ngOnDestroy(): void {
    this.aiChatListenerSub?.unsubscribe();
    this.dbErrorListenerSub?.unsubscribe();
  }

  /**
   * Shows an alert dialog with database error details
   * Moves the alert to body level so it appears above PrimeNG dialogs
   */
  private async showDbErrorAlert(title: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: title,
      message: message,
      buttons: [{
        text: 'OK',
        handler: () => {
          document.body.classList.remove('gts-alert-active');
        }
      }],
      cssClass: 'db-error-alert gts-body-alert',
      backdropDismiss: false
    });

    await alert.present();

    // Move alert to body level so it can appear above PrimeNG dialogs
    // ion-alert inside ion-app can't compete with p-dialog at body level due to stacking context
    const alertElement = document.querySelector('ion-alert.db-error-alert');
    if (alertElement && alertElement.parentElement !== document.body) {
      document.body.appendChild(alertElement);
      document.body.classList.add('gts-alert-active');
    }
  }

  /**
   * Gestisce la richiesta di apertura chat AI da action (gridSetAIMode, formAIAssist)
   */
  private handleAiChatRequest(request: any): void {
    console.log('[app.component] AI Chat request received:', request);

    // Salva il contesto per usarlo quando arrivano i dati
    this.gtsDataService.setCurrentAiChatContext(request);

    // Configura la chat in modalità template (usage mode)
    this.aiChatConfig = {
      prjId: request.prjId,
      chatCode: request.chatCode,
      useTemplateMode: true,  // Non salva i nuovi messaggi
      contextType: request.type === 'grid' ? 'grid' : 'form',
      // Passa info per popolare dopo
      formId: request.formId,
      gridName: request.gridName,
      groupId: request.clFldGrpId
    };

    // Apri la chat
    this.aiChatVisible = true;
    this.cdr.detectChanges();
  }

  /**
   * Gestisce i dati ricevuti dall'AI
   */
  onAiDataReceived(event: { type: 'grid' | 'form', data: any }): void {
    console.log('[app.component] AI Data received:', event);

    const context = this.gtsDataService.getCurrentAiChatContext();
    if (!context) {
      console.warn('[app.component] No AI chat context found');
      return;
    }

    // Elabora i dati AI per popolare grid/form
    this.gtsDataService.processAiData({
      ...event,
      context: context
    });

    // Chiudi la chat e pulisci il contesto
    this.aiChatVisible = false;
    this.gtsDataService.clearCurrentAiChatContext();
    this.cdr.detectChanges();
  }

  /**
   * Gestisce la chiusura della chat (senza dati)
   */
  onAiChatVisibleChange(visible: boolean): void {
    this.aiChatVisible = visible;
    if (!visible) {
      // Se la chat viene chiusa senza inviare dati, pulisci il contesto
      this.gtsDataService.clearCurrentAiChatContext();
    }
  }
}
