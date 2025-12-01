import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IonIcon, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent } from "@ionic/angular/standalone";
import { ContactFormComponent, ContactFormData } from './contact-form/contact-form.component';
import { environment } from '../../../environments/environment';

interface Document {
  title: string;
  description: string;
  filename: string;
  icon: string;
  size: string;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [IonIcon, CommonModule, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, ContactFormComponent],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent {
  private http = inject(HttpClient);

  constructor(private router: Router) {}

  currentYear = new Date().getFullYear();
  showContactModal = false;
  currentLanguage: 'EN' | 'IT' = 'EN';
  
  documents: Document[] = [
    {
      title: 'Introduction & Overview',
      description: 'Complete overview of GTSuite platform architecture and capabilities',
      filename: 'GTSuite_Introduction.pdf',
      icon: 'document-text-outline',
      size: '50 KB'
    },
    {
      title: 'Designer Documentation',
      description: 'Comprehensive guide to the GTS Designer metadata editor',
      filename: 'GTSuite_Designer_Documentation.pdf',
      icon: 'create-outline',
      size: '31 KB'
    },
    {
      title: 'Server Documentation',
      description: 'Node.js backend server architecture and API reference',
      filename: 'GTSuite_Server_Documentation.pdf',
      icon: 'server-outline',
      size: '37 KB'
    },
    {
      title: 'Client Documentation',
      description: 'Angular/Ionic client framework and component library',
      filename: 'GTSuite_Client_Documentation.pdf',
      icon: 'phone-portrait-outline',
      size: '34 KB'
    },
    {
      title: 'Report Server Appendix',
      description: 'FastReport integration and PDF generation service',
      filename: 'GTSuite_ReportServer_Appendix.pdf',
      icon: 'print-outline',
      size: '21 KB'
    }
  ];

  features = [
    {
      icon: 'layers-outline',
      title: 'Metadata-Driven',
      description: 'Design once in metadata, deploy everywhere. True metadata architecture, not visual drag-and-drop.'
    },
    {
      icon: 'flash-outline',
      title: '5-10x Faster',
      description: 'Build applications 5-10 times faster than traditional coding with instant UI generation.'
    },
    {
      icon: 'phone-portrait-outline',
      title: 'Cross-Platform',
      description: 'Single codebase deploys to web, iOS, and Android. Real Angular/Ionic output.'
    },
    {
      icon: 'refresh-outline',
      title: 'No Recompilation',
      description: 'Changes without recompilation. Evolution without migration. Update metadata, refresh browser.'
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'No Vendor Lock-in',
      description: 'SQLite exports, open standards, deployable anywhere. Full control of your data.'
    },
    {
      icon: 'server-outline',
      title: 'Multi-Database',
      description: 'Oracle, SQL Server, PostgreSQL, MongoDB support. Integrate with existing systems.'
    }
  ];

  technologies = [
    { name: 'Delphi', color: '#EE1F35' },
    { name: 'Node.js', color: '#339933' },
    { name: 'Angular', color: '#DD0031' },
    { name: 'Ionic', color: '#3880FF' },
    { name: 'MongoDB', color: '#47A248' },
    { name: 'FastReport', color: '#FF6B35' }
  ];

  downloadDocument(filename: string): void {
    // In production, this would download from your server
    // For now, it creates a download link
    const link = document.createElement('a');
    link.href = `/assets/docs/${filename}`;
    link.download = filename;
    link.click();
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  navigateToLogin(): void {
    // Navigate to login page with state to track we came from landing
    this.router.navigate(['/login'], { state: { fromLanding: true } });
  }

  contactUs(): void {
    this.showContactModal = true;
  }

  closeContactModal(): void {
    this.showContactModal = false;
  }

  async handleContactFormSubmit(formData: ContactFormData): Promise<void> {
    try {
      // Aggiungi data e ora della richiesta
      const requestData = {
        ...formData,
        requestDate: new Date().toLocaleDateString('it-IT'),
        requestTime: new Date().toLocaleTimeString('it-IT')
      };

      // Invia la richiesta al server
      const response = await firstValueFrom(this.http.post(
        `${environment.apiUrl}/mail/sendSalesContact`,
        requestData
      ));

      // Chiudi il modal dopo 3 secondi (il messaggio di successo è gestito dal form component)
      setTimeout(() => {
        this.closeContactModal();
      }, 3000);

    } catch (error) {
      console.error('Error sending contact form:', error);
      // L'errore viene gestito dal form component
    }
  }

  handleContactFormCancel(): void {
    this.closeContactModal();
  }

  setLanguage(lang: 'EN' | 'IT'): void {
    this.currentLanguage = lang;
  }
}