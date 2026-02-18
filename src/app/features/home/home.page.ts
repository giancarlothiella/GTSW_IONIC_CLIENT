// src/app/features/home/home.page.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewWillEnter } from '@ionic/angular';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonSpinner,
  IonButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  businessOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { MenuService } from '../../core/services/menu.service';
import { GtsDataService } from '../../core/services/gts-data.service';
import { TranslationService } from '../../core/services/translation.service';
import { ProjectInfo } from '../../core/models/menu.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonBadge,
    IonGrid,
    IonRow,
    IonCol,
    IonSpinner,
    IonButton
  ],
  template: `
    <div class="ion-padding">
      <!-- Barra superiore con bottoni -->
      <div class="top-bar">
        <div>
          @if (adminProjects.length > 0) {
            <ion-button
              fill="outline"
              size="small"
              color="warning"
              (click)="toggleAdminSection()">
              <ion-icon slot="start" [name]="showAdminSection ? 'business-outline' : 'shield-checkmark-outline'"></ion-icon>
              {{ showAdminSection ? getText(614) : getText(612) }}
            </ion-button>
          }
        </div>
      </div>

      <!-- Sezione progetti amministrativi -->
      @if (adminProjects.length > 0 && showAdminSection) {
        <div class="projects-container admin-section">
          <h2>
            <ion-icon name="shield-checkmark-outline" color="warning"></ion-icon>
            {{ getText(613) }}
          </h2>

          @if (loading) {
            <div class="loading-container">
              <ion-spinner></ion-spinner>
              <p>Caricamento progetti...</p>
            </div>
          } @else {
            <ion-grid>
              <ion-row>
                @for (project of adminProjects; track project.prjId) {
                  <ion-col size="12" sizeSm="6" sizeMd="4" sizeLg="3">
                    <ion-card
                      class="admin-project-card"
                      [class.selected-project]="project.prjId === user?.prjId"
                      button="true"
                      (click)="onProjectClick(project)">
                      <!-- Project Image -->
                      @if (project.homeImage) {
                        <div class="project-image-container admin-image-container">
                          <img [src]="project.homeImage" [alt]="project.description" class="project-image">
                          @if (project.prjId === user?.prjId) {
                            <ion-badge color="success" class="active-badge">{{ getText(1301) }}</ion-badge>
                          }
                        </div>
                      }
                      <ion-card-header>
                        <ion-card-title>{{ project.prjId }}</ion-card-title>
                      </ion-card-header>
                      <ion-card-content>
                        <p class="project-description">{{ project.description }}</p>

                        @if (project.dbConnections && project.dbConnections.length > 0) {
                          <div class="connections-list">
                            <p class="connections-title"><strong>Connessioni:</strong></p>
                            @for (conn of project.dbConnections; track conn.connCode) {
                              <div
                                class="connection-chip"
                                [class.default-connection]="conn.connDefault"
                                (click)="onConnectionClick($event, project, conn)">
                                {{ conn.dataKey }}
                                @if (conn.connDefault) {
                                  <ion-icon name="checkmark-circle" color="success" size="small"></ion-icon>
                                }
                              </div>
                            }
                          </div>
                        }
                      </ion-card-content>
                    </ion-card>
                  </ion-col>
                }
              </ion-row>
            </ion-grid>
          }
        </div>
      }

      <!-- Sezione progetti standard -->
      @if (!showAdminSection) {
        <div class="projects-container">
          <h2>{{ getText(635) }}</h2>

        @if (loading) {
          <div class="loading-container">
            <ion-spinner></ion-spinner>
            <p>{{ getText(636) }}</p>
          </div>
        } @else {
          <ion-grid>
            <ion-row>
              @for (project of standardProjects; track project.prjId) {
                <ion-col size="12" sizeSm="6" sizeMd="4" sizeLg="3">
                  <ion-card
                    [class.selected-project]="project.prjId === user?.prjId"
                    button="true"
                    (click)="onProjectClick(project)">
                    <!-- Project Image -->
                    @if (project.homeImage) {
                      <div class="project-image-container">
                        <img [src]="project.homeImage" [alt]="project.description" class="project-image">
                        @if (project.prjId === user?.prjId) {
                          <ion-badge color="success" class="active-badge">{{ getText(1301) }}</ion-badge>
                        }
                      </div>
                    }
                    <ion-card-header>
                      <ion-card-title>{{ project.prjId }}</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                      <p class="project-description">{{ project.description }}</p>

                      @if (project.dbConnections && project.dbConnections.length > 0) {
                        <div class="connections-list">
                          <p class="connections-title"><strong>{{ getText(638) }}</strong></p>
                          @for (conn of project.dbConnections; track conn.connCode) {
                            <div
                              class="connection-chip"
                              [class.default-connection]="conn.connDefault"
                              (click)="onConnectionClick($event, project, conn)">
                              {{ conn.dataKey }}
                              @if (conn.connDefault) {
                                <ion-icon name="checkmark-circle" color="success" size="small"></ion-icon>
                              }
                            </div>
                          }
                        </div>
                      }
                    </ion-card-content>
                  </ion-card>
                </ion-col>
              }
            </ion-row>
          </ion-grid>
        }
        </div>
      }
    </div>
  `,
  styles: [`
    /* Barra superiore con bottoni */
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      max-width: 1400px;
      margin-left: auto;
      margin-right: auto;
      gap: 10px;
    }

    .top-bar > div {
      display: flex;
      gap: 10px;
    }

    /* Bottone amministrazione con colore più scuro e migliore contrasto */
    ion-button[color="warning"] {
      --background: #e67e22;
      --background-hover: #d35400;
      --background-activated: #d35400;
      --color: white;
      --border-color: #e67e22;
      font-weight: 600;
    }

    /* Bottone outline warning - stile specifico per il toggle */
    ion-button[color="warning"][fill="outline"] {
      --border-color: #e67e22 !important;
      --color: #e67e22 !important;
      --color-hover: white !important;
      --background-hover: #e67e22 !important;
      --background-activated: #d35400 !important;
      font-weight: 600;
    }

    /* Icona dentro il bottone warning outline - deve usare il colore più scuro */
    ion-button[color="warning"][fill="outline"] ion-icon {
      color: #e67e22;
    }

    ion-button[color="warning"][fill="outline"]:hover ion-icon {
      color: white;
    }

    /* Icona warning con colore più scuro */
    ion-icon[color="warning"] {
      --ion-color-warning: #e67e22;
    }

    /* Area progetti */
    .projects-container {
      max-width: 1400px;
      margin: 0 auto;
      margin-bottom: 40px;
    }

    .projects-container h2 {
      margin-bottom: 20px;
      color: var(--ion-color-primary);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Sezione amministrativa con colori più intensi */
    .admin-section {
      padding: 24px;
      background: linear-gradient(135deg, rgba(230, 126, 34, 0.08) 0%, rgba(211, 84, 0, 0.08) 100%);
      border-radius: 12px;
      border: 2px solid #e67e22;
      margin-bottom: 40px;
    }

    .admin-section h2 {
      color: #d35400;
      font-weight: 600;
    }

    .admin-project-card {
      border: 2px solid #e67e22;
      background: linear-gradient(135deg, rgba(230, 126, 34, 0.12) 0%, rgba(255, 255, 255, 1) 50%);
    }

    .admin-project-card.selected-project {
      border: 3px solid #e67e22;
      box-shadow: 0 4px 20px rgba(230, 126, 34, 0.5);
    }

    .admin-image-container {
      background: linear-gradient(135deg, rgba(230, 126, 34, 0.18) 0%, rgba(211, 84, 0, 0.18) 100%);
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: var(--ion-color-medium);
    }

    .selected-project {
      border: 2px solid var(--ion-color-success);
      box-shadow: 0 4px 16px rgba(var(--ion-color-success-rgb), 0.3);
    }

    .project-image-container {
      position: relative;
      width: 100%;
      height: 180px;
      overflow: hidden;
      background: linear-gradient(135deg, var(--ion-color-light) 0%, var(--ion-color-light-shade) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .project-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 20px;
    }

    .active-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 10;
    }

    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .project-description {
      margin: 12px 0;
      color: var(--ion-color-medium-shade);
      min-height: 40px;
    }

    .connections-list {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--ion-color-light);
    }

    .connections-title {
      font-size: 0.9em;
      margin-bottom: 8px;
      color: var(--ion-color-medium-shade);
    }

    .connection-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      margin: 4px 4px 4px 0;
      background: var(--ion-color-light);
      border: 1px solid var(--ion-color-medium);
      border-radius: 16px;
      font-size: 0.85em;
      cursor: pointer;
      transition: all 0.2s;
    }

    .connection-chip:hover {
      background: var(--ion-color-light-shade);
      transform: translateY(-1px);
    }

    .connection-chip.default-connection {
      background: var(--ion-color-success-tint);
      border-color: var(--ion-color-success);
      font-weight: 500;
    }

    ion-card[button] {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    ion-card[button]:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }
  `]
})
export class HomePage implements OnInit, ViewWillEnter {
  private authService = inject(AuthService);
  private menuService = inject(MenuService);
  private gtsDataService = inject(GtsDataService);
  private translationService = inject(TranslationService);

