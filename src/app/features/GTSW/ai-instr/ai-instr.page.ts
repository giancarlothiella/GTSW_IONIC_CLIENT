// src/app/features/GTSW/ai-instr/ai-instr.page.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
// Import GTS Components - Open Source Versions
import { GtsToolbarComponent } from '../../../core/gts-open-source/gts-toolbar/gts-toolbar.component';
import { GtsLoaderComponent } from '../../../core/gts-open-source/gts-loader/gts-loader.component';
import { GtsTabsComponent } from '../../../core/gts-open-source/gts-tabs/gts-tabs.component';
import { GtsReportsComponent } from '../../../core/gts-open-source/gts-reports/gts-reports.component';
import { GtsGridComponent } from '../../../core/gts-open-source/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts-open-source/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts-open-source/gts-form-popup/gts-form-popup.component';
import { GtsMessageComponent } from '../../../core/gts-open-source/gts-message/gts-message.component';
import { GtsAiChatComponent, AiChatConfig } from '../../../core/gts-open-source/gts-ai-chat/gts-ai-chat.component';

@Component({
  selector: 'app-aiinstr',
  standalone: true,
  imports: [
    CommonModule,
    GtsToolbarComponent,
    GtsLoaderComponent,
    GtsTabsComponent,
    GtsReportsComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsMessageComponent,
    GtsAiChatComponent
  ],
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
          [config]="chatConfig">
        </app-gts-ai-chat>
      </ng-container>
    }
  `
})
export class GTSW_AiInstrComponent implements OnInit, OnDestroy {

  private cd = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);

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
          const chatCode = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqAIInstr_chatCode');
          const chatName = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqAIInstr_chatName');
          if (chatCode) {
            this.chatConfig = {
              prjId: this.prjId,
              chatCode: chatCode,
              dialogTitle: 'AI Chat - ' + (chatName || chatCode)
            };
            this.chatDialogVisible = true;
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

}
