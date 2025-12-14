/**
 * AI Template Builder Component (STANDALONE)
 * 
 * Pagina per creare template HTML da sessioni report esistenti
 * Richiamata dalla grid "REPORT SESSIONS LOG" con bottone dedicato
 */

import { Component, OnInit, inject, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';

// PrimeNG Imports (v21)
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FileUploadModule } from 'primeng/fileupload';
import { SelectButtonModule } from 'primeng/selectbutton';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { StepsModule } from 'primeng/steps';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { RadioButton } from 'primeng/radiobutton';

// Monaco Editor (opzionale - solo se lo usi)
// import { MonacoEditorModule } from 'ngx-monaco-editor-v2';

// Services
import { AiReportsService } from '../../core/services/ai-reports.service';
import { TranslationService } from '../../core/services/translation.service';
import { AuthService, ProjectConnection } from '../../core/services/auth.service';

// ============================================
// INTERFACES
// ============================================

interface SessionData {
  sessionId: number;
  prjId: string;
  reportCode: string;
  reportName: string;
  sqlId: number;
  connCode: string;
  dbMode: string;
  sessionUserMail: string;
  params: Record<string, unknown>;
}

/**
 * Dati Oracle - può essere in formato normalizzato o raw Oracle
 *
 * Formato normalizzato (usato internamente dai template):
 *   { main: [...], subreports: { SR01: [...], SR02: [...] } }
 *
 * Formato Oracle raw (come esce dal DB):
 *   { rows_P_MAIN_SESS: [...], rows_P_SR01_SESS: [...], rows_P_SR02_SESS: [...] }
 *
 * Il backend normalizza on-the-fly quando serve per AI analysis o rendering.
 * Nel frontend usiamo 'any' per accettare entrambi i formati senza errori TS.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OracleData = any;

interface OracleMetadata {
  main: FieldMetadata[];
  subreports: Record<string, FieldMetadata[]>;
}

interface FieldMetadata {
  name: string;
  dbType: {
    num: number;
    name: string;
    columnTypeName: string;
  };
  nullable: boolean;
  precision?: number;
  scale?: number;
  dbTypeName: string;
}

interface UploadedPdf {
  file: File;
  base64: string;
  previewUrl: string;
}

interface AiResult {
  template: {
    html: string;
    description: string;
  };
  aggregationRules: AggregationRules;
  mockData: Record<string, unknown>;
  analysis: string;
}

interface AggregationRules {
  main: {
    strategy: 'first' | 'merge' | 'none';
    fields: string[];
  };
  subreports: Record<string, SubreportRules>;
}

interface SubreportRules {
  groupBy: string[];
  aggregations: Record<string, string | AggregationConfig>;
  filters?: Record<string, unknown>;
  sortBy?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

interface AggregationConfig {
  type: string;
  weightField?: string;
  condition?: unknown;
}

interface SaveConfig {
  prjId: string;
  connCode: string;
  reportCode: string;
  reportName: string;
  description: string;
  notes: string;
  status: 'draft' | 'active' | 'archived';
  pdfFormat: 'A4' | 'A3' | 'Letter';
  pdfOrientation: 'portrait' | 'landscape';
}

interface EditorOptions {
  theme: string;
  language: string;
  automaticLayout: boolean;
  minimap: {
    enabled: boolean;
  };
}

type StepType = 'mode' | 'upload' | 'analyzing' | 'preview' | 'editing';
type TabType = 'info' | 'template' | 'rules' | 'mockData' | 'preview';
type PdfSourceType = 'fastReport' | 'clientPDF' | 'developerPDF';

/**
 * Modalità di utilizzo del componente:
 * - fromReport: Chiamato dai log report con PDF + dati Oracle già disponibili
 * - newWithMock: Creazione nuovo template con dati mock JSON caricati
 * - newWithPdf: Creazione nuovo template estraendo dati da PDF esterno
 * - edit: Modifica di un template esistente
 */
type BuilderMode = 'fromReport' | 'newWithMock' | 'newWithPdf' | 'edit';

/**
 * Template esistente (per modifica)
 */
interface ExistingTemplate {
  prjId: string;
  connCode: string;
  reportCode: string;
  reportName: string;
  template: {
    html: string;
    description: string;
    notes?: string;
  };
  aggregationRules: AggregationRules;
  mockData: Record<string, unknown>;
  pdfConfig?: {
    format: 'A4' | 'A3' | 'Letter';
    orientation: 'portrait' | 'landscape';
    margin?: {
      top: string;
      right: string;
      bottom: string;
      left: string;
    };
    printBackground?: boolean;
  };
  status: 'draft' | 'active' | 'archived';
  // Campi aggiuntivi dalla lista
  author?: string;
  updatedAt?: Date;
  createdAt?: Date;
  sourceSession?: {
    sessionId?: number;
    prjId?: string;
    sqlId?: number;
    connCode?: string;
    createdFrom?: string;
  };
  sourcePdf?: {
    base64?: string;
    fileName?: string;
    fileSize?: number;
    uploadedAt?: Date;
    source?: string;
  };
  cachedPreviewPdf?: {
    base64?: string;
    generatedAt?: Date;
    templateHash?: string;
    fileSize?: number;
  };
  versions?: Array<{
    version: number;
    savedAt: Date;
    savedBy: string;
    template?: {
      html: string;
      description?: string;
    };
  }>;
  userInstructions?: string;
}

// ============================================
// COMPONENT
// ============================================

@Component({
  selector: 'app-ai-template-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    FileUploadModule,
    SelectButtonModule,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Dialog,
    InputText,
    Textarea,
    Select,
    StepsModule,
    ProgressSpinnerModule,
    ToastModule,
    TooltipModule,
    RadioButton
  ],
  providers: [MessageService],
  templateUrl: './ai-template-builder.component.html',
  styleUrls: ['./ai-template-builder.component.scss']
})
export class AiTemplateBuilderComponent implements OnInit {

  // ============================================
  // INPUTS (from parent component)
  // ============================================

  /** Modalità di utilizzo del builder */
  @Input() mode: BuilderMode = 'fromReport';

  /** Template esistente da modificare (per mode='edit') */
  @Input() existingTemplate: ExistingTemplate | null = null;

  /** Dati sessione (per mode='fromReport') */
  @Input() sessionData: SessionData | null = null;
  @Input() oracleData: OracleData | null = null;
  @Input() oracleMetadata: OracleMetadata | null = null;

  // ============================================
  // OUTPUTS
  // ============================================

  /** Emesso quando il template viene salvato con successo */
  @Output() templateSaved = new EventEmitter<{ reportCode: string; success: boolean }>();

  /** Emesso quando l'utente annulla */
  @Output() cancelled = new EventEmitter<void>();

  // ============================================
  // STATE
  // ============================================
  loading = false;
  loadingMessage = 'Elaborazione in corso...';
  currentStep: StepType = 'upload';
  showSaveDialog = false;
  showConfirmExitDialog = false;
  showConfirmRegenerateDialog = false;
  private pendingExitAction: (() => void) | null = null;

  /** Indica se la modalità è già stata selezionata (per saltare step 0) */
  modeSelected = false;

  // ============================================
  // TIMER (per mostrare tempo trascorso durante analisi)
  // ============================================
  elapsedSeconds = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  /** Tempo trascorso formattato come MM:SS */
  get elapsedTimeFormatted(): string {
    const minutes = Math.floor(this.elapsedSeconds / 60);
    const seconds = this.elapsedSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // ============================================
  // PDF UPLOAD
  // ============================================
  uploadedPdf: UploadedPdf | null = null;
  pdfSource: PdfSourceType = 'fastReport';
  fastReportPdf: string | null = null;  // PDF base64 dal FastReport (passato via state)
  requireManualPdf = false;  // Flag che indica che l'utente DEVE caricare il PDF manualmente
  isDraggingPdf = false;
  isDraggingJson = false;

  // ============================================
  // USER INSTRUCTIONS FOR AI
  // ============================================
  /** Istruzioni utente per guidare Claude nella generazione del template */
  userInstructions = '';

  // ============================================
  // MOCK DATA JSON (per mode='newWithMock')
  // ============================================
  uploadedMockJson: string | null = null;
  mockDataFileName: string | null = null;
  parsedMockData: OracleData | null = null;

  /** Esempio JSON per guida utente (evita problemi ICU con parentesi graffe nel template) */
  jsonExampleText = `{
  "main": { "field1": "value", "field2": 123 },
  "subreports": {
    "SR_ITEMS": [
      { "item": "A", "qty": 10 },
      { "item": "B", "qty": 20 }
    ]
  }
}`;
  
  // ============================================
  // AI GENERATED CONTENT
  // ============================================
  aiResult: AiResult | null = null;
  
  // ============================================
  // PREVIEW
  // ============================================
  previewHtml = '';
  previewPdfBlob: Blob | null = null;

  /**
   * Preview HTML sanitizzato per uso sicuro nell'iframe
   * IMPORTANTE: Angular sanitizza [srcdoc] rimuovendo <style> tags.
   * Usiamo bypassSecurityTrustHtml per preservare il CSS.
   */
  safePreviewHtml: SafeHtml = '';
  private sanitizer = inject(DomSanitizer);

  /** Cache per PDF generato - evita chiamate ripetute */
  cachedPdfBlob: Blob | null = null;
  /** Hash del template+config usato per generare il PDF cached */
  private cachedPdfHash: string | null = null;
  
  // ============================================
  // EDITORS
  // ============================================
  templateHtml = '';
  aggregationRulesJson = '';
  
  // Editor options (Monaco-like)
  editorOptions: EditorOptions = {
    theme: 'vs-dark',
    language: 'html',
    automaticLayout: true,
    minimap: { enabled: false }
  };
  
  jsonEditorOptions: EditorOptions = {
    theme: 'vs-dark',
    language: 'json',
    automaticLayout: true,
    minimap: { enabled: false }
  };
  
  // ============================================
  // TABS
  // ============================================
  activeTab: TabType = 'info';
  private lastPreviewUpdate = 0;
  
  // ============================================
  // SAVE CONFIG
  // ============================================
  saveConfig: SaveConfig = {
    prjId: '',
    connCode: '',
    reportCode: '',
    reportName: '',
    description: '',
    notes: '',
    status: 'draft',
    pdfFormat: 'A4',
    pdfOrientation: 'portrait'
  };

  // ============================================
  // SELECT BUTTON OPTIONS
  // ============================================
  pdfSourceOptions = [
    { label: 'FastReport Esistente', value: 'fastReport' },
    { label: 'PDF Cliente', value: 'clientPDF' },
    { label: 'PDF Sviluppatore', value: 'developerPDF' }
  ];

  statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Active', value: 'active' }
  ];

  pdfFormatOptions = [
    { label: 'A4', value: 'A4' },
    { label: 'A3', value: 'A3' },
    { label: 'Letter', value: 'Letter' }
  ];

  pdfOrientationOptions = [
    { label: 'Portrait', value: 'portrait' },
    { label: 'Landscape', value: 'landscape' }
  ];

  /** Opzioni modalità builder (per step 0) */
  modeOptions = [
    {
      value: 'newWithMock',
      label: 'Nuovo da Mock JSON',
      icon: 'pi pi-database',
      description: 'Carica dati mock JSON e genera template + regole'
    },
    {
      value: 'newWithPdf',
      label: 'Nuovo da PDF',
      icon: 'pi pi-file-pdf',
      description: 'Estrai dati e layout da un PDF esistente'
    }
  ];

  // ============================================
  // LOAD TEMPLATE DIALOG
  // ============================================
  showLoadTemplateDialog = false;
  loadingTemplates = false;
  templatesList: ExistingTemplate[] = [];
  filteredTemplatesList: ExistingTemplate[] = [];
  selectedTemplateToLoad: ExistingTemplate | null = null;
  templateSearchQuery = '';
  templateStatusFilter: string | null = null;
  get templateStatusOptions() {
    return [
      { label: this.t(1298, 'Draft'), value: 'draft' },
      { label: this.t(1299, 'Active'), value: 'active' },
      { label: this.t(1300, 'Archived'), value: 'archived' }
    ];
  }

  // ============================================
  // AI STYLE ENHANCEMENT DIALOG
  // ============================================
  showStyleDialog = false;
  styleEnhancing = false;
  styleRequest = '';
  customStyleRequest = '';
  styleTimeout = false;  // Flag per indicare timeout
  lastStyleResult: {
    css: string;
    colorPalette: { primary: string; secondary: string; accent: string; background: string; text: string } | null;
    suggestions: string[];
  } | null = null;