  user = this.authService.getCurrentUser();
  projects: ProjectInfo[] = [];
  loading = false;

  // Toggle per visualizzazione progetti/amministrazione
  showAdminSection = false;

  private readonly ADMIN_SECTION_KEY = 'gts_show_admin_section';

  constructor() {
    // Registra le icone necessarie
    addIcons({
      checkmarkCircle,
      businessOutline,
      shieldCheckmarkOutline
    });

    // Sottoscrivi ai cambiamenti dell'utente
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });

    // Sottoscrivi ai progetti - QUESTO è l'aggiornamento automatico
    this.menuService.projects$.subscribe(projects => {
      this.projects = projects;
    });
  }

  ngOnInit() {
    this.syncProjectSection();
  }

  ionViewWillEnter() {
    // Spegni sempre il loader globale quando si entra nella home
    this.gtsDataService.sendAppLoaderListener(false);
    // Ri-sincronizza ogni volta che la home diventa visibile
    this.syncProjectSection();
  }

  /**
   * Sincronizza la sezione visualizzata con il progetto corrente dell'utente
   */
  private syncProjectSection() {
    if (!this.user?.prjId) return;

    const isAdminPrj = this.isAdminProject({ prjId: this.user.prjId } as ProjectInfo);

    // Mostra la sezione corretta in base al progetto dell'utente
    this.showAdminSection = isAdminPrj;
    localStorage.setItem(this.ADMIN_SECTION_KEY, String(isAdminPrj));
  }

  /**
   * Toggle tra visualizzazione progetti e amministrazione
   */
  toggleAdminSection() {
    this.showAdminSection = !this.showAdminSection;
    // Salva lo stato in localStorage
    localStorage.setItem(this.ADMIN_SECTION_KEY, String(this.showAdminSection));
  }

  /**
   * Verifica se un progetto è amministrativo (GTSW)
   */
  isAdminProject(project: ProjectInfo): boolean {
    return project.prjId === 'GTSW';
  }

  /**
   * Filtra i progetti amministrativi
   */
  get adminProjects(): ProjectInfo[] {
    return this.projects.filter(p => this.isAdminProject(p));
  }

  /**
   * Filtra i progetti standard (non amministrativi)
   */
  get standardProjects(): ProjectInfo[] {
    return this.projects.filter(p => !this.isAdminProject(p));
  }

  /**
   * Click su tile progetto
   */
  onProjectClick(project: ProjectInfo) {
    // Se il progetto è già attivo, non fare nulla
    if (project.prjId === this.user?.prjId) return;

    // Se il progetto ha connessioni, usa quella di default
    let connCode: string | undefined;
    if (project.dbConnections && project.dbConnections.length > 0) {
      const defaultConn = project.dbConnections.find(c => c.connDefault);
      connCode = defaultConn?.connCode || project.dbConnections[0].connCode;
    }

    // Salva lo stato della sezione in base al tipo di progetto selezionato
    const isAdmin = this.isAdminProject(project);
    localStorage.setItem(this.ADMIN_SECTION_KEY, String(isAdmin));

    // Cambia progetto e ricarica il menu
    this.loading = true;
    this.menuService.changeProject(project.prjId, connCode).subscribe({
      next: (response) => {
        this.loading = false;
      },
      error: (error) => {
        console.error('Error changing project:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Click su connessione specifica (impedisce propagazione al progetto)
   */
  onConnectionClick(event: Event, project: ProjectInfo, connection: any) {
    event.stopPropagation();

    // Se il progetto è già attivo e la connessione è quella di default, non fare nulla
    if (project.prjId === this.user?.prjId && connection.connDefault) return;

    // Salva lo stato della sezione in base al tipo di progetto selezionato
    const isAdmin = this.isAdminProject(project);
    localStorage.setItem(this.ADMIN_SECTION_KEY, String(isAdmin));

    // Cambia progetto con connessione specifica
    this.loading = true;
    this.menuService.changeProject(project.prjId, connection.connCode).subscribe({
      next: (response) => {
        this.loading = false;
      },
      error: (error) => {
        console.error('Error changing project/connection:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Ottiene un testo tradotto
   */
  getText(txtId: number): string {
    return this.translationService.getText(txtId, '');
  }
}
