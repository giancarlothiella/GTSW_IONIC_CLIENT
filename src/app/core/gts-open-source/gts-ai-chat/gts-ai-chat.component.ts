/**
 * GTS AI Chat Component
 *
 * Componente riusabile per chat AI configurabile.
 * Può essere richiamato da qualsiasi pagina tramite chatCode.
 *
 * Caratteristiche:
 * - Conversazioni multi-turno persistenti
 * - Supporto allegati (PDF, immagini)
 * - Contesto configurabile (griglia, form, documento)
 * - Domande suggerite
 * - Rendering Markdown
 */

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// PrimeNG
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { Textarea } from 'primeng/textarea';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tooltip } from 'primeng/tooltip';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FileUploadModule } from 'primeng/fileupload';

// Services
import { AuthService } from '../../services/auth.service';
import { GtsDataService } from '../../services/gts-data.service';
import { environment } from '../../../../environments/environment';

// Marked for markdown rendering
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// ExcelJS for Excel to CSV conversion (same library used in gts-grid for export)
import { Workbook } from 'exceljs';

// ============================================
// INTERFACES
// ============================================

export interface AiChatConfig {
  prjId: string;
  chatCode: string;       // Codice configurazione chat
  contextData?: any;      // Dati contestuali (es. righe griglia, dati form)
  contextType?: 'grid' | 'form' | 'pdf' | 'general';   // Tipo contesto
  dialogTitle?: string;   // Titolo custom dialog
  dialogWidth?: string;
  dialogHeight?: string;
  useTemplateMode?: boolean;  // Se true, usa sessione template senza salvare nuovi messaggi
  loadExistingSession?: boolean;  // Se true, carica la sessione esistente invece di crearne una nuova (per training)
  showClearButton?: boolean;  // Se true, mostra bottone per pulire la chat
  // Per CHAT_ON_GRID
  formId?: number;
  gridName?: string;
  gridColumns?: GridColumnInfo[];  // Struttura colonne per AI
  // Per CHAT_ON_FORM
  groupId?: number;
  formFields?: FormFieldInfo[];    // Struttura campi per AI
  // Callback mode - AI restituisce dati strutturati
  returnDataMode?: boolean;        // Se true, l'AI deve restituire JSON strutturato
}

// Info colonna griglia per contesto AI
export interface GridColumnInfo {
  fieldName: string;
  caption: string;
  dataType: string;
  required?: boolean;
  allowedValues?: any[];  // Per lookup/dropdown
}

// Info campo form per contesto AI
export interface FormFieldInfo {
  fieldName: string;
  label: string;
  fieldType: string;      // text, number, date, boolean, lookup
  required?: boolean;
  allowedValues?: any[];  // Per lookup/dropdown
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: ChatAttachment[];
  isStreaming?: boolean;
}

export interface ChatAttachment {
  type: string;
  mediaType: string;
  fileName: string;
  fileSize?: number;
  base64Data?: string;
}

export interface ChatSession {
  _id: string;
  sessionName: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-gts-ai-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Dialog,
    ButtonModule,
    Textarea,
    ProgressSpinner,
    Tooltip,
    Toast,
    FileUploadModule
  ],
  providers: [MessageService],
  templateUrl: './gts-ai-chat.component.html',
  styleUrls: ['./gts-ai-chat.component.scss']
})
export class GtsAiChatComponent implements OnInit, OnDestroy {

  // ============================================
  // INPUTS
  // ============================================

  @Input() config: AiChatConfig = { prjId: '', chatCode: '' };
  @Input() visible: boolean = false;

  // ============================================
  // OUTPUTS
  // ============================================

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() sessionCreated = new EventEmitter<string>();
  @Output() messageSent = new EventEmitter<ChatMessage>();
  @Output() dataReceived = new EventEmitter<{ type: 'grid' | 'form', data: any, mode?: 'append' | 'replace' }>();  // Dati strutturati da AI

  // ============================================
  // SERVICES
  // ============================================

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private gtsDataService = inject(GtsDataService);
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(MessageService);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  // ============================================
  // STATE
  // ============================================

  loading: boolean = false;
  sendingMessage: boolean = false;
  error: string = '';

  // Chat config loaded from server
  chatConfig: any = null;

  // Session
  sessionId: string = '';
  sessionName: string = '';
  messages: ChatMessage[] = [];

  // Input
  userMessage: string = '';
  pendingAttachments: ChatAttachment[] = [];