  // ============================================
  // AI QUICK EDIT DIALOG
  // ============================================
  showQuickEditDialog = false;
  quickEditProcessing = false;
  quickEditRequest = '';
  quickEditTimeout = false;
  quickEditRequestProcessed = false; // true quando la richiesta è stata elaborata, reset quando il testo cambia
  lastQuickEditResult: {
    changes: string[];
    suggestions: string[];
  } | null = null;

  // Rigenera Template AI
  regeneratingTemplate = false;

  // ============================================
  // PDF VIEWER POPUP
  // ============================================
  showPdfViewerDialog = false;
  pdfViewerUrl: SafeResourceUrl | null = null;
  private pdfViewerRawUrl: string | null = null;  // URL raw per cleanup
  pdfViewerFileName = 'preview.pdf';
  pdfViewerBlob: Blob | null = null;
  pdfViewerLoading = false;

  // Timer per Quick Edit
  quickEditElapsedSeconds = 0;
  private quickEditTimerInterval: ReturnType<typeof setInterval> | null = null;

  // Timer per Style Enhancement
  styleElapsedSeconds = 0;
  private styleTimerInterval: ReturnType<typeof setInterval> | null = null;

  /** Opzioni predefinite per lo stile */
  get stylePresets() {
    return [
      { label: this.t(1288, 'Professionale'), value: 'Professional corporate style with navy blue and gray colors, clean borders, conservative spacing' },
      { label: this.t(1289, 'Moderno'), value: 'Modern minimal style with dark gray, generous whitespace, thin borders, system fonts' },
      { label: this.t(1290, 'Classico'), value: 'Classic traditional style with dark blue, gold accents, serif fonts, double borders on headers' },
      { label: this.t(1291, 'Colorato'), value: 'Colorful vibrant style with rich colors, visual hierarchy through color, modern sans-serif fonts' },
      { label: this.t(1292, 'Personalizzato'), value: 'custom' }
    ];
  }
  selectedStylePreset = '';

  // ============================================
  // DUPLICATE TEMPLATE DIALOG
  // ============================================
  showDuplicateDialog = false;
  duplicateProcessing = false;
  /** Connessione di destinazione selezionata per la duplicazione */
  duplicateTargetConnCode = '';
  /** Lista connessioni disponibili per il progetto corrente */
  availableConnections: ProjectConnection[] = [];
  /** Connessioni filtrate (escludendo quella corrente) */
  get availableConnectionsFiltered(): { label: string; value: string }[] {
    const currentConnCode = this.existingTemplate?.connCode || '';
    return this.availableConnections
      .filter(conn => conn.connCode !== currentConnCode)
      .map(conn => ({
        label: conn.connCode + (conn.connDefault ? ' (default)' : ''),
        value: conn.connCode
      }));
  }

  // ============================================
  // CLEAN VERSIONS DIALOG
  // ============================================
  showCleanVersionsDialog = false;
  cleanVersionsProcessing = false;
  /** Numero di versioni da mantenere (default 5) */
  keepLastVersions = 5;
  /** Numero totale di versioni attuali */
  totalVersionsCount = 0;
  /** Opzioni dropdown per keepLast */
  keepLastOptions = [
    { label: '1', value: 1 },
    { label: '3', value: 3 },
    { label: '5', value: 5 },
    { label: '10', value: 10 },
    { label: '20', value: 20 }
  ];

  // ============================================
  // EDITING MODE - Per modifica manuale contenuti
  // ============================================
  isEditingHtml = false;
  isEditingRules = false;
  isEditingMockData = false;

  // Backup dei dati originali per ripristino su Annulla
  private originalTemplateHtml = '';
  private originalAggregationRulesJson = '';
  private originalMockDataJson = '';

  // Mock data come JSON string per editing
  mockDataJson = '';

  /** Indica se qualsiasi tab è in modalità editing */
  get isAnyEditing(): boolean {
    return this.isEditingHtml || this.isEditingRules || this.isEditingMockData;
  }

  // ============================================
  // UNSAVED CHANGES TRACKING
  // ============================================

  /** Indica se ci sono modifiche non salvate */
  hasUnsavedChanges = false;

  /** Stato salvato l'ultima volta - per confronto */
  private lastSavedState: {
    templateHtml: string;
    aggregationRulesJson: string;
    mockDataJson: string;
    pdfFormat: string;
    pdfOrientation: string;
  } | null = null;

  // ============================================
  // INJECTED SERVICES
  // ============================================
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private aiReportsService = inject(AiReportsService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);
  public ts = inject(TranslationService);
  private authService = inject(AuthService);

  /**
   * Helper method for translations - shorthand for ts.getText()
   * @param txtId Translation text ID
   * @param fallback Fallback text if translation not found
   */
  t(txtId: number, fallback: string = ''): string {
    return this.ts.getText(txtId, fallback);
  }

  // ============================================
  // LIFECYCLE
  // ============================================
  async ngOnInit(): Promise<void> {
    // Assicurati che le traduzioni siano caricate
    await this.ts.initialize();
    this.initializeBuilder();
  }

  /**
   * Inizializza il builder in base alla modalità
   */
  private initializeBuilder(): void {
    switch (this.mode) {
      case 'fromReport':
        // Chiamato dai log report - ha già tutti i dati
        this.modeSelected = true;
        this.currentStep = 'upload';
        this.loadSessionData();
        break;

      case 'edit':
        // Modifica template esistente
        this.modeSelected = true;
        this.currentStep = 'preview';
        this.loadExistingTemplate();
        break;

      case 'newWithMock':
      case 'newWithPdf':
        // Modalità già specificata via Input
        this.modeSelected = true;
        this.currentStep = 'upload';
        break;

      default:
        // Nessuna modalità specificata - mostra step 0 per selezione
        this.modeSelected = false;
        this.currentStep = 'mode';
        // Controlla comunque se ci sono dati da route state
        this.checkRouteState();
        break;
    }
  }

  /**
   * Controlla se ci sono dati passati via route state
   */
  private checkRouteState(): void {
    const state = window.history.state;
    if (state && state.sessionData) {
      // Dati da log report - imposta automaticamente modalità fromReport
      this.mode = 'fromReport';
      this.modeSelected = true;
      this.currentStep = 'upload';
      this.loadSessionData();
    }
  }

  /**
   * Carica template esistente per modifica
   */
  private loadExistingTemplate(): void {
    if (!this.existingTemplate) {
      this.showError('Template non trovato');
      return;
    }

    // Popola i campi con i dati del template esistente
    this.templateHtml = this.existingTemplate.template.html;
    this.aggregationRulesJson = JSON.stringify(this.existingTemplate.aggregationRules, null, 2);
    this.oracleData = this.existingTemplate.mockData as unknown as OracleData;

    // Carica userInstructions se presenti
    this.userInstructions = this.existingTemplate.userInstructions || '';

    // Popola save config
    this.saveConfig.prjId = this.existingTemplate.prjId;
    this.saveConfig.connCode = this.existingTemplate.connCode;
    this.saveConfig.reportCode = this.existingTemplate.reportCode;
    this.saveConfig.reportName = this.existingTemplate.reportName;
    this.saveConfig.description = this.existingTemplate.template.description || '';
    this.saveConfig.notes = this.existingTemplate.template.notes || '';
    this.saveConfig.status = this.existingTemplate.status === 'archived' ? 'draft' : this.existingTemplate.status;
    if (this.existingTemplate.pdfConfig) {
      this.saveConfig.pdfFormat = this.existingTemplate.pdfConfig.format || 'A4';
      this.saveConfig.pdfOrientation = this.existingTemplate.pdfConfig.orientation || 'portrait';
    }

    // Costruisci aiResult per compatibilità
    this.aiResult = {
      template: this.existingTemplate.template,
      aggregationRules: this.existingTemplate.aggregationRules,
      mockData: this.existingTemplate.mockData,
      analysis: 'Template caricato per modifica'
    };

    this.showInfo('Template caricato per modifica');
    this.updatePreview();
  }

  /**
   * Seleziona modalità dallo step 0
   */
  selectMode(selectedMode: BuilderMode): void {
    this.mode = selectedMode;
    this.modeSelected = true;
    this.currentStep = 'upload';
  }

  // ============================================
  // LOAD EXISTING TEMPLATE
  // ============================================

  /**
   * Apre il dialog per selezionare un template esistente
   */
  async openLoadTemplateDialog(): Promise<void> {
    // Forza reload traduzioni per assicurarsi di avere le ultime
    await this.ts.reloadTexts();
    this.showLoadTemplateDialog = true;
    this.selectedTemplateToLoad = null;
    this.templateSearchQuery = '';
    this.templateStatusFilter = null;
    this.loadTemplatesList();
  }

  /**
   * Carica la lista dei template dal backend
   */
  loadTemplatesList(): void {
    this.loadingTemplates = true;
    this.aiReportsService.listTemplates().subscribe({
      next: (templates) => {
        this.templatesList = templates as ExistingTemplate[];
        this.filterTemplates();
        this.loadingTemplates = false;
      },
      error: (err) => {
        console.error('[LoadTemplate] Error loading templates:', err);
        this.showError('Errore caricamento template: ' + err.message);
        this.loadingTemplates = false;
      }
    });
  }

  /**
   * Filtra i template in base a ricerca e stato
   */
  filterTemplates(): void {
    let filtered = [...this.templatesList];

    // Filtro per ricerca testuale
    if (this.templateSearchQuery) {
      const query = this.templateSearchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.reportCode.toLowerCase().includes(query) ||
        t.reportName.toLowerCase().includes(query)
      );
    }

    // Filtro per stato
    if (this.templateStatusFilter) {
      filtered = filtered.filter(t => t.status === this.templateStatusFilter);
    }

