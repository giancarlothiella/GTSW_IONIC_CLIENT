import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';

export interface ContactFormData {
  companyName: string;
  contactName: string;
  email: string;
  notes?: string;
  honeypot?: string; // Campo nascosto per bloccare bot
}

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  template: `
    <div class="contact-form">
      <!-- Language Switcher -->
      <div class="language-switcher">
        <button
          type="button"
          [class.active]="currentLanguage === 'EN'"
          (click)="setLanguage('EN')"
          class="lang-btn"
          title="English">
          <img src="assets/icons/stdImage_1922.png" alt="EN" class="flag-icon">
        </button>
        <button
          type="button"
          [class.active]="currentLanguage === 'IT'"
          (click)="setLanguage('IT')"
          class="lang-btn"
          title="Italiano">
          <img src="assets/icons/stdImage_1944.png" alt="IT" class="flag-icon">
        </button>
      </div>

      <h3 class="form-title">{{ getText('title') }}</h3>
      <p class="form-subtitle">{{ getText('subtitle') }}</p>

      <form (ngSubmit)="onSubmit()" #contactForm="ngForm">
        <!-- Company Name -->
        <div class="form-group">
          <label for="companyName" class="required">{{ getText('companyName') }}</label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            [(ngModel)]="formData.companyName"
            #companyName="ngModel"
            required
            minlength="2"
            maxlength="100"
            [placeholder]="getText('companyNamePlaceholder')"
            [class.error]="companyName.invalid && companyName.touched"
          />
          @if (companyName.invalid && companyName.touched) {
            <span class="error-message">
              @if (companyName.errors?.['required']) {
                {{ getText('companyNameRequired') }}
              }
              @if (companyName.errors?.['minlength']) {
                {{ getText('companyNameMinLength') }}
              }
            </span>
          }
        </div>

        <!-- Contact Name -->
        <div class="form-group">
          <label for="contactName" class="required">{{ getText('contactName') }}</label>
          <input
            type="text"
            id="contactName"
            name="contactName"
            [(ngModel)]="formData.contactName"
            #contactName="ngModel"
            required
            minlength="2"
            maxlength="100"
            [placeholder]="getText('contactNamePlaceholder')"
            [class.error]="contactName.invalid && contactName.touched"
          />
          @if (contactName.invalid && contactName.touched) {
            <span class="error-message">
              @if (contactName.errors?.['required']) {
                {{ getText('contactNameRequired') }}
              }
              @if (contactName.errors?.['minlength']) {
                {{ getText('contactNameMinLength') }}
              }
            </span>
          }
        </div>

        <!-- Email -->
        <div class="form-group">
          <label for="email" class="required">{{ getText('email') }}</label>
          <input
            type="email"
            id="email"
            name="email"
            [(ngModel)]="formData.email"
            #email="ngModel"
            required
            pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            [placeholder]="getText('emailPlaceholder')"
            [class.error]="(email.invalid && email.touched) || emailError"
            (blur)="validateEmail()"
          />
          @if (email.invalid && email.touched) {
            <span class="error-message">
              @if (email.errors?.['required']) {
                {{ getText('emailRequired') }}
              }
              @if (email.errors?.['pattern']) {
                {{ getText('emailInvalid') }}
              }
            </span>
          }
          @if (emailError) {
            <span class="error-message">{{ emailError }}</span>
          }
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label for="notes">{{ getText('notes') }}</label>
          <textarea
            id="notes"
            name="notes"
            [(ngModel)]="formData.notes"
            rows="4"
            maxlength="500"
            [placeholder]="getText('notesPlaceholder')"
          ></textarea>
          <span class="char-count">{{ formData.notes?.length || 0 }}/500</span>
        </div>

        <!-- Honeypot - campo nascosto per bloccare bot -->
        <div class="honeypot">
          <input
            type="text"
            name="website"
            [(ngModel)]="formData.honeypot"
            tabindex="-1"
            autocomplete="off"
          />
        </div>

        <!-- Messaggi di stato -->
        @if (successMessage) {
          <div class="success-message">
            <ion-icon name="checkmark-circle"></ion-icon>
            {{ successMessage }}
          </div>
        }

        @if (errorMessage) {
          <div class="error-alert">
            <ion-icon name="alert-circle"></ion-icon>
            {{ errorMessage }}
          </div>
        }

        <!-- Buttons -->
        <div class="form-actions">
          <button
            type="submit"
            class="btn-submit"
            [disabled]="contactForm.invalid || isSubmitting || emailError !== null"
          >
            <ion-icon name="paper-plane-outline"></ion-icon>
            {{ isSubmitting ? getText('submittingButton') : getText('submitButton') }}
          </button>
          <button type="button" class="btn-cancel" (click)="onCancel()">
            {{ getText('cancelButton') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .contact-form {
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      max-width: 600px;
      margin: 0 auto;
    }

    .language-switcher {
      display: flex;
      justify-content: flex-end;
      gap: 4px;
      padding: 4px;
      background: #f3f4f6;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .lang-btn {
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lang-btn:hover {
      background: rgba(26, 84, 144, 0.1);
    }

    .lang-btn.active {
      background: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .lang-btn .flag-emoji {
      font-size: 24px;
      line-height: 1;
      font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;
    }

    .form-title {
      font-size: 28px;
      font-weight: 800;
      color: #1f2937;
      margin-bottom: 8px;
      text-align: center;
    }

    .form-subtitle {
      font-size: 16px;
      color: #6b7280;
      text-align: center;
      margin-bottom: 32px;
    }

    .form-group {
      margin-bottom: 24px;
    }

    label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    label.required::after {
      content: ' *';
      color: #ef4444;
    }

    input[type="text"],
    input[type="email"],
    textarea {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 15px;
      transition: all 0.3s;
      font-family: inherit;
    }

    input:focus,
    textarea:focus {
      outline: none;
      border-color: #1a5490;
      box-shadow: 0 0 0 3px rgba(26, 84, 144, 0.1);
    }

    input.error,
    textarea.error {
      border-color: #ef4444;
    }

    textarea {
      resize: vertical;
      min-height: 100px;
    }

    .char-count {
      display: block;
      text-align: right;
      font-size: 12px;
      color: #9ca3af;
      margin-top: 4px;
    }

    .error-message {
      display: block;
      color: #ef4444;
      font-size: 13px;
      margin-top: 6px;
    }

    .success-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      background: #d1fae5;
      border: 2px solid #10b981;
      border-radius: 8px;
      color: #065f46;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .success-message ion-icon {
      font-size: 24px;
      color: #10b981;
    }

    .error-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      background: #fee2e2;
      border: 2px solid #ef4444;
      border-radius: 8px;
      color: #991b1b;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .error-alert ion-icon {
      font-size: 24px;
      color: #ef4444;
    }

    /* Honeypot - campo nascosto */
    .honeypot {
      position: absolute;
      left: -9999px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 32px;
    }

    .btn-submit,
    .btn-cancel {
      flex: 1;
      padding: 14px 24px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: none;
    }

    .btn-submit {
      background: #1a5490;
      color: white;
    }

    .btn-submit:hover:not(:disabled) {
      background: #2b6cb0;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(26, 84, 144, 0.3);
    }

    .btn-submit:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .btn-submit ion-icon {
      font-size: 20px;
    }

    .btn-cancel {
      background: white;
      color: #6b7280;
      border: 2px solid #e5e7eb;
    }

    .btn-cancel:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }

    @media (max-width: 576px) {
      .contact-form {
        padding: 24px;
      }

      .form-title {
        font-size: 24px;
      }

      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class ContactFormComponent {
  @Output() formSubmit = new EventEmitter<ContactFormData>();
  @Output() formCancel = new EventEmitter<void>();

  formData: ContactFormData = {
    companyName: '',
    contactName: '',
    email: '',
    notes: '',
    honeypot: ''
  };

  isSubmitting = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  emailError: string | null = null;
  currentLanguage: 'EN' | 'IT' = 'EN';

  private texts = {
    EN: {
      title: 'Request Information',
      subtitle: 'Fill out the form and we will contact you as soon as possible',
      companyName: 'Company Name',
      companyNamePlaceholder: 'E.g.: GTSoftware Ltd',
      companyNameRequired: 'Company name is required',
      companyNameMinLength: 'Minimum 2 characters',
      contactName: 'Full Name',
      contactNamePlaceholder: 'E.g.: John Doe',
      contactNameRequired: 'Name is required',
      contactNameMinLength: 'Minimum 2 characters',
      email: 'Email',
      emailPlaceholder: 'E.g.: john.doe@company.com',
      emailRequired: 'Email is required',
      emailInvalid: 'Invalid email',
      emailDisposable: 'Temporary or disposable emails are not accepted',
      emailSuspicious: 'Suspicious email. Please use a valid email address',
      emailDomainInvalid: 'Invalid email domain',
      notes: 'Notes (optional)',
      notesPlaceholder: 'Briefly describe your request...',
      submitButton: 'Send Request',
      submittingButton: 'Sending...',
      cancelButton: 'Cancel',
      successMessage: 'Request sent successfully! We will contact you as soon as possible.',
      errorMessage: 'Error sending request. Please try again later.'
    },
    IT: {
      title: 'Richiedi Informazioni',
      subtitle: 'Compila il form e ti ricontatteremo al più presto',
      companyName: 'Nome Azienda',
      companyNamePlaceholder: 'Es: GTSoftware Srl',
      companyNameRequired: 'Il nome dell\'azienda è obbligatorio',
      companyNameMinLength: 'Minimo 2 caratteri',
      contactName: 'Nome e Cognome',
      contactNamePlaceholder: 'Es: Mario Rossi',
      contactNameRequired: 'Il nome è obbligatorio',
      contactNameMinLength: 'Minimo 2 caratteri',
      email: 'Email',
      emailPlaceholder: 'Es: mario.rossi@azienda.it',
      emailRequired: 'L\'email è obbligatoria',
      emailInvalid: 'Email non valida',
      emailDisposable: 'Non sono accettate email temporanee o usa e getta',
      emailSuspicious: 'Email sospetta. Usa un indirizzo email valido',
      emailDomainInvalid: 'Dominio email non valido',
      notes: 'Note (opzionale)',
      notesPlaceholder: 'Descrivi brevemente la tua richiesta...',
      submitButton: 'Invia Richiesta',
      submittingButton: 'Invio in corso...',
      cancelButton: 'Annulla',
      successMessage: 'Richiesta inviata con successo! Ti ricontatteremo al più presto.',
      errorMessage: 'Errore durante l\'invio. Riprova più tardi.'
    }
  };

  // Lista di domini email temporanei/fake comuni
  private disposableEmailDomains = [
    'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com',
    'throwaway.email', 'temp-mail.org', 'trashmail.com', 'yopmail.com',
    'maildrop.cc', 'getairmail.com', 'fakeinbox.com', 'sharklasers.com'
  ];

  getText(key: string): string {
    return (this.texts[this.currentLanguage] as any)[key] || key;
  }

  setLanguage(lang: 'EN' | 'IT'): void {
    this.currentLanguage = lang;
  }

  validateEmail(): void {
    this.emailError = null;

    if (!this.formData.email) {
      return;
    }

    const email = this.formData.email.toLowerCase().trim();
    const domain = email.split('@')[1];

    // Controlla se è un dominio email temporaneo
    if (this.disposableEmailDomains.includes(domain)) {
      this.emailError = this.getText('emailDisposable');
      return;
    }

    // Controlla pattern sospetti
    if (email.includes('test') || email.includes('fake') || email.includes('spam')) {
      this.emailError = this.getText('emailSuspicious');
      return;
    }

    // Verifica che il dominio abbia almeno 2 caratteri dopo il punto
    const domainParts = domain?.split('.') || [];
    if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
      this.emailError = this.getText('emailDomainInvalid');
      return;
    }
  }

  async onSubmit(): Promise<void> {
    // Reset messaggi
    this.successMessage = null;
    this.errorMessage = null;

    // Verifica honeypot (se compilato, è un bot)
    if (this.formData.honeypot) {
      console.warn('Bot detected via honeypot');
      this.errorMessage = 'Richiesta non valida';
      return;
    }

    // Valida email
    this.validateEmail();
    if (this.emailError) {
      return;
    }

    this.isSubmitting = true;

    try {
      // Prepara dati da inviare (senza honeypot)
      const { honeypot, ...dataToSend } = this.formData;

      // Emetti evento con i dati
      this.formSubmit.emit(dataToSend);

      // Simula invio (in realtà gestito dal parent component)
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.successMessage = this.getText('successMessage');

      // Reset form dopo 3 secondi
      setTimeout(() => {
        this.resetForm();
      }, 3000);

    } catch (error) {
      console.error('Error submitting form:', error);
      this.errorMessage = this.getText('errorMessage');
    } finally {
      this.isSubmitting = false;
    }
  }

  onCancel(): void {
    this.formCancel.emit();
    this.resetForm();
  }

  private resetForm(): void {
    this.formData = {
      companyName: '',
      contactName: '',
      email: '',
      notes: '',
      honeypot: ''
    };
    this.successMessage = null;
    this.errorMessage = null;
    this.emailError = null;
  }
}
