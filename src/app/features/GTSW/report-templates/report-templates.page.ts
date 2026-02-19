import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { TranslationService } from '../../../core/services/translation.service';
import { Subscription } from 'rxjs';
import {
  mapOracleDataForTemplateBuilder,
  mapOracleMetadataForTemplateBuilder,
  extractSessionData
} from '../logs/helpers/oracle-data-mapper.helper';

// Import GTS Components - Open Source Versions
import { GtsLoaderComponent } from '../../../core/gts-open-source/gts-loader/gts-loader.component';
import { GtsToolbarComponent } from '../../../core/gts-open-source/gts-toolbar/gts-toolbar.component';
import { GtsTabsComponent } from '../../../core/gts-open-source/gts-tabs/gts-tabs.component';
import { GtsGridComponent } from '../../../core/gts-open-source/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts-open-source/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts-open-source/gts-form-popup/gts-form-popup.component';
import { GtsMessageComponent } from '../../../core/gts-open-source/gts-message/gts-message.component';

// PrimeNG
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-report-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    // GTS Components
    GtsLoaderComponent,
    GtsToolbarComponent,
    GtsTabsComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsMessageComponent,

    // PrimeNG
    Dialog,
    InputNumber,
    ButtonModule
  ],
  templateUrl: './report-templates.page.html',
  styleUrls: ['./report-templates.page.scss']
})
export class GTSW_ReportTemplatesComponent implements OnInit, OnDestroy {
  //========= PAGE PARAMS =================
  prjId: string = 'GTSW';
  formId: number = 12;

  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);
  private router = inject(Router);
  private ts = inject(TranslationService);

  /**
   * Ottiene un testo tradotto
   * @param txtId ID del testo
   * @param fallback Testo di fallback se non trovato
   */
  t(txtId: number, fallback: string = ''): string {
    return this.ts.getText(txtId, fallback);
  }

  constructor() {
    addIcons({ arrowBackOutline });
  }

  appViewListenerSubs: Subscription | undefined;
  formReqListenerSubs: Subscription | undefined;
  pageCustomListenerSubs: Subscription | undefined;
  appLoaderListenerSubs: Subscription | undefined;
  toolbarListenerSubs: Subscription | undefined;

  ngOnInit(): void {
    // Controlla se siamo tornati dal template builder con stato da ripristinare
    this.checkReturnState();

    // Loader Listener
    this.appLoaderListenerSubs = this.gtsDataService
    .getAppLoaderListener()
    .subscribe((loading) => {
      this.loading = loading;
    })

    // View Listener
    this.appViewListenerSubs = this.gtsDataService
    .getAppViewListener()
    .subscribe((actualView) => {
      if (actualView !== undefined && actualView !== '') {
        this.actualView = actualView;
        this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
        this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'all', 'all');
        if (this.metaData.views.filter((view: any) => view.viewName === actualView)[0] !== undefined)
          this.viewStyle = this.metaData.views.filter((view: any) => view.viewName === actualView)[0].viewStyle;
      }
    });

    // Form Req Listener
    this.formReqListenerSubs = this.gtsDataService
    .getFormReqListener()
    .subscribe((formRequest) => {
      let reply: any = {
        valid: true
      };

      //===== START FORM REQUEST CUSTOM CODE =====

      //===== END FORM REQUEST CUSTOM CODE =====
      this.gtsDataService.sendFormReply(reply);
    });

    // Custom Code Listener
    this.pageCustomListenerSubs = this.gtsDataService
    .getPageCustomListener()
    .subscribe(async (event) => {
      //===== START CUSTOM CODE =====

      // Riattiva il loader per il custom code
      this.gtsDataService.sendAppLoaderListener(true);

      await this.getCustomData(this.prjId, this.formId, event.customCode, this.actualView);

      // Disattiva il loader dopo il custom code
      setTimeout(() => {
        this.gtsDataService.sendAppLoaderListener(false);
      }, 300);

      // Run next action if specified
      if (event.actionName) {
        this.gtsDataService.runAction(this.prjId, this.formId, event.actionName);
      }

      //===== END CUSTOM CODE =====
    });

    // Toolbar Events Listener
    this.toolbarListenerSubs = this.gtsDataService
    .getToolbarEventListener()
    .subscribe((data) => {
      //===== START CUSTOM_TOOLBAR_EVENT_CODE =====

      this.toolbarSelectedValue = data.selectedValue;
      this.customData[0].value = this.toolbarSelectedValue;
      this.gtsDataService.runAction(this.prjId, this.formId, 'projectDS');

      //===== END CUSTOM_TOOLBAR_EVENT_CODE =====
    });


    // CUSTOM DATA
    this.customData = [{
      type: 'select',
      label: 'Project: ',
      items: null,
      value: null,
      field: 'prjId',
    }];

    // Run Page with hardcoded formId
    this.gtsDataService.runPage(this.prjId, this.formId);
  }

  ngOnDestroy(): void {
    this.appViewListenerSubs?.unsubscribe();
    this.pageCustomListenerSubs?.unsubscribe();
    this.appLoaderListenerSubs?.unsubscribe();
    this.formReqListenerSubs?.unsubscribe();
    this.toolbarListenerSubs?.unsubscribe();
  }

  //========= GLOBALS =================
  metaData: any = {};
  actualView: string = '';
  loading: boolean = true;
  pageData: any = {};
  viewStyle: string = '';
  customData: any[] = [];
  toolbarSelectedValue = '';
  pendingRestoreProject: string | null = null;  // Progetto da ripristinare al ritorno dal template builder

  // Session ID Dialog
  showSessionIdDialog: boolean = false;
  sessionIdInput: number | null = null;
  pendingTemplateRow: any = null;  // Template row in attesa di conferma

  //========= PAGE FUNCTIONS =================
  async getCustomData(prjId: string, formId: number, customCode: string, actualView: string) {
    //===== START CUSTOM CODE =====

    if (customCode === 'setCtxProject') {
      // Se abbiamo un progetto pendente da ripristinare (ritorno dal template builder), usalo
      // Altrimenti usa il primo progetto dalla lista
      if (this.pendingRestoreProject) {
        this.toolbarSelectedValue = this.pendingRestoreProject;
        this.pendingRestoreProject = null; // Reset dopo l'uso
        console.log('[setCtxProject] Restored project from pendingRestoreProject:', this.toolbarSelectedValue);
      } else {
        this.toolbarSelectedValue = this.pageData
          .filter((element: any) => element.dataAdapter === 'daProjects')[0]
          .data[0]
          .rows[0].prjId;
      }

      this.metaData.pageFields
        .filter((field: any) => field.pageFieldName === 'gtsFldqProjects_prjId')[0].value = this.toolbarSelectedValue;

      const qProjects = this.pageData
        .filter((element: any) => element.dataAdapter === 'daProjects')[0]
        .data[0]
        .rows;
      this.customData[0].value = this.toolbarSelectedValue;
      this.customData[0].items = qProjects;

      this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'gtsFldqProjects_prjId')[0].value = this.toolbarSelectedValue;
      this.filterProject('gtsGridTemplates', this.toolbarSelectedValue, 'qTemplates');
      this.filterProject('gtsGridSessions', this.toolbarSelectedValue, 'qSessions');
    }

    if (customCode === 'setCtxProject2') {
      this.toolbarSelectedValue = this.metaData.pageFields
        .filter((field: any) => field.pageFieldName === 'gtsFldqProjects_prjId')[0].value;

      this.customData[0].value = this.toolbarSelectedValue;
      this.filterProject('gtsGridTemplates', this.toolbarSelectedValue, 'qTemplates');
      this.filterProject('gtsGridSessions', this.toolbarSelectedValue, 'qSessions');
    }

    if (customCode === 'REFRESH_GRID_OBJS') {
      this.gtsDataService.sendGridReload('qTemplates');
      this.gtsDataService.sendGridReload('qSessions');
    }

    if (customCode === 'SHOW_AI_BUILDER') {
      console.log('[SHOW_AI_BUILDER] Starting...');
      const row = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daTemplates', 'qSessions');
      console.log('[SHOW_AI_BUILDER] Selected row:', row);

      if (!row) {
        alert('Seleziona una sessione dalla griglia');
        return;
      }

      this.gtsDataService.sendAppLoaderListener(true);

      // Carica i dati del report per passarli al builder
      const report = {
        sessionId: row.sessionId,
        fieldGrpId: row.fieldGrpId,
        reportCode: row.reportCode,
        reportName: row.reportName,
        sqlId: row.sqlId,
      };
      console.log('[SHOW_AI_BUILDER] Report object:', report);

      await this.gtsDataService.getOtherPageData(row.prjId, row.formId);
      console.log('[SHOW_AI_BUILDER] Calling getReportData with prjId:', row.prjId, 'formId:', row.formId, 'params:', row.params, 'connCode:', row.connCode);
      const reportData = await this.gtsDataService.getReportData(row.prjId, row.formId, report, row.params, row.connCode, false, true);
      console.log('[SHOW_AI_BUILDER] getReportData response:', reportData);

      if (reportData && reportData.valid) {
        console.log('[SHOW_AI_BUILDER] Report data is valid, calling mappers...');
        // Usa helper per mappare i dati
        const oracleData = mapOracleDataForTemplateBuilder(reportData);
        const oracleMetadata = mapOracleMetadataForTemplateBuilder(reportData);
        const sessionData = extractSessionData(row);

        console.log('[SHOW_AI_BUILDER] Final mapped data:');
        console.log('[SHOW_AI_BUILDER] - sessionData:', sessionData);
        console.log('[SHOW_AI_BUILDER] - oracleData:', oracleData);
        console.log('[SHOW_AI_BUILDER] - oracleMetadata:', oracleMetadata);

        this.gtsDataService.sendAppLoaderListener(false);

        // Naviga alla pagina Template Builder
        // Estrai il PDF dalla risposta (se presente)
        const reportPdf = reportData.reportPdf || null;
        console.log('[SHOW_AI_BUILDER] reportPdf available:', !!reportPdf, reportPdf ? `(${reportPdf.length} chars)` : '');

        console.log('[SHOW_AI_BUILDER] Navigating to /GTSW/templateBuilder with state...');
        this.router.navigate(['/GTSW/templateBuilder'], {
          state: {
            sessionData: sessionData,
            oracleData: oracleData,
            oracleMetadata: oracleMetadata,
            fastReportPdf: reportPdf
          }
        });
      } else {
        console.log('[SHOW_AI_BUILDER] Report data invalid or null:', reportData);
        this.gtsDataService.sendAppLoaderListener(false);
        alert('Errore caricamento dati report: ' + (reportData?.message || 'Errore sconosciuto'));
      }
    }

    // AI_BUILD_NOPDF: Come SHOW_AI_BUILDER ma senza PDF automatico
    // L'utente dovrà caricare manualmente il PDF nel template builder
    // Usato quando la sessione ha i metadati ma il PDF viene generato esternamente
    if (customCode === 'AI_BUILD_NOPDF') {
      console.log('[AI_BUILD_NOPDF] Starting...');
      const row = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daTemplates', 'qSessions');
      console.log('[AI_BUILD_NOPDF] Selected row:', row);

      if (!row) {
        alert('Seleziona una sessione dalla griglia');
        return;
      }

      this.gtsDataService.sendAppLoaderListener(true);

      // Carica i dati del report per passarli al builder (senza generare PDF)
      const report = {
        sessionId: row.sessionId,
        fieldGrpId: row.fieldGrpId,
        reportCode: row.reportCode,
        reportName: row.reportName,
        sqlId: row.sqlId,
      };

      await this.gtsDataService.getOtherPageData(row.prjId, row.formId);
      // Passa false per skipPdf per ottenere solo i dati senza generare PDF
      const reportData = await this.gtsDataService.getReportData(row.prjId, row.formId, report, row.params, row.connCode, false, false);
      console.log('[AI_BUILD_NOPDF] getReportData response:', reportData);

      if (reportData && reportData.valid) {
        // Usa helper per mappare i dati
        const oracleData = mapOracleDataForTemplateBuilder(reportData);
        const oracleMetadata = mapOracleMetadataForTemplateBuilder(reportData);
        const sessionData = extractSessionData(row);

        console.log('[AI_BUILD_NOPDF] Mapped data ready, navigating without PDF...');

        this.gtsDataService.sendAppLoaderListener(false);

        // Naviga alla pagina Template Builder SENZA PDF
        // L'utente dovrà caricare il PDF manualmente
        this.router.navigate(['/GTSW/templateBuilder'], {
          state: {
            sessionData: sessionData,
            oracleData: oracleData,
            oracleMetadata: oracleMetadata,
            fastReportPdf: null,  // Nessun PDF automatico
            requireManualPdf: true  // Flag per indicare che serve upload manuale
          }
        });
      } else {
        console.log('[AI_BUILD_NOPDF] Report data invalid or null:', reportData);
        this.gtsDataService.sendAppLoaderListener(false);
        alert('Errore caricamento dati report: ' + (reportData?.message || 'Errore sconosciuto'));
      }
    }

    // NEW_TEMPLATE: Apre il template builder mostrando le card di selezione modalità
    if (customCode === 'NEW_TEMPLATE') {
      console.log('[NEW_TEMPLATE] Navigating to template builder (mode selection)...');
      this.router.navigate(['/GTSW/templateBuilder'], {
        state: {
          returnTo: this.getReturnToState()
        }
      });
    }

    // GET_TEMPLATE: Apre direttamente il template selezionato dalla grid qTemplates
    // Opzionalmente chiede un sessionId per caricare dati reali come mock data
    if (customCode === 'GET_TEMPLATE') {
      const row = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daTemplates', 'qTemplates');

      if (row && row.reportCode && row.prjId && row.connCode) {
        // Salva il row e apri la dialog per chiedere sessionId
        this.pendingTemplateRow = row;
        this.sessionIdInput = null;
        this.showSessionIdDialog = true;
      } else {
        alert('Seleziona un template dalla griglia');
      }
    }

    // SEARCH_TEMPLATE: Apre il template builder mostrando la dialog di ricerca
    if (customCode === 'SEARCH_TEMPLATE') {
      console.log('[SEARCH_TEMPLATE] Navigating to template builder (load dialog)...');
      this.router.navigate(['/GTSW/templateBuilder'], {
        state: {
          showLoadDialog: true,
          returnTo: this.getReturnToState()
        }
      });
    }

    //===== END CUSTOM CODE =====
  }

  // METHODS
  filterProject(objectName: string, selectedValue: any, dataSetName: string) {
    // Set filter on dataSet first
    if (this.metaData.dataSets) {
      this.metaData.dataSets.forEach((dataSet: any) => {
        if (dataSet.dataSetName === dataSetName) {
          dataSet.filterObject = { 'prjId': selectedValue };
        }
      });
    }

    // Reload grid to apply the new filter (PrimeNG version)
    this.gtsDataService.sendGridReload(dataSetName);
  }

  /**
   * Controlla se siamo tornati dal template builder e ripristina lo stato
   */
  private checkReturnState(): void {
    const state = window.history.state;
    if (state && state.restoreProject) {
      console.log('[checkReturnState] Restoring project:', state.restoreProject);
      this.pendingRestoreProject = state.restoreProject;
    }
  }

  /**
   * Crea l'oggetto returnTo con lo stato corrente da passare al template builder
   */
  private getReturnToState(): { route: string; project: string } {
    return {
      route: '/GTSW/reporttemplates',
      project: this.toolbarSelectedValue
    };
  }

  /**
   * Conferma la selezione del template dalla dialog sessionId
   */
  async confirmLoadTemplate(): Promise<void> {
    this.showSessionIdDialog = false;

    if (!this.pendingTemplateRow) return;

    const row = this.pendingTemplateRow;
    this.pendingTemplateRow = null;

    if (this.sessionIdInput && this.sessionIdInput > 0) {
      // Carica dati dalla sessione
      await this.loadTemplateWithSessionData(row, this.sessionIdInput);
    } else {
      // Comportamento normale - usa mock data esistenti
      this.router.navigate(['/GTSW/templateBuilder'], {
        state: {
          loadTemplate: {
            prjId: row.prjId,
            connCode: row.connCode,
            reportCode: row.reportCode
          },
          returnTo: this.getReturnToState()
        }
      });
    }
  }

  /**
   * Annulla la dialog sessionId
   */
  cancelLoadTemplate(): void {
    this.showSessionIdDialog = false;
    this.pendingTemplateRow = null;
    this.sessionIdInput = null;
  }

  /**
   * Carica un template con i dati di una sessione specifica come mock data
   * Utile per debuggare perché il template funziona con mock data ma non con dati reali
   */
  private async loadTemplateWithSessionData(templateRow: any, sessionId: number): Promise<void> {
    this.gtsDataService.sendAppLoaderListener(true);

    // Trova la sessione nella griglia qSessions
    const sessionsData = this.pageData
      .filter((element: any) => element.dataAdapter === 'daTemplates')[0]
      ?.data?.find((d: any) => d.dataSetName === 'qSessions');

    const sessionRow = sessionsData?.rows?.find((r: any) => r.sessionId === sessionId);

    if (!sessionRow) {
      this.gtsDataService.sendAppLoaderListener(false);
      alert(`Sessione con ID ${sessionId} non trovata nella griglia`);
      // Fallback: carica template senza dati sessione
      this.router.navigate(['/GTSW/templateBuilder'], {
        state: {
          loadTemplate: {
            prjId: templateRow.prjId,
            connCode: templateRow.connCode,
            reportCode: templateRow.reportCode
          },
          returnTo: this.getReturnToState()
        }
      });
      return;
    }

    // Carica i dati del report dalla sessione (come in SHOW_AI_BUILDER)
    const report = {
      sessionId: sessionRow.sessionId,
      fieldGrpId: sessionRow.fieldGrpId,
      reportCode: sessionRow.reportCode,
      reportName: sessionRow.reportName,
      sqlId: sessionRow.sqlId,
    };

    await this.gtsDataService.getOtherPageData(sessionRow.prjId, sessionRow.formId);
    const reportData = await this.gtsDataService.getReportData(
      sessionRow.prjId,
      sessionRow.formId,
      report,
      sessionRow.params,
      sessionRow.connCode,
      false,
      false  // skipPdf - non serve il PDF, servono solo i dati
    );

    if (reportData && reportData.valid) {
      // Mappa i dati Oracle
      const oracleData = mapOracleDataForTemplateBuilder(reportData);
      const oracleMetadata = mapOracleMetadataForTemplateBuilder(reportData);
      const sessionData = extractSessionData(sessionRow);

      this.gtsDataService.sendAppLoaderListener(false);

      // Naviga al template builder con:
      // - loadTemplate: per caricare il template selezionato
      // - oracleData/oracleMetadata: dati reali dalla sessione come mock data
      this.router.navigate(['/GTSW/templateBuilder'], {
        state: {
          loadTemplate: {
            prjId: templateRow.prjId,
            connCode: templateRow.connCode,
            reportCode: templateRow.reportCode
          },
          sessionData: sessionData,
          oracleData: oracleData,
          oracleMetadata: oracleMetadata,
          useSessionDataAsMock: true,  // Flag per indicare di usare questi dati come mock
          returnTo: this.getReturnToState()
        }
      });
    } else {
      this.gtsDataService.sendAppLoaderListener(false);
      alert('Errore caricamento dati sessione: ' + (reportData?.message || 'Errore sconosciuto'));
    }
  }
}
