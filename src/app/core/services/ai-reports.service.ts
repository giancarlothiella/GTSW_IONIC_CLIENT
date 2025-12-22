/**
 * AI Reports Service
 * 
 * Service per comunicazione con backend AI Reports
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiReportsService {
  
  private apiUrl = `${environment.apiUrl}/ai-reports`;

  constructor(private http: HttpClient) {}

  // ============================================
  // SESSION DATA
  // ============================================
  
  /**
   * Carica dati completi sessione report
   */
  getSessionData(sessionId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/sessions/${sessionId}/data`);
  }

  // ============================================
  // AI ANALYSIS
  // ============================================
  
  /**
   * Analizza report con AI e genera template + rules
   */
  analyzeReport(payload: {
    sessionId: number;
    reportCode: string;
    pdfSource: 'fastReport' | 'clientPDF' | 'developerPDF';
    pdfBase64?: string;
    oracleData: any;
    oracleMetadata: any;
  }): Observable<{
    template: {
      html: string;
      description: string;
    };
    aggregationRules: any;
    mockData: any;
    analysis: string;
  }> {
    return this.http.post<any>(`${this.apiUrl}/analyze`, payload);
  }

  /**
   * Analisi veloce senza PDF - genera template solo dalla struttura dati Oracle
   * Molto più veloce (~10-30 secondi vs 60-180 secondi con PDF)
   */
  analyzeReportSimple(payload: {
    reportCode: string;
    oracleData: any;
    oracleMetadata: any;
  }): Observable<{
    template: {
      html: string;
      description: string;
    };
    aggregationRules: any;
    mockData: any;
    analysis: string;
  }> {
    return this.http.post<any>(`${this.apiUrl}/analyze-simple`, payload);
  }

  /**
   * Analisi solo PDF - genera template, mock data e schema dal solo documento PDF
   * Non richiede dati Oracle, Claude inferisce tutto dal contenuto del PDF
   */
  analyzeReportPdfOnly(payload: {
    pdfBase64: string;
    reportCode?: string;
    reportName?: string;
  }): Observable<{
    template: {
      html: string;
      description: string;
    };
    dataSchema: {
      main: { fields: Array<{ name: string; type: string; description: string }> };
      subreports: Record<string, {
        description: string;
        fields: Array<{ name: string; type: string; description: string }>;
      }>;
    };
    aggregationRules: any;
    mockData: any;
    analysis: string;
  }> {
    return this.http.post<any>(`${this.apiUrl}/analyze-pdf-only`, payload);
  }

  // ============================================
  // PREVIEW
  // ============================================
  
  /**
   * Genera preview HTML dal template
   */
  previewTemplate(payload: {
    template: string;
    aggregationRules: any;
    mockData: any;
  }): Observable<{
    html: string;
  }> {
    return this.http.post<any>(`${this.apiUrl}/preview`, payload);
  }

  /**
   * Genera PDF di preview
   */
  generatePreviewPDF(payload: {
    template: string;
    aggregationRules: any;
    mockData: any;
    pdfConfig?: {
      format?: 'A4' | 'A3' | 'Letter';
      orientation?: 'portrait' | 'landscape';
      margin?: { top: string; right: string; bottom: string; left: string };
      printBackground?: boolean;
    };
  }): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/preview/pdf`, payload, {
      responseType: 'blob'
    });
  }

  // ============================================
  // CACHED PDF
  // ============================================

  /**
   * Recupera PDF cached per un template (se disponibile e valido)
   * Evita chiamate AI/Puppeteer ripetute quando il template non è cambiato
   */
  getCachedPdf(prjId: string, connCode: string, reportCode: string, templateHash?: string): Observable<Blob> {
    const params: Record<string, string> = {};
    if (templateHash) {
      params['templateHash'] = templateHash;
    }
    return this.http.get(`${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}/cached-pdf`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Salva il PDF generato nella cache del template
   * Viene chiamato dopo aver generato un nuovo PDF per evitare rigenerazioni
   */
  saveCachedPdf(prjId: string, connCode: string, reportCode: string, pdfBase64: string, templateHash?: string): Observable<{ success: boolean; fileSize: number }> {
    return this.http.post<{ success: boolean; fileSize: number }>(
      `${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}/cached-pdf`,
      { pdfBase64, templateHash }
    );
  }

  /**
   * Invalida/elimina il PDF cached (da chiamare quando il template viene modificato)
   */
  invalidateCachedPdf(prjId: string, connCode: string, reportCode: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}/cached-pdf`
    );
  }

  // ============================================
  // TEMPLATE MANAGEMENT
  // ============================================
  
  /**
   * Salva template su MongoDB
   */
  saveTemplate(template: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/templates`, template);
  }

  /**
   * Aggiorna template esistente
   */
  updateTemplate(prjId: string, connCode: string, reportCode: string, template: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}`, template);
  }

  /**
   * Aggiorna solo i metadati del template (senza creare nuova versione)
   */
  updateTemplateInfo(data: {
    prjId: string;
    connCode: string;
    reportCode: string;
    reportName?: string;
    description?: string;
    status?: string;
    pdfFormat?: string;
    pdfOrientation?: string;
    userInstructions?: string;
  }): Observable<any> {
    const { prjId, connCode, reportCode, ...updateFields } = data;
    return this.http.patch<any>(`${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}/info`, updateFields);
  }

  /**
   * Lista tutti i template
   */
  listTemplates(filters?: {
    prjId?: string;
    connCode?: string;
    status?: string;
    reportType?: string;
  }): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/templates`, { params: filters as any });
  }

  /**
   * Carica template specifico
   */
  getTemplate(prjId: string, connCode: string, reportCode: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}`);
  }

  /**
   * Elimina template
   */
  deleteTemplate(prjId: string, connCode: string, reportCode: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}`);
  }

  /**
   * Cambia stato template
   */
  changeTemplateStatus(prjId: string, connCode: string, reportCode: string, status: 'draft' | 'active' | 'archived'): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}/status`, { status });
  }

  /**
   * Ottiene l'elenco delle connessioni che hanno già questo template
   * Usato per filtrare le connessioni disponibili nel dialog di duplicazione
   */
  getTemplateConnections(prjId: string, reportCode: string): Observable<{
    prjId: string;
    reportCode: string;
    connections: Array<{ connCode: string; status: string }>;
  }> {
    return this.http.get<any>(`${this.apiUrl}/templates/${prjId}/${reportCode}/connections`);
  }

  /**
   * Duplica template su una nuova connessione
   *
   * Crea una copia del template con:
   * - Stessa prjId e reportCode
   * - Nuova connCode (targetConnCode)
   * - Status = 'draft'
   * - Version = 1 (storia versioni pulita)
   */
  duplicateTemplate(
    prjId: string,
    connCode: string,
    reportCode: string,
    targetConnCode: string,
    author?: string
  ): Observable<{
    success: boolean;
    message: string;
    template: {
      prjId: string;
      connCode: string;
      reportCode: string;
      reportName: string;
      status: string;
      version: number;
    };
  }> {
    return this.http.post<any>(
      `${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}/duplicate`,
      { targetConnCode, author }
    );
  }

  // ============================================
  // REPORT GENERATION (Runtime)
  // ============================================
  
  /**
   * Genera report usando template AI (se disponibile) o FastReport fallback
   */
  generateReport(config: {
    reportCode: string;
    sqlId: number;
    params: any;
    connCode: string;
    prjId: string;
    forceAI?: boolean;
    forceFastReport?: boolean;
  }): Observable<{
    pdf: string; // base64
    data: any;
    generatedBy: 'htmlReport' | 'fastReport';
    generationTime: number;
  }> {
    return this.http.post<any>(`${this.apiUrl}/generate`, config);
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Statistiche template
   */
  getTemplateStats(prjId: string, connCode: string, reportCode: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}/stats`);
  }

  /**
   * Storico versioni template
   */
  getTemplateVersions(prjId: string, connCode: string, reportCode: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}/versions`);
  }

  /**
   * Pulisce le versioni vecchie mantenendo solo le ultime N
   *
   * @param prjId - Project ID
   * @param connCode - Connection code
   * @param reportCode - Report code
   * @param keepLast - Numero di versioni da mantenere (default: 5)
   */
  cleanOldVersions(
    prjId: string,
    connCode: string,
    reportCode: string,
    keepLast: number = 5
  ): Observable<{
    success: boolean;
    message: string;
    deletedCount: number;
    remainingCount: number;
    keptVersions: number[];
  }> {
    return this.http.delete<any>(
      `${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}/versions/clean`,
      { params: { keepLast: keepLast.toString() } }
    );
  }

  /**
   * Recupera il PDF sorgente usato per generare il template
   * Utile per rivedere il documento originale nella pagina di gestione template
   */
  getTemplateSourcePdf(prjId: string, connCode: string, reportCode: string): Observable<{
    prjId: string;
    connCode: string;
    reportCode: string;
    reportName: string;
    sourcePdf: {
      base64: string;
      fileName: string;
      fileSize: number;
      uploadedAt: Date;
      source: 'fastReport' | 'clientPDF' | 'developerPDF' | 'pdfUpload';
    };
  }> {
    return this.http.get<any>(`${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}/source-pdf`);
  }

  /**
   * Ripristina versione template
   */
  restoreTemplateVersion(prjId: string, connCode: string, reportCode: string, version: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}/restore`, { version });
  }

  // ============================================
  // TESTING
  // ============================================

  /**
   * Test template con dati mock
   */
  testTemplate(prjId: string, connCode: string, reportCode: string): Observable<{
    success: boolean;
    pdf: string;
    errors: any[];
  }> {
    return this.http.post<any>(`${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}/test`, {});
  }

  /**
   * Test template con dati reali
   */
  testTemplateWithRealData(prjId: string, connCode: string, reportCode: string, params: any): Observable<{
    success: boolean;
    pdf: string;
    data: any;
    errors: any[];
  }> {
    return this.http.post<any>(`${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}/test-real`, { params });
  }

  // ============================================
  // UTILITIES
  // ============================================
  
  /**
   * Valida template HTML
   */
  validateTemplate(html: string): Observable<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return this.http.post<any>(`${this.apiUrl}/validate-template`, { html });
  }

  /**
   * Valida aggregation rules
   */
  validateRules(rules: any): Observable<{
    valid: boolean;
    errors: string[];
  }> {
    return this.http.post<any>(`${this.apiUrl}/validate-rules`, { rules });
  }

  /**
   * Export template come file JSON
   */
  exportTemplate(prjId: string, connCode: string, reportCode: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/templates/${prjId}/${connCode}/${reportCode}/export`, {
      responseType: 'blob'
    });
  }

  /**
   * Import template da file JSON
   */
  importTemplate(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('template', file);

    return this.http.post<any>(`${this.apiUrl}/templates/import`, formData);
  }

  // ============================================
  // AI CSS ENHANCEMENT
  // ============================================

  /**
   * Quick Edit - Modifica puntuale del template HTML senza rigenerare tutto
   *
   * Invia il template corrente con una richiesta di modifica specifica
   * e riceve il template modificato. Molto più veloce di una rigenerazione completa.
   *
   * @param payload - Configurazione per il quick edit
   * @param payload.templateHtml - HTML del template corrente
   * @param payload.editRequest - Richiesta di modifica (es. "Metti i totali in colonna", "Cambia il colore del testo")
   * @param payload.mockData - Mock data per context (opzionale)
   */
  quickEditTemplate(payload: {
    templateHtml: string;
    editRequest: string;
    mockData?: any;
    aggregationRules?: any;
  }): Observable<{
    html: string;
    aggregationRules?: any;
    changes: string[];
    suggestions: string[];
  }> {
    return this.http.post<any>(`${this.apiUrl}/quick-edit`, payload);
  }

  /**
   * AI Collaboration - Chat multi-turno con supporto vision per screenshot
   * Permette conversazioni iterative per raffinare il template
   *
   * @param payload - Configurazione per la collaborazione
   * @param payload.templateHtml - HTML del template corrente
   * @param payload.message - Messaggio dell'utente
   * @param payload.screenshot - Screenshot in base64 (opzionale)
   * @param payload.mockData - Dati mock per contesto
   * @param payload.aggregationRules - Regole aggregazione correnti
   * @param payload.conversationHistory - Cronologia messaggi precedenti
   */
  aiCollaborate(payload: {
    templateHtml: string;
    message: string;
    screenshot?: string;
    mockData?: any;
    aggregationRules?: any;
    conversationHistory?: Array<{
      role: 'user' | 'assistant';
      content: string;
      screenshot?: string;
    }>;
  }): Observable<{
    html: string;
    aggregationRules?: any;
    response: string;
    changes: string[];
    suggestions: string[];
  }> {
    return this.http.post<any>(`${this.apiUrl}/collaborate`, payload);
  }

  /**
   * Richiede a Claude di generare CSS migliorato per il template
   *
   * @param payload - Configurazione per il miglioramento CSS
   * @param payload.templateHtml - HTML del template
   * @param payload.styleRequest - Richiesta di stile dell'utente (es. "Professional", "Modern", "Custom request...")
   * @param payload.currentCss - CSS attuale (opzionale, per miglioramenti incrementali)
   */
  enhanceCss(payload: {
    templateHtml: string;
    styleRequest: string;
    currentCss?: string;
  }): Observable<{
    css: string;
    enhancedHtml: string;
    colorPalette: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
    };
    suggestions: string[];
  }> {
    return this.http.post<any>(`${this.apiUrl}/enhance-css`, payload);
  }

  // ============================================
  // AI DATA ANALYZER
  // ============================================

  /**
   * Genera regole di aggregazione dati basate su richiesta in linguaggio naturale
   *
   * IMPORTANTE: Invia SOLO lo schema dei dati (campi e tipi), NON i dati sensibili.
   * L'aggregazione vera e propria avviene lato client.
   *
   * @param payload - Configurazione per l'analisi
   * @param payload.userRequest - Richiesta in linguaggio naturale (es. "mostrami le vendite per regione")
   * @param payload.dataSchema - Schema dei dati disponibili { fields: [{ name, type, sample }] }
   * @param payload.chartType - Tipo di grafico: 'bar', 'line', 'pie', 'doughnut', 'area'
   * @param payload.maxResults - Numero massimo di risultati (default 10)
   */
  generateDataAnalysisRules(payload: {
    userRequest: string;
    dataSchema: {
      fields: Array<{
        name: string;
        type: 'string' | 'number' | 'date' | 'boolean';
        sample?: any;
        description?: string;
      }>;
    };
    chartType?: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
    maxResults?: number;
  }): Observable<{
    aggregationRule: {
      groupBy: string[];
      aggregations: Array<{
        field: string;
        operation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last' | 'concat';
        alias: string;
        separator?: string;
      }>;
      sortBy: {
        field: string;
        order: 'asc' | 'desc';
      } | null;
      filters: Array<{
        field: string;
        operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'between';
        value: any;
      }>;
      limit: number;
    };
    chartConfig: {
      type: string;
      xAxis: { field: string; label: string };
      yAxis: { field: string; label: string };
      title: string;
      colors?: string[];
    };
    gridConfig: {
      columns: Array<{
        field: string;
        header: string;
        type: 'string' | 'number' | 'currency' | 'date';
      }>;
      showTotals: boolean;
      pageSize: number;
    };
    explanation: string;
  }> {
    return this.http.post<any>(`${this.apiUrl}/data-analyzer/generate`, payload);
  }

  /**
   * Salva un'analisi dati su MongoDB per riutilizzo futuro
   */
  saveDataAnalysis(analysis: {
    prjId: string;
    analysisName: string;
    description?: string;
    dataContext: {
      datasetName: string;
      availableFields: Array<{ name: string; type: string }>;
    };
    userRequest: string;
    aggregationRule: any;
    chartConfig: any;
    gridConfig: any;
    createdBy?: string;
    tags?: string[];
  }): Observable<{
    success: boolean;
    analysisId: string;
    message: string;
  }> {
    return this.http.post<any>(`${this.apiUrl}/data-analyzer/save`, analysis);
  }

  /**
   * Lista analisi salvate per un progetto
   */
  listDataAnalyses(prjId: string, options?: {
    tags?: string[];
    search?: string;
    limit?: number;
    skip?: number;
  }): Observable<{
    analyses: Array<{
      _id: string;
      prjId: string;
      analysisName: string;
      description: string;
      userRequest: string;
      chartConfig: { type: string; title: string };
      tags: string[];
      createdAt: Date;
      createdBy: string;
      usageCount: number;
    }>;
    total: number;
  }> {
    const params: any = { ...options };
    if (params.tags) {
      params.tags = params.tags.join(',');
    }
    return this.http.get<any>(`${this.apiUrl}/data-analyzer/list/${prjId}`, { params });
  }

  /**
   * Carica un'analisi salvata
   */
  getDataAnalysis(analysisId: string): Observable<{
    _id: string;
    prjId: string;
    analysisName: string;
    description: string;
    dataContext: any;
    userRequest: string;
    aggregationRule: any;
    chartConfig: any;
    gridConfig: any;
    tags: string[];
    createdAt: Date;
    createdBy: string;
    usageCount: number;
  }> {
    return this.http.get<any>(`${this.apiUrl}/data-analyzer/${analysisId}`);
  }

  /**
   * Elimina un'analisi salvata
   */
  deleteDataAnalysis(analysisId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`${this.apiUrl}/data-analyzer/${analysisId}`);
  }

  /**
   * Archivia un'analisi (soft delete)
   */
  archiveDataAnalysis(analysisId: string): Observable<{ success: boolean; message: string }> {
    return this.http.patch<any>(`${this.apiUrl}/data-analyzer/${analysisId}/archive`, {});
  }

  // ============================================
  // AI PROMPTS (Dynamic Examples)
  // ============================================

  /**
   * Genera regole di aggregazione con supporto per retry
   * Se retryContext è fornito, il sistema userà il contesto dell'errore precedente
   */
  generateDataAnalysisRulesWithRetry(payload: {
    userRequest: string;
    dataSchema: {
      fields: Array<{
        name: string;
        type: 'string' | 'number' | 'date' | 'boolean';
        sample?: any;
        description?: string;
      }>;
    };
    chartType?: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
    maxResults?: number;
    prjId?: string;
    retryContext?: {
      errorType: string;
      errorMessage: string;
      previousRules: any;
    };
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/data-analyzer/generate`, payload);
  }

  /**
   * Segnala che un'analisi ha funzionato correttamente
   * Il sistema salverà l'esempio per migliorare le risposte future
   */
  learnFromSuccess(payload: {
    userRequest: string;
    aggregationRule: any;
    chartConfig: any;
    gridConfig: any;
    explanation: string;
    prjId?: string;
  }): Observable<{
    success: boolean;
    id: string;
    action: 'created' | 'updated';
    message: string;
  }> {
    return this.http.post<any>(`${environment.apiUrl}/ai-prompts/learn`, {
      promptType: 'dataAnalysis',
      ...payload
    });
  }

  /**
   * Popola il database con gli esempi di sistema iniziali
   * Chiamare una sola volta al setup iniziale
   */
  seedAiPrompts(): Observable<{
    success: boolean;
    message: string;
    seeded: number;
  }> {
    return this.http.post<any>(`${environment.apiUrl}/ai-prompts/seed`, {});
  }

  /**
   * Lista gli esempi AI disponibili
   */
  listAiPrompts(promptType: string = 'dataAnalysis'): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/ai-prompts/${promptType}`);
  }
}