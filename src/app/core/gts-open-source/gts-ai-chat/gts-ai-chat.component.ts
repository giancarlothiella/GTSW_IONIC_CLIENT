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

// ============================================
// INTERFACES
// ============================================

export interface AiChatConfig {
  prjId: string;
  chatCode: string;       // Codice configurazione chat
  contextData?: any;      // Dati contestuali (es. righe griglia, dati form)
  contextType?: string;   // Tipo contesto: 'grid', 'pdf', 'form', 'general'
  dialogTitle?: string;   // Titolo custom dialog
  dialogWidth?: string;
  dialogHeight?: string;
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

  // ============================================
  // LIFECYCLE
  // ============================================

  ngOnInit(): void {
    // Configure marked for safe rendering
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  ngOnDestroy(): void {
    // Cleanup
  }

  // ============================================
  // DIALOG
  // ============================================

  async onDialogShow(): Promise<void> {
    if (!this.config.prjId || !this.config.chatCode) {
      this.error = 'Configurazione chat mancante (prjId o chatCode)';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      // Load chat configuration
      await this.loadChatConfig();

      // Create new session
      await this.createSession();

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
    const body = {
      prjId: this.config.prjId,
      chatCode: this.config.chatCode,
      userId: this.authService.getUserEmail() || 'anonymous',
      sessionName: `Chat ${new Date().toLocaleDateString('it-IT')}`,
      contextData: this.config.contextData ? {
        type: this.config.contextType || 'general',
        data: this.config.contextData
      } : undefined
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
      const url = `${environment.apiUrl}/ai-chat/message`;
      const body = {
        sessionId: this.sessionId,
        message: message,
        attachments: userMsg.attachments
      };

      const response: any = await firstValueFrom(this.http.post(url, body));

      if (!response.valid) {
        throw new Error(response.message || 'Errore durante l\'invio del messaggio');
      }

      // Update assistant message
      assistantPlaceholder.content = response.data.response;
      assistantPlaceholder.isStreaming = false;

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

  useSuggestedQuestion(question: string): void {
    this.userMessage = question;
    this.sendMessage();
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
