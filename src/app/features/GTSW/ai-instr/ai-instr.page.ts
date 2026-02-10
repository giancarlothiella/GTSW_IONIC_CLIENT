// src/app/features/GTSW/ai-instr/ai-instr.page.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription, firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { environment } from '../../../../environments/environment';
// Import GTS Components - Open Source Versions
import { GtsToolbarComponent } from '../../../core/gts-open-source/gts-toolbar/gts-toolbar.component';
import { GtsLoaderComponent } from '../../../core/gts-open-source/gts-loader/gts-loader.component';
import { GtsTabsComponent } from '../../../core/gts-open-source/gts-tabs/gts-tabs.component';
import { GtsReportsComponent } from '../../../core/gts-open-source/gts-reports/gts-reports.component';
import { GtsGridComponent } from '../../../core/gts-open-source/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts-open-source/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts-open-source/gts-form-popup/gts-form-popup.component';
import { GtsMessageComponent } from '../../../core/gts-open-source/gts-message/gts-message.component';
import { GtsAiChatComponent, AiChatConfig, GridColumnInfo, FormFieldInfo } from '../../../core/gts-open-source/gts-ai-chat/gts-ai-chat.component';
// PrimeNG
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-aiinstr',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GtsToolbarComponent,
    GtsLoaderComponent,
    GtsTabsComponent,
    GtsReportsComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsMessageComponent,
    GtsAiChatComponent,
    Dialog,
    ButtonModule,
    InputText,
    InputNumber,
    ConfirmDialog,
    Toast
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    @if (!nestedFormActive) {
      <ng-container class="pageFormat">
        <app-gts-toolbar
          [prjId]="prjId"
          [formId]="formId"
          [objectName]="'mainToolbar'"
          [customData]="customData"
          (newValueEvent)="gtsDataService.toolbarSelectEvent($event)"
        ></app-gts-toolbar>
        <div [style]="viewStyle">
          @if (loading) {
            <app-gts-loader></app-gts-loader>
          }
          @for (element of metaData.tabs; track element) {
            @if (element.visible) {
              <app-gts-tabs
                [style]="'grid-area: '+element.gridArea"
                [prjId]="prjId"
                [formId]="formId"
                [objectName]="element.objectName"
              ></app-gts-tabs>
            }
          }
          @for (element of metaData.reports; track element) {
            @if (element.visible) {
              <app-gts-reports
                [style]="'grid-area: '+element.gridArea"
                [prjId]="prjId"
                [formId]="formId"
                [fieldGrpId]="element.fieldGrpId"
              ></app-gts-reports>
            }
          }
          @for (element of metaData.toolbars; track element) {
            @if (element.visible && element.objectName !== 'mainToolbar' && !element.toolbarFlagSubmit) {
              <app-gts-toolbar
                [style]="'grid-area: '+element.gridArea"
                [prjId]="prjId"
                [formId]="formId"
                [objectName]="element.objectName"
                [customCssClass]="element.customCssClass"
                (newValueEvent)="gtsDataService.toolbarSelectEvent($event)"
              ></app-gts-toolbar>
            }
          }
          @for (element of metaData.grids; track element) {
            @if (element.visible) {
              <app-gts-grid
                [style]="'grid-area: '+element.gridArea"
                [prjId]="prjId"
                [formId]="formId"
                [objectName]="element.objectName"
              ></app-gts-grid>
            }
          }
          @for (element of metaData.forms; track element) {
            @if (element.visible && !element.groupShowPopUp) {
              <app-gts-form
                [style]="'grid-area: '+element.gridArea"
                [prjId]="prjId"
                [formId]="formId"
                [objectName]="element.objectName"
              ></app-gts-form>
            }
            @if (element.visible && element.groupShowPopUp) {
              <app-gts-form-popup
                [prjId]="prjId"
                [formId]="formId"
                [objectName]="element.objectName"
              ></app-gts-form-popup>
            }
          }
        </div>
        <app-gts-message
          [prjId]="prjId"
          [formId]="formId"
        ></app-gts-message>

        <!-- AI Chat Dialog -->
        <app-gts-ai-chat
          [(visible)]="chatDialogVisible"
          [config]="chatConfig"
          (dataReceived)="onAiDataReceived($event)">
        </app-gts-ai-chat>

        <!-- Toast for notifications -->
        <p-toast></p-toast>

        <!-- Confirm Dialog for overwrite warning -->
        <p-confirmDialog></p-confirmDialog>

        <!-- AI Target Config Dialog -->
        <p-dialog
          [(visible)]="configDialogVisible"
          [modal]="true"
          [draggable]="true"
          [resizable]="false"
          [style]="{ width: '400px' }"
          [header]="configDialogMode === 'grid' ? 'AI on Grid - Config' : 'AI on Form - Config'"
          (onHide)="onConfigDialogCancel()">

          <div class="config-form">
            <!-- Shared fields -->
            <div class="field">
              <label for="targetPrjId">Target Project ID</label>
              <input pInputText id="targetPrjId" [(ngModel)]="configTarget.prjId" class="w-full" />
            </div>

            <div class="field">
              <label for="targetFormId">Target Form ID</label>
              <p-inputNumber id="targetFormId" [(ngModel)]="configTarget.formId" [showButtons]="true" class="w-full"></p-inputNumber>
            </div>

            <!-- Grid specific -->
            @if (configDialogMode === 'grid') {
              <div class="field">
                <label for="gridName">Grid Name</label>
                <input pInputText id="gridName" [(ngModel)]="configTarget.gridName" class="w-full" />
              </div>
            }

            <!-- Form specific -->
            @if (configDialogMode === 'form') {
              <div class="field">
                <label for="groupId">Group ID</label>
                <p-inputNumber id="groupId" [(ngModel)]="configTarget.groupId" [showButtons]="true" class="w-full"></p-inputNumber>
              </div>
            }
          </div>

          <ng-template pTemplate="footer">
            <p-button label="Cancel" icon="pi pi-times" severity="secondary" (onClick)="onConfigDialogCancel()"></p-button>
            <p-button label="OK" icon="pi pi-check" (onClick)="onConfigDialogConfirm()"></p-button>
          </ng-template>
        </p-dialog>
      </ng-container>
    }
  `,
  styles: [`
    .config-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .config-form .field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .config-form label {
      font-weight: 600;
      font-size: 0.9rem;
    }
    .w-full {
      width: 100%;
    }
  `]
})
export class GTSW_AiInstrComponent implements OnInit, OnDestroy {

  private cd = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  //========= PAGE PARAMS =================
  prjId = 'GTSW';
  formId = 9;

  appViewListenerSubs: Subscription | undefined;
  formReqListenerSubs: Subscription | undefined;
  pageCustomListenerSubs: Subscription | undefined;
  appLoaderListenerSubs: Subscription | undefined;

  ngOnInit(): void {
    // ======= All pages should check token =======
    if (this.authService.autoAuthUser()) {
      this.authService.checkToken();
    }

    // Loader Listener
    this.appLoaderListenerSubs = this.gtsDataService
      .getAppLoaderListener()
      .subscribe((loading) => {
        this.loading = loading;
      });

    // View Listener
    this.appViewListenerSubs = this.gtsDataService
      .getAppViewListener()
      .subscribe((actualView) => {
        this.actualView = actualView;
        this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
        this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'all', 'all');
        if (this.metaData.views.filter((view: any) => view.viewName === actualView) !== undefined &&
            this.metaData.views.filter((view: any) => view.viewName === actualView).length > 0) {
          this.viewStyle = this.metaData.views.filter((view: any) => view.viewName === actualView)[0].viewStyle;
        }
      });

    // Form Req Listener
    this.formReqListenerSubs = this.gtsDataService
      .getFormReqListener()
      .subscribe((formRequestField) => {
        const reply: any = {
          valid: true,
          message: ''
        };
        //===== START FORM REQUEST CUSTOM CODE  =====

        //===== END FORM REQUEST CODE           =====
        if (formRequestField.typeRequest !== 'EXIT') {
          this.gtsDataService.sendFormReply(reply);
        }
      });

    // Custom Code Listener
    this.pageCustomListenerSubs = this.gtsDataService
      .getPageCustomListener()
      .subscribe(async (customCode) => {
        //===== START CUSTOM CODE =====

        // Open AI Chat dialog with selected instruction
        if (customCode === 'GET_CHAT') {
          // Spegni loader prima di aprire il dialog
          this.gtsDataService.sendAppLoaderListener(false);

          // Leggi i valori dalla riga selezionata (incluso prjId che può essere diverso da this.prjId)
          const selectedPrjId = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqAIInstr_prjId');
          const chatCode = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqAIInstr_chatCode');
          const chatName = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqAIInstr_chatName');

          console.log('[ai-instr] GET_CHAT - selectedPrjId:', selectedPrjId, 'chatCode:', chatCode, 'chatName:', chatName);

          if (chatCode) {
            this.chatConfig = {
              prjId: selectedPrjId || this.prjId,  // Usa il prjId della riga selezionata, fallback a this.prjId
              chatCode: chatCode,
              dialogTitle: 'AI Chat - ' + (chatName || chatCode),
              loadExistingSession: true  // Carica sessione esistente per training (salva nuovi messaggi)
            };
            this.chatDialogVisible = true;
          } else {
            console.warn('[ai-instr] GET_CHAT: No chatCode found in pageField gtsFldqAIInstr_chatCode');
          }
        }

        // CHAT_ON_GRID - Apre dialog configurazione per AI su griglia
        if (customCode === 'CHAT_ON_GRID') {
          const selectedPrjId = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqAIInstr_prjId');
          const chatCode = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqAIInstr_chatCode');
          if (chatCode) {
            this.selectedChatCode = chatCode;
            this.configDialogMode = 'grid';
            // Usa il prjId dalla riga selezionata come default
            this.configTarget = { prjId: selectedPrjId || 'GTSW', formId: 0, gridName: '', groupId: 0 };
            this.configDialogVisible = true;
            this.gtsDataService.sendAppLoaderListener(false);
          } else {
            console.warn('[ai-instr] CHAT_ON_GRID: No chatCode selected');
            this.gtsDataService.sendAppLoaderListener(false);
          }
        }

        // CHAT_ON_FORM - Apre dialog configurazione per AI su form
        if (customCode === 'CHAT_ON_FORM') {
          const selectedPrjId = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqAIInstr_prjId');
          const chatCode = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqAIInstr_chatCode');
          if (chatCode) {
            this.selectedChatCode = chatCode;
            this.configDialogMode = 'form';
            // Usa il prjId dalla riga selezionata come default
            this.configTarget = { prjId: selectedPrjId || 'GTSW', formId: 0, gridName: '', groupId: 0 };
            this.configDialogVisible = true;
            this.gtsDataService.sendAppLoaderListener(false);
          } else {
            console.warn('[ai-instr] CHAT_ON_FORM: No chatCode selected');
            this.gtsDataService.sendAppLoaderListener(false);
          }
        }

        //===== END CUSTOM CODE =====
      });

    // Run Page
    this.gtsDataService.runPage(this.prjId, this.formId);
  }

  ngOnDestroy(): void {
    this.appViewListenerSubs?.unsubscribe();
    this.pageCustomListenerSubs?.unsubscribe();
    this.appLoaderListenerSubs?.unsubscribe();
    this.formReqListenerSubs?.unsubscribe();
  }

  //========= GLOBALS =================
  metaData: any = {};
  actualView = '';
  loading = true;
  pageData: any = {};
  viewStyle = '';
  customData: any[] = [];
  toolbarSelectedValue = '';

  nestedFormActive = false;
  nestedFormId = 0;
  nestedFormCargo: any = {};

  // AI Chat
  chatDialogVisible = false;
  chatConfig: AiChatConfig = { prjId: 'GTSW', chatCode: '' };
  currentAiTarget: { type: 'grid' | 'form', name: string } | null = null;

  // AI Config Dialog
  configDialogVisible = false;
  configDialogMode: 'grid' | 'form' = 'grid';
  configTarget = {
    prjId: 'GTSW',
    formId: 0,
    gridName: '',
    groupId: 0
  };
  selectedChatCode = '';

  // ============================================
  // AI CONFIG DIALOG METHODS
  // ============================================

  /**
   * Chiude il dialog di configurazione senza fare nulla
   */
  onConfigDialogCancel(): void {
    this.configDialogVisible = false;
    this.selectedChatCode = '';
  }

  /**
   * Conferma la configurazione e apre la chat AI
   * Deve caricare i metadati della pagina target per estrarre la struttura
   * Se esiste già una sessione per questo chatCode, chiede conferma prima di sovrascrivere
   */
  async onConfigDialogConfirm(): Promise<void> {
    // Validazione in base al modo
    if (this.configDialogMode === 'grid') {
      if (!this.configTarget.prjId || !this.configTarget.formId || !this.configTarget.gridName) {
        console.warn('[ai-instr] Config incomplete for grid:', this.configTarget);
        return;
      }
    } else {
      if (!this.configTarget.prjId || !this.configTarget.formId || !this.configTarget.groupId) {
        console.warn('[ai-instr] Config incomplete for form:', this.configTarget);
        return;
      }
    }

    // IMPORTANTE: Salva chatCode in variabile locale PRIMA di chiudere il dialog
    // perché onHide chiama onConfigDialogCancel che svuota selectedChatCode
    const chatCodeToUse = this.selectedChatCode;

    // Chiudi il dialog (questo triggera onHide -> onConfigDialogCancel)
    this.configDialogVisible = false;

    // Leggi il prjId dalla riga selezionata (quello della chat, non del target)
    const selectedPrjId = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqAIInstr_prjId');
    const chatPrjId = selectedPrjId || this.prjId;

    // Verifica se esiste già una sessione per questo chatCode
    const sessionExists = await this.checkSessionExists(chatPrjId, chatCodeToUse);

    if (sessionExists) {
      // Mostra conferma di sovrascrittura
      this.confirmationService.confirm({
        message: 'Esiste già una sessione per questa chat. Procedendo, la sessione precedente verrà sovrascritta. Continuare?',
        header: 'Conferma Sovrascrittura',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sovrascrivi',
        rejectLabel: 'Annulla',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => {
          // Prima elimina la sessione esistente, poi procedi
          this.deleteExistingSession(chatPrjId, chatCodeToUse).then(() => {
            this.proceedWithChatOpen(chatCodeToUse);
          });
        },
        reject: () => {
          this.messageService.add({
            severity: 'info',
            summary: 'Annullato',
            detail: 'Operazione annullata'
          });
        }
      });
    } else {
      // Nessuna sessione esistente, procedi direttamente
      this.proceedWithChatOpen(chatCodeToUse);
    }
  }

  /**
   * Procede con l'apertura della chat (dopo eventuale conferma)
   */
  private proceedWithChatOpen(chatCode: string): void {
    if (this.configDialogMode === 'grid') {
      this.openChatForGridRemote(
        this.configTarget.prjId,
        this.configTarget.formId,
        this.configTarget.gridName,
        chatCode
      );
    } else {
      this.openChatForFormRemote(
        this.configTarget.prjId,
        this.configTarget.formId,
        this.configTarget.groupId,
        chatCode
      );
    }
  }

  /**
   * Verifica se esiste già una sessione per il chatCode specificato
   */
  private async checkSessionExists(prjId: string, chatCode: string): Promise<boolean> {
    try {
      const url = `${environment.apiUrl}/ai-chat/template-session?prjId=${prjId}&chatCode=${chatCode}`;
      const response: any = await firstValueFrom(this.http.get(url));
      return response.valid && response.data?.session;
    } catch {
      return false;
    }
  }

  /**
   * Elimina la sessione esistente per il chatCode specificato
   */
  private async deleteExistingSession(prjId: string, chatCode: string): Promise<void> {
    try {
      // Prima ottieni la sessione per avere l'ID
      const url = `${environment.apiUrl}/ai-chat/template-session?prjId=${prjId}&chatCode=${chatCode}`;
      const response: any = await firstValueFrom(this.http.get(url));

      if (response.valid && response.data?.session?._id) {
        // Elimina la sessione
        const deleteUrl = `${environment.apiUrl}/ai-chat/session`;
        await firstValueFrom(this.http.delete(deleteUrl, {
          body: { sessionId: response.data.session._id, hardDelete: true }
        }));
        console.log('[ai-instr] Deleted existing session:', response.data.session._id);
      }
    } catch (error) {
      console.error('[ai-instr] Error deleting existing session:', error);
    }
  }

  // ============================================
  // AI CHAT METHODS
  // ============================================

  /**
   * Apre la chat AI per popolare una griglia su una pagina remota
   * Carica i metadati della pagina target per estrarre la struttura
   */
  async openChatForGridRemote(targetPrjId: string, targetFormId: number, gridName: string, chatCode: string): Promise<void> {
    this.gtsDataService.sendAppLoaderListener(true);

    try {
      // Carica i metadati della pagina target usando il metodo esistente
      await this.gtsDataService.getOtherPageData(targetPrjId, targetFormId);

      // Recupera i metadati caricati
      const targetMetaData = this.gtsDataService.getPageMetaData(targetPrjId, targetFormId, 'all', '');

      if (!targetMetaData || !targetMetaData.grids) {
        console.warn('[ai-instr] Could not load metadata for target page:', targetPrjId, targetFormId);
        this.gtsDataService.sendAppLoaderListener(false);
        return;
      }

      const gridMeta = targetMetaData.grids.find((g: any) => g.objectName === gridName);
      if (!gridMeta) {
        console.warn('[ai-instr] Grid not found in target page:', gridName, '- Available:', targetMetaData.grids?.map((g: any) => g.objectName));
        this.gtsDataService.sendAppLoaderListener(false);
        return;
      }

      // Estrai struttura colonne per l'AI
      const gridColumns: GridColumnInfo[] = (gridMeta.columns || []).map((col: any) => ({
        fieldName: col.fieldName,
        caption: col.text || col.fieldName,
        dataType: col.colType || 'String',
        required: col.allowEmpty === false
      }));

      this.currentAiTarget = { type: 'grid', name: gridName };
      this.chatConfig = {
        prjId: targetPrjId,
        formId: targetFormId,
        chatCode: chatCode,
        contextType: 'grid',
        gridName: gridName,
        gridColumns: gridColumns,
        returnDataMode: true,
        dialogTitle: `AI Import - ${gridMeta.caption || gridName}`,
        showClearButton: true
      };

      this.gtsDataService.sendAppLoaderListener(false);
      this.chatDialogVisible = true;

    } catch (error) {
      console.error('[ai-instr] Error loading target metadata:', error);
      this.gtsDataService.sendAppLoaderListener(false);
    }
  }

  /**
   * Apre la chat AI per popolare un form su una pagina remota
   * Carica i metadati della pagina target per estrarre la struttura
   */
  async openChatForFormRemote(targetPrjId: string, targetFormId: number, groupId: number, chatCode: string): Promise<void> {
    this.gtsDataService.sendAppLoaderListener(true);

    try {
      // Carica i metadati della pagina target usando il metodo esistente
      await this.gtsDataService.getOtherPageData(targetPrjId, targetFormId);

      // Recupera i metadati caricati
      const targetMetaData = this.gtsDataService.getPageMetaData(targetPrjId, targetFormId, 'all', '');

      if (!targetMetaData || !targetMetaData.forms) {
        console.warn('[ai-instr] Could not load metadata for target page:', targetPrjId, targetFormId);
        this.gtsDataService.sendAppLoaderListener(false);
        return;
      }

      const formMeta = targetMetaData.forms.find((f: any) => f.groupId === groupId);
      if (!formMeta) {
        console.warn('[ai-instr] Form not found in target page with groupId:', groupId, '- Available:', targetMetaData.forms?.map((f: any) => ({ name: f.objectName, groupId: f.groupId })));
        this.gtsDataService.sendAppLoaderListener(false);
        return;
      }

      // Estrai struttura campi per l'AI
      const formFields: FormFieldInfo[] = (formMeta.fields || []).map((field: any) => ({
        fieldName: field.objectName,
        label: field.label || field.objectName,
        fieldType: field.editorType || 'text',
        required: field.allowEmpty === false
      }));

      this.currentAiTarget = { type: 'form', name: formMeta.objectName };
      this.chatConfig = {
        prjId: targetPrjId,
        formId: targetFormId,
        chatCode: chatCode,
        contextType: 'form',
        groupId: groupId,
        formFields: formFields,
        returnDataMode: true,
        dialogTitle: `AI Assist - ${formMeta.groupCaption || formMeta.objectName}`,
        showClearButton: true
      };

      this.gtsDataService.sendAppLoaderListener(false);
      this.chatDialogVisible = true;

    } catch (error) {
      console.error('[ai-instr] Error loading target metadata:', error);
      this.gtsDataService.sendAppLoaderListener(false);
    }
  }

  /**
   * Apre la chat AI per popolare una griglia (metadati locali)
   * Estrae la struttura delle colonne dai metadati
   */
  openChatForGrid(gridName: string, chatCode: string): void {
    // Spegni loader prima di aprire il dialog
    this.gtsDataService.sendAppLoaderListener(false);

    const gridMeta = this.metaData.grids?.find((g: any) => g.objectName === gridName);
    if (!gridMeta) {
      console.warn('[ai-instr] Grid not found:', gridName, '- Available grids:', this.metaData.grids?.map((g: any) => g.objectName));
      return;
    }

    // Estrai struttura colonne per l'AI
    const gridColumns: GridColumnInfo[] = (gridMeta.columns || []).map((col: any) => ({
      fieldName: col.fieldName,
      caption: col.text || col.fieldName,
      dataType: col.colType || 'String',
      required: col.allowEmpty === false
    }));

    this.currentAiTarget = { type: 'grid', name: gridName };
    this.chatConfig = {
      prjId: this.prjId,
      formId: this.formId,
      chatCode: chatCode,
      contextType: 'grid',
      gridName: gridName,
      gridColumns: gridColumns,
      returnDataMode: true,
      dialogTitle: `AI Import - ${gridMeta.caption || gridName}`,
      showClearButton: true
    };
    this.chatDialogVisible = true;
  }

  /**
   * Apre la chat AI per popolare un form
   * Estrae la struttura dei campi dai metadati
   */
  openChatForForm(groupId: number, chatCode: string): void {
    // Spegni loader prima di aprire il dialog
    this.gtsDataService.sendAppLoaderListener(false);

    const formMeta = this.metaData.forms?.find((f: any) => f.groupId === groupId);
    if (!formMeta) {
      console.warn('[ai-instr] Form not found with groupId:', groupId, '- Available forms:', this.metaData.forms?.map((f: any) => ({ name: f.objectName, groupId: f.groupId })));
      return;
    }

    // Estrai struttura campi per l'AI
    const formFields: FormFieldInfo[] = (formMeta.fields || []).map((field: any) => ({
      fieldName: field.objectName,
      label: field.label || field.objectName,
      fieldType: field.editorType || 'text',
      required: field.allowEmpty === false
    }));

    this.currentAiTarget = { type: 'form', name: formMeta.objectName };
    this.chatConfig = {
      prjId: this.prjId,
      formId: this.formId,
      chatCode: chatCode,
      contextType: 'form',
      groupId: groupId,
      formFields: formFields,
      returnDataMode: true,
      dialogTitle: `AI Assist - ${formMeta.groupCaption || formMeta.objectName}`,
      showClearButton: true
    };
    this.chatDialogVisible = true;
  }

  /**
   * Gestisce i dati ricevuti dall'AI
   * Per grid: carica l'array nella griglia
   * Per form: popola i campi del form
   */
  onAiDataReceived(event: { type: 'grid' | 'form', data: any }): void {
    if (!this.currentAiTarget) return;

    if (event.type === 'grid' && Array.isArray(event.data)) {
      // Carica dati nella griglia
      console.log('[ai-instr] Loading AI data into grid:', this.currentAiTarget.name, event.data);
      // TODO: Implementare caricamento dati in griglia via gtsDataService
      // this.gtsDataService.setGridData(this.prjId, this.formId, this.currentAiTarget.name, event.data);
    }

    if (event.type === 'form' && typeof event.data === 'object') {
      // Popola campi form
      console.log('[ai-instr] Loading AI data into form:', this.currentAiTarget.name, event.data);
      // Imposta i valori nei pageFields
      Object.keys(event.data).forEach(fieldName => {
        this.gtsDataService.setPageFieldValue(this.prjId, this.formId, fieldName, event.data[fieldName]);
      });
      // Forza aggiornamento UI
      this.cd.detectChanges();
    }

    // Chiudi la chat dopo aver ricevuto i dati
    this.chatDialogVisible = false;
    this.currentAiTarget = null;
  }

}