  // File upload
  allowFileUpload: boolean = false;
  allowedFileTypes: string[] = [];
  maxFileSize: number = 10485760; // 10MB

  // Suggested questions
  suggestedQuestions: string[] = [];

  // Template mode - messaggi base dalla sessione template
  templateMessages: ChatMessage[] = [];

  // Help popup
  helpVisible: boolean = false;

  // Detected data from AI response (for Apply button)
  detectedArrayData: any[] | null = null;
  detectedArrayRowCount: number = 0;

  // ============================================
  // LIFECYCLE
  // ============================================

  ngOnInit(): void {
    // Configure marked with custom renderer for code blocks with copy button
    const renderer = new marked.Renderer();

    // Custom code block renderer with copy button
    renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
      const language = lang || '';
      const escapedCode = this.escapeHtml(text);
      return `<div class="code-block-wrapper">
        <div class="code-block-header">
          <span class="code-language">${language}</span>
          <button class="copy-code-btn" onclick="window.copyCodeToClipboard(this)" title="Copia codice">
            <i class="pi pi-copy"></i>
          </button>
        </div>
        <pre><code class="language-${language}">${escapedCode}</code></pre>
      </div>`;
    };

    marked.setOptions({
      breaks: true,
      gfm: true,
      renderer: renderer
    });

    // Register global copy function
    (window as any).copyCodeToClipboard = (button: HTMLElement) => {
      const wrapper = button.closest('.code-block-wrapper');
      const codeElement = wrapper?.querySelector('code');
      if (codeElement) {
        const text = codeElement.textContent || '';
        navigator.clipboard.writeText(text).then(() => {
          // Visual feedback
          const icon = button.querySelector('i');
          if (icon) {
            icon.className = 'pi pi-check';
            setTimeout(() => {
              icon.className = 'pi pi-copy';
            }, 2000);
          }
        }).catch(err => {
          console.error('Failed to copy:', err);
        });
      }
    };
  }

  /**
   * Escape HTML special characters to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  ngOnDestroy(): void {
    // Cleanup
  }

  // ============================================
  // DIALOG
  // ============================================

  async onDialogShow(): Promise<void> {
    console.log('[gts-ai-chat] onDialogShow - config:', this.config);

    if (!this.config.prjId || !this.config.chatCode) {
      this.error = 'Configurazione chat mancante (prjId o chatCode)';
      console.error('[gts-ai-chat] Missing config - prjId:', this.config.prjId, 'chatCode:', this.config.chatCode);
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      // Load chat configuration
      await this.loadChatConfig();

      // Choose the right session mode:
      // - loadExistingSession: Carica sessione esistente, mostra tutti i messaggi, SALVA nuovi messaggi (per training)
      // - useTemplateMode: Carica sessione esistente, nasconde messaggi, NON salva nuovi messaggi (per uso in programmi)
      // - default: Crea nuova sessione (per nuove conversazioni)
      if (this.config.loadExistingSession) {
        await this.loadExistingSession();
      } else if (this.config.useTemplateMode) {
        await this.loadTemplateSession();
      } else {
        await this.createSession();
      }

      // Focus input
      setTimeout(() => this.focusInput(), 100);

    } catch (err: any) {
      this.error = err.message || 'Errore durante l\'inizializzazione della chat';
      console.error('Chat init error:', err);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  onDialogHide(): void {
    this.visible = false;
    this.visibleChange.emit(false);

    // Turn off the global loader
    this.gtsDataService.sendAppLoaderListener(false);

    // Reset all state when dialog is closed
    this.loading = false;
    this.sendingMessage = false;
    this.error = '';
    this.messages = [];
    this.sessionId = '';
    this.sessionName = '';
    this.chatConfig = null;
    this.userMessage = '';
    this.pendingAttachments = [];
    this.suggestedQuestions = [];
    this.templateMessages = [];
    this.detectedArrayData = null;
    this.detectedArrayRowCount = 0;
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  private async loadChatConfig(): Promise<void> {
    const url = `${environment.apiUrl}/ai-chat/config?prjId=${this.config.prjId}&chatCode=${this.config.chatCode}`;
    const response: any = await firstValueFrom(this.http.get(url));

    if (!response.valid || !response.data) {
      throw new Error('Configurazione chat non trovata');
    }

    this.chatConfig = response.data;
    this.allowFileUpload = this.chatConfig.allowFileUpload || false;
    this.allowedFileTypes = this.chatConfig.allowedFileTypes || [];
    this.maxFileSize = this.chatConfig.maxFileSize || 10485760;
    this.suggestedQuestions = this.chatConfig.suggestedQuestions || [];
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  private async createSession(): Promise<void> {
    const url = `${environment.apiUrl}/ai-chat/session`;

    // Build context data based on config type
    let contextData: any = undefined;
    if (this.config.contextType === 'grid' && this.config.gridColumns) {
      // For grid context, pass column structure with explicit field names
      contextData = {
        type: 'grid',
        gridName: this.config.gridName,
        columns: this.config.gridColumns,
        returnDataMode: this.config.returnDataMode,
        outputInstructions: this.buildGridOutputInstructions()
      };
    } else if (this.config.contextType === 'form' && this.config.formFields) {
      // For form context, pass field structure
      contextData = {
        type: 'form',
        groupId: this.config.groupId,
        fields: this.config.formFields,
        returnDataMode: this.config.returnDataMode,
        outputInstructions: this.buildFormOutputInstructions()
      };
    } else if (this.config.contextData) {
      contextData = {
        type: this.config.contextType || 'general',
        data: this.config.contextData
      };
    }

    const body = {
      prjId: this.config.prjId,
      chatCode: this.config.chatCode,
      userId: this.authService.getUserEmail() || 'anonymous',
      sessionName: `Chat ${new Date().toLocaleDateString('it-IT')}`,
      contextData: contextData
    };

    const response: any = await firstValueFrom(this.http.post(url, body));

    if (!response.valid || !response.data) {
      throw new Error('Impossibile creare la sessione chat');
    }

    this.sessionId = response.data.session._id;
    this.sessionName = response.data.session.sessionName;

    // Load initial messages (welcome message if present)
    this.messages = (response.data.session.messages || []).map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }));

    this.sessionCreated.emit(this.sessionId);
  }

  /**
   * Carica la sessione template esistente (prima sessione per questo chatCode)
   * I messaggi vengono usati come contesto ma non modificati
   */
  private async loadTemplateSession(): Promise<void> {
    const url = `${environment.apiUrl}/ai-chat/template-session?prjId=${this.config.prjId}&chatCode=${this.config.chatCode}`;
    const response: any = await firstValueFrom(this.http.get(url));

    if (!response.valid || !response.data) {
      throw new Error('Sessione template non trovata. Creare prima una sessione di addestramento.');
    }

    this.sessionId = response.data.session._id;
    this.sessionName = response.data.session.sessionName;

    // Salva i messaggi template come riferimento
    this.templateMessages = (response.data.session.messages || []).map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }));

    // In template mode, non mostriamo i messaggi di training, partiamo vuoti
    this.messages = [];

    this.sessionCreated.emit(this.sessionId);
  }

  /**
   * Carica la sessione esistente per continuare il training
   * Mostra tutti i messaggi esistenti e SALVA i nuovi messaggi
   * Usato da GET_CHAT nella pagina ai-instr per addestrare la chat
   */
  private async loadExistingSession(): Promise<void> {
    const url = `${environment.apiUrl}/ai-chat/template-session?prjId=${this.config.prjId}&chatCode=${this.config.chatCode}`;
    const response: any = await firstValueFrom(this.http.get(url));

    if (!response.valid || !response.data) {
      throw new Error('Sessione non trovata per questo chatCode. Creare prima una sessione.');
    }

    this.sessionId = response.data.session._id;
    this.sessionName = response.data.session.sessionName;

    // Mostra tutti i messaggi esistenti (a differenza del template mode)
    this.messages = (response.data.session.messages || []).map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }));

    // Scroll to bottom per vedere gli ultimi messaggi
    setTimeout(() => this.scrollToBottom(), 100);

    this.sessionCreated.emit(this.sessionId);
  }

  /**
   * Pulisce i messaggi della chat corrente (non tocca i template)
   */
  clearChat(): void {
    // Rimuovi solo i messaggi aggiunti in questa sessione, non i template
    this.messages = [];
    this.userMessage = '';
    this.pendingAttachments = [];
    this.detectedArrayData = null;
    this.detectedArrayRowCount = 0;
    this.focusInput();
  }

  // ============================================
  // MESSAGING
  // ============================================

  async sendMessage(): Promise<void> {
    const message = this.userMessage.trim();
    if (!message || this.sendingMessage) return;

    // Add user message to UI immediately
    const userMsg: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
      attachments: [...this.pendingAttachments]
    };
    this.messages.push(userMsg);

    // Clear input
    this.userMessage = '';
    this.pendingAttachments = [];

    // Add placeholder for assistant response
    const assistantPlaceholder: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    this.messages.push(assistantPlaceholder);

    this.sendingMessage = true;
    this.cdr.detectChanges(); // Force UI update to show thinking indicator
    this.scrollToBottom();

    try {
      let response: any;

      if (this.config.useTemplateMode) {
        // Template mode: usa endpoint che non salva i nuovi messaggi
        const url = `${environment.apiUrl}/ai-chat/template-message`;
        const body = {
          sessionId: this.sessionId,
          message: message,
          attachments: userMsg.attachments,
          // Passa i messaggi correnti della UI (escluso placeholder) come contesto aggiuntivo
          currentMessages: this.messages.slice(0, -1).filter(m => !m.isStreaming)
        };
        response = await firstValueFrom(this.http.post(url, body));
      } else {
        // Normal mode: salva tutto nella sessione
        const url = `${environment.apiUrl}/ai-chat/message`;
        const body = {
          sessionId: this.sessionId,
          message: message,
          attachments: userMsg.attachments
        };
        response = await firstValueFrom(this.http.post(url, body));
      }

      if (!response.valid) {
        throw new Error(response.message || 'Errore durante l\'invio del messaggio');
      }

      // Update assistant message
      assistantPlaceholder.content = response.data.response;
      assistantPlaceholder.isStreaming = false;

      // Detect if response contains a JSON array (for grid import)
      this.detectArrayInResponse(response.data.response);

      this.messageSent.emit(userMsg);

    } catch (err: any) {
      // Remove placeholder and show error
      this.messages.pop();
      this.showError(err.message || 'Errore durante l\'invio del messaggio');
      console.error('Send message error:', err);
    } finally {
      this.sendingMessage = false;
      this.scrollToBottom();
      this.focusInput();
      this.cdr.detectChanges();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    // Send on Enter (without Shift)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Gestisce il paste di immagini dagli appunti
   */
  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          this.handlePastedImage(file);
        }
      }
    }
  }

  /**
   * Processa un'immagine incollata dagli appunti
   */
  private handlePastedImage(file: File): void {
    if (file.size > this.maxFileSize) {
      this.showError(`Immagine troppo grande (max ${this.maxFileSize / 1024 / 1024}MB)`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const attachment: ChatAttachment = {
        type: 'image',
        mediaType: file.type,
        fileName: `pasted_image_${Date.now()}.${this.getImageExtension(file.type)}`,
        fileSize: file.size,
        base64Data: base64
      };
      this.pendingAttachments.push(attachment);
      this.cdr.detectChanges();

      this.showSuccess('Immagine aggiunta dagli appunti');
    };
    reader.readAsDataURL(file);
  }

  /**
   * Ottiene l'estensione corretta dal MIME type dell'immagine
   */
  private getImageExtension(mimeType: string): string {
    const map: { [key: string]: string } = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp'
    };
    return map[mimeType] || 'png';
  }

  useSuggestedQuestion(question: string): void {
    this.userMessage = question;
    this.sendMessage();
  }

  // ============================================
  // ARRAY DETECTION & APPLY
  // ============================================

  /**
   * Rileva se la risposta dell'AI contiene un array JSON valido
   * Cerca pattern di array JSON nel contenuto del messaggio
   */
  private detectArrayInResponse(content: string): void {
    this.detectedArrayData = null;
    this.detectedArrayRowCount = 0;

    if (!content) return;

    // Prova a estrarre JSON array dalla risposta
    // Pattern 1: Array diretto nel contenuto
    // Pattern 2: Array dentro code block ```json ... ```
    // Pattern 3: Array dentro code block ``` ... ```

    const patterns = [
      /```json\s*\n?([\s\S]*?)\n?```/,  // ```json ... ```
      /```\s*\n?([\s\S]*?)\n?```/,       // ``` ... ```
      /(\[[\s\S]*\])/                     // Array diretto
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const jsonStr = match[1].trim();
        try {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.detectedArrayData = parsed;
            this.detectedArrayRowCount = parsed.length;
            console.log('[ai-chat] Detected array with', this.detectedArrayRowCount, 'rows');
            return;
          }
        } catch (e) {
          // Non è un JSON valido, continua con il prossimo pattern
        }
      }
    }
  }

  /**
   * Applica i dati rilevati alla griglia
   * @param mode 'append' aggiunge ai dati esistenti, 'replace' sostituisce tutti i dati
   */
  applyDetectedData(mode: 'append' | 'replace'): void {
    if (!this.detectedArrayData || this.detectedArrayData.length === 0) {
      this.showError('Nessun dato da applicare');
      return;
    }

    // Emit the data to be processed with mode
    this.dataReceived.emit({
      type: 'grid',
      data: this.detectedArrayData,
      mode: mode
    });

    // Reset detected data
    this.detectedArrayData = null;
    this.detectedArrayRowCount = 0;

    // Close the chat (the parent will handle the data)
    this.visible = false;
    this.visibleChange.emit(false);
  }

  // ============================================
  // FILE UPLOAD
  // ============================================

  onFileSelect(event: any): void {
    const files = event.files || event.target?.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      if (file.size > this.maxFileSize) {
        this.showError(`File ${file.name} troppo grande (max ${this.maxFileSize / 1024 / 1024}MB)`);
        continue;
      }

      // Check if Excel file - convert to CSV
      if (this.isExcelFile(file)) {
        this.handleExcelFile(file);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const attachment: ChatAttachment = {
          type: this.getFileType(file.type),
          mediaType: file.type,
          fileName: file.name,
          fileSize: file.size,
          base64Data: base64
        };
        this.pendingAttachments.push(attachment);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Verifica se il file è un Excel
   */
  private isExcelFile(file: File): boolean {
    const excelTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.spreadsheet'
    ];
    const excelExtensions = ['.xlsx', '.xls', '.ods'];

    if (excelTypes.includes(file.type)) return true;

    const fileName = file.name.toLowerCase();
    return excelExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Converte un file Excel in CSV e lo aggiunge come allegato
   * Usa ExcelJS (stessa libreria usata in gts-grid per export)
   */
  private async handleExcelFile(file: File): Promise<void> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new Workbook();
      await workbook.xlsx.load(arrayBuffer);

      // Prendi il primo foglio
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        this.showError('Il file Excel non contiene fogli');
        return;
      }

      // Converti in CSV manualmente
      const csvRows: string[] = [];
      worksheet.eachRow((row, rowNumber) => {
        const values: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          // Gestisci diversi tipi di valore
          let cellValue = '';
          if (cell.value !== null && cell.value !== undefined) {
            if (typeof cell.value === 'object' && 'result' in cell.value) {
              // Formula con risultato
              cellValue = String(cell.value.result || '');
            } else if (cell.value instanceof Date) {
              cellValue = cell.value.toISOString().split('T')[0];
            } else {
              cellValue = String(cell.value);
            }
          }
          // Escape per CSV (se contiene ; o " o newline)
          if (cellValue.includes(';') || cellValue.includes('"') || cellValue.includes('\n')) {
            cellValue = '"' + cellValue.replace(/"/g, '""') + '"';
          }
          values.push(cellValue);
        });
        csvRows.push(values.join(';'));
      });

      const csvContent = csvRows.join('\n');

      // Crea il nome file CSV
      const csvFileName = file.name.replace(/\.(xlsx|xls|ods)$/i, '.csv');

      // Converti CSV in base64
      const base64 = btoa(unescape(encodeURIComponent(csvContent)));

      const attachment: ChatAttachment = {
        type: 'document',
        mediaType: 'text/csv',
        fileName: csvFileName,
        fileSize: csvContent.length,
        base64Data: base64
      };
      this.pendingAttachments.push(attachment);
      this.cdr.detectChanges();

      // Info sui fogli disponibili se più di uno
      const sheetCount = workbook.worksheets.length;
      if (sheetCount > 1) {
        this.showSuccess(`Excel convertito in CSV (foglio "${worksheet.name}"). File originale aveva ${sheetCount} fogli.`);
      } else {
        this.showSuccess('Excel convertito in CSV');
      }
    } catch (err) {
      console.error('Error converting Excel to CSV:', err);
      this.showError('Errore durante la conversione del file Excel');
    }
  }

  removeAttachment(index: number): void {
    this.pendingAttachments.splice(index, 1);
  }

  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'document';
    return 'document';
  }

  // ============================================
  // MARKDOWN RENDERING
  // ============================================

  renderMarkdown(content: string): SafeHtml {
    if (!content) return '';
    const html = marked.parse(content) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // ============================================
  // UTILITIES
  // ============================================

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer?.nativeElement) {
        const container = this.messagesContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }

  private focusInput(): void {
    setTimeout(() => {
      if (this.messageInput?.nativeElement) {
        this.messageInput.nativeElement.focus();
      }
    }, 50);
  }

  formatTime(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private showError(message: string): void {
    this.messageService.add({ severity: 'error', summary: 'Errore', detail: message, life: 5000 });
  }

  private showSuccess(message: string): void {
    this.messageService.add({ severity: 'success', summary: 'Successo', detail: message, life: 3000 });
  }

  // ============================================
  // OUTPUT INSTRUCTIONS BUILDERS
  // ============================================

  /**
   * Costruisce istruzioni dettagliate per l'output griglia
   * Specifica esattamente i nomi dei campi da usare
   */
  private buildGridOutputInstructions(): string {
    if (!this.config.gridColumns || this.config.gridColumns.length === 0) {
      return '';
    }

    const fieldList = this.config.gridColumns.map(col =>
      `  - "${col.fieldName}" (${col.caption}) - tipo: ${col.dataType}${col.required ? ' - OBBLIGATORIO' : ''}`
    ).join('\n');

    const exampleRow: any = {};
    this.config.gridColumns.forEach(col => {
      if (col.dataType === 'Integer' || col.dataType === 'Float') {
        exampleRow[col.fieldName] = 0;
      } else if (col.dataType === 'Date') {
        exampleRow[col.fieldName] = '2024-01-01';
      } else if (col.dataType === 'Boolean') {
        exampleRow[col.fieldName] = false;
      } else {
        exampleRow[col.fieldName] = '';
      }
    });

    return `IMPORTANTE - FORMATO OUTPUT RICHIESTO:
Devi restituire ESCLUSIVAMENTE un array JSON valido con oggetti che usano ESATTAMENTE questi nomi di campo:

${fieldList}

ESEMPIO di struttura riga (usa ESATTAMENTE questi nomi):
${JSON.stringify(exampleRow, null, 2)}

REGOLE:
1. Restituisci SOLO l'array JSON, senza testo prima o dopo
2. Usa ESATTAMENTE i nomi dei campi indicati sopra (case-sensitive)
3. Rispetta i tipi di dato indicati
4. NON inventare nomi di campo diversi`;
  }

  /**
   * Costruisce istruzioni dettagliate per l'output form
   * Specifica esattamente i nomi dei campi da usare
   */
  private buildFormOutputInstructions(): string {
    if (!this.config.formFields || this.config.formFields.length === 0) {
      return '';
    }

    const fieldList = this.config.formFields.map(field =>
      `  - "${field.fieldName}" (${field.label}) - tipo: ${field.fieldType}${field.required ? ' - OBBLIGATORIO' : ''}`
    ).join('\n');

    const exampleObj: any = {};
    this.config.formFields.forEach(field => {
      if (field.fieldType === 'number') {
        exampleObj[field.fieldName] = 0;
      } else if (field.fieldType === 'date') {
        exampleObj[field.fieldName] = '2024-01-01';
      } else if (field.fieldType === 'boolean') {
        exampleObj[field.fieldName] = false;
      } else {
        exampleObj[field.fieldName] = '';
      }
    });

    return `IMPORTANTE - FORMATO OUTPUT RICHIESTO:
Devi restituire ESCLUSIVAMENTE un oggetto JSON valido che usa ESATTAMENTE questi nomi di campo:

${fieldList}

ESEMPIO di struttura (usa ESATTAMENTE questi nomi):
${JSON.stringify(exampleObj, null, 2)}

REGOLE:
1. Restituisci SOLO l'oggetto JSON, senza testo prima o dopo
2. Usa ESATTAMENTE i nomi dei campi indicati sopra (case-sensitive)
3. Rispetta i tipi di dato indicati
4. NON inventare nomi di campo diversi`;
  }

  // ============================================
  // DIALOG TITLE
  // ============================================

  get dialogTitle(): string {
    if (this.config.dialogTitle) return this.config.dialogTitle;
    if (this.chatConfig?.chatName) return this.chatConfig.chatName;
    return 'AI Chat';
  }

  get acceptFileTypes(): string {
    if (this.allowedFileTypes.length > 0) {
      return this.allowedFileTypes.map(t => '.' + t).join(',');
    }
    return '*';
  }
}