    this.filteredTemplatesList = filtered;
  }

  /**
   * Seleziona un template dalla lista
   */
  selectTemplateToLoad(template: ExistingTemplate): void {
    this.selectedTemplateToLoad = template;
  }

  /**
   * Carica il template selezionato e passa alla modalità edit
   */
  loadSelectedTemplate(): void {
    if (!this.selectedTemplateToLoad) return;

    const { prjId, connCode, reportCode } = this.selectedTemplateToLoad;

    this.loading = true;
    this.loadingMessage = 'Caricamento template...';
    this.showLoadTemplateDialog = false;

    // Carica il template completo (con HTML, mockData, etc.)
    this.aiReportsService.getTemplate(prjId, connCode, reportCode).subscribe({
      next: (fullTemplate) => {
        // Imposta i dati nel builder
        this.existingTemplate = fullTemplate;
        this.mode = 'edit';
        this.modeSelected = true;

        // Popola gli editor
        this.templateHtml = fullTemplate.template?.html || '';
        this.aggregationRulesJson = JSON.stringify(fullTemplate.aggregationRules || {}, null, 2);

        // Popola oracleData con i mockData del template
        // IMPORTANTE: Questo è necessario per il salvataggio corretto
        this.oracleData = fullTemplate.mockData;
        this.mockDataJson = JSON.stringify(fullTemplate.mockData || {}, null, 2);

        // Popola aiResult per la preview
        this.aiResult = {
          template: {
            html: fullTemplate.template?.html || '',
            description: fullTemplate.template?.description || ''
          },
          aggregationRules: fullTemplate.aggregationRules,
          mockData: fullTemplate.mockData,
          analysis: ''
        };

        // Popola saveConfig
        this.saveConfig = {
          prjId: fullTemplate.prjId,
          connCode: fullTemplate.connCode,
          reportCode: fullTemplate.reportCode,
          reportName: fullTemplate.reportName,
          description: fullTemplate.template?.description || '',
          notes: fullTemplate.template?.notes || '',
          status: fullTemplate.status || 'draft',
          pdfFormat: fullTemplate.pdfConfig?.format || 'A4',
          pdfOrientation: fullTemplate.pdfConfig?.orientation || 'portrait'
        };

        // Vai direttamente alla preview/editing
        this.currentStep = 'preview';
        this.loading = false;

        // Marca come salvato (nessuna modifica non salvata subito dopo il caricamento)
        this.markAsSaved();

        // Genera preview
        this.updatePreview();

        this.showSuccess(`Template "${reportCode}" caricato con successo`);
      },
      error: (err) => {
        console.error('[LoadTemplate] Error loading template:', err);
        this.showError('Errore caricamento template: ' + err.message);
        this.loading = false;
      }
    });
  }

  // ============================================
  // LOAD DATA
  // ============================================
  
  loadSessionData(): void {
    // Priorità 1: Dati passati via @Input (dal popup parent)
    if (this.sessionData) {
      this.saveConfig.prjId = this.sessionData.prjId;
      this.saveConfig.connCode = this.sessionData.connCode;
      this.saveConfig.reportCode = this.sessionData.reportCode;
      this.saveConfig.reportName = this.sessionData.reportName;
      this.showInfo('Dati sessione caricati');
      return;
    }

    // Priorità 2: Carica da route state (navigazione con state)
    const state = window.history.state;
    if (state && state.sessionData) {
      this.sessionData = state.sessionData as SessionData;
      this.oracleData = state.oracleData as OracleData;
      this.oracleMetadata = state.oracleMetadata as OracleMetadata;
      this.fastReportPdf = state.fastReportPdf as string || null;
      this.requireManualPdf = state.requireManualPdf === true;
      this.saveConfig.prjId = this.sessionData.prjId;
      this.saveConfig.connCode = this.sessionData.connCode;
      this.saveConfig.reportCode = this.sessionData.reportCode;
      this.saveConfig.reportName = this.sessionData.reportName;

      // Se requireManualPdf è true, imposta automaticamente pdfSource su 'developerPDF'
      // così l'utente vede subito l'area di upload
      if (this.requireManualPdf) {
        this.pdfSource = 'developerPDF';
      }

      this.showInfo('Dati sessione caricati' + (this.requireManualPdf ? ' - Carica PDF manualmente' : ''));
      return;
    }

    // Priorità 3: Fallback - load da route params se disponibili
    this.route.params.subscribe(params => {
      if (params['sessionId']) {
        this.loadSessionFromApi(Number(params['sessionId']));
      } else {
        this.modeSelected = false;
        this.currentStep = 'mode';
      }
    });
  }
  
  loadSessionFromApi(sessionId: number): void {
    this.loading = true;
    this.aiReportsService.getSessionData(sessionId).subscribe({
      next: (data) => {
        this.sessionData = data.session as SessionData;
        this.oracleData = data.oracleData as OracleData;
        this.oracleMetadata = data.oracleMetadata as OracleMetadata;
        this.loading = false;
        this.showSuccess('Dati sessione caricati');
      },
      error: (err) => {
        this.loading = false;
        this.showError('Errore caricamento sessione: ' + err.message);
      }
    });
  }

  // ============================================
  // DRAG & DROP HANDLERS
  // ============================================

  onDragOver(event: DragEvent, type: 'pdf' | 'json'): void {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'pdf') {
      this.isDraggingPdf = true;
    } else {
      this.isDraggingJson = true;
    }
  }

  onDragLeave(event: DragEvent, type: 'pdf' | 'json'): void {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'pdf') {
      this.isDraggingPdf = false;
    } else {
      this.isDraggingJson = false;
    }
  }

  onDrop(event: DragEvent, type: 'pdf' | 'json'): void {
    event.preventDefault();
    event.stopPropagation();

    // Reset drag state
    this.isDraggingPdf = false;
    this.isDraggingJson = false;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) {
      this.showError('Nessun file rilasciato');
      return;
    }

    const file = files[0];

    if (type === 'pdf') {
      // Valida PDF
      if (file.type !== 'application/pdf') {
        this.showError('Solo file PDF sono accettati');
        return;
      }
      if (file.size > 10000000) {
        this.showError('File troppo grande (max 10MB)');
        return;
      }
      // Processa come se fosse selezionato
      this.processPdfFile(file);
    } else {
      // Valida JSON
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        this.showError('Solo file JSON sono accettati');
        return;
      }
      if (file.size > 5000000) {
        this.showError('File troppo grande (max 5MB)');
        return;
      }
      // Processa come se fosse selezionato
      this.processJsonFile(file);
    }
  }

  private processPdfFile(file: File): void {
    this.loading = true;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.uploadedPdf = {
        file: file,
        base64: result.split(',')[1],
        previewUrl: result
      };
      this.loading = false;
      this.showSuccess('PDF caricato');
    };
    reader.onerror = () => {
      this.loading = false;
      this.showError('Errore lettura file PDF');
    };
    reader.readAsDataURL(file);
  }

  private processJsonFile(file: File): void {
    this.loading = true;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const jsonContent = reader.result as string;
        const parsed = JSON.parse(jsonContent);

        // Valida struttura
        if (!parsed.main && !parsed.subreports) {
          this.loading = false;
          this.showError('JSON deve avere almeno "main" o "subreports"');
          return;
        }

        this.uploadedMockJson = jsonContent;
        this.mockDataFileName = file.name;
        this.parsedMockData = this.normalizeMockData(parsed);
        this.oracleData = this.parsedMockData;

        this.loading = false;
        this.showSuccess(`JSON caricato: ${file.name}`);

      } catch (e) {
        this.loading = false;
        this.showError('Errore parsing JSON: ' + (e as Error).message);
      }
    };

    reader.onerror = () => {
      this.loading = false;
      this.showError('Errore lettura file JSON');
    };

    reader.readAsText(file);
  }

  // ============================================
  // PDF UPLOAD
  // ============================================

  onPdfFileSelected(event: { files: File[] }): void {
    const file: File = event.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      this.showError('Seleziona un file PDF valido');
      return;
    }
    
    this.loading = true;
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.uploadedPdf = {
        file: file,
        base64: result.split(',')[1],
        previewUrl: result
      };
      this.loading = false;
      this.showSuccess('PDF caricato');
    };
    reader.onerror = () => {
      this.loading = false;
      this.showError('Errore lettura file PDF');
    };
    reader.readAsDataURL(file);
  }
  
  removePdf(): void {
    this.uploadedPdf = null;
    this.showInfo('PDF rimosso');
  }

  // ============================================
  // MOCK JSON UPLOAD (per mode='newWithMock')
  // ============================================

  /**
   * Gestisce upload file JSON con dati mock
   */
  onMockJsonFileSelected(event: { files: File[] }): void {
    const file: File = event.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      this.showError('Seleziona un file JSON valido');
      return;
    }

    this.loading = true;
    this.loadingMessage = 'Caricamento JSON...';

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const jsonContent = reader.result as string;
        const parsed = JSON.parse(jsonContent);

        // Valida struttura minima
        if (!this.validateMockDataStructure(parsed)) {
          this.showError('Struttura JSON non valida. Deve avere almeno "main" o "subreports"');
          this.loading = false;
          return;
        }

        this.uploadedMockJson = jsonContent;
        this.mockDataFileName = file.name;
        this.parsedMockData = this.normalizeMockData(parsed);
        this.oracleData = this.parsedMockData;

        this.loading = false;
        this.showSuccess(`JSON caricato: ${file.name}`);

      } catch (e) {
        this.loading = false;
        this.showError('Errore parsing JSON: ' + (e as Error).message);
      }
    };

    reader.onerror = () => {
      this.loading = false;
      this.showError('Errore lettura file JSON');
    };

    reader.readAsText(file);
  }

  /**
   * Valida struttura mock data
   */
  private validateMockDataStructure(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) return false;

    const obj = data as Record<string, unknown>;

    // Deve avere almeno main o subreports
    const hasMain = 'main' in obj;
    const hasSubreports = 'subreports' in obj;

    return hasMain || hasSubreports;
  }

  /**
   * Normalizza struttura mock data
   */
  private normalizeMockData(data: Record<string, unknown>): OracleData {
    const normalized: OracleData = {
      main: [],
      subreports: {}
    };

    // Normalizza main
    if (data['main']) {
      if (Array.isArray(data['main'])) {
        normalized.main = data['main'] as Record<string, unknown>[];
      } else if (typeof data['main'] === 'object') {
        // Se main è un singolo oggetto, wrappalo in array
        normalized.main = [data['main'] as Record<string, unknown>];
      }
    }

    // Normalizza subreports
    if (data['subreports'] && typeof data['subreports'] === 'object') {
      const subs = data['subreports'] as Record<string, unknown>;
      for (const [key, value] of Object.entries(subs)) {
        if (Array.isArray(value)) {
          normalized.subreports[key] = value as Record<string, unknown>[];
        }
      }
    }

    return normalized;
  }

  /**
   * Rimuove mock JSON caricato
   */
  removeMockJson(): void {
    this.uploadedMockJson = null;
    this.mockDataFileName = null;
    this.parsedMockData = null;
    this.oracleData = null;
    this.showInfo('JSON rimosso');
  }

  /**
   * Analizza mock data e genera template + regole
   */
  analyzeFromMockData(): void {
    if (!this.parsedMockData) {
      this.showError('Carica un file JSON con dati mock prima di analizzare');
      return;
    }

    this.currentStep = 'analyzing';
    this.loading = true;
    this.loadingMessage = 'Generazione template da dati mock...';
    this.startTimer();

    // Costruisci metadata inferito dai dati
    const inferredMetadata = this.inferMetadataFromMockData(this.parsedMockData);

    const payload = {
      reportCode: this.saveConfig.reportCode || 'CUSTOM',
      oracleData: this.parsedMockData,
      oracleMetadata: inferredMetadata,
      userInstructions: this.userInstructions || undefined
    };

    this.aiReportsService.analyzeReportSimple(payload).subscribe({
      next: (result) => {
        this.stopTimer();
        this.aiResult = result as AiResult;
        // Formatta HTML per visualizzazione leggibile nell'editor
        this.templateHtml = this.formatHtml(result.template.html);
        this.aggregationRulesJson = JSON.stringify(result.aggregationRules, null, 2);

        this.loading = false;
        this.loadingMessage = 'Elaborazione in corso...';
        this.currentStep = 'preview';
        this.activeTab = 'template';

        this.showSuccess(`Template generato in ${this.elapsedTimeFormatted}!`);
        this.updatePreview();
      },
      error: (err) => {
        this.stopTimer();
        this.loading = false;
        this.loadingMessage = 'Elaborazione in corso...';
        this.currentStep = 'upload';
        this.showError('Errore analisi: ' + (err.error?.error || err.message));
      }
    });
  }

  /**
   * Inferisce metadata dalla struttura dei dati mock
   */
  private inferMetadataFromMockData(data: OracleData): OracleMetadata {
    const metadata: OracleMetadata = {
      main: [],
      subreports: {}
    };

    // Inferisci da main
    if (data.main && data.main.length > 0) {
      const sample = data.main[0];
      metadata.main = Object.entries(sample).map(([name, value]) => ({
        name,
        dbType: this.inferDbType(value),
        nullable: true,
        dbTypeName: this.inferDbTypeName(value)
      }));
    }

    // Inferisci da subreports
    if (data.subreports) {
      for (const [srName, records] of Object.entries(data.subreports)) {
        if (Array.isArray(records) && records.length > 0) {
          const sample = records[0];
          metadata.subreports[srName] = Object.entries(sample).map(([name, value]) => ({
            name,
            dbType: this.inferDbType(value),
            nullable: true,
            dbTypeName: this.inferDbTypeName(value)
          }));
        }
      }
    }

    return metadata;
  }

  /**
   * Inferisce tipo DB dal valore
   */
  private inferDbType(value: unknown): { num: number; name: string; columnTypeName: string } {
    if (value === null || value === undefined) {
      return { num: 1, name: 'VARCHAR2', columnTypeName: 'VARCHAR2' };
    }

    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return { num: 2, name: 'NUMBER', columnTypeName: 'NUMBER' };
      }
      return { num: 2, name: 'NUMBER', columnTypeName: 'NUMBER' };
    }

    if (typeof value === 'boolean') {
      return { num: 1, name: 'VARCHAR2', columnTypeName: 'VARCHAR2' };
    }

    if (typeof value === 'string') {
      // Controlla se sembra una data
      if (/^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{2}\/\d{2}\/\d{4}/.test(value)) {
        return { num: 12, name: 'DATE', columnTypeName: 'DATE' };
      }
    }

    return { num: 1, name: 'VARCHAR2', columnTypeName: 'VARCHAR2' };
  }

  /**
   * Inferisce nome tipo DB dal valore
   */
  private inferDbTypeName(value: unknown): string {
    if (typeof value === 'number') return 'NUMBER';
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'DATE';
    }
    return 'VARCHAR2';
  }

  // ============================================
  // AI ANALYSIS
  // ============================================

  /**
   * Analisi veloce - SENZA PDF (10-30 secondi)
   * Genera template basandosi solo sulla struttura dei dati Oracle
   */
  analyzeSimple(): void {
    if (!this.sessionData) {
      this.showError('Dati sessione mancanti');
      return;
    }

    this.currentStep = 'analyzing';
    this.loading = true;
    this.loadingMessage = 'Analisi veloce in corso...';
    this.startTimer();

    const payload = {
      reportCode: this.sessionData.reportCode,
      oracleData: this.oracleData,
      oracleMetadata: this.oracleMetadata,
      userInstructions: this.userInstructions || undefined
    };

    this.aiReportsService.analyzeReportSimple(payload).subscribe({
      next: (result) => {
        this.stopTimer();
        this.aiResult = result as AiResult;
        // Formatta HTML per visualizzazione leggibile nell'editor
        this.templateHtml = this.formatHtml(result.template.html);
        this.aggregationRulesJson = JSON.stringify(result.aggregationRules, null, 2);

        this.loading = false;
        this.loadingMessage = 'Elaborazione in corso...';
        this.currentStep = 'preview';
        this.activeTab = 'template';

        this.showSuccess(`Template generato in ${this.elapsedTimeFormatted}!`);
        this.updatePreview();
      },
      error: (err) => {
        this.stopTimer();
        this.loading = false;
        this.loadingMessage = 'Elaborazione in corso...';
        this.currentStep = 'upload';
        this.showError('Errore analisi: ' + (err.error?.error || err.message));
      }
    });
  }

  /**
   * Analisi solo PDF - genera template, mock data e schema dal solo PDF
   * Non richiede dati Oracle pre-esistenti
   */
  analyzePdfOnly(): void {
    // Determina quale PDF usare
    let pdfToAnalyze: string | undefined;

    // In modalità newWithPdf, usa sempre il PDF uploadato
    if (this.mode === 'newWithPdf') {
      pdfToAnalyze = this.uploadedPdf?.base64;
    } else if (this.pdfSource === 'fastReport') {
      pdfToAnalyze = this.fastReportPdf || undefined;
    } else {
      pdfToAnalyze = this.uploadedPdf?.base64;
    }

    if (!pdfToAnalyze) {
      this.showError('Carica un PDF prima di analizzare');
      return;
    }

    this.currentStep = 'analyzing';
    this.loading = true;
    this.loadingMessage = 'Analisi PDF in corso...';
    this.startTimer();

    // Usa saveConfig per reportCode se disponibile (modalità newWithPdf)
    const reportCode = this.saveConfig.reportCode || this.sessionData?.reportCode || 'CUSTOM';
    const reportName = this.saveConfig.reportName || this.sessionData?.reportName || 'Custom Report';

    const payload = {
      pdfBase64: pdfToAnalyze,
      reportCode: reportCode,
      reportName: reportName,
      userInstructions: this.userInstructions || undefined
    };

    this.aiReportsService.analyzeReportPdfOnly(payload).subscribe({
      next: (result) => {
        this.stopTimer();
        // Costruisci AiResult dal risultato PDF-only
        this.aiResult = {
          template: result.template,
          aggregationRules: result.aggregationRules,
          mockData: result.mockData,
          analysis: result.analysis
        } as AiResult;

        // Formatta HTML per visualizzazione leggibile nell'editor
        this.templateHtml = this.formatHtml(result.template.html);
        this.aggregationRulesJson = JSON.stringify(result.aggregationRules, null, 2);

        // Aggiorna oracleData con i mock data generati (per la preview)
        this.oracleData = result.mockData as OracleData;

        this.loading = false;
        this.loadingMessage = 'Elaborazione in corso...';
        this.currentStep = 'preview';
        this.activeTab = 'template';

        this.showSuccess(`Template generato in ${this.elapsedTimeFormatted}!`);
        this.showInfo(`Schema inferito: ${result.dataSchema?.main?.fields?.length || 0} campi main, ${Object.keys(result.dataSchema?.subreports || {}).length} subreport`);
        this.updatePreview();
      },
      error: (err) => {
        this.stopTimer();
        this.loading = false;
        this.loadingMessage = 'Elaborazione in corso...';
        this.currentStep = 'upload';
        this.showError('Errore analisi PDF: ' + (err.error?.error || err.message));
      }
    });
  }

  /**
   * Analisi completa - CON PDF (60-180 secondi)
   * Genera template basandosi sul PDF + struttura dati Oracle
   */
  analyzeWithAI(): void {
    if (!this.uploadedPdf && this.pdfSource !== 'fastReport') {
      this.showError('Carica un PDF prima di analizzare');
      return;
    }

    if (!this.sessionData) {
      this.showError('Dati sessione mancanti');
      return;
    }

    // Se pdfSource è fastReport, verifica che abbiamo il PDF
    if (this.pdfSource === 'fastReport' && !this.fastReportPdf) {
      this.showError('PDF FastReport non disponibile. Prova a caricare un PDF manualmente.');
      return;
    }

    this.currentStep = 'analyzing';
    this.loading = true;
    this.loadingMessage = 'Analisi AI completa in corso...';
    this.startTimer();

    // Determina quale PDF usare
    let pdfToSend: string | undefined;
    if (this.pdfSource === 'fastReport') {
      pdfToSend = this.fastReportPdf || undefined;
    } else {
      pdfToSend = this.uploadedPdf?.base64;
    }

    const payload = {
      sessionId: this.sessionData.sessionId,
      reportCode: this.sessionData.reportCode,
      pdfSource: this.pdfSource,
      pdfBase64: pdfToSend,
      oracleData: this.oracleData,
      oracleMetadata: this.oracleMetadata,
      userInstructions: this.userInstructions || undefined
    };

    this.aiReportsService.analyzeReport(payload).subscribe({
      next: (result) => {
        this.stopTimer();
        this.aiResult = result as AiResult;
        // Formatta HTML per visualizzazione leggibile nell'editor
        this.templateHtml = this.formatHtml(result.template.html);
        this.aggregationRulesJson = JSON.stringify(result.aggregationRules, null, 2);

        this.loading = false;
        this.loadingMessage = 'Elaborazione in corso...';
        this.currentStep = 'preview';
        this.activeTab = 'template';

        this.showSuccess(`Template generato in ${this.elapsedTimeFormatted}!`);
        this.updatePreview();
      },
      error: (err) => {
        this.stopTimer();
        this.loading = false;
        this.loadingMessage = 'Elaborazione in corso...';
        this.currentStep = 'upload';
        this.showError('Errore analisi AI: ' + (err.error?.error || err.message));
      }
    });
  }

  // ============================================
  // PREVIEW
  // ============================================

  updatePreview(): void {
    // NON bloccare l'UI durante la preview - usa generateLocalPreview direttamente
    // per evitare che loading=true blocchi i bottoni
    this.generateLocalPreview();

    // Tenta anche la preview server-side in background (senza loading overlay)
    // this.loading = true; // DISABILITATO per non bloccare UI

    // Tenta anche preview server-side in background (opzionale)
    let rules: AggregationRules;
    try {
      rules = JSON.parse(this.aggregationRulesJson) as AggregationRules;
    } catch {
      // Preview locale già generata sopra, non serve fare altro
      return;
    }

    const mockData = this.aiResult?.mockData || this.oracleData;
    if (!mockData) {
      return;
    }

    const payload = {
      template: this.templateHtml,
      aggregationRules: rules,
      mockData: mockData
    };

    this.aiReportsService.previewTemplate(payload).subscribe({
      next: (result) => {
        if (result.html && result.html.trim()) {
          this.previewHtml = result.html;
          // Aggiorna safePreviewHtml per l'iframe (bypassa sanitizzazione Angular)
          this.safePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(this.previewHtml);
        }
      },
      error: () => {
        // Preview locale già generata, nessuna azione necessaria
      }
    });
  }

  /**
   * Genera preview HTML localmente senza chiamare il backend
   * NOTA: Questa è una preview semplificata. Per il rendering completo con CSS,
   * usa updatePreview() che chiama il server con Handlebars completo.
   */
  private generateLocalPreview(): void {
    const mockData = this.aiResult?.mockData || this.oracleData;

    if (!this.templateHtml || !mockData) {
      this.previewHtml = '<p style="color: #666; padding: 20px;">Nessun template o dati disponibili per la preview.</p>';
      return;
    }

    try {
      let html = this.templateHtml;

      // IMPORTANTE: Estrai e preserva TUTTI i blocchi <style> prima di elaborare
      const styleBlocks: string[] = [];
      const styleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
      let styleMatch;
      while ((styleMatch = styleRegex.exec(html)) !== null) {
        styleBlocks.push(styleMatch[0]);
      }

      // Sostituisce {{main.campo}} con valori da main
      if (mockData.main) {
        const mainRecord = Array.isArray(mockData.main) ? mockData.main[0] : mockData.main;
        if (mainRecord) {
          for (const [key, value] of Object.entries(mainRecord as Record<string, unknown>)) {
            // Pattern: {{main.FIELD}} o {{FIELD}} - MA NON dentro <style>
            const regexWithMain = new RegExp(`\\{\\{\\s*main\\.${key}\\s*\\}\\}`, 'gi');
            const regexDirect = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
            html = html.replace(regexWithMain, String(value ?? ''));
            html = html.replace(regexDirect, String(value ?? ''));
          }
        }
      }

      // Per i subreports, sostituisce {{#each subreports.SR_NAME}}...{{/each}}
      if (mockData.subreports) {
        for (const [srName, records] of Object.entries(mockData.subreports as Record<string, Record<string, unknown>[]>)) {
          // Pattern: {{#each subreports.SR_NAME}} o {{#each SR_NAME}}
          const eachRegexFull = new RegExp(`\\{\\{#each\\s+subreports\\.${srName}\\}\\}([\\s\\S]*?)\\{\\{/each\\}\\}`, 'gi');
          const eachRegexShort = new RegExp(`\\{\\{#each\\s+${srName}\\}\\}([\\s\\S]*?)\\{\\{/each\\}\\}`, 'gi');

          const replaceEach = (_match: string, innerTemplate: string) => {
            if (!Array.isArray(records) || records.length === 0) {
              return '';
            }

            return records.slice(0, 10).map(record => {
              let row = innerTemplate;
              for (const [key, value] of Object.entries(record)) {
                const fieldRegex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
                row = row.replace(fieldRegex, String(value ?? ''));
              }
              return row;
            }).join('\n');
          };

          html = html.replace(eachRegexFull, replaceEach);
          html = html.replace(eachRegexShort, replaceEach);
        }
      }

      // Rimuovi placeholder Handlebars non sostituiti (ma NON dentro <style>)
      // Prima rimuovi i blocchi style, poi pulisci, poi rimettili
      if (styleBlocks.length > 0) {
        styleBlocks.forEach((block, i) => {
          html = html.replace(block, `___STYLE_PLACEHOLDER_${i}___`);
        });
      }

      // Rimuove eventuali placeholder non sostituiti
      html = html.replace(/\{\{[^}]+\}\}/g, '');

      // Rimetti i blocchi style originali
      if (styleBlocks.length > 0) {
        styleBlocks.forEach((block, i) => {
          html = html.replace(`___STYLE_PLACEHOLDER_${i}___`, block);
        });
      }

      // Se l'HTML è già un documento completo (con <!DOCTYPE o <html>), usalo direttamente
      // Questo preserva il CSS generato da Claude AI
      const isCompleteDocument = html.trim().toLowerCase().startsWith('<!doctype') ||
                                  html.trim().toLowerCase().startsWith('<html');

      if (isCompleteDocument) {
        this.previewHtml = html;
      } else {
        // Wrap in documento HTML completo
        // Se abbiamo estratto del CSS, usalo, altrimenti usa stili default

        const defaultStyle = `
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      margin: 20px;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background: #f5f5f5;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }
    h1, h2, h3 {
      color: #333;
      margin: 10px 0;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .totals {
      font-weight: bold;
      background: #e0e0e0 !important;
    }`;

        this.previewHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${styleBlocks.length > 0 ? styleBlocks.join('\n') : `<style>${defaultStyle}</style>`}
</head>
<body>
${html}
</body>
</html>`;
      }

      // Aggiorna safePreviewHtml per l'iframe (bypassa sanitizzazione Angular che rimuove <style>)
      this.safePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(this.previewHtml);
    } catch (e) {
      this.previewHtml = `<p style="color: red; padding: 20px;">Errore generazione preview: ${(e as Error).message}</p>`;
      this.safePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(this.previewHtml);
    }
  }
  
  /**
   * Visualizza il PDF in un popup (genera se necessario)
   * Rinominato da downloadPreviewPDF per riflettere la nuova funzionalità
   */
  downloadPreviewPDF(): void {
    // Calcola hash per verificare se possiamo usare il PDF cached
    const currentHash = this.calculatePdfHash();
    const { prjId, connCode, reportCode } = this.saveConfig;

    // Step 1: Se abbiamo un PDF cached in memoria locale, mostralo nel popup
    if (this.cachedPdfBlob && this.cachedPdfHash === currentHash) {
      this.showPdfInPopup(this.cachedPdfBlob);
      return;
    }

    this.loading = true;
    this.pdfViewerLoading = true;

    // Step 2: Se il template è già salvato (mode=edit), prova a recuperare il PDF cached dal server
    if (this.mode === 'edit' && prjId && connCode && reportCode) {
      this.aiReportsService.getCachedPdf(prjId, connCode, reportCode, currentHash).subscribe({
        next: (blob) => {
          // Salva anche in cache locale
          this.cachedPdfBlob = blob;
          this.cachedPdfHash = currentHash;
          this.showPdfInPopup(blob);
          this.loading = false;
          this.showSuccess('PDF caricato (dalla cache)');
        },
        error: () => {
          // Cache non disponibile o scaduta, genera nuovo PDF
          this.generateAndDownloadPdf(currentHash);
        }
      });
    } else {
      // Template non ancora salvato, genera direttamente
      this.generateAndDownloadPdf(currentHash);
    }
  }

  /**
   * Rigenera forzatamente il PDF bypassando tutte le cache
   * Utile quando si cambiano formato/orientamento e si vuole rigenerare
   */
  regeneratePDF(): void {
    // Invalida la cache locale
    this.cachedPdfBlob = null;
    this.cachedPdfHash = '';

    const currentHash = this.calculatePdfHash();
    const { prjId, connCode, reportCode } = this.saveConfig;

    this.loading = true;

    // Se il template è salvato, invalida anche la cache server prima di rigenerare
    if (this.mode === 'edit' && prjId && connCode && reportCode) {
      this.aiReportsService.invalidateCachedPdf(prjId, connCode, reportCode).subscribe({
        next: () => {
          this.generateAndDownloadPdf(currentHash);
        },
        error: () => {
          // Ignora errori di invalidazione cache e procedi comunque
          this.generateAndDownloadPdf(currentHash);
        }
      });
    } else {
      // Template non ancora salvato, genera direttamente
      this.generateAndDownloadPdf(currentHash);
    }
  }

  /**
   * Genera un nuovo PDF e lo scarica (usato quando non c'è cache)
   */
  private generateAndDownloadPdf(currentHash: string): void {
    let rules: AggregationRules;
    try {
      rules = JSON.parse(this.aggregationRulesJson) as AggregationRules;
    } catch (e) {
      this.showError('JSON regole non valido');
      this.loading = false;
      return;
    }

    // Includi pdfConfig nel payload per rispettare format/orientation selezionati
    const payload = {
      template: this.templateHtml,
      aggregationRules: rules,
      mockData: this.aiResult?.mockData || this.oracleData,
      pdfConfig: {
        format: this.saveConfig.pdfFormat || 'A4',
        orientation: this.saveConfig.pdfOrientation || 'portrait',
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        printBackground: true
      }
    };

    this.aiReportsService.generatePreviewPDF(payload).subscribe({
      next: async (blob) => {
        // Verifica che il blob sia effettivamente un PDF valido
        if (blob.type && !blob.type.includes('pdf')) {
          try {
            const text = await blob.text();
            const errorData = JSON.parse(text);
            this.loading = false;
            this.showError('Errore generazione PDF: ' + (errorData.error || errorData.message || 'Risposta non valida dal server'));
            return;
          } catch {
            this.loading = false;
            this.showError('Errore generazione PDF: Risposta non valida dal server (content-type: ' + blob.type + ')');
            return;
          }
        }

        // Verifica dimensione minima
        if (blob.size < 100) {
          try {
            const text = await blob.text();
            this.loading = false;
            this.showError('PDF generato vuoto o non valido: ' + text.substring(0, 200));
            return;
          } catch {
            this.loading = false;
            this.showError('PDF generato vuoto o non valido');
            return;
          }
        }

        // Verifica header PDF (%PDF-)
        const headerBytes = await blob.slice(0, 5).text();
        if (!headerBytes.startsWith('%PDF-')) {
          try {
            const text = await blob.text();
            console.error('[PDF] Invalid PDF header, content:', text.substring(0, 500));
            this.loading = false;
            this.showError('Il file scaricato non è un PDF valido. Verifica i log del backend.');
            return;
          } catch {
            this.loading = false;
            this.showError('Il file scaricato non è un PDF valido');
            return;
          }
        }

        // Salva in cache locale per riuso
        this.cachedPdfBlob = blob;
        this.cachedPdfHash = currentHash;

        // Se il template è già salvato, salva il PDF anche nella cache del server
        const { prjId, connCode, reportCode } = this.saveConfig;
        if (this.mode === 'edit' && prjId && connCode && reportCode) {
          this.savePdfToServerCache(blob, prjId, connCode, reportCode, currentHash);
        }

        // Mostra PDF nel popup invece di scaricarlo
        this.showPdfInPopup(blob);
        this.loading = false;
        this.showSuccess('PDF generato');
      },
      error: async (err) => {
        this.loading = false;
        if (err.error instanceof Blob) {
          try {
            const text = await err.error.text();
            const errorData = JSON.parse(text);
            this.showError('Errore generazione PDF: ' + (errorData.error || errorData.message || text));
          } catch {
            this.showError('Errore generazione PDF: ' + err.message);
          }
        } else {
          this.showError('Errore generazione PDF: ' + (err.error?.error || err.error?.message || err.message));
        }
      }
    });
  }

  /**
   * Salva il PDF generato nella cache del server per riuso futuro
   */
  private async savePdfToServerCache(blob: Blob, prjId: string, connCode: string, reportCode: string, templateHash: string): Promise<void> {
    try {
      // Converti blob in base64
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const pdfBase64 = btoa(binary);

      this.aiReportsService.saveCachedPdf(prjId, connCode, reportCode, pdfBase64, templateHash).subscribe({
        error: () => {
          // Non blocchiamo l'utente, è solo una ottimizzazione
        }
      });
    } catch {
      // Ignora errori di conversione blob
    }
  }

  /**
   * Calcola un hash semplice per identificare quando template/config cambiano
   */
  private calculatePdfHash(): string {
    const data = {
      template: this.templateHtml,
      rules: this.aggregationRulesJson,
      format: this.saveConfig.pdfFormat,
      orientation: this.saveConfig.pdfOrientation
    };
    // Hash semplice basato sulla lunghezza e primi/ultimi caratteri
    const str = JSON.stringify(data);
    return `${str.length}-${str.substring(0, 50)}-${str.substring(str.length - 50)}`;
  }

  /**
   * Scarica un Blob come file PDF (download diretto)
   */
  private downloadBlobAsPdf(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preview_${this.saveConfig.reportCode || 'template'}.pdf`;
    document.body.appendChild(a); // Necessario per Firefox
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Mostra il PDF in un popup dialog invece di scaricarlo
   */
  private showPdfInPopup(blob: Blob, fileName?: string): void {
    // Pulisci eventuale URL precedente
    if (this.pdfViewerRawUrl) {
      URL.revokeObjectURL(this.pdfViewerRawUrl);
    }

    // Crea nuovo URL per il blob e sanitizzalo per l'iframe
    this.pdfViewerRawUrl = URL.createObjectURL(blob);
    this.pdfViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfViewerRawUrl);
    this.pdfViewerBlob = blob;
    this.pdfViewerFileName = fileName || `preview_${this.saveConfig.reportCode || 'template'}.pdf`;
    this.showPdfViewerDialog = true;
    this.pdfViewerLoading = false;
  }

  /**
   * Chiude il popup del PDF viewer e pulisce le risorse
   */
  closePdfViewer(): void {
    this.showPdfViewerDialog = false;
    if (this.pdfViewerRawUrl) {
      URL.revokeObjectURL(this.pdfViewerRawUrl);
      this.pdfViewerRawUrl = null;
    }
    this.pdfViewerUrl = null;
    this.pdfViewerBlob = null;
  }

  /**
   * Scarica il PDF attualmente visualizzato nel popup
   */
  downloadPdfFromViewer(): void {
    if (!this.pdfViewerBlob) {
      this.showError('Nessun PDF disponibile per il download');
      return;
    }

    const url = URL.createObjectURL(this.pdfViewerBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.pdfViewerFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showSuccess('PDF scaricato');
  }

  /**
   * Invalida la cache PDF (chiamare quando template o config cambiano)
   */
  invalidatePdfCache(): void {
    this.cachedPdfBlob = null;
    this.cachedPdfHash = null;
  }

  /**
   * Rigenera il template HTML con AI usando i dati già caricati
   * Richiama l'analisi completa senza dover ricaricare PDF e dati Oracle
   */
  regenerateTemplateAI(): void {
    // Verifica che abbiamo i dati necessari
    if (!this.oracleData && !this.aiResult?.mockData && !this.parsedMockData) {
      this.showError('Nessun dato disponibile per rigenerare il template');
      return;
    }

    // Mostra sempre la dialog di conferma prima di rigenerare
    this.showConfirmRegenerateDialog = true;
  }

  /**
   * Conferma la rigenerazione del template AI dalla dialog
   */
  confirmRegenerateTemplate(): void {
    this.showConfirmRegenerateDialog = false;
    this.doRegenerateTemplateAI();
  }

  /**
   * Annulla la rigenerazione del template AI
   */
  cancelRegenerateTemplate(): void {
    this.showConfirmRegenerateDialog = false;
  }

  /**
   * Esegue la rigenerazione del template AI
   */
  private doRegenerateTemplateAI(): void {
    this.regeneratingTemplate = true;
    this.currentStep = 'analyzing';
    this.loading = true;
    this.loadingMessage = 'Rigenerazione template con AI...';
    this.startTimer();

    // Determina quale dato usare
    const dataToUse = this.oracleData || this.aiResult?.mockData || this.parsedMockData;

    // Determina se abbiamo un PDF sorgente (da FastReport, upload, o template esistente)
    const sourcePdfFromTemplate = this.existingTemplate?.sourcePdf?.base64;
    const hasPdf = this.fastReportPdf || this.uploadedPdf?.base64 || sourcePdfFromTemplate;

    if (hasPdf) {
      // Analisi completa con PDF
      const pdfToSend = this.fastReportPdf || this.uploadedPdf?.base64 || sourcePdfFromTemplate;

      const payload = {
        sessionId: this.sessionData?.sessionId || 0,
        reportCode: this.saveConfig.reportCode || this.sessionData?.reportCode || 'REGEN',
        pdfSource: this.pdfSource || 'clientPDF',
        pdfBase64: pdfToSend,
        oracleData: dataToUse,
        oracleMetadata: this.oracleMetadata,
        userInstructions: this.userInstructions || undefined
      };

      this.aiReportsService.analyzeReport(payload).subscribe({
        next: (result) => {
          this.handleRegenerateSuccess(result);
        },
        error: (err) => {
          this.handleRegenerateError(err);
        }
      });
    } else {
      // Analisi senza PDF (solo dati)
      const payload = {
        reportCode: this.saveConfig.reportCode || this.sessionData?.reportCode || 'REGEN',
        oracleData: dataToUse,
        oracleMetadata: this.oracleMetadata || this.inferMetadataFromMockData(dataToUse),
        userInstructions: this.userInstructions || undefined
      };

      this.aiReportsService.analyzeReportSimple(payload).subscribe({
        next: (result) => {
          this.handleRegenerateSuccess(result);
        },
        error: (err) => {
          this.handleRegenerateError(err);
        }
      });
    }
  }

  /**
   * Gestisce il successo della rigenerazione template
   */
  private handleRegenerateSuccess(result: AiResult | unknown): void {
    this.stopTimer();
    this.regeneratingTemplate = false;
    this.loading = false;
    this.loadingMessage = 'Elaborazione in corso...';

    const typedResult = result as AiResult;
    this.aiResult = typedResult;
    this.templateHtml = this.formatHtml(typedResult.template.html);
    this.aggregationRulesJson = JSON.stringify(typedResult.aggregationRules, null, 2);

    this.currentStep = 'preview';
    this.activeTab = 'template';

    // Invalida cache PDF
    this.invalidatePdfCache();

    // Marca come modificato
    this.markAsModified();

    this.showSuccess(`Template rigenerato in ${this.elapsedTimeFormatted}!`);
    this.updatePreview();
  }

  /**
   * Gestisce l'errore della rigenerazione template
   */
  private handleRegenerateError(err: { error?: { error?: string; message?: string }; message?: string }): void {
    this.stopTimer();
    this.regeneratingTemplate = false;
    this.loading = false;
    this.loadingMessage = 'Elaborazione in corso...';
    this.currentStep = 'preview'; // Torna alla preview invece di upload

    const errorMsg = err.error?.error || err.error?.message || err.message || 'Errore sconosciuto';
    this.showError('Errore rigenerazione: ' + errorMsg);
  }

  openPreviewInNewTab(): void {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(this.previewHtml);
      win.document.close();
    }
  }

  // ============================================
  // SAVE TEMPLATE
  // ============================================

  openSaveDialog(): void {
    this.showSaveDialog = true;
    this.cdr.detectChanges();
  }

  // ============================================
  // TEMPLATE MANAGEMENT DIALOGS
  // ============================================

  /**
   * Apre dialog per gestione storico versioni
   */
  openVersionsDialog(): void {
    // TODO: Implementare dialog versioni
    this.showInfo('Funzionalità in sviluppo - Gestione Versioni');
  }

  /**
   * Apre dialog per duplicare template su altra connessione
   */
  openDuplicateDialog(): void {
    if (!this.existingTemplate) {
      this.showError('Nessun template caricato');
      return;
    }

    // Carica le connessioni disponibili dall'utente corrente
    const user = this.authService.getCurrentUser();
    if (user && user.prjConnections) {
      this.availableConnections = user.prjConnections;
    } else {
      this.availableConnections = [];
    }

    // Se non ci sono altre connessioni disponibili
    if (this.availableConnectionsFiltered.length === 0) {
      this.showWarning(this.t(1420, 'Non ci sono altre connessioni disponibili per questo progetto'));
      return;
    }

    // Reset selection
    this.duplicateTargetConnCode = '';
    this.duplicateProcessing = false;

    this.showDuplicateDialog = true;
    this.cdr.detectChanges();
  }

  /**
   * Esegue la duplicazione del template sulla connessione selezionata
   */
  duplicateTemplate(): void {
    if (!this.existingTemplate) {
      this.showError('Nessun template caricato');
      return;
    }

    if (!this.duplicateTargetConnCode) {
      this.showWarning(this.t(1421, 'Seleziona una connessione di destinazione'));
      return;
    }

    this.duplicateProcessing = true;

    this.aiReportsService.duplicateTemplate(
      this.existingTemplate.prjId,
      this.existingTemplate.connCode,
      this.existingTemplate.reportCode,
      this.duplicateTargetConnCode
    ).subscribe({
      next: (result) => {
        this.duplicateProcessing = false;
        this.showDuplicateDialog = false;
        this.showSuccess(
          this.t(1422, 'Template duplicato con successo su') + ` ${result.template.connCode}`
        );
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.duplicateProcessing = false;
        console.error('Error duplicating template:', error);
        const errorMsg = error.error?.error || error.message || 'Errore durante la duplicazione';
        this.showError(errorMsg);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Chiude dialog duplicazione
   */
  cancelDuplicateDialog(): void {
    this.showDuplicateDialog = false;
    this.duplicateTargetConnCode = '';
    this.duplicateProcessing = false;
  }

  /**
   * Apre dialog per pulizia vecchie versioni
   */
  openCleanVersionsDialog(): void {
    if (!this.existingTemplate) {
      this.showError(this.t(1430, 'Nessun template caricato'));
      return;
    }

    // Conta le versioni attuali
    this.totalVersionsCount = this.existingTemplate.versions?.length || 0;

    if (this.totalVersionsCount === 0) {
      this.showInfo(this.t(1431, 'Il template non ha versioni da pulire'));
      return;
    }

    // Reset
    this.keepLastVersions = 5;
    this.cleanVersionsProcessing = false;
    this.showCleanVersionsDialog = true;
    this.cdr.detectChanges();
  }

  /**
   * Esegue la pulizia delle versioni vecchie
   */
  cleanOldVersions(): void {
    if (!this.existingTemplate) {
      this.showError(this.t(1430, 'Nessun template caricato'));
      return;
    }

    // Calcola quante versioni saranno eliminate
    const toDelete = Math.max(0, this.totalVersionsCount - this.keepLastVersions);

    if (toDelete === 0) {
      this.showInfo(this.t(1432, 'Nessuna versione da eliminare'));
      this.showCleanVersionsDialog = false;
      return;
    }

    this.cleanVersionsProcessing = true;

    this.aiReportsService.cleanOldVersions(
      this.existingTemplate.prjId,
      this.existingTemplate.connCode,
      this.existingTemplate.reportCode,
      this.keepLastVersions
    ).subscribe({
      next: (result) => {
        this.cleanVersionsProcessing = false;
        this.showCleanVersionsDialog = false;

        // Aggiorna il conteggio locale
        if (this.existingTemplate) {
          this.existingTemplate.versions = this.existingTemplate.versions
            ?.sort((a: any, b: any) => b.version - a.version)
            .slice(0, this.keepLastVersions) || [];
        }

        this.showSuccess(
          this.t(1433, 'Eliminate') + ` ${result.deletedCount} ` + this.t(1434, 'versioni vecchie')
        );
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.cleanVersionsProcessing = false;
        console.error('Error cleaning versions:', error);
        const errorMsg = error.error?.error || error.message || 'Errore durante la pulizia';
        this.showError(errorMsg);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Annulla dialog pulizia versioni
   */
  cancelCleanVersionsDialog(): void {
    this.showCleanVersionsDialog = false;
    this.cleanVersionsProcessing = false;
  }

  /**
   * Calcola quante versioni saranno eliminate
   */
  get versionsToDeleteCount(): number {
    return Math.max(0, this.totalVersionsCount - this.keepLastVersions);
  }

  // ============================================

  saveTemplate(): void {
    // Valida campi chiave obbligatori
    if (!this.saveConfig.prjId) {
      this.showError('Project ID obbligatorio');
      return;
    }
    if (!this.saveConfig.connCode) {
      this.showError('Connection Code obbligatorio');
      return;
    }
    // Auto-genera reportCode se mancante
    if (!this.saveConfig.reportCode) {
      const now = new Date();
      const dateStr = now.toISOString().replace(/[-:T]/g, '').substring(0, 14); // YYYYMMDDHHMMSS
      this.saveConfig.reportCode = `NEWRPT_${dateStr}`;
    }
    if (!this.templateHtml) {
      this.showError('Template HTML mancante');
      return;
    }

    // Parse rules
    let rules: AggregationRules;
    try {
      rules = JSON.parse(this.aggregationRulesJson) as AggregationRules;
    } catch (e) {
      this.showError('JSON regole non valido');
      return;
    }

    this.loading = true;
    this.loadingMessage = 'Salvataggio template in corso...';

    // Determina createdFrom in base alla modalità
    let createdFrom: string;
    switch (this.mode) {
      case 'newWithMock':
        createdFrom = 'mockJson';
        break;
      case 'newWithPdf':
        createdFrom = 'pdfUpload';
        break;
      case 'edit':
        createdFrom = 'edit';
        break;
      default:
        createdFrom = this.pdfSource;
    }

    // Costruisci payload adattato alla modalità
    // NOTA: Usa sempre i dati correnti (che potrebbero essere stati modificati manualmente)
    // - oracleData: aggiornato da saveEditingMockData() quando l'utente edita i mock data
    // - rules: parsato da aggregationRulesJson che viene aggiornato da saveEditingRules()
    const currentMockData = this.oracleData || this.aiResult?.mockData || {
      main: [],
      subreports: {}
    };

    const payload: Record<string, unknown> = {
      prjId: this.saveConfig.prjId,
      connCode: this.saveConfig.connCode,
      reportCode: this.saveConfig.reportCode,
      reportName: this.saveConfig.reportName || this.saveConfig.reportCode,
      reportType: 'htmlReport',
      status: this.saveConfig.status,
      author: this.sessionData?.sessionUserMail || 'unknown',

      template: {
        html: this.templateHtml,
        description: this.saveConfig.description,
        notes: this.saveConfig.notes
      },

      aggregationRules: rules,

      mockData: currentMockData,

      oracleMetadata: this.oracleMetadata || null,

      pdfConfig: {
        format: this.saveConfig.pdfFormat,
        orientation: this.saveConfig.pdfOrientation,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        printBackground: true
      },

      // Istruzioni utente per Claude (salvate per riferimento futuro)
      userInstructions: this.userInstructions || '',

      aiGeneration: {
        model: this.aiResult ? 'claude-sonnet-4' : null,
        generatedAt: this.aiResult ? new Date() : null,
        manualEdits: this.currentStep === 'editing',
        userInstructions: this.userInstructions || ''  // Copia delle istruzioni usate
      }
    };

    // Aggiungi sourcePdf se disponibile (per riferimento futuro)
    const pdfBase64 = this.getPdfForSave();
    if (pdfBase64) {
      payload['sourcePdf'] = {
        base64: pdfBase64,
        fileName: this.uploadedPdf?.file?.name || 'fastReport.pdf',
        fileSize: this.uploadedPdf?.file?.size || Math.round(pdfBase64.length * 0.75), // Stima size da base64
        uploadedAt: new Date(),
        source: this.mode === 'newWithPdf' ? 'pdfUpload' : this.pdfSource
      };
    }

    // Aggiungi sourceSession solo se abbiamo sessionData (modalità fromReport)
    if (this.sessionData) {
      payload['sourceSession'] = {
        sessionId: this.sessionData.sessionId,
        prjId: this.sessionData.prjId,
        sqlId: this.sessionData.sqlId,
        connCode: this.sessionData.connCode,
        createdFrom: createdFrom
      };
    } else {
      // Per modalità newWithMock/newWithPdf, usa sourceSession minimale
      payload['sourceSession'] = {
        sessionId: null,
        prjId: null,
        sqlId: null,
        connCode: null,
        createdFrom: createdFrom
      };
    }

    // Scegli operazione: INSERT (POST) per nuovi, UPDATE (PUT) per esistenti
    const isUpdate = this.mode === 'edit';
    const saveOperation$ = isUpdate
      ? this.aiReportsService.updateTemplate(this.saveConfig.prjId, this.saveConfig.connCode, this.saveConfig.reportCode, payload)
      : this.aiReportsService.saveTemplate(payload);

    saveOperation$.subscribe({
      next: () => {
        this.loading = false;
        this.loadingMessage = 'Elaborazione in corso...';
        this.showSaveDialog = false;
        this.showSuccess(isUpdate ? 'Template aggiornato con successo!' : 'Template salvato con successo!');

        // Reset dirty state - nessuna modifica non salvata dopo il salvataggio
        this.markAsSaved();

        // NON uscire dalla pagina - l'utente può continuare a modificare
        // Se l'utente vuole uscire, userà il bottone "Indietro" o "Esci"
      },
      error: (err) => {
        this.loading = false;
        this.loadingMessage = 'Elaborazione in corso...';
        console.error('[Save] ERRORE:', err);

        // Gestisci errore 409 (template già esistente)
        if (err.status === 409) {
          this.showError('Un template con questo Report Code esiste già. Usa un codice diverso.');
        } else {
          this.showError('Errore salvataggio: ' + (err.error?.error || err.message));
        }
      }
    });
  }

  // ============================================
  // MANUAL EDIT
  // ============================================
  
  enableManualEdit(): void {
    this.currentStep = 'editing';
    this.showInfo('Modalità editing manuale attivata');
  }
  
  onTemplateChange(value: string): void {
    this.templateHtml = value;
    if (this.aiResult) {
      this.aiResult.analysis = 'Template modificato manualmente';
    }
    // Invalida cache PDF quando il template cambia
    this.invalidatePdfCache();
    // Track modifiche non salvate
    this.checkForUnsavedChanges();
  }

  onRulesChange(value: string): void {
    this.aggregationRulesJson = value;
    // Invalida cache PDF quando le regole cambiano
    this.invalidatePdfCache();
    // Track modifiche non salvate
    this.checkForUnsavedChanges();
  }

  onMockDataChange(value: string): void {
    this.mockDataJson = value;
    // Track modifiche non salvate
    this.checkForUnsavedChanges();
  }

  /**
   * Gestisce cambio tab - aggiorna preview solo quando si passa al tab preview
   */
  onTabChange(): void {
    // Aggiorna preview solo quando si seleziona il tab "preview"
    if (this.activeTab === 'preview') {
      // Evita aggiornamenti troppo frequenti (throttle 2 secondi)
      const now = Date.now();
      if (now - this.lastPreviewUpdate > 2000) {
        this.lastPreviewUpdate = now;
        this.updatePreview();
      }
    }
  }

  // ============================================
  // UNSAVED CHANGES TRACKING METHODS
  // ============================================

  /**
   * Ottiene lo stato corrente per confronto (per dirty checking)
   */
  private getCurrentState(): { templateHtml: string; aggregationRulesJson: string; mockDataJson: string; pdfFormat: string; pdfOrientation: string } {
    return {
      templateHtml: this.templateHtml,
      aggregationRulesJson: this.aggregationRulesJson,
      mockDataJson: this.mockDataJson,
      pdfFormat: this.saveConfig.pdfFormat,
      pdfOrientation: this.saveConfig.pdfOrientation
    };
  }

  /**
   * Confronta stato corrente con ultimo salvato per determinare se ci sono modifiche
   */
  private checkForUnsavedChanges(): void {
    if (!this.lastSavedState) {
      // Nessun salvataggio precedente - considera come modifiche presenti se c'è contenuto
      this.hasUnsavedChanges = !!(this.templateHtml || this.aggregationRulesJson || this.mockDataJson);
      return;
    }

    const current = this.getCurrentState();
    this.hasUnsavedChanges =
      current.templateHtml !== this.lastSavedState.templateHtml ||
      current.aggregationRulesJson !== this.lastSavedState.aggregationRulesJson ||
      current.mockDataJson !== this.lastSavedState.mockDataJson ||
      current.pdfFormat !== this.lastSavedState.pdfFormat ||
      current.pdfOrientation !== this.lastSavedState.pdfOrientation;
  }

  /**
   * Marca lo stato corrente come "salvato" - resetta dirty flag
   */
  markAsSaved(): void {
    this.lastSavedState = this.getCurrentState();
    this.hasUnsavedChanges = false;
  }

  /**
   * Marca manualmente come "modificato" - utile dopo AI edits
   */
  markAsModified(): void {
    this.hasUnsavedChanges = true;
  }

  /**
   * Chiamato quando cambia pdfFormat o pdfOrientation
   * Invalida la cache PDF e aggiorna lo stato modificato
   */
  onPdfConfigChange(): void {
    // Invalida la cache locale perché le impostazioni PDF sono cambiate
    this.cachedPdfBlob = null;
    this.cachedPdfHash = '';

    // Verifica se ci sono modifiche non salvate
    this.checkForUnsavedChanges();
  }

  // ============================================
  // NAVIGATION
  // ============================================

  /**
   * Torna alla pagina dei log report
   */
  goBackToLogs(): void {
    this.router.navigate(['/GTSW/logs'], { queryParams: { param: 'reports' } });
  }

  goBack(): void {
    // Controlla sempre le modifiche non salvate prima di tornare indietro
    if (this.hasUnsavedChanges) {
      // Salva l'azione da eseguire dopo la conferma
      this.pendingExitAction = () => {
        if (this.currentStep === 'preview' || this.currentStep === 'editing') {
          if (this.mode === 'edit') {
            this.resetToModeSelection();
          } else {
            this.currentStep = 'upload';
          }
        } else {
          this.goBackToLogs();
        }
      };
      this.showConfirmExitDialog = true;
      return;
    }

    if (this.currentStep === 'preview' || this.currentStep === 'editing') {
      // Se siamo in mode 'edit' (caricato da template esistente), torna alla selezione modalità
      if (this.mode === 'edit') {
        this.resetToModeSelection();
      } else {
        this.currentStep = 'upload';
      }
    } else {
      this.goBackToLogs();
    }
  }

  /**
   * Conferma uscita dal dialog - esegue l'azione pendente
   */
  confirmExit(): void {
    this.showConfirmExitDialog = false;
    if (this.pendingExitAction) {
      this.pendingExitAction();
      this.pendingExitAction = null;
    }
  }

  /**
   * Reset completo e torna alla selezione modalità iniziale
   */
  private resetToModeSelection(): void {
    // Reset mode
    this.mode = 'fromReport'; // Reset al default
    this.modeSelected = false;
    this.existingTemplate = null;

    // Reset uploaded files
    this.uploadedPdf = null;
    this.uploadedMockJson = null;
    this.mockDataFileName = null;
    this.parsedMockData = null;
    this.fastReportPdf = null;

    // Reset AI results
    this.aiResult = null;
    this.templateHtml = '';
    this.aggregationRulesJson = '';
    this.previewHtml = '';

    // Reset data
    this.oracleData = null;
    this.oracleMetadata = null;
    this.sessionData = null;

    // Reset save config
    this.saveConfig = {
      prjId: '',
      connCode: '',
      reportCode: '',
      reportName: '',
      description: '',
      notes: '',
      status: 'draft',
      pdfFormat: 'A4',
      pdfOrientation: 'portrait'
    };

    // Reset dialogs
    this.showSaveDialog = false;
    this.showLoadTemplateDialog = false;
    this.selectedTemplateToLoad = null;

    // Torna a step 0
    this.currentStep = 'mode';
  }

  /**
   * Torna alla selezione modalità resettando lo stato (metodo pubblico)
   */
  goBackToModeSelection(): void {
    this.resetToModeSelection();
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Avvia il timer per mostrare il tempo trascorso durante l'analisi
   */
  private startTimer(): void {
    this.elapsedSeconds = 0;
    this.stopTimer(); // Ferma eventuali timer precedenti
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds++;
    }, 1000);
  }

  /**
   * Ferma il timer
   */
  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ============================================
  // TIMER HELPERS PER DIALOG AI
  // ============================================

  /** Formatta il tempo per Quick Edit */
  get quickEditElapsedTimeFormatted(): string {
    const minutes = Math.floor(this.quickEditElapsedSeconds / 60);
    const seconds = this.quickEditElapsedSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /** Formatta il tempo per Style Enhancement */
  get styleElapsedTimeFormatted(): string {
    const minutes = Math.floor(this.styleElapsedSeconds / 60);
    const seconds = this.styleElapsedSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /** Avvia timer Quick Edit */
  private startQuickEditTimer(): void {
    this.quickEditElapsedSeconds = 0;
    this.stopQuickEditTimer();
    this.quickEditTimerInterval = setInterval(() => {
      this.quickEditElapsedSeconds++;
    }, 1000);
  }

  /** Ferma timer Quick Edit */
  private stopQuickEditTimer(): void {
    if (this.quickEditTimerInterval) {
      clearInterval(this.quickEditTimerInterval);
      this.quickEditTimerInterval = null;
    }
  }

  /** Avvia timer Style Enhancement */
  private startStyleTimer(): void {
    this.styleElapsedSeconds = 0;
    this.stopStyleTimer();
    this.styleTimerInterval = setInterval(() => {
      this.styleElapsedSeconds++;
    }, 1000);
  }

  /** Ferma timer Style Enhancement */
  private stopStyleTimer(): void {
    if (this.styleTimerInterval) {
      clearInterval(this.styleTimerInterval);
      this.styleTimerInterval = null;
    }
  }

  showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Successo',
      detail: message,
      life: 3000
    });
  }
  
  showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Errore',
      detail: message,
      life: 5000
    });
  }
  
  showInfo(message: string): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: message,
      life: 3000
    });
  }
  
  // ============================================
  // DATA INFO
  // ============================================

  get mainRecordsCount(): number {
    return this.oracleData?.main?.length || 0;
  }

  get subreportsCount(): number {
    return this.oracleData?.subreports ? Object.keys(this.oracleData.subreports).length : 0;
  }

  get totalRecords(): number {
    let total = this.mainRecordsCount;
    if (this.oracleData?.subreports) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.values(this.oracleData.subreports).forEach((sr: any) => {
        total += Array.isArray(sr) ? sr.length : 0;
      });
    }
    return total;
  }

  // ============================================
  // HTML FORMATTING
  // ============================================

  /**
   * Formatta HTML con indentazione corretta per visualizzazione nell'editor
   * Trasforma HTML minificato/su una riga in formato leggibile
   * @param forceReformat Se true, riformatta anche HTML già formattato
   */
  private formatHtml(html: string, forceReformat = false): string {
    if (!html) return '';

    // Se l'HTML è già formattato (contiene newline), non riformattare
    // A meno che non sia esplicitamente richiesto (es. click su "Formatta HTML")
    if (!forceReformat && html.includes('\n') && html.split('\n').length > 5) {
      return html;
    }

    // Rimuovi formattazione esistente per riformattare da zero
    let formatted = html.replace(/\n\s*/g, ' ').replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ');
    let indent = 0;
    const indentSize = 2;

    // Tags che non richiedono newline dopo
    const inlineTags = ['span', 'a', 'strong', 'em', 'b', 'i', 'small', 'code'];

    // Aggiungi newline prima di tag di apertura (escludendo inline)
    formatted = formatted.replace(/(<[^/!][^>]*>)/g, (match) => {
      const tagName = match.match(/<(\w+)/)?.[1]?.toLowerCase() || '';
      if (inlineTags.includes(tagName)) {
        return match;
      }
      return '\n' + match;
    });

    // Aggiungi newline dopo tag di chiusura (escludendo inline)
    formatted = formatted.replace(/(<\/[^>]+>)/g, (match) => {
      const tagName = match.match(/<\/(\w+)/)?.[1]?.toLowerCase() || '';
      if (inlineTags.includes(tagName)) {
        return match;
      }
      return match + '\n';
    });

    // Aggiungi newline dopo tag self-closing
    formatted = formatted.replace(/(<[^>]+\/>)/g, '$1\n');

    // Rimuovi newline multiple
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // Aggiungi indentazione
    const lines = formatted.split('\n');
    const indentedLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Decrementa indent per tag di chiusura
      if (trimmedLine.startsWith('</')) {
        indent = Math.max(0, indent - 1);
      }

      // Aggiungi indentazione
      const indentStr = ' '.repeat(indent * indentSize);
      indentedLines.push(indentStr + trimmedLine);

      // Incrementa indent per tag di apertura (non self-closing e non void)
      if (trimmedLine.match(/^<[^/!][^>]*>$/) &&
          !trimmedLine.match(/\/>$/) &&
          !trimmedLine.match(/<(br|hr|img|input|meta|link)[^>]*>/i)) {
        indent++;
      }

      // Gestisci tag sulla stessa riga (es. <td>valore</td>)
      if (trimmedLine.match(/<[^/][^>]*>[^<]*<\/[^>]+>/)) {
        // Tag apertura e chiusura sulla stessa riga - nessun cambio indent
      }
    }

    return indentedLines.join('\n');
  }

  /**
   * Bottone per formattare manualmente l'HTML nell'editor
   * Forza la riformattazione anche se l'HTML è già formattato
   */
  formatTemplateHtml(): void {
    this.templateHtml = this.formatHtml(this.templateHtml, true);
    this.showInfo('HTML formattato');
  }

  /**
   * Ottiene il PDF base64 da salvare (da upload o fastReport)
   * Ritorna null se nessun PDF disponibile
   */
  private getPdfForSave(): string | null {
    // Priorità 1: PDF uploadato dall'utente
    if (this.uploadedPdf?.base64) {
      return this.uploadedPdf.base64;
    }

    // Priorità 2: PDF da FastReport (passato via state)
    if (this.fastReportPdf) {
      return this.fastReportPdf;
    }

    return null;
  }

  // ============================================
  // AI STYLE ENHANCEMENT
  // ============================================

  /**
   * Apre il dialog per migliorare lo stile con AI
   */
  openStyleDialog(): void {
    this.showStyleDialog = true;
    this.styleRequest = '';
    this.customStyleRequest = '';
    this.selectedStylePreset = '';
    this.lastStyleResult = null;
    this.styleTimeout = false;
  }

  /**
   * Gestisce la selezione di un preset di stile
   */
  onStylePresetChange(): void {
    if (this.selectedStylePreset === 'custom') {
      this.styleRequest = '';
    } else {
      this.styleRequest = this.selectedStylePreset;
    }
  }

  /**
   * Richiede a Claude di generare CSS migliorato
   */
  enhanceStyle(): void {
    // Determina la richiesta finale
    const finalRequest = this.selectedStylePreset === 'custom'
      ? this.customStyleRequest
      : this.styleRequest;

    if (!finalRequest) {
      this.showError('Seleziona uno stile o inserisci una richiesta personalizzata');
      return;
    }

    if (!this.templateHtml) {
      this.showError('Nessun template HTML da stilizzare');
      return;
    }

    this.styleEnhancing = true;
    this.styleTimeout = false;  // Reset timeout flag
    this.startStyleTimer();  // Avvia timer

    // Estrai CSS corrente dal template (se presente)
    const currentCss = this.extractCssFromHtml(this.templateHtml);

    this.aiReportsService.enhanceCss({
      templateHtml: this.templateHtml,
      styleRequest: finalRequest,
      currentCss: currentCss || undefined
    }).subscribe({
      next: (result) => {
        this.stopStyleTimer();  // Ferma timer

        // Salva risultato
        this.lastStyleResult = {
          css: result.css,
          colorPalette: result.colorPalette,
          suggestions: result.suggestions || []
        };

        // Aggiorna il template HTML con il nuovo CSS
        if (result.enhancedHtml) {
          this.templateHtml = result.enhancedHtml;
        } else if (result.css) {
          this.templateHtml = this.injectCssIntoHtml(this.templateHtml, result.css);
        }

        // Invalida cache PDF perché il CSS è cambiato
        this.invalidatePdfCache();

        this.styleEnhancing = false;

        // Aggiorna preview
        this.updatePreview();

        this.showSuccess(`Stile migliorato in ${this.styleElapsedTimeFormatted}!`);

        // Mostra suggerimenti se presenti
        if (result.suggestions && result.suggestions.length > 0) {
          this.showInfo(`Suggerimenti: ${result.suggestions[0]}`);
        }
      },
      error: (err) => {
        console.error('[Style] Error:', err);
        this.stopStyleTimer();  // Ferma timer
        this.styleEnhancing = false;

        // Controlla se è un timeout
        const errorMessage = err.error?.error || err.message || '';
        if (errorMessage.toLowerCase().includes('timeout')) {
          this.styleTimeout = true;
          // Non mostrare toast di errore - il messaggio viene mostrato nel dialog
        } else {
          this.showError('Errore miglioramento stile: ' + errorMessage);
        }
      }
    });
  }

  /**
   * Applica il CSS generato e chiude il dialog
   */
  applyStyleAndClose(): void {
    this.showStyleDialog = false;
    this.showSuccess('Stile applicato al template');
  }

  /**
   * Annulla e chiude il dialog senza applicare modifiche
   */
  cancelStyleDialog(): void {
    this.showStyleDialog = false;
  }

  /**
   * Estrae il CSS da un HTML (cerca tag <style>)
   */
  private extractCssFromHtml(html: string): string | null {
    const match = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    return match ? match[1].trim() : null;
  }

  /**
   * Inietta CSS in un HTML esistente
   */
  private injectCssIntoHtml(html: string, css: string): string {
    // Cerca un tag <style> esistente
    const styleTagMatch = html.match(/<style[^>]*>[\s\S]*?<\/style>/i);

    if (styleTagMatch) {
      // Sostituisci il contenuto dello style esistente
      return html.replace(/<style[^>]*>[\s\S]*?<\/style>/i, `<style>\n${css}\n</style>`);
    }

    // Cerca il tag </head> e inserisci prima
    const headMatch = html.match(/<\/head>/i);
    if (headMatch) {
      return html.replace(/<\/head>/i, `<style>\n${css}\n</style>\n</head>`);
    }

    // Se non c'è head, inserisci all'inizio del body
    const bodyMatch = html.match(/<body[^>]*>/i);
    if (bodyMatch) {
      return html.replace(/<body[^>]*>/i, `${bodyMatch[0]}\n<style>\n${css}\n</style>`);
    }

    // Fallback: prependi lo style
    return `<style>\n${css}\n</style>\n${html}`;
  }

  // ============================================
  // AI QUICK EDIT
  // ============================================

  /**
   * Apre il dialog per quick edit con AI
   */
  openQuickEditDialog(): void {
    this.showQuickEditDialog = true;
    this.quickEditRequest = '';
    this.lastQuickEditResult = null;
    this.quickEditTimeout = false;
    this.quickEditRequestProcessed = false;
  }

  /**
   * Esegue il quick edit del template
   */
  executeQuickEdit(): void {
    if (!this.quickEditRequest.trim()) {
      this.showError('Inserisci una descrizione della modifica richiesta');
      return;
    }

    if (!this.templateHtml) {
      this.showError('Nessun template HTML da modificare');
      return;
    }

    this.quickEditProcessing = true;
    this.quickEditTimeout = false;
    this.startQuickEditTimer();  // Avvia timer

    // Prepara mock data per context
    const mockData = this.aiResult?.mockData || this.oracleData;

    // Prepara aggregation rules correnti per permettere aggiornamenti
    let currentRules: any = null;
    try {
      currentRules = JSON.parse(this.aggregationRulesJson);
    } catch {
      // Could not parse current aggregationRules
    }

    this.aiReportsService.quickEditTemplate({
      templateHtml: this.templateHtml,
      editRequest: this.quickEditRequest,
      mockData: mockData || undefined,
      aggregationRules: currentRules || undefined
    }).subscribe({
      next: (result) => {
        this.stopQuickEditTimer();  // Ferma timer

        // Salva risultato per mostrare le modifiche effettuate
        this.lastQuickEditResult = {
          changes: result.changes || [],
          suggestions: result.suggestions || []
        };

        // Aggiorna il template HTML con il nuovo HTML
        if (result.html) {
          this.templateHtml = result.html;

          // Aggiorna anche aiResult se presente
          if (this.aiResult) {
            this.aiResult.template.html = result.html;
            this.aiResult.analysis = 'Template modificato tramite AI Quick Edit';
          }

          // Aggiorna aggregationRules se ricevute dall'AI
          if (result.aggregationRules) {
            this.aggregationRulesJson = JSON.stringify(result.aggregationRules, null, 2);
            if (this.aiResult) {
              this.aiResult.aggregationRules = result.aggregationRules;
            }
          }

          // Invalida cache PDF perché il template è cambiato
          this.invalidatePdfCache();

          // Marca come modificato (modifiche non salvate)
          this.markAsModified();

          // Aggiorna preview immediatamente
          this.updatePreview();

          this.showSuccess(`Template modificato in ${this.quickEditElapsedTimeFormatted}!`);
        }

        this.quickEditProcessing = false;
        this.quickEditRequestProcessed = true; // Richiesta elaborata - disabilita bottone finché non cambia il testo
      },
      error: (err) => {
        console.error('[QuickEdit] Error:', err);
        this.stopQuickEditTimer();  // Ferma timer
        this.quickEditProcessing = false;

        // Controlla se è un timeout
        const errorMessage = err.error?.error || err.message || '';
        if (errorMessage.toLowerCase().includes('timeout')) {
          this.quickEditTimeout = true;
          // Non mostrare toast di errore - il messaggio viene mostrato nel dialog
        } else {
          this.showError('Errore modifica template: ' + errorMessage);
        }
      }
    });
  }

  /**
   * Applica le modifiche e chiude il dialog
   */
  applyQuickEditAndClose(): void {
    this.showQuickEditDialog = false;
    this.quickEditRequest = '';
  }

  /**
   * Annulla e chiude il dialog quick edit
   */
  cancelQuickEditDialog(): void {
    this.showQuickEditDialog = false;
    this.quickEditRequest = '';
    this.lastQuickEditResult = null;
  }

  /**
   * Chiamato quando l'utente modifica il testo della richiesta quick edit
   * Resetta il flag "processed" per riabilitare il bottone "Applica Modifiche"
   */
  onQuickEditRequestChange(): void {
    this.quickEditRequestProcessed = false;
  }

  // ============================================
  // PDF VIEWER (sorgente e cached)
  // ============================================

  /**
   * Apre il PDF sorgente (quello usato per generare il template) in una nuova tab
   */
  openSourcePdf(): void {
    if (!this.existingTemplate?.sourcePdf?.base64) {
      this.showError('PDF sorgente non disponibile');
      return;
    }

    this.openPdfInNewTab(
      this.existingTemplate.sourcePdf.base64,
      this.existingTemplate.sourcePdf.fileName || `source_${this.existingTemplate.reportCode}.pdf`
    );
  }

  /**
   * Apre il PDF cached (ultimo generato) in una nuova tab
   */
  openCachedPdf(): void {
    if (!this.existingTemplate?.cachedPreviewPdf?.base64) {
      this.showError('PDF cached non disponibile');
      return;
    }

    this.openPdfInNewTab(
      this.existingTemplate.cachedPreviewPdf.base64,
      `preview_${this.existingTemplate.reportCode}.pdf`
    );
  }

  /**
   * Helper per aprire un PDF base64 nel popup viewer
   */
  private openPdfInNewTab(base64Data: string, fileName: string): void {
    try {
      // Rimuovi eventuale prefisso data:application/pdf;base64,
      let cleanBase64 = base64Data;
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }

      // Converti base64 in Blob
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      // Mostra nel popup invece che in nuova tab
      this.showPdfInPopup(blob, fileName);
    } catch (error) {
      console.error('[PDF] Error opening PDF:', error);
      this.showError('Errore apertura PDF');
    }
  }

  // ============================================
  // EDITING MODE METHODS
  // ============================================

  /**
   * Entra in modalità editing per Template HTML
   */
  startEditingHtml(): void {
    if (this.isAnyEditing) {
      this.showWarning('Completa prima la modifica in corso');
      return;
    }
    this.originalTemplateHtml = this.templateHtml;
    this.isEditingHtml = true;
    this.showInfo('Modalità modifica HTML attiva');
  }

  /**
   * Salva modifiche Template HTML
   */
  saveEditingHtml(): void {
    if (!this.templateHtml.trim()) {
      this.showError('Il template HTML non può essere vuoto');
      return;
    }
    this.isEditingHtml = false;
    this.updatePreview();
    // Track modifiche non salvate
    this.checkForUnsavedChanges();
    this.showSuccess('Modifiche HTML salvate');
  }

  /**
   * Annulla modifiche Template HTML
   */
  cancelEditingHtml(): void {
    this.templateHtml = this.originalTemplateHtml;
    this.isEditingHtml = false;
    this.showInfo('Modifiche HTML annullate');
  }

  /**
   * Entra in modalità editing per Regole Aggregazione
   */
  startEditingRules(): void {
    if (this.isAnyEditing) {
      this.showWarning('Completa prima la modifica in corso');
      return;
    }
    this.originalAggregationRulesJson = this.aggregationRulesJson;
    this.isEditingRules = true;
    this.showInfo('Modalità modifica regole attiva');
  }

  /**
   * Salva modifiche Regole Aggregazione
   */
  saveEditingRules(): void {
    try {
      // Valida JSON
      const parsedRules = JSON.parse(this.aggregationRulesJson);

      // Aggiorna anche aiResult se presente per mantenere sincronizzazione
      if (this.aiResult) {
        this.aiResult.aggregationRules = parsedRules;
      }

      this.isEditingRules = false;
      this.updatePreview();
      // Track modifiche non salvate
      this.checkForUnsavedChanges();
      this.showSuccess('Modifiche regole salvate');
    } catch (e) {
      this.showError('JSON non valido. Correggi la sintassi prima di salvare.');
    }
  }

  /**
   * Annulla modifiche Regole Aggregazione
   */
  cancelEditingRules(): void {
    this.aggregationRulesJson = this.originalAggregationRulesJson;
    this.isEditingRules = false;
    this.showInfo('Modifiche regole annullate');
  }

  /**
   * Entra in modalità editing per Mock Data
   */
  startEditingMockData(): void {
    if (this.isAnyEditing) {
      this.showWarning('Completa prima la modifica in corso');
      return;
    }
    // Converti mock data in JSON string per editing
    const mockData = this.aiResult?.mockData || this.oracleData || {};
    this.mockDataJson = JSON.stringify(mockData, null, 2);
    this.originalMockDataJson = this.mockDataJson;
    this.isEditingMockData = true;
    this.showInfo('Modalità modifica dati attiva');
  }

  /**
   * Salva modifiche Mock Data
   */
  saveEditingMockData(): void {
    try {
      // Valida e parse JSON
      const parsedData = JSON.parse(this.mockDataJson);

      // Aggiorna i dati
      if (this.aiResult) {
        this.aiResult.mockData = parsedData;
      }
      this.oracleData = parsedData as OracleData;

      this.isEditingMockData = false;
      this.updatePreview();
      // Track modifiche non salvate
      this.checkForUnsavedChanges();
      this.showSuccess('Modifiche dati salvate');
    } catch (e) {
      this.showError('JSON non valido. Correggi la sintassi prima di salvare.');
    }
  }

  /**
   * Annulla modifiche Mock Data
   */
  cancelEditingMockData(): void {
    this.mockDataJson = this.originalMockDataJson;
    this.isEditingMockData = false;
    this.showInfo('Modifiche dati annullate');
  }

  /**
   * Mostra warning toast
   */
  private showWarning(message: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Attenzione',
      detail: message,
      life: 3000
    });
  }
}