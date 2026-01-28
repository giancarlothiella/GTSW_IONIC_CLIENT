import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GetDBData, ExecProcData, ExecReportData } from './pages.model';
import { AppInfoService } from './app-info.service';
import { PageService } from './pages.service';
import { Subscription, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { MenuService } from './menu.service';

import { environment } from '../../../environments/environment';
import { lastValueFrom } from 'rxjs';
const BACKEND_URL = environment.apiUrl + '/data';
const DB_URL = environment.apiUrl + '/db';
const USER_URL = environment.apiUrl + '/user';
const MAIL_URL = environment.apiUrl + '/mail';
const FILE_URL = environment.apiUrl + '/files';
const SETUP_URL = environment.apiUrl + '/setup';
const TASK_URL = environment.apiUrl + '/task';
const PRJ_URL = environment.apiUrl + '/prj';

@Injectable({
  providedIn: 'root'
})
export class GtsDataService {
  constructor(
    private http: HttpClient,
    private pageService: PageService,
    private authService: AuthService,
    private appInfo: AppInfoService,
    private menuService: MenuService
  ) {
    this.appActionsDebugListenerSubs = this.appInfo
    .getAppActionsDebugListener()
    .subscribe(async (debug) => {
      this.runActionInDebug = debug;
    });
  }

  appActionsDebugListenerSubs: Subscription | undefined;

  //===================================================================================================
  // Post Server Data
  //===================================================================================================
  async postServerData(apiRoute: string, url: string, params: any) {
    if (apiRoute === 'data') {
        url = BACKEND_URL+'/'+url;
    } else if (apiRoute === 'db') { 
        url = DB_URL+'/'+url;                 
    } else if (apiRoute === 'file') {
        url = FILE_URL+'/'+url; 
    } else if (apiRoute === 'auth') {
        url = USER_URL+'/'+url; 
    } else if (apiRoute === 'mail') {
        url = MAIL_URL+'/'+url; 
    } else if (apiRoute === 'setup') {
        url = SETUP_URL+'/'+url; 
    } else if (apiRoute === 'task') {
        url = TASK_URL+'/'+url; 
    } else if (apiRoute === 'prj') {
        url = PRJ_URL+'/'+url; 
    }

    const postHttp = this.http.post(url, params);
    const response: any = await lastValueFrom(postHttp);
    
    return response;
  }

  //===================================================================================================
  // Page Data
  //===================================================================================================

  private actualPrjId: string = '';
  private actualFormId: number = 0;
  private actualView: string = '';
  private actualMessageStatus: string = 'idle';
  private previousView: string[] = [];
  private pageReady: boolean = false;
  private actionCanRun: boolean = true;
  
  private metaData: any[] = [];
  private pageData: any[] = [];
  private pageRules: any[] = [];
  private dbLog: any[] = [];

  private iLoop: number = 0;

  // Helper method to get current connection code based on project
  private getConnCode(prjId?: string): string {
    // Se prjId è specificato, cerca la connessione per quel progetto
    if (prjId) {
      // Prima controlla se il prjId corrisponde al progetto corrente dell'utente
      // Questo funziona anche dopo il reload della pagina perché i dati utente sono salvati in storage
      const currentUser = this.authService.getCurrentUser();

      if (currentUser && currentUser.prjId === prjId) {
        // L'utente è sul progetto richiesto
        if (currentUser.prjConnections && currentUser.prjConnections.length > 0) {
          // Il progetto ha connessioni, usa quelle
          const defaultConn = currentUser.prjConnections.find(conn => conn.connDefault);
          if (defaultConn) {
            return defaultConn.connCode;
          }
          // Se nessuna connessione è marcata come default, usa la prima
          return currentUser.prjConnections[0].connCode;
        } else {
          // Il progetto non ha connessioni specifiche, ritorna stringa vuota
          return '';
        }
      }

      // Se il prjId è diverso dal progetto corrente dell'utente,
      // cerca nelle informazioni dei progetti (solo se già caricate)
      const projects = this.menuService.getProjects();
      if (projects.length > 0) {
        const project = projects.find(p => p.prjId === prjId);

        if (project) {
          if (project.dbConnections && project.dbConnections.length > 0) {
            const defaultConn = project.dbConnections.find(conn => conn.connDefault);
            if (defaultConn) {
              return defaultConn.connCode;
            }
            return project.dbConnections[0].connCode;
          } else {
            // Il progetto non ha connessioni, ritorna stringa vuota
            return '';
          }
        }
      }
    }

    // Fallback: usa la connessione di default dell'utente corrente
    const defaultConnection = this.authService.getDefaultConnection();
    return defaultConnection?.connCode || '';
  }

  // LISTENERS ========================================================================================
  private appViewListener = new Subject<string>();
  getAppViewListener() {
    return this.appViewListener.asObservable();
  }

  private pageCustomListener = new Subject<string>();
  getPageCustomListener() {
    return this.pageCustomListener.asObservable();
  }

  private appLoaderListener = new Subject<boolean>();
  getAppLoaderListener() {
    return this.appLoaderListener.asObservable();
  }

  private fileLoaderListener = new Subject<any>();
  getFileLoaderListener() {
    return this.fileLoaderListener.asObservable();
  }

  private formReqListener = new Subject<any>();
  getFormReqListener() {
    return this.formReqListener.asObservable();
  }

  private formRepListener = new Subject<any>();
  getFormRepListener() {
    return this.formRepListener.asObservable();
  }

  private lookUpListener = new Subject<any>();
  getLookUpListener() {
    return this.lookUpListener.asObservable();
  }

  private gridSelectListener = new Subject<any>();
  getGridSelectListener() {
    return this.gridSelectListener.asObservable();
  }

  private formFocusListener = new Subject<boolean>();
  getFormFocusListener() {
    return this.formFocusListener.asObservable();
  }

  private gridReloadListener = new Subject<string>();
  getGridReloadListener() {
    return this.gridReloadListener.asObservable();
  }

  // Listener for single row updates (preserves selection, no full reload)
  private gridRowUpdateListener = new Subject<{ dataSetName: string, rowData: any, keyField: string, keyValue: any }>();
  getGridRowUpdateListener() {
    return this.gridRowUpdateListener.asObservable();
  }
  sendGridRowUpdate(dataSetName: string, rowData: any, keyField: string, keyValue: any) {
    this.gridRowUpdateListener.next({ dataSetName, rowData, keyField, keyValue });
  }

  private messageListener = new Subject<any>();
  getMessageListener() {
    return this.messageListener.asObservable();
  }

  private formExternalListener = new Subject<any>();
  getFormExternalListener() {
    return this.formExternalListener.asObservable();
  }

  private toolbarEventListener = new Subject<any>();
  getToolbarEventListener() {
    return this.toolbarEventListener.asObservable();
  }

  private actionEventListener = new Subject<any>();
  getActionEventListener() {
    return this.actionEventListener.asObservable();
  }

  // AI Chat Listener - per aprire la chat AI da actions (gridSetAIMode, formAIAssist)
  private aiChatListener = new Subject<any>();
  getAiChatListener() {
    return this.aiChatListener.asObservable();
  }
  sendAiChatRequest(config: any) {
    this.aiChatListener.next(config);
  }

  // Database Error Listener - per mostrare errori da operazioni database (POST, execProc, etc.)
  private dbErrorListener = new Subject<{ title: string; message: string }>();
  getDbErrorListener() {
    return this.dbErrorListener.asObservable();
  }
  sendDbError(title: string, message: string) {
    this.dbErrorListener.next({ title, message });
  }

  // AI Chat Data Received Listener - per ricevere i dati dall'AI e popolare grid/form
  private aiDataReceivedListener = new Subject<any>();
  getAiDataReceivedListener() {
    return this.aiDataReceivedListener.asObservable();
  }
  sendAiDataReceived(data: any) {
    this.aiDataReceivedListener.next(data);
  }

  // Contesto corrente per AI Chat (usato dal wrapper globale)
  private currentAiChatContext: any = null;
  setCurrentAiChatContext(context: any) {
    this.currentAiChatContext = context;
  }
  getCurrentAiChatContext() {
    return this.currentAiChatContext;
  }
  clearCurrentAiChatContext() {
    this.currentAiChatContext = null;
  }

  /**
   * Elabora i dati ricevuti dall'AI e li inserisce in grid o form
   * Chiamato dall'app.component quando la chat AI restituisce dati strutturati
   */
  processAiData(aiData: { type: 'grid' | 'form', data: any, context: any }): void {
    const { type, data, context } = aiData;
    console.log('[gts-data.service] Processing AI data:', { type, data, context });

    if (!context) {
      console.error('[gts-data.service] No context provided for AI data');
      return;
    }

    const { prjId, formId, dataSetName, gridName, clFldGrpId } = context;

    if (type === 'grid' && Array.isArray(data)) {
      // Per grid: aggiungi le righe al dataset e ricarica la griglia
      this.processAiGridData(prjId, formId, dataSetName, gridName, data);
    } else if (type === 'form' && typeof data === 'object') {
      // Per form: imposta i valori dei campi
      this.processAiFormData(prjId, formId, clFldGrpId, data);
    } else {
      console.warn('[gts-data.service] Invalid AI data type or format:', { type, data });
    }
  }

  /**
   * Inserisce le righe AI nella griglia
   */
  private processAiGridData(prjId: string, formId: number, dataSetName: string, gridName: string, rows: any[]): void {
    console.log('[gts-data.service] Processing AI grid data:', { prjId, formId, dataSetName, rows });

    try {
      // Trova il pageData per questa pagina
      const page = this.pageData.find((p: any) => p.prjId === prjId && p.formId === formId);
      if (!page) {
        console.error('[gts-data.service] Page data not found for AI grid data');
        return;
      }

      // Trova il dataset
      const dataSet = page.data?.find((ds: any) => ds.dataSetName === dataSetName);
      if (!dataSet) {
        console.error('[gts-data.service] Dataset not found:', dataSetName);
        return;
      }

      // REPLACE: Svuota la griglia e carica i nuovi dati dall'AI
      // Marca le righe come nuove per il salvataggio
      const newRows = rows.map((row, index) => ({
        ...row,
        _aiInserted: true,  // Flag per identificare righe inserite da AI
        _tempId: `ai_${Date.now()}_${index}`  // ID temporaneo per tracking
      }));

      // REPLACE existing rows (don't append)
      dataSet.rows = newRows;

      console.log('[gts-data.service] Replaced grid data with AI rows:', newRows.length);

      // Metti la griglia in modalità edit/insert per permettere modifiche
      this.sendGridReload(dataSetName + ';Insert:true');
      this.sendGridReload(dataSetName + ';Edit:true');

      // Ricarica la griglia per mostrare i nuovi dati
      this.sendGridReload(dataSetName);

    } catch (error) {
      console.error('[gts-data.service] Error processing AI grid data:', error);
    }
  }

  /**
   * Imposta i valori dei campi form dai dati AI
   */
  private processAiFormData(prjId: string, formId: number, clFldGrpId: number, data: any): void {
    console.log('[gts-data.service] Processing AI form data:', { prjId, formId, clFldGrpId, data });

    try {
      // Trova i pageFields per questo form group
      const page = this.metaData.find((p: any) => p.prjId === prjId && p.formId === formId);
      if (!page || !page.pageData?.pageFields) {
        console.error('[gts-data.service] Page fields not found for AI form data');
        return;
      }

      // Per ogni campo nei dati AI, imposta il valore se il campo esiste
      Object.keys(data).forEach((fieldName) => {
        const value = data[fieldName];

        // Trova il campo nel pageFields
        const field = page.pageData.pageFields.find((f: any) =>
          f.dbFieldName === fieldName || f.pageFieldName === fieldName
        );

        if (field) {
          field.value = value;
          console.log(`[gts-data.service] Set field ${fieldName} = ${value}`);
        } else {
          console.warn(`[gts-data.service] Field not found: ${fieldName}`);
        }
      });

      // Notifica il cambio di view per aggiornare i componenti form
      this.appViewListener.next(this.actualView);

    } catch (error) {
      console.error('[gts-data.service] Error processing AI form data:', error);
    }
  }

  // END LISTENERS ========================================================================================

  async runPage(prjId: string, formId: number) {
    // Reset actualView to prevent NG0100 when navigating between pages
    this.actualView = '';
    await this.runGtsPage(prjId, formId);
    this.appViewListener.next(this.actualView);
  }

  sendFileLoaderListener(status: any) {
    this.fileLoaderListener.next(status);
  }

  sendAppLoaderListener(status: boolean) {
    this.appLoaderListener.next(status);
  }

  showLookUp(field: any) {
    this.lookUpListener.next(field);
  }

  sendFormRequest(formRequest: any) {
    this.formReqListener.next(formRequest);
  }

  sendFormExtenalData(data: any) {
    this.formExternalListener.next(data);
  }

  sendToolbarEventData(data: any) {
    this.toolbarEventListener.next(data);
  }

  sendActionEventData(data: any) {
    this.actionEventListener.next(data);
  }

  setFormFocus() {
    this.formFocusListener.next(true);
  }

  sendFormReply(formReply: any) {
    this.formRepListener.next(formReply);
  }

  sendGridReload(dataSetName: string) {
    this.gridReloadListener.next(dataSetName);       
  }

  setActionCanRun(canRun: boolean) {
    return this.actionCanRun = canRun;
  }

  getActualDebugData() {
    return {
      actualPrjId: this.actualPrjId,
      actualFormId: this.actualFormId,
      actualView: this.actualView,
      metaData: this.metaData,
      pageData: this.pageData,
      pageRules: this.pageRules
    }
  }

  getDbLog() {
    return this.dbLog;
  }

  removeProjectsData(prjId: string) {
    this.metaData = this.metaData.filter((page) => page.prjId !== prjId);
    this.pageData = this.pageData.filter((page) => page.prjId !== prjId);
    this.pageRules = this.pageRules.filter((page) => page.prjId !== prjId);
  }

  clearAllMetadata() {  
    this.metaData = [];
    this.pageData = [];
    this.pageRules = [];
  }

  async getOtherPageData(prjId: string, formId: number) {
    this.appLoaderListener.next(true);
    let page: any  = this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )
    if (page === undefined || page.length === 0) {
      let response: any = await this.postServerData('data', 'getpageData2', {prjId: prjId, formId: formId, languageId: this.appInfo.getLanguageId});      
      if (response.valid) {     
        // concat on all view the items from other views with viewFlagAlwaysActive = true
        response.pageData.views.forEach((view: any) => {
          if (view.viewFlagAlwaysActive) {
            response.pageData.views.forEach((view2: any) => {
              if (view2.viewName !== view.viewName) {
                view2.objects = view2.objects.concat(view.objects);
              }
            });
          }
        });
        
        this.metaData.push({
          prjId: prjId,
          formId: formId,
          pageData: response.pageData
        })
        let rules = response.pageData.condRules.map((rule: any) => {return {prjId: rule.prjId, formId: rule.formId, condId: rule.condId, condValue: rule.condValue}});
        this.pageRules.filter((rule) => rule.prjId === prjId && rule.formId === formId).length === 0 ? this.pageRules = this.pageRules.concat(rules) : this.pageRules = this.pageRules.concat(rules);
        page = this.metaData.filter((page) => page.prjId === prjId && page.formId == formId);

        // get all dropDown fieds data
        let allForms = response.pageData.forms;
        for (let i = 0; i < allForms.length; i++) {
          let form = allForms[i];
          let allFields = form.fields;
          for (let j = 0; j < allFields.length; j++) {
            let field = allFields[j];
            if (field.editorType === 'DropDownBox' && field.sqlId !== undefined && field.sqlId !== null) {
              const responseData = await this.getExportedDSData(prjId, formId, form.groupId, field.fieldName, form, field.objectName);
              field.dropDownRows = responseData.data[0].rows;
              }
          }
        }
      }
    } else {
      // set all page element not visible 
      this.resetMetadataVisibility(prjId, formId);   
    }

    this.appLoaderListener.next(false);
  }

  private async runGtsPage(prjId: string, formId: number) {
    this.pageReady = false;
    this.appLoaderListener.next(true);
    let page: any  = this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )
    if (page === undefined || page.length === 0) {
      let response: any = await this.postServerData('data', 'getPageData2', {prjId: prjId, formId: formId, languageId: this.appInfo.getLanguageId});
      if (response.valid) {     
        // concat on all view the items from other views with viewFlagAlwaysActive = true
        response.pageData.views.forEach((view: any) => {
          if (view.viewFlagAlwaysActive) {
            response.pageData.views.forEach((view2: any) => {
              if (view2.viewName !== view.viewName) {
                view2.objects = view2.objects.concat(view.objects);
              }
            });
          }
        });
        
        this.metaData.push({
          prjId: prjId,
          formId: formId,
          pageData: response.pageData
        })
        let rules = response.pageData.condRules.map((rule: any) => {return {prjId: prjId, formId: formId, condId: rule.condId, condValue: rule.condValue}});
        this.pageRules.filter((rule) => rule.prjId === prjId && rule.formId === formId).length === 0 ? this.pageRules = this.pageRules.concat(rules) : this.pageRules = this.pageRules.concat(rules);
        page = this.metaData.filter((page) => page.prjId === prjId && page.formId == formId);

        // get all dropDown fieds data
        let allForms = response.pageData.forms;
        for (let i = 0; i < allForms.length; i++) {
          let form = allForms[i];
          let allFields = form.fields;
          for (let j = 0; j < allFields.length; j++) {
            let field = allFields[j];
            if (field.editorType === 'DropDownBox' && field.sqlId !== undefined && field.sqlId !== null) {
              const responseData = await this.getExportedDSData(prjId, formId, form.groupId, field.fieldName, form, field.objectName);
              field.dropDownRows = responseData.data[0].rows;
              }
          }
        }
      }
    } else {
      // set all page element not visible
      this.resetMetadataVisibility(prjId, formId);
    }
    await this.runAction(prjId, formId, page[0].pageData.page.initAction);
    this.actualFormId = formId;
    this.actualPrjId = prjId;
    this.pageReady = true;
    this.appLoaderListener.next(false);
  }

  getUserEmail() {  
    return this.authService.getUserEmail();
  }

  getPageData(prjId: string, formId: number) {
    // Create an new array copy of pageData to avoid direct mutation
    let pageData = JSON.parse(JSON.stringify(this.pageData.filter((page) => page.prjId === prjId && page.formId == formId)));
    
    // get dataSets from metaData
    if (this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )[0] !== undefined) {
      const dataSets = this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )[0].pageData.dataSets || [];

      // apply filter on pageData if exists
      pageData.forEach((data: any) => {
        data.data.forEach((dataSet: any) => {
          const filterObject = dataSets.filter((ds: any) => ds.dataSetName === dataSet.dataSetName)[0].filterObject || {};

          if (filterObject !== undefined && filterObject !== null && Object.keys(filterObject).length > 0) {
            dataSet.rows = dataSet.rows.filter((row: any) => {
              let valid: boolean = true;
              Object.entries(filterObject).forEach(([key, value]) => {
                if (row[key] !== value) {
                  valid = false;
                }
              });
              return valid;
            });
          }
        });
      });
    }
    
    return pageData;
  }

  setPageDataSet(prjId: string, formId: number, dataAdapter: string, dataSetName: string, rows: any[]) {
    if (this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId && data.dataAdapter === dataAdapter)[0] !== undefined) {
      this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId && data.dataAdapter === dataAdapter)[0]
      .data
      .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0].rows = rows;

      this.appViewListener.next(this.actualView);
    }
  }

  setPageFieldValue(prjId: string, formId: number, name: string, value: any) {
    this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )[0]
    .pageData
    .pageFields
    .filter((field: any) => field.pageFieldName === name)[0].value = value; 
  }

  getPageFieldValue(prjId: string, formId: number, name: string) {
    const page = this.metaData.filter((page) => page.prjId === prjId && page.formId == formId)[0];
    if (!page || !page.pageData || !page.pageData.pageFields) {
      return null;
    }
    const field = page.pageData.pageFields.filter((field: any) => field.pageFieldName === name)[0];
    return field ? field.value : null;
  }

  getPageFieldLabel(prjId: string, formId: number, name: string) {
    let label = this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )[0]
    .pageData
    .pageFields
    .filter((field: any) => field.pageFieldName === name)[0].pageFieldLabel; 
    return label;
  }
  getPageFieldDataType(prjId: string, formId: number, name: string) {
    let dataType = this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )[0]
    .pageData
    .pageFields
    .filter((field: any) => field.pageFieldName === name)[0].dataType; 
    return dataType;
  }

  getPrjAllMetaData(prjId: string) {
    return this.metaData.filter((page) => page.prjId === prjId );
  }

  getPrjAllPageData(prjId: string) {
    return this.pageData.filter((page) => page.prjId === prjId );
  }

  getPrjAllPageRules(prjId: string) {
    return this.pageRules.filter((page) => page.prjId === prjId );
  }


  removePageData(prjId: string, formId: number) {
    this.pageData.splice(this.metaData.findIndex((page) => page.prjId === prjId && page.formId === formId), 1);
  }

  getPageMetaData(prjId: string, formId: number, objects: string, name: string) {
    if (objects === 'all') {
      this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      .pageData
      .toolbars
      .filter((toolBar: any) => toolBar.actionTarget !== null && toolBar.actionTarget !== undefined && toolBar.actionTarget !== '')
      .forEach((toolBar: any) => {
        // get toolbar item from other toolbars with with item objectName = actionTarget
        const item = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
        .pageData
        .toolbars
        .forEach((tb: any) => {
          if (tb.itemsList.filter((tbItem: any) => tbItem.objectName === toolBar.actionTarget)[0] !== undefined) {
            tb.itemsList.filter((tbItem: any) => tbItem.objectName === toolBar.actionTarget)[0]
            .actionToolbar = toolBar
          }
        });
      });

      return this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )[0].pageData;
    } else {
      if (this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )[0] !== undefined) {
        if (objects === 'pageFields') {
          return this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )[0].pageData[objects]
          .filter((object: any) => object.pageFieldName === name)[0];
        } else if (objects === 'dataAdapter') {
          return this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )[0].pageData['dataSets']
          .filter((object: any) => object.dataAdapterName === name);
        } else if (objects === 'views') {
          return this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )[0].pageData[objects]
          .filter((object: any) => object.viewName === name)[0];
        } else if (objects === 'reportsGroups') {
          // convert name in Number
          const fieldGrpId = Number(name);
          return this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )[0].pageData[objects]
          .filter((object: any) => object.fieldGrpId === fieldGrpId)[0];
        } else {
          return this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )[0].pageData[objects]
          .filter((object: any) => object.objectName === name)[0];
        }
      } else {
        return null;
      }
    }
  }

  /**
   * Restituisce tutti i metaData per il debug
   */
  getAllMetaData(): any[] {
    return this.metaData;
  }

  /**
   * Restituisce tutti i pageData per il debug
   */
  getAllPageData(): any[] {
    return this.pageData;
  }

  /**
   * Restituisce tutti i dbLog per il debug
   */
  getAllDbLog(): any[] {
    return this.dbLog;
  }

  /**
   * Restituisce tutte le pageRules per il debug
   */
  getAllPageRules(): any[] {
    return this.pageRules;
  }

  /**
   * Restituisce il connection code corrente
   */
  getActualConnCode(): string {
    return this.getConnCode();
  }

  getDataSetSelectRow(prjId: string, formId: number, dataAdapter: string, dataSetName: string) {
    const data = this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId && data.dataAdapter === dataAdapter);
    if (data !== undefined && data !== null && data.length > 0) {    
      const dataSet = data[0].data.filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0];
      if (dataSet !== undefined && dataSet !== null && dataSet.selectedRows !== undefined && dataSet.selectedRows !== null && dataSet.selectedRows.length > 0) {  
        return dataSet.selectedRows[0];
      } else {
        return null;
      }      
    } else {
      return null;
    }
  }

  getDataSetSelectKeys(prjId: string, formId: number, dataAdapter: string, dataSetName: string) {   
    const data = this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId && data.dataAdapter === dataAdapter)[0]
    .data
    .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0]
    .selectedKeys; 

    if (data !== undefined && data !== null && data.length > 0) {
      return data[0];
    } else {
      return null;
    } 
  }

  getDataSet(prjId: string, formId: number, dataAdapter: string, dataSetName: string) {   
    if (this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId && data.dataAdapter === dataAdapter)[0] !== undefined) {
      return this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId && data.dataAdapter === dataAdapter)[0]
      .data
      .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0].rows;
    } else {
      return null;
    }
  }

  getPageReady() {  
    return this.pageReady;
  }

  getActualView() {
    return this.actualView;
  }

  getActualFormId() {
    return this.actualFormId;
  }

  getActualPrjId() {
    return this.actualPrjId;
  }

  // Reset view state when leaving a page to prevent NG0100 error on next page
  resetViewState() {
    this.actualView = '';
    this.previousView = [];
  }

  checkPageRule(prjId: string, formId: number, condRules: any[]) {  
    let valid: boolean = true;
    if (condRules !== undefined && condRules !== null && condRules.length > 0) {
      for (let i = 0; i < condRules.length; i++) {
        const condRule = condRules[i];
        const pageRule = this.pageRules.filter((rule) => rule.prjId === prjId && rule.formId === formId && rule.condId === condRule.Id)[0];
        if (pageRule !== undefined && pageRule.condValue !== undefined && pageRule.condValue !== condRule.Value) {
          valid = false;
          break;
        }
      }
    }
    return valid;
  }

  setPageDataSetRule(prjId: string, formId: number, dataAdapter: string, dataSetName: string) {      
    let condRules = this.metaData.filter((page) => page.prjId === prjId && page.formId == formId)[0]
    .pageData
    .condRules;

    if (condRules !== undefined && condRules !== null && condRules.length > 0) {
      condRules = condRules.filter((rule: any) => rule.dataSetName !== undefined && rule.dataSetName === dataSetName);  
    }

    if (condRules !== undefined && condRules !== null && condRules.length > 0) {
      for (let i = 0; i < condRules.length; i++) {
        let condRule = condRules[i];
        const selectedRow = this.getDataSetSelectRow(prjId, formId, dataAdapter, dataSetName);
        if (selectedRow !== null && selectedRow !== undefined && selectedRow[condRule.fieldName] !== undefined) {
          const dbFieldValue = selectedRow[condRule.fieldName];
          
          for (let j = 0; j < condRule.fieldValues.length; j++) {
            const condRuleValueArray = condRule.fieldValues[j].split(';');
            if (condRuleValueArray.includes(dbFieldValue)) {
              const condValue: number = Number(condRule.dataSetCondValues[j]);
              this.setPageRule(prjId, formId, condRule.condId, condValue);
              break;
            }
          }
        }
      }
    }
    this.setView(prjId, formId, this.actualView, false);
  }

  //========== RUN ACTION LOOP ========================================================
  runActionInDebug: boolean = false;

  async runAction(prjId: string, formId: number, objectName: string, iStart: number = 0, debugLevel: number = 0) {
    const page: any = this.metaData.filter((page) => page.prjId === prjId && page.formId == formId)[0];
    const mainAction = page.pageData.actions.filter((action: any) => action.objectName === objectName);
    this.actionCanRun = true;
    this.sendAppLoaderListener(true);

    if (mainAction[0] === undefined) {
      this.sendAppLoaderListener(false);
      return;
    }

    let lastActionType = '';
    const iLoop = iStart;
    let level = debugLevel;

    if (this.runActionInDebug && debugLevel === 0 && this.actualMessageStatus !== 'OK' && this.actualMessageStatus !== 'Cancel' && this.actualMessageStatus !== 'Close') {
      level = 3;
      const debugParams = {
        visible: true,
        action: mainAction[0],
        pageRules: this.pageRules,
        index: iStart,
        debugLevel: level
      };
      this.sendActionEventData(debugParams);
    }

    const runTo = level !== 1 ? mainAction[0].actions.length : iStart + 1;

    if (level < 3) {
      let debugIndex = iLoop;
      for (let i = iLoop; i < runTo; i++) {
        debugIndex = i;
        const element = mainAction[0].actions[i];
        const elementActive = this.checkPageRule(prjId, formId, element.execCond);      
        if (elementActive) {        
          if (element.actionType === 'getData') {   
            const params = this.buildParamsArray(prjId, formId, element);
            this.actionCanRun = await this.getData(prjId, formId, element.dataAdapter, params);          
          } else if (element.actionType === 'removeData') {          
            this.actionCanRun = this.removeData(prjId, formId, element.dataAdapter);          
          } else if (element.actionType === 'setView') {
            this.actionCanRun = this.setView(prjId, formId, element.viewName, false);
          } else if (element.actionType === 'setPreviousView') {
            this.actionCanRun = this.setView(prjId, formId, '', true);
          } else if (element.actionType === 'goToFirstRow') {
            this.setDataSetSelected(prjId, formId, element.dataSetName, true, true, false);
          } else if (element.actionType === 'goToLastRow') {
            this.setDataSetSelected(prjId, formId, element.dataSetName, true, false, true);
          } else if (element.actionType === 'selectDS') {
            this.setDataSetSelected(prjId, formId, element.dataSetName, true);
          } else if (element.actionType === 'unselectDS') {
            this.setDataSetSelected(prjId, formId, element.dataSetName, false);
          } else if (element.actionType === 'execCustom') {
            this.pageCustomListener.next(element.customCode);        
          } else if (element.actionType === 'execProc') {
            const params = this.buildParamsArray(prjId, formId, element);
            this.actionCanRun = await this.execProc(prjId, formId, element.sqlId, params, element.sqlParams);                  
          } else if (element.actionType === 'setRule') {
            this.setPageRule(prjId, formId, element.condId, element.condValue);
          } else if (element.actionType === 'getFormData') {
            this.getFormData(prjId, formId, element.clFldGrpId);
          } else if (element.actionType === 'clearFields') {
            this.clearFields(prjId, formId, element.clFldGrpId);
          } else if (element.actionType === 'pkLock') {
            this.pkLock(prjId, formId, element.clFldGrpId);
          } else if (element.actionType === 'pkUnlock') {
            this.pkUnlock(prjId, formId, element.clFldGrpId);
          } else if (element.actionType === 'saveFormData') {
            this.saveFormData(prjId, formId, element.clFldGrpId, false, '', '');
          } else if (element.actionType === 'getExportedData') {
            await this.getExportedData(prjId, formId, element.clFldGrpId, '*');
          } else if (element.actionType === 'dsInsert') {
            this.setDataSetStatus(prjId, formId, element.dataSetName, 'insert', element);
          } else if (element.actionType === 'dsEdit') {
            this.setDataSetStatus(prjId, formId, element.dataSetName, 'edit', element);
          } else if (element.actionType === 'dsCancel') {
            this.setDataSetStatus(prjId, formId, element.dataSetName, 'idle', element);
          } else if (element.actionType === 'dsRefresh') {
            this.actionCanRun = await this.dataSetRefresh(prjId, formId, element.dataSetName, true);        
          } else if (element.actionType === 'dsRefreshSel') {
            this.actionCanRun = await this.dataSetRefresh(prjId, formId, element.dataSetName, false);        
          } else if (element.actionType === 'dsPost') {
            this.actionCanRun = await this.dataSetAction(prjId, formId, element);        
          } else if (element.actionType === 'dsDelete') {
            this.actionCanRun = await this.dataSetAction(prjId, formId, element);
          } else if (element.actionType === 'showMsg') {
            this.actionCanRun = await this.showOKCancel(prjId, formId, element, objectName, i, debugLevel);
            if (this.iLoop > 0) { 
              debugIndex = this.iLoop;
              i = this.iLoop 
            }
          } else if (element.actionType === 'showOKCancel') {
            this.actionCanRun = await this.showOKCancel(prjId, formId, element, objectName, i, debugLevel);
            if (this.iLoop > 0) { 
              debugIndex = this.iLoop;
              i = this.iLoop 
            }
          } else if (element.actionType === 'gridSetIdle') {
            this.sendGridReload(element.dataSetName+';Idle:true');
            this.actionCanRun = true
          } else if (element.actionType === 'gridSetEdit') {
            this.sendGridReload(element.dataSetName+';Edit:true');
            this.actionCanRun = true
          } else if (element.actionType === 'gridSetInsert') {
            this.sendGridReload(element.dataSetName+';Insert:true');
            this.actionCanRun = true
          } else if (element.actionType === 'gridAllowDelete') {
            this.sendGridReload(element.dataSetName+';Delete:true');
            this.actionCanRun = true
          } else if (element.actionType === 'gridPostChanges') {
            this.actionCanRun = await this.dataSetPost(prjId, formId, element.dataSetName, element.gridName);
          } else if (element.actionType === 'gridRollback') {
            this.actionCanRun = true
          } else if (element.actionType === 'gridSetAIMode') {
            // Apre AI Chat per import dati in griglia
            this.sendAiChatRequest({
              type: 'grid',
              chatCode: element.customCode,
              prjId: prjId,
              formId: formId,
              dataSetName: element.dataSetName,
              gridName: element.gridName,
              clFldGrpId: element.clFldGrpId
            });
            this.actionCanRun = true;
          } else if (element.actionType === 'formAIAssist') {
            // Apre AI Chat per compilazione campi form
            this.sendAiChatRequest({
              type: 'form',
              chatCode: element.customCode,
              prjId: prjId,
              formId: formId,
              clFldGrpId: element.clFldGrpId
            });
            this.actionCanRun = true;
          }

          lastActionType = element.actionType;
        }

        let debugCanRun = this.actionCanRun;
        if (element.actionType === 'showOKCancel' && this.actualMessageStatus === 'showOKCancel') {
          debugCanRun = true;
        }

        if (this.runActionInDebug) {
          const debugParams = {
            debugLevel: level,
            action: element,
            pageRules: this.pageRules,
            actionCanRun: debugCanRun,
            elementActive: elementActive === undefined ? true : elementActive,
            index: debugIndex + 1,
            actionCompleted: debugIndex === mainAction[0].actions.length - 1 ? true : false
          };


          this.sendActionEventData(debugParams);
        }         

        if (!this.actionCanRun) break;
      }

    }
    if (lastActionType !== 'execCustom') {
      this.sendAppLoaderListener(false);
    }
  };
  //========== END RUN ACTION LOOP =======================================================================


  //========== MESSAGE METHODS ===========================================================================
  async showOKCancel(prjId: string, formId: number, action: any, objectName: string, iLoop: number, debugLevel: number = 0) {    
    let valid: boolean = true;

    if (this.actualMessageStatus === 'idle') {      
      this.actualMessageStatus = action.actionType;
      action.objectName = objectName;
      action.debugLevel = debugLevel;

      // get custom message from pageData if exists
      const data = this.metaData.filter((page) => page.prjId === prjId && page.formId == formId)[0];
      action.customMsg = data.pageData.customMsg;

      this.sendMessage(action);
      valid = false;
    } else if (this.actualMessageStatus === 'showMsg') {
      valid = true;
    } else if (this.actualMessageStatus === 'showOKCancel') { 
      this.actualMessageStatus = 'idle';
      valid = false;   
    } else if (this.actualMessageStatus === 'OK') {  
      this.actualMessageStatus = 'idle'; 
      valid = true;   
    } else if (this.actualMessageStatus === 'Cancel') {  
      this.actualMessageStatus = 'idle'; 
      valid = false;   
    } else if (this.actualMessageStatus === 'Close') {  
      this.actualMessageStatus = 'idle'; 
      valid = true;   
    }

    if (this.actualMessageStatus === 'showMsg' || this.actualMessageStatus === 'showOKCancel') {
      this.iLoop = iLoop;
    }

    return valid;
  }

  sendMessage(action: any) {
    this.messageListener.next(action);
  }

  setMessageStatus(status: string) {
    this.actualMessageStatus = status;
  }

  //========== DATASET METHODS ===========================================================================
  async dataSetPost(prjId: string, formId: number, dataSetName: string, gridName: string) {
    let valid:  boolean = true;
    const changeArray = this.metaData.filter((page) => page.prjId === prjId && page.formId == formId)[0]
    .pageData
    .grids
    .filter((grid: any) => grid.objectName === gridName)[0]
    .changeArray;

    let dataSet: any = {};
    const data = this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId);
    for (let i = 0; i < data.length; i++) {
      const dataAdapter = data[i];
      dataSet = dataAdapter.data.filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0];
      if (dataSet !== undefined && dataSet !== null) {
        break;
      }
    }    
    
    for (let i = 0; i < changeArray.length; i++) {
      const change = changeArray[i];
      const sqlId = this.getDataSetSqlId(prjId, formId, dataSetName, change.type);
      if (change.type === 'insert' || change.type === 'update' ) {          
        valid = await this.execProc(prjId, formId, sqlId, change.dataParams, [], dataSet);
        if (!valid) break;
      } else {        
        valid = await this.execProc(prjId, formId, sqlId, change.keyParams, [], dataSet);
        if (!valid) break;
      }
    }

    this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .pageFields.forEach((field: any) => {
      if (field.dataSetName === dataSetName) {
        field.value = dataSet.selectedRows[0][field.dbFieldName];
      }
    });  

    return valid;     
  }

  async dataSetRefresh(prjId: string, formId: number, dataSetName: string, all: boolean) {

    let valid:  boolean = true;

    const sqlId = this.getDataSetSqlId(prjId, formId, dataSetName, 'idle');
    const dataAdapter = this.getDataSetAdapter(prjId, formId, dataSetName).dataAdapter;
    let selectedKeys = this.getDataSetSelectKeys(prjId, formId, dataAdapter, dataSetName);

    let lookUpValue = '*';
    let lookupField = '';

    // get sqlId Params from getData Action on this dataAdapter
    let action: any = {};
    this.metaData.filter((page) => page.prjId === prjId && page.formId == formId)[0]
    .pageData
    .actions
    .forEach((actionHdr: any) => {
      actionHdr
      .actions
      .forEach((actionStep: any) => {
        if (actionStep.actionType === 'getData' && actionStep.dataAdapter === dataAdapter) {
          action = actionStep;
        }
      });
    });

    const params = this.buildParamsArray(prjId, formId, action);

    if (!all && selectedKeys !== null) {
      lookupField = Object.keys(selectedKeys)[0];
      lookUpValue = selectedKeys[lookupField];
    }

    if (lookupField !== undefined && lookupField !== null && (all || selectedKeys !== null)) {
      const connCode: string = this.getConnCode(prjId);
      const dataReq: any = {
        prjId: prjId,
        formId: formId,
        params: params,
        lookupSqlId: sqlId,
        lookupField: lookupField,
        lookupValue: lookUpValue,
        connCode: connCode
      };

      const responseData: any = await this.postServerData('db', 'getData', dataReq);

      if (responseData.valid && responseData.data[0].rows.length > 0) {
        responseData.data.forEach((dataSet: any) => {
          if (dataSet.opFieldName !==null ) {
            this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
            .pageData
            .pageFields
            .forEach((field: any) => {
              if (field.pageFieldName === dataSet.opFieldName) {
                field.value = dataSet.rows;
              }
            });
          }
        });

        if (!all) {
          // change the selected row on selected array
          this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId && data.dataAdapter === dataAdapter)[0]
          .data
          .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0]
          .selectedRows = responseData.data[0].rows;

          // get dataset rows array
          const dataSetObj = this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId && data.dataAdapter === dataAdapter)[0]
          .data
          .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0];

          // get row index
          const index = dataSetObj.rows.findIndex((row: any) => row[lookupField] === lookUpValue);

          if (index !== -1) {
            // get dataset row from index
            const row = dataSetObj.rows[index];
            const dbRow = responseData.data[0].rows[0];

            // Update all fields from DB response (including new fields with DEFAULT values)
            // Use DB response keys to ensure fields like "Stato" with DEFAULT are added
            Object.keys(dbRow).forEach((key: any) => {
              row[key] = dbRow[key];
            });
          }

          // Notify grid to update just this row (without full reload)
          this.sendGridRowUpdate(dataSetName, responseData.data[0].rows[0], lookupField, lookUpValue);

          // realign page fields data
          this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
          .pageData
          .pageFields.forEach((field: any) => {
            if (field.dataSetName === dataSetName) {
              field.value = responseData.data[0].rows[0][field.dbFieldName];
            }
          });
        } else {
          // change the selected row on selected array
          let allRows = this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId && data.dataAdapter === dataAdapter)[0]
          .data
          .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0]
          .rows;

          // swap all rows with the new rows
          allRows.splice(0, allRows.length);
          responseData.data[0].rows.forEach((row: any) => {
            allRows.push(row);
          }); 
          
          this.gridReloadListener.next(dataSetName); 
        }
      
        // realign page rules
        this.setPageDataSetRule(prjId, formId, dataAdapter, dataSetName);

        valid = true;           
      } else {
        valid = false;
      } 

    } else {
      if (!all && selectedKeys === null) {
        valid = true;
      } else {
        valid = false;
      }      
    }

    // Only trigger full grid reload for full dataset refresh (all=true)
    // For single row refresh (all=false), the row is updated in place - no reload needed
    if (valid && all) {
      this.sendGridReload(dataSetName);
    }

    return valid;
  }

  removeData(prjId: string, formId: number, dataAdapter: string) {
    // remove data adapter from pageData
    const index = this.pageData.findIndex((page) => page.prjId === prjId && page.formId === formId && page.dataAdapter === dataAdapter);    
    if (index !== -1) {
      this.pageData.splice(index, 1);
    }
    return true;
  } 
  
  setDataSetStatus(prjId: string, formId: number, dataSetName: string, status: string, action: any) {
    const matches = this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId);

    matches.forEach((dataAdapter: any) => {
      let row = dataAdapter.data.filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0];
      if (row !== undefined && row !== null) {
        row.status = status;
        row.sqlParams = action.sqlParams;
        row.queryParams = action.queryParams;
        row.doc = action.doc;
        row.sqlType = action.sqlType;
      }
    });
  }

  getDataSetStatus(prjId: string, formId: number, dataSetName: string) {
    let status: string = '';
    const data = this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId);

    for (let i = 0; i < data.length; i++) {
      const dataAdapter = data[i];
      const dataSet = dataAdapter.data.filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0];
      if (dataSet !== undefined && dataSet !== null) {
        status = dataSet.status;
        break;
      }
    }

    return status;
  } 

  getDataSetAdapter(prjId: string, formId: number, dataSetName: string) {
    let adapter: any = {};
    const data = this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId);
    
    for (let i = 0; i < data.length; i++) {
      const dataAdapter = data[i];
      if (dataAdapter.data.filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0] !== undefined) {
        adapter = data[i];     
        break;
      }
    }    
    
    return adapter;
  } 

  getDataSetSqlId(prjId: string, formId: number, dataSetName: string, status: string) {
    let sqlId: number = 0;
    const dataSet: any = this.metaData.filter((data: any) => data.prjId === prjId && data.formId === formId)[0]
    .pageData
    .dataSets
    .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0];

    if (status === 'insert') {
      sqlId = dataSet.sqlInsertId;
    } else if (status === 'edit' || status === 'update') {
      sqlId = dataSet.sqlUpdateId;
    } else if (status === 'delete') {
      sqlId = dataSet.sqlDeleteId;
    } else {
      sqlId = dataSet.sqlId;
    }

    return sqlId;
  }

  async dataSetAction(prjId: string, formId: number, action: any) {
    let actionRow: any = {};
    let status: string = '';
    let sqlParams: any[] = [];
    let dataSet: any = {};

    if (action.actionType === 'dsPost') {
      status = this.getDataSetStatus(prjId, formId, action.dataSetName);

      this.saveFormData(prjId, formId, action.clFldGrpId, true, action.dataSetName, status);

      const data = this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId);
      for (let i = 0; i < data.length; i++) {
        const dataAdapter = data[i];
        dataSet = dataAdapter.data.filter((dataSet: any) => dataSet.dataSetName === action.dataSetName)[0];
        if (dataSet !== undefined && dataSet !== null) {
          break;
        }
      }

      sqlParams = dataSet.sqlParams;

      actionRow = {
        sqlType: dataSet.sqlType,
        sqlParams: dataSet.sqlParams,
        doc: dataSet.doc,
        queryParams: dataSet.queryParams
      }

    } else {
      this.saveFormData(prjId, formId, action.clFldGrpId, true, action.dataSetName, 'delete');
      actionRow = {
        sqlType: action.sqlType,
        sqlParams: action.sqlParams,
        doc: action.doc,
        queryParams: action.queryParams        
      }

      sqlParams = action.sqlParams;
      status = 'delete';
    } 
    
    const sqlId = this.getDataSetSqlId(prjId, formId, action.dataSetName, status);
    actionRow.sqlId = sqlId;

    const params = this.buildParamsArray(prjId, formId, actionRow);
    const valid = await this.execProc(prjId, formId, sqlId, params, sqlParams, dataSet);

    if (valid && status === 'insert') {
      if (dataSet.outBinds !== undefined && dataSet.outBinds !== null && dataSet.outBinds.length > 0) {
        const targetDataSet = this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId)[0]
          ?.data
          ?.filter((ds: any) => ds.dataSetName === action.dataSetName)[0];

        // Get the primary key from the first outBind (usually the RETURNING ID)
        let primaryKeyField: string | null = null;
        let primaryKeyValue: any = null;

        dataSet.outBinds.forEach((outBind: any) => {
          // Aggiorna solo se rows esiste e ha almeno un elemento
          if (targetDataSet?.rows && targetDataSet.rows.length > 0) {
            targetDataSet.rows[0][outBind.dbFieldName] = outBind.value;
          }

          // Store the first outBind as primary key (usually the RETURNING ID)
          if (primaryKeyField === null) {
            primaryKeyField = outBind.dbFieldName;
            primaryKeyValue = outBind.value;
          }
        });

        // After INSERT, set selectedKeys and selectedRows to point to the new row
        // This allows dataSetRefresh to fetch the complete row with DEFAULT values
        if (primaryKeyField !== null && primaryKeyValue !== null && targetDataSet) {
          const newSelectedKey: any = {};
          newSelectedKey[primaryKeyField] = primaryKeyValue;
          targetDataSet.selectedKeys = [newSelectedKey];

          if (targetDataSet.rows && targetDataSet.rows.length > 0) {
            targetDataSet.selectedRows = [targetDataSet.rows[0]];
          }
        }
      }
    }

    // Solo se l'operazione è riuscita, resetta lo stato a 'idle'
    // Se fallisce, mantieni lo stato (insert/edit/delete) per permettere un nuovo tentativo
    if (valid && dataSet !== undefined && dataSet !== null) {
      dataSet.status = 'idle';
    }

    // After successful INSERT, refresh the row from DB to get DEFAULT values
    if (valid && status === 'insert') {
      await this.dataSetRefresh(prjId, formId, action.dataSetName, false);
    }

    this.sendGridReload(action.dataSetName);

    if (valid) {
      // save log
      const logReq: any = {
        logDate: new Date(),
        prjId: prjId,
        formId: formId,
        action: 'dsPost',
        sqlId:  null,
        dataAdapter: null,
        dataSetAction: action.actionType,
        dataSetName: action.dataSetName,
        params: sqlParams,
        connCode: null
      };
      this.dbLog.push(logReq);
    }

    return valid;
  }
  
  // ========== FORM DATA ENTRY ACTIONS ==================================================================

  // save form fields value on metaData pageFields
  getFormData(prjId: string, formId: number, clFldGrpId: number) {
    const fields: any[] = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .forms
    .filter((form: any) => form.groupId === clFldGrpId)[0]
    .fields;

    fields.forEach((field: any) => {
      this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      .pageData
      .pageFields.forEach((pageField: any) => {
        if (pageField.pageFieldName === field.objectName) {
          field.value = pageField.value;          
        }
      });
    });
  }

  setDataEntryFormFieldValue(prjId: string, formId: number, groupId: number, fieldName: string, fieldValue: any) {
    this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .forms
    .filter((form: any) => form.groupId === groupId)[0]
    .fields
    .forEach((field: any) => {
      if (field.objectName === fieldName) {        
        field.value = fieldValue;
      }
    });
  }

  // set metadata fields value to null
  clearFields(prjId: string, formId: number, clFldGrpId: number) {
    const fields: any[] = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .forms
    .filter((form: any) => form.groupId === clFldGrpId)[0]
    .fields;

    fields.forEach((field: any) => {
      this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      .pageData
      .pageFields.forEach((pageField: any) => {
        if (pageField.pageFieldName === field.objectName) {
          pageField.value = null;
        }
        if (field.details !== undefined && field.details !== null && field.details.length > 0) {
          field.details.forEach((detail: any) => {
            detail.value = null;
          });
        }
      });
    });
  }

  // set PK form fields as readOnly
  pkLock(prjId: string, formId: number, clFldGrpId: number) {
    const fields: any[] = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .forms
    .filter((form: any) => form.groupId === clFldGrpId)[0]
    .fields
    .filter((field: any) => field.isPK);

    fields.forEach((field: any) => {
      field.readOnly = true;
      field.initAsReadOnly = true;
      field.disabled = false;
      field.initAsDisabled = false;
    });
  }
  
  // unset PK form fields from readOnly and disabled
  pkUnlock(prjId: string, formId: number, clFldGrpId: number) {
    const fields: any[] = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .forms
    .filter((form: any) => form.groupId === clFldGrpId)[0]
    .fields
    .filter((field: any) => field.isPK);

    fields.forEach((field: any) => {
      field.readOnly = false;
      field.initAsReadOnly = false;
      field.disabled = false;
      field.initAsDisabled = false;
    });
  }


  // set form data to page fields
  saveFormDataValues(prjId: string, formId: number, clFldGrpId: number) {
    const formFields: any[] = [];

    // Form fields
    let fields: any[] = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .forms
    .filter((form: any) => form.groupId === clFldGrpId)[0]
    .fields;

    fields.forEach((field: any) => {
      this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      .pageData
      .pageFields.forEach((pageField: any) => {
        if (pageField.pageFieldName === field.objectName) {
          if (field.editorType === 'CheckBox') {
            // set checked and unchecked values
            if (field.valueChecked === 'true' || field.valueChecked === 'false') {
              pageField.value = field.value;
            } else {
              pageField.value = field.value ? field.valueChecked : field.valueUnchecked;   
            }           
          } else {
            pageField.value = field.value;
          }

          formFields.push({
            pageFieldName: pageField.pageFieldName,
            value: pageField.value            
          })
        }
      });
    });      

    // Details fields
    let fieldsDet: any[] = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .forms
    .filter((form: any) => form.groupId === clFldGrpId)[0]
    .fields
    .filter((field: any) => field.details !== null && field.details !== undefined && field.details.length > 0);
          
    fieldsDet.forEach((field: any) => {        
      field.details.forEach((detail: any) => {  
        this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
        .pageData
        .pageFields.forEach((pageField: any) => {
          if (pageField.pageFieldName === detail.pageFieldName) {       
            pageField.value = detail.value;   

            formFields.push({
              pageFieldName: pageField.pageFieldName,
              value: detail.value            
            })
          }
        });
      });
    });

    return formFields;
  }

  // set metaData page fields value from form fields and update dataSet fields value (if required)
  saveFormData(prjId: string, formId: number, clFldGrpId: number, setDataSet: boolean, dataSetName: string = '', status: string = '') {
    if (status !== 'delete') {
      let formFields: any[] = [];

      formFields = this.saveFormDataValues(prjId, formId, clFldGrpId);

      if (setDataSet) {
        if (status === 'insert') {
          this.insertDataSetValue(prjId, formId, dataSetName);

        } else if (status === 'edit') {
          const pageFields: any[] = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
          .pageData
          .pageFields
          .filter((field: any) => field.dataSetName === dataSetName);

          //intersect pageFields and form fields by Name
          const commonFields: any[] = [];
          pageFields.forEach((pageField: any) => {
            formFields.forEach((field: any) => {
              if (pageField.pageFieldName === field.pageFieldName) {
                commonFields.push({pageFieldName: pageField.pageFieldName, dbFieldName: pageField.dbFieldName, value: field.value});
              }
            });
          });

          const dataAdapter = this.getDataSetAdapter(prjId, formId, dataSetName)
          this.setDataSetValue(prjId, formId, dataAdapter, dataSetName, commonFields);
        }
      }
    } else {
      // delete dataset selected row
      this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId)
      .forEach((dataAdapter: any) => {
        dataAdapter.data.forEach((dataSet: any) => {
          if (dataSet.dataSetName === dataSetName) {
            dataSet.selectedRows.forEach((row: any) => {
              dataSet.rows = dataSet.rows.filter((dataRow: any) => {
                let valid: boolean = true;
                Object.entries(row).forEach(([key, value]) => {
                  if (dataRow[key] !== value) {
                    valid = false;
                  }
                });
                return !valid;
              });
            });
          }
        });
      });
    }
  }

  // Set dataSet value from pageFields
  insertDataSetValue(prjId: string, formId: number, dataSetName: string) {
    let newRow: any = {};
    this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)
    .forEach((page: any) => {
      page.pageData
      .pageFields
      .forEach((field: any) => {
        if (field.dataSetName === dataSetName) {
          // Convert Date object to ISO string for consistency with DB data
          if ((field.dataType === 'DateTime' || field.dataType === 'Date') && field.value instanceof Date) {
            newRow[field.dbFieldName] = field.value.toISOString();
          } else {
            newRow[field.dbFieldName] = field.value;
          }
        }
      });
    });
    
    let dataAdapter = this.getDataSetAdapter(prjId, formId, dataSetName)

    dataAdapter.data
    .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0]
    .rows
    .unshift(newRow);
  }

  // Set dataSet value from pageField
  setDataSetFieldValue(dataAdapterName: string, dataSetName: string, fieldName: string, fieldValue: any) {
    // get dataAdapter from metadata
    const dataAdapter = this.pageData.filter((data: any) => data.dataAdapter === dataAdapterName)[0];

    // get keys to update
    const keys = dataAdapter.data
    .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0]
    .selectedKeys;

    // get row filtered by keysArray (array of objects key = field name, value = key value)
    let keysArray: any[] = [];
    keys.forEach((key: any) => {
      //split key object to key and value
      Object.keys(key).forEach((keyName: string) => {
        keysArray.push({key: keyName, value: key[keyName]});
      });
    });

    let filteredRows: any;

    // get row filtered by keysArray (array of objects key = filed name, value = field value and update values
    filteredRows =
    dataAdapter.data
    .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0]
    .rows
    .filter((dataRow: any) => {
      let valid: boolean = true;
      keysArray.forEach((key: any) => {
        // check if key value is equal to row value
        if (dataRow[key.key] !== key.value) {
          valid = false;
        }
      });
      return valid;
    })

    filteredRows
    .forEach((row: any) => {
      row[fieldName] = fieldValue;
    });
  }


  // Set dataSet value from pageFields
  setDataSetValue(prjId: string, formId: number, dataAdapter: any, dataSetName: string, fields: any[]) {
    // get keys to update
    const keys = dataAdapter.data
    .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0]
    .selectedKeys;

    // get row filtered by keysArray (array of objects key = field name, value = key value)
    let keysArray: any[] = [];
    keys.forEach((key: any) => {
      //split key object to key and value
      Object.keys(key).forEach((keyName: string) => {
        keysArray.push({key: keyName, value: key[keyName]});
      });
    });

    let filteredRows: any;

    // get row filtered by keysArray (array of objects key = filed name, value = field value and update values
    filteredRows =
    dataAdapter.data
    .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0]
    .rows
    .filter((dataRow: any) => {
      let valid: boolean = true;
      keysArray.forEach((key: any) => {
        // check if key value is equal to row value
        if (dataRow[key.key] !== key.value) {
          valid = false;
        }
      });
      return valid;
    })

    // update rows values
    filteredRows.forEach((row: any) => {
      fields.forEach((field: any) => {
        row[field.dbFieldName] = field.value;
      });
    });
  }

  // Get data from Server from field SQL
  async getExportedData(prjId: string, formId: number, clFldGrpId: number, fieldName: string, fieldValue: string = '*', fieldCaller: string = '*') {
    let valid: boolean = false;

    let responseData: any = {
      valid: false,
      data: []
    };

    let fields: any[];
    if (fieldName === '*') {
      fields = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      .pageData
      .forms
      .filter((form: any) => form.groupId === clFldGrpId)[0]
      .fields
      .filter((field: any) => field.sqlId !== null && field.details !== null && field.details !== undefined && field.details.length > 0 );
    } else {
      fields = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      .pageData
      .forms
      .filter((form: any) => form.groupId === clFldGrpId)[0]
      .fields
      .filter((field: any) => field.sqlId !== null && field.fieldName === fieldName && field.objectName === fieldCaller);
    }

    if (fields.length > 0) {
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];

        let params: any = {};

        if (field.sqlParams !== undefined && field.sqlParams !== null && field.sqlParams.length > 0) {
          // Get params matching param from page field value
          field.sqlParams.forEach((fieldParam: any) => {
            let value: any;

            // Check if ObjectParamName is a Form Field
            const paramIsFormFields = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
            .pageData
            .forms
            .filter((form: any) => form.groupId === clFldGrpId)[0]
            .fields
            .filter((metaField: any) => metaField.objectName === fieldParam.paramObjectName).length === 1;

            if (paramIsFormFields) {
              value = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
              .pageData
              .forms
              .filter((form: any) => form.groupId === clFldGrpId)[0]
              .fields
              .filter((metaField: any) => metaField.objectName === fieldParam.paramObjectName)[0]
              .value;
            } else {
              value = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
              .pageData
              .pageFields
              .filter((pageField: any) => pageField.pageFieldName === fieldParam.paramObjectName)[0].value;
            }

            params[fieldParam.paramName] = value;
          });
        } 
        
        let value = fieldValue;
        if (fieldValue !== '*') {
          value = fieldValue;          
        } else {
          value = field.value;          
        }

        if (value !== undefined && value !== null && value !== '') {
          const connCode: string = this.getConnCode(prjId);
          const dataReq: any = {
            prjId: prjId,
            formId: formId,
            params: params,
            lookupSqlId: field.sqlId,
            lookupField: field.fieldName,
            lookupValue: fieldValue !== '*' ? fieldValue : field.value,
            connCode: connCode
          };

          const opFieldName = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
          .pageData
          .sqls
          .filter((sql: any) => sql.sqlId === field.sqlId)[0].opFieldName || null;

          if (opFieldName !== null) {
            const opFieldData = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
            .pageData
            .pageFields
            .filter((field: any) => field.pageFieldName === opFieldName)[0].value || null;

            params[opFieldName] = opFieldData;
          }

          responseData = await this.postServerData('db', 'getData', dataReq);
          if (responseData.valid && responseData.data[0].rows.length > 0) { 
            valid = true;   
            responseData.data.forEach((dataSet: any) => {
              if (dataSet.opFieldName !==null ) {
                this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
                .pageData
                .pageFields
                .forEach((field: any) => {
                  if (field.pageFieldName === dataSet.opFieldName) {
                    field.value = dataSet.rows;
                  }
                });
              }
            });
            
            field.details.forEach((detail: any) => {
              detail.value = responseData.data[0].rows[0][detail.detailFieldName];
            });
          } 
          
          if (responseData.valid && responseData.data[0].rows.length > 0) {   
            valid = true;   
            field.details.forEach((detail: any) => {
              detail.value = responseData.data[0].rows[0][detail.detailFieldName];
            });
          } 

        } else {
          field.details.forEach((detail: any) => {
            detail.value = null;
          });
        }
      };
    } else {
      valid = true;
    }
    
    return responseData;
  }

  // Get dataset from Server from field SQL used in lookup form
  async getExportedDSData(prjId: string, formId: number, clFldGrpId: number, fieldName: string, formData: any, objectName: string){
    const field: any = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .forms
    .filter((form: any) => form.groupId === clFldGrpId)[0]
    .fields
    .filter((field: any) => field.sqlId !== null && field.fieldName === fieldName && field.objectName === objectName)[0];

    let params: any = {};
    // Get params matching param from page field value
    if (field !== undefined && field.sqlParams !== undefined && field.sqlParams !== null && field.sqlParams.length > 0) {
      field.sqlParams.forEach((fieldParam: any) => {
        let value: any;
        if (formData.filter((formField: any) => formField.objectName === fieldParam.paramObjectName).length === 1) {
          value = formData.filter((formField: any) => formField.objectName === fieldParam.paramObjectName)[0].value;   
        } else {
          value = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
          .pageData
          .pageFields
          .filter((pageField: any) => pageField.pageFieldName === fieldParam.paramObjectName)[0]. value;          
        }

        params[fieldParam.paramName] = value;        
      });
    }    

    if (field !== undefined && field !== null) {     
      // const opFieldName = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      // .pageData
      // .sqls
      // .filter((sql: any) => sql.sqlId === field.sqlId)[0].opFieldName || null;

      // if (opFieldName !== null) {
      //   const opFieldData = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      //   .pageData
      //   .pageFields
      //   .filter((field: any) => field.pageFieldName === opFieldName)[0].value || null;
        
      //   params[opFieldName] = opFieldData;
      // }

      const connCode: string = this.getConnCode(prjId);
      const dataReq: any = {
        prjId: prjId,
        formId: formId,
        params: params,
        lookupSqlId: field.sqlId,
        lookupField: field.fieldName,
        lookupValue: '*',
        connCode: connCode
      };

      const responseData: any = await this.postServerData('db', 'getData', dataReq);

      if (responseData.valid && responseData.data[0].rows.length > 0) { 
        responseData.data.forEach((dataSet: any) => {
          if (dataSet.opFieldName !==null ) {
            this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
            .pageData
            .pageFields
            .forEach((field: any) => {
              if (field.pageFieldName === dataSet.opFieldName) {
                field.value = dataSet.rows;
              }
            });
          }
        });
      }

      return responseData;
    } 
  }

  //========== END FORM DATA ENTRY ACTIONS ========================================================



  // Set Page Rule
  setPageRule(prjId: string, formId: number, condId: number, condValue: number) {
    this.pageRules.filter((rule) => rule.prjId === prjId && rule.formId === formId && rule.condId === condId)[0].condValue = condValue;
    // Refresh the view to apply the rule change
    this.setView(prjId, formId, this.actualView, false);
  }    

  refreshActualView(prjId: string, formId: number) {
    this.setView(prjId, formId, this.actualView, false);
    this.appViewListener.next(this.actualView);
  }

  // Build Params Array
  private buildParamsArray(prjId: string, formId: number, action: any) {
    let params: any = {};

    if (action.sqlType === 'SQL') {
      if (action.sqlParams !== undefined && action.sqlParams !== null && action.sqlParams.length > 0) {
        action.sqlParams.forEach((param: any) => {          
          // Get page field value 
          if (param.paramObjectName !== undefined && param.paramObjectName !== '' && param.paramObjectName !== null) {
            this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
            .pageData
            .pageFields
            .forEach((field: any) => {
              if (field.pageFieldName === param.paramObjectName) {    
                params[param.paramName] = field.value;

                // Convert DateTime or Date to string from Date to String DD/MM/YYYY
                if (field.dataType === 'DateTime' || field.dataType === 'Date') {
                  const date = new Date(field.value);
                  params[param.paramName] = this.pageService.formatDate(date);
                }
              }
            });        
          } else  if (param.paramDataSetName !== undefined && param.paramDataSetName !== '' && param.paramDataSetName !== null) {
            this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
            .pageData
            .pageFields
            .forEach((field: any) => {
              if (field.dataSetName === param.paramDataSetName && field.dbFieldName === param.paramDataSetField) {    
                params[param.paramName] = field.value;

                // Convert DateTime to string from Date to String DD/MM/YYYY
                if (field.dataType === 'DateTime') {
                  const date = new Date(field.value);
                  params[param.paramName] = this.pageService.formatDate(date);
                }
              }
            });     
          }
        });
      }
      
      // Converte stringhe vuote in null per permettere ai trigger Oracle di gestire i valori default
      Object.entries(params).forEach(([key, value]) => {
        if (value === '') {
          params[key] = null;
        }
      });
    }
    
    if (action.sqlType === 'MongoDB') {
      
      if (action.doc !== undefined && action.doc !== null && action.doc.length > 0) {
        action.doc.forEach((param: any) => {
          if (param.PAGE_FIELD_NAME !== undefined && param.PAGE_FIELD_NAME !== '' && param.PAGE_FIELD_NAME !== null) {
            // Get page field value 
            this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
            .pageData
            .pageFields
            .forEach((field: any) => {
              if (field.pageFieldName === param.PAGE_FIELD_NAME) {
                if (field.dataType === 'Object') {
                  // Convert Object to JSON only if field.value data type is a string
                  if (field.value !== undefined && field.value !== null && field.value !== '') {
                    params[param.COLL_FIELD_NAME] = typeof field.value === 'string' ? JSON.parse(field.value) : field.value;
                  }
                } else {
                  params[param.COLL_FIELD_NAME] = field.value;   
                }             
              }
            });
          }
        });
      }

      if (action.queryParams !== undefined && action.queryParams !== null && action.queryParams.length > 0) {
        action.queryParams.forEach((param: any) => {
          if (param.PAGE_FIELD_NAME !== undefined && param.PAGE_FIELD_NAME !== '' && param.PAGE_FIELD_NAME !== null) {
            // Get page field value 
            this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
            .pageData
            .pageFields
            .forEach((field: any) => {
              if (field.pageFieldName === param.PAGE_FIELD_NAME) {
                if (field.dataType === 'Object') {
                  if (field.value !== undefined && field.value !== null && field.value !== '') {
                    params[param.MDBPOPFLD_QUERY_PARAM] = typeof field.value === 'string' ? JSON.parse(field.value) : field.value;
                  }
                } else {
                  params[param.MDBPOPFLD_QUERY_PARAM] = field.value;
                }
              }
            });
          }
        });
      }
    };

    return params;
  }

  // Execute Server Method
  async execMethod(apiRoute: string, methodName: string, params: any) {
    const responseData: any = await this.postServerData(apiRoute, methodName, params)    
    return responseData;
  }

  // Execute Procedure
  private async execProc(prjId: string, formId: number, sqlId: number,params: any, sqlParams: any, dataSet: any = null) {
    const connCode: string = this.getConnCode(prjId);
    const dataReq: ExecProcData = {
      prjId: prjId,
      sqlId: sqlId,
      params: params,
      connCode: connCode
    };

    let outBinds: any[] = [];

    const responseData: any = await this.postServerData('db', 'execProc', dataReq);

    if (responseData.valid && responseData.outBinds !== undefined && responseData.outBinds !== null) {
      // outBinds object loop on key values and set to page fields using field from sqlParams
      Object.entries(responseData.outBinds).forEach(([key, value]) => {
        sqlParams.forEach((param: any) => {
          if (param.paramName === key) {
            this.metaData
            .filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
            .pageData
            .pageFields
            .forEach((field: any) => {  
              if (field.pageFieldName === param.paramObjectName) {
                // value is an array of data
                // get first element of array
                field.value = (value as any[])[0];
                outBinds.push({
                  paramName: key, 
                  pageFieldName: field.pageFieldName,
                  dbFieldName: field.dbFieldName,
                  value: field.value
                });                
              }
            });
          }
        });
      });

      if (dataSet !== null) {
        dataSet.outBinds = outBinds;
      }
    }; 
    
    if (responseData.valid) {
      // save log
      const logReq: any = {
        logDate: new Date(),
        prjId: prjId,
        formId: formId,
        action: 'execProc',
        sqlId: sqlId,
        dataAdapter: null,
        dataSetAction: null,
        dataSetName: null,
        params: params,
        connCode: connCode
      };
      this.dbLog.push(logReq);
    } else if (responseData.message) {
      // Show error message to user
      this.sendDbError('Errore Database', responseData.message);
    }

    return responseData.valid;
  }



  // Get Data
  private async getData(prjId: string, formId: number, dataAdapter: string, dataParams: any) {
    let valid: boolean = false;
    const connCode: string = this.getConnCode(prjId);
    const dataReq: GetDBData = {
      prjId: prjId,
      formId: formId,
      dataAdapterName: dataAdapter,
      params: dataParams,
      connCode: connCode
    };
    const responseData: any = await this.postServerData('db', 'getData', dataReq);

    if (responseData.valid) {  
      if (responseData.data && responseData.data[0]?.rows && responseData.data[0].rows.length > 0) { 
        responseData.data.forEach((dataSet: any) => {
          if (dataSet.opFieldName !==null ) {
            this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
            .pageData
            .pageFields
            .forEach((field: any) => {
              if (field.pageFieldName === dataSet.opFieldName) {
                field.value = dataSet.rows;
              }
            });
          }
        });
      }

      // save log
      const logReq: any = {
        logDate: new Date(),
        prjId: prjId,
        formId: formId,
        action: 'getData',
        sqlId: null,
        dataAdapter: dataAdapter,
        dataSetAction: null,
        dataSetName: null,
        params: dataParams,
        connCode: connCode
      };
      this.dbLog.push(logReq);
      
      const data: any = {
        prjId: prjId,
        formId: formId,
        dataAdapter: dataAdapter,
        data: responseData.data
      }

      data.data.forEach((dataSet: any) => {
        dataSet.status = 'idle';

        // Convert numeric strings to numbers using Oracle metaData
        if (dataSet.metaData && dataSet.rows) {
          const numericFields = dataSet.metaData
            .filter((meta: any) => meta.dbType?.name === 'DB_TYPE_NUMBER')
            .map((meta: any) => meta.name);

          if (numericFields.length > 0) {
            dataSet.rows.forEach((row: any) => {
              numericFields.forEach((fieldName: string) => {
                if (row[fieldName] !== null && row[fieldName] !== undefined && row[fieldName] !== '') {
                  row[fieldName] = parseFloat(row[fieldName]);
                }
              });
            });
          }
        }
      });

      valid = true;   
      let adapter = this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId && data.dataAdapter === dataAdapter)[0];
      if (adapter !== undefined && adapter !== null) {
        adapter.data.forEach((dataSet: any) => {
          if (dataSet.opFieldName !==null ) {
            this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
            .pageData
            .pageFields
            .forEach((field: any) => {
              if (field.pageFieldName === dataSet.opFieldName) {
                field.value = dataSet.rows;
              }
            });
          }
          data.data.forEach((data: any) => {
            if (dataSet.dataSetName === data.dataSetName) {
              dataSet.rows = data.rows;
              dataSet.selectedRows = [];
              dataSet.status = 'idle';
              dataSet.selectedKeys = [];
              dataSet.isSelected = false;
              // Update limit-related fields from server response
              if (data.totalCount !== undefined) {
                dataSet.totalCount = data.totalCount;
              }
              if (data.limitApplied !== undefined) {
                dataSet.limitApplied = data.limitApplied;
              }
              if (data.limitInitialLoad !== undefined) {
                dataSet.limitInitialLoad = data.limitInitialLoad;
              }
              if (data.initialLoadLimit !== undefined) {
                dataSet.initialLoadLimit = data.initialLoadLimit;
              }
           }
          });
        });
      } else {
        this.pageData.push(data);
      }   
    }
    
    return valid;
  }

  /**
   * Reload data for a specific dataset with optional grid filters and skip initial limit
   * Used by gts-grid "Load All" button to fetch all data (filtered or not)
   */
  async reloadDataWithFilters(
    prjId: string,
    formId: number,
    dataAdapter: string,
    dataSetName: string,
    gridFilters: any[] = [],
    skipInitialLimit: boolean = true
  ): Promise<any> {
    const connCode: string = this.getConnCode(prjId);

    // Get the original action element that loaded this data to rebuild params from current field values
    const pageMetaData = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0];
    let params: any = {};

    if (pageMetaData?.pageData?.actions) {
      // Actions are stored as array of action groups, each with an 'actions' array
      for (const actionGroup of pageMetaData.pageData.actions) {
        if (actionGroup.actions) {
          for (const action of actionGroup.actions) {
            if (action.actionType === 'getData' && action.dataAdapter === dataAdapter) {
              // Use buildParamsArray to get current field values, just like the original getData call
              params = this.buildParamsArray(prjId, formId, action);
              break;
            }
          }
        }
      }
    }

    const dataReq: GetDBData = {
      prjId: prjId,
      formId: formId,
      dataAdapterName: dataAdapter,
      params: params,
      connCode: connCode,
      gridFilters: gridFilters,
      skipInitialLimit: skipInitialLimit,
      dataSetName: dataSetName  // Applica i filtri solo a questo dataset
    };

    const responseData: any = await this.postServerData('db', 'getData', dataReq);

    if (responseData.valid && responseData.data) {
      // Update the pageData with new data
      const adapter = this.pageData.find((data: any) =>
        data.prjId === prjId && data.formId === formId && data.dataAdapter === dataAdapter
      );

      if (adapter) {
        responseData.data.forEach((newDataSet: any) => {
          if (newDataSet.dataSetName === dataSetName) {
            const existingDataSet = adapter.data.find((ds: any) => ds.dataSetName === dataSetName);
            if (existingDataSet) {
              existingDataSet.rows = newDataSet.rows;
              existingDataSet.totalCount = newDataSet.totalCount;
              existingDataSet.limitApplied = newDataSet.limitApplied;
              existingDataSet.limitInitialLoad = newDataSet.limitInitialLoad;
              existingDataSet.initialLoadLimit = newDataSet.initialLoadLimit;
              existingDataSet.status = 'idle';
            }
          }
        });
      }

      return responseData;
    }

    return null;
  }

  // Reset Metadata Vibility
  private resetMetadataVisibility(prjId: string, formId: number) {
    this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      .pageData
      .tabs
      .forEach((tab: any) => {
        tab.visible = false;
      });

      this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      .pageData
      .grids
      .forEach((grid: any) => {
        grid.visible = false;
      });

      this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      .pageData
      .reportsGroups
      .forEach((rptGroup: any) => {
        rptGroup.visible = false;
      });

      this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      .pageData
      .toolbars
      .forEach((toolbar: any) => {
        toolbar.visible = false;
        toolbar.itemsList.forEach((item: any) => {
          item.visible = false;
        });
      });

      this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      .pageData
      .forms
      .forEach((form: any) => {
        form.visible = false;
      });
  }

  // Set View - Optimized version that applies only differences to avoid flickering
  private setView(prjId: string, formId: number, viewName: string, isPrevious: boolean) {
    let valid: boolean = true;

    if (!isPrevious) {
      if (this.actualView !== '' && this.actualView !== viewName) {
        this.previousView.push(this.actualView);
      }
      this.actualView = viewName;
    } else {
      this.actualView = this.previousView.pop() || '';
      viewName = this.actualView;
    }

    if (viewName === '') {
      valid = false;
    } else {
      const pageData = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]?.pageData;
      if (!pageData) {
        return false;
      }

      // Step 1: Build the desired state (objList) from view definitions
      let objList: any[] = [];

      // Look on all view actual viewName plus all views with viewFlagAlwaysActive order by viewLevel
      pageData.views
      .filter((view: any) => view.viewName === viewName || view.viewFlagAlwaysActive)
      .sort((a: any, b: any) => a.viewLevel - b.viewLevel)
      .forEach((view: any) => {
        view.objects
        .forEach((object: any) => {
          if (object.objectType === 'tabs') {
            // search metadata tabs and set actual tab index in view tabs object
            pageData.tabs.forEach((tab: any) => {
              if (tab.objectName === object.objectName) {
                object.tabIndex = tab.tabIndex || 0;
              }
            });
          }

          object.visible = true;

          if (object.tabsName !== undefined && object.tabsName !== null && object.tabsName !== '') {
            if (objList.filter((tab: any) => tab.objectName === object.tabsName).length > 0) {
              object.visible = objList.filter((tab: any) => tab.objectName === object.tabsName)[0].visible && objList.filter((tab: any) => tab.objectName === object.tabsName)[0].tabIndex === object.tabRN-1;
            }
          }

          if (object.visible) {
            if (object.selected === 'U') {
              object.visible = true;
            } else if (object.selected === 'Y') {
              object.visible = false;
              this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId)
              .forEach((data: any) => {
                data.data.forEach((dataSet: any) => {
                  if (dataSet.dataSetName === object.selectedObjectName) {
                    if (dataSet.isSelected) {
                      object.visible = true;
                    }
                  }
                });
              });
            } else if (object.selected === 'N') {
              object.visible = false;
              this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId)
              .forEach((data: any) => {
                data.data.forEach((dataSet: any) => {
                  if (dataSet.dataSetName === object.selectedObjectName) {
                    if (!dataSet.isSelected) {
                      object.visible = true;
                    }
                  }
                });
              });
            }
          }

          if (object.visible) {
            if (object.execCond !== undefined && object.execCond !== null && object.execCond.length > 0) {
              object.disabled = false;
              if (!this.checkPageRule(prjId, formId, object.execCond)) {
                object.disabled = true;
                if (object.execCondNotVisible) {
                  object.visible = false;
                }
              }
            }
          }

          objList.push(object);
        });
      });

      // Step 2: Create a map of desired states for quick lookup
      const desiredStateMap = new Map<string, { visible: boolean, disabled: boolean, tabIndex?: number }>();
      objList.forEach((obj: any) => {
        const key = `${obj.objectType}:${obj.objectName}`;
        desiredStateMap.set(key, {
          visible: obj.visible || false,
          disabled: obj.disabled || false,
          tabIndex: obj.tabIndex
        });
      });

      // Step 3: Apply differences only - update metadata objects only if their state actually changes

      // Tabs
      pageData.tabs.forEach((tab: any) => {
        const key = `tabs:${tab.objectName}`;
        const desired = desiredStateMap.get(key);
        const newVisible = desired?.visible || false;
        const newTabIndex = desired?.tabIndex;

        if (tab.visible !== newVisible) {
          tab.visible = newVisible;
        }
        if (newTabIndex !== undefined && tab.tabIndex !== newTabIndex) {
          tab.tabIndex = newTabIndex;
        }
      });

      // Grids
      pageData.grids.forEach((grid: any) => {
        const key = `grid:${grid.objectName}`;
        const desired = desiredStateMap.get(key);
        const newVisible = desired?.visible || false;
        const newDisabled = desired?.disabled || false;

        if (grid.visible !== newVisible) {
          grid.visible = newVisible;
        }
        if (grid.disabled !== newDisabled) {
          grid.disabled = newDisabled;
        }
      });

      // ReportsGroups
      pageData.reportsGroups.forEach((rptGroup: any) => {
        const key = `reportsGroup:${rptGroup.fieldGrpId}`;
        const desired = desiredStateMap.get(key);
        const newVisible = desired?.visible || false;

        if (rptGroup.visible !== newVisible) {
          rptGroup.visible = newVisible;
        }
      });

      // Toolbars
      pageData.toolbars.forEach((toolbar: any) => {
        const key = `toolbar:${toolbar.objectName}`;
        const desired = desiredStateMap.get(key);
        const newVisible = desired?.visible || false;

        if (toolbar.visible !== newVisible) {
          toolbar.visible = newVisible;
        }

        // ToolbarItems
        toolbar.itemsList.forEach((item: any) => {
          const itemKey = `toolbarItem:${item.objectName}`;
          const itemDesired = desiredStateMap.get(itemKey);
          const itemNewVisible = itemDesired?.visible || false;
          const itemNewDisabled = itemDesired?.disabled || false;

          if (item.visible !== itemNewVisible) {
            item.visible = itemNewVisible;
          }
          if (item.disabled !== itemNewDisabled) {
            item.disabled = itemNewDisabled;
          }
        });
      });

      // Forms
      pageData.forms.forEach((form: any) => {
        const key = `form:${form.objectName}`;
        const desired = desiredStateMap.get(key);
        const newVisible = desired?.visible || false;

        if (form.visible !== newVisible) {
          form.visible = newVisible;
        }
      });

      // Apply checkPageRule for each reports
      pageData.reportsGroups.forEach((rptGroup: any) => {
        rptGroup.reports.forEach((report: any) => {
          if (report.execCond !== undefined && report.execCond !== null && report.execCond.length > 0) {
            const newVisible = this.checkPageRule(prjId, formId, report.execCond);
            if (report.visible !== newVisible) {
              report.visible = newVisible;
            }
          }
        });
      });

      this.appViewListener.next(this.actualView);
    }

    return valid;
  }

  // Set selected rows, keys and set pageFields Values
  setSelectedRows(prjId: string, formId: number, dataAdapter: string, dataSetName: string, selectedRows: any[], selectedKeys: any[]) {
    if (selectedRows.length === 0) {
      selectedRows.push(this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId && data.dataAdapter === dataAdapter)[0]
      .data
      .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0]
      .rows[0]);
    };

    this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId && data.dataAdapter === dataAdapter)[0]
    .data
    .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0].selectedRows = selectedRows;

    this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId && data.dataAdapter === dataAdapter)[0]
    .data
    .filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0].selectedKeys = selectedKeys;

    this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .pageFields.forEach((field: any) => {
      if (field.dataSetName === dataSetName) {
        // Check if selectedRows has data and first row exists before accessing
        field.value = (selectedRows && selectedRows.length > 0 && selectedRows[0])
          ? selectedRows[0][field.dbFieldName]
          : null;
      }
    });
  }

  setDDRules(prjId: string, formId: number, objectName: string, DDdata: any) {
    if (this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0].DDRules === undefined) {
      this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0].DDRules = [];
    } 

    // Add DDdata to DDRules if objectName not exists
    if (this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0].DDRules.filter((rule: any) => rule.objectName === objectName).length === 0) {
      this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0].DDRules.push({
        objectName: objectName,
        DDdata: DDdata
      });
    }    
  }

  getDDRules(prjId: string, formId: number) {
    let DDdata: any = [];
    if (this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0].DDRules !== undefined) {
      this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0].DDRules.forEach((rule: any) => {
        DDdata.push({
          objectName: rule.objectName,
          DDdata: rule.DDdata
        });
      });
    }
    return DDdata;
  }

  // Set dataSet selected status
  setDataSetSelected(prjId: string, formId: number, dataSetName: string, isSelected: boolean, goToFirstRow: boolean = false, goToLastRow: boolean = false) {
    let changedSelectedStatus: boolean = false;
    let dataAdapter = '';
    let firstDataSetRow: any = null; 
    
    this.pageData
    .forEach((data: any) => {
      data.data.forEach((dataSet: any) => {
        if (dataSet.dataSetName === dataSetName) {
          if (dataSet.isSelected !== isSelected) {
            changedSelectedStatus = true;            
          }     
          dataSet.isSelected = isSelected;     
          dataAdapter = data.dataAdapter;
          if (!goToFirstRow && !goToLastRow) {
            if (dataSet.selectedRows !== undefined && dataSet.selectedRows !== null && dataSet.selectedRows.length > 0) {
              firstDataSetRow = dataSet.selectedRows[0];
            } else {
              firstDataSetRow = null;
            }
          } else if (goToFirstRow) {
            if (dataSet.rows !== undefined && dataSet.rows !== null && dataSet.rows.length > 0) {
              firstDataSetRow = dataSet.rows[0];
            } else {
              firstDataSetRow = null;
            }
          } else if (goToLastRow) {
            if (dataSet.rows !== undefined && dataSet.rows !== null && dataSet.rows.length > 0) {
              firstDataSetRow = dataSet.rows[dataSet.rows.length - 1];
            } else {
              firstDataSetRow = null;
            }
          }
        }
      });
    });

    //  remove selected rows and keys if unselected
    if (!isSelected) {
      this.pageData
      .forEach((data: any) => {        
        data.data.forEach((dataSet: any) => {
          if (dataSet.dataSetName === dataSetName) {
            dataSet.selectedRows = [];
            dataSet.selectedKeys = [];
          }
        });
      });

      // realign page fields data
      this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      .pageData
      .pageFields.forEach((field: any) => {
        if (field.dataSetName === dataSetName) {
          field.value = null;
        }
      });  
    } else {
      if (firstDataSetRow !== null) {
        // realign page fields data
        this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
        .pageData
        .pageFields.forEach((field: any) => {
          if (field.dataSetName === dataSetName) {
            field.value = firstDataSetRow[field.dbFieldName];
          }
        });  
      }
    }
   
    this.setPageDataSetRule(prjId, formId, dataAdapter, dataSetName);
    
    // emit gridSelectListener
    this.gridSelectListener.next({dataSetName: dataSetName, isSelected: isSelected});    
  }

  // Set pageFields Values from DataSet
  setFieldsValue(prjId: string, formId: number, fields: any[]) {
    fields.forEach((field: any) => {
      this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      .pageData
      .pageFields.forEach((pageField: any) => {
        if (pageField.pageFieldName === field.pageFieldName) {
          pageField.value = field.value;
        }
      });
    });
  }

  // Set Form Field Value
  setFormFieldValue(prjId: string, formId: number, formName: string, pageFieldName: string, newValue: any) {
    let field = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .forms
    .filter((form: any) => form.objectName === formName)[0]
    .fields
    .filter((field: any) => field.objectName === pageFieldName)
    [0];

    if (field !== undefined && field !== null) {  
      field.value = newValue;
    } else {
      field = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
      .pageData
      .forms
      .filter((form: any) => form.objectName === formName)[0]
      .fields
      .forEach((field: any) => {
        if (field.details !== undefined && field.details !== null && field.details.length > 0) {
          field.details.forEach((detail: any) => {
            if (detail.pageFieldName === pageFieldName) {
              detail.value = newValue;
            }
          });
        }
      });
    }
  }

  getFormFieldValue(prjId: string, formId: number, formName: string, pageFieldName: string) {
    const value = this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .forms
    .filter((form: any) => form.objectName === formName)[0]
    .fields
    .filter((field: any) => field.objectName === pageFieldName)
    [0].value;

    return value;
  }  

  // Toolbar Select DropDown Button Event
  toolbarSelectEvent(data: any) {
    this.sendToolbarEventData(data);
  }

  // Get Toolbar Data
  getToolBar(prjId: string, formId: number, objectName: string) {
    let toolbar: any = {};
    this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .toolbars
    .forEach((element: any) => {
      if (element.objectName === objectName) {
        toolbar = element;
      }
    });
    return toolbar;    
  }

  // Get Report Data
  async getReportData(prjId: string, formId: number, report: any, params: any, connCode: string, createSession: boolean = true, goToNextStep: boolean = true) {
    this.appLoaderListener.next(true);
    const action = {
      sqlId: report.sqlId,
      sqlParams: report.sqlParams,
      sqlType: 'SQL'
    };

    let reportParams: any = {};
    let reportConn: string = '';
    if (connCode !== undefined && connCode !== '') {
      reportParams = params
      reportConn = connCode;
    } else {
      reportParams = this.buildParamsArray(prjId, formId, action);
      reportConn = this.getConnCode();
    }

    const dataReq: ExecReportData = {
      prjId: prjId,
      formId: formId,
      fieldGrpId: report.fieldGrpId,
      reportCode: report.reportCode,
      reportName: report.reportName,
      sqlId: report.sqlId,
      params: reportParams,
      connCode: reportConn,
      goToNextStep: goToNextStep,
      sessionId: 0
    };

    let serverMethod: string = 'getReportData';
    if (!createSession) {
      serverMethod = 'getReportDataNoSession';
      dataReq.sessionId = report.sessionId;
    }
    const responseData: any = await this.postServerData('data', serverMethod, dataReq);

    this.appLoaderListener.next(false);
    return responseData;    
  }

  getNextFieldValue(prjId: string, formId: number, field: any) {
    // split field object to get dataSetName and dbFieldName first by ; then by =
    let dataSetName: string = field.split(';')[0].split('=')[1];
    let dbFieldName: string = field.split(';')[1].split('=')[1];
    
    let nextValue: number = 1;

    // get dataSets from metaData
    const filterObject = this.metaData.filter((page) => page.prjId === prjId && page.formId == formId )[0]
    .pageData.dataSets.filter((dataSet: any) => dataSet.dataSetName === dataSetName)[0].filterObject || {};

    // get from pageData arrays the next value extract from field parameter
    let rows: any[] = [];
    this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId)
    .forEach((dataAdapter: any) => {
      dataAdapter.data.forEach((dataSet: any) => {
        if (dataSet.dataSetName === dataSetName) {
          rows = dataSet.rows;  
        }
      });
    });

    // filter rows by filterObject
    if (Object.keys(filterObject).length > 0) {
      rows = rows.filter((row: any) => {
        let valid: boolean = true;
        Object.entries(filterObject).forEach(([key, value]) => {
          if (row[key] !== value) {
            valid = false;
          }
        });
        return valid;
      });
    }

    if (rows !== undefined && rows !== null) {
      if (rows.length === 0) {
        nextValue = 1;
      } else if (rows.length === 1 && rows[0][dbFieldName] === null) {
        nextValue = 1;
      } else if (rows.length === 1 && rows[0][dbFieldName] !== null) {
        nextValue = rows[0][dbFieldName] + 1;
      }
      // if rows has more than one element, get max value and add 1
      else if (rows.length > 1) {
        const max: number = Math.max.apply(Math, rows.map((row: any) => row[dbFieldName] || 0));
        // set nextValue to max + 1
        // if max is null or undefined, set nextValue to 1
        if (max === null || max === undefined) {
          nextValue = 1;
        } else {
          nextValue = max + 1;
        }
      }
    } else {
      nextValue = 1;
    }
    

    return nextValue;
  }

  // Get Grid Row Data
  getGridRowData(reqData: any) {    
    this.formReqListener.next(reqData);
  }


  // Download a File
  async saveZippedFile(fileName: string, fileData: string) {
    let fileBlob: any = this.bin64ToBlob(fileData, 'application/zip');
    fileBlob = this.blobToFile(fileBlob, fileName);
    this.blobFileToURL(fileBlob);    
  }

  // From Binary B64 to Blob
  bin64ToBlob(b64: string, type: string) {
    // decode base64
    let imageContent: string = atob(b64);

    // create an ArrayBuffer and a view (as unsigned 8-bit)
    let buffer: ArrayBuffer = new ArrayBuffer(imageContent.length);
    let view: Uint8Array = new Uint8Array(buffer);

    // fill the view, using the decoded base64
    for (let n: number = 0; n < imageContent.length; n++) {
      view[n] = imageContent.charCodeAt(n);
    }

    // convert ArrayBuffer to Blob
    let blob: Blob = new Blob([buffer], { type: type });

    return blob;
  }

  // From Blob To File
  blobToFile(theBlob: any, fileName: string) {
    theBlob.lastModifiedDate = new Date();
    theBlob.name = fileName;
    return theBlob;
  }

  // Save Blob File to Disk
  blobFileToURL(theBlob: any) {
    let blobUrl: string = URL.createObjectURL(theBlob);
    let link = document.createElement('a');
    link.href = blobUrl;
    link.download = theBlob.name;
    link.click();
  }
  
}
