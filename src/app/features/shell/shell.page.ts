// src/app/features/shell/shell.page.ts
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonMenu,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonModal,
  MenuController,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  menuOutline,
  chevronForwardOutline,
  chevronDownOutline,
  folderOutline,
  documentOutline,
  homeOutline,
  closeOutline,
  personCircleOutline,
  bugOutline,
  bug
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { MenuService } from '../../core/services/menu.service';
import { DynamicRoutesService } from '../../core/services/dynamic-routes.service';
import { TranslationService } from '../../core/services/translation.service';
import { MenuItem, ProjectInfo } from '../../core/models/menu.model';
import { GtsLoaderComponent } from '../../core/gts/gts-loader/gts-loader.component';
import { GtsDebugComponent } from '../../core/gts/gts-debug/gts-debug.component';
import { GtsActionsDebugComponent } from '../../core/gts/gts-actions-debug/gts-actions-debug.component';
import { GtsDataService } from '../../core/services/gts-data.service';
import { AppInfoService } from '../../core/services/app-info.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonMenu,
    IonList,
    IonItem,
    IonLabel,
    IonSpinner,
    IonModal,
    GtsLoaderComponent,
    GtsDebugComponent,
    GtsActionsDebugComponent
  ],
  template: `
    <!-- Loader globale -->
    <app-gts-loader></app-gts-loader>

    <!-- Menu laterale sinistro -->
    <ion-menu menuId="main-menu" contentId="main-content" type="overlay">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Menu</ion-title>
          <ion-buttons slot="end">
            <ion-button (click)="toggleMenu()">
              <ion-icon name="close-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        @if (loading) {
          <div class="loading-container">
            <ion-spinner></ion-spinner>
            <p>Caricamento menu...</p>
          </div>
        } @else if (menuItems.length > 0) {
          <ion-list>
            <!-- Link alla home -->
            <ion-item button (click)="navigateToHome()" detail="false">
              <ion-icon slot="start" name="home-outline" color="primary"></ion-icon>
              <ion-label><strong>Home</strong></ion-label>
            </ion-item>

            @for (item of menuItems; track item.leafId) {
              <div>
                @if (item.children && item.children.length > 0) {
                  <!-- Nodo con figli -->
                  <ion-item button (click)="toggleMenuItem(item.leafId)" detail="false">
                    @if (hasCustomIcon(item.iconId)) {
                      <img slot="start" [src]="getIconPath(item.iconId)" class="menu-icon" alt="">
                    } @else {
                      <ion-icon
                        slot="start"
                        name="folder-outline"
                        color="primary">
                      </ion-icon>
                    }
                    <ion-label>{{ item.caption }}</ion-label>
                    <ion-icon
                      slot="end"
                      [name]="isExpanded(item.leafId) ? 'chevron-down-outline' : 'chevron-forward-outline'">
                    </ion-icon>
                  </ion-item>
                  @if (isExpanded(item.leafId)) {
                    <div class="submenu">
                      @for (child of item.children; track child.leafId) {
                        @if (child.children && child.children.length > 0) {
                          <!-- Sotto-nodo con figli -->
                          <ion-item button (click)="toggleMenuItem(child.leafId)" detail="false" class="submenu-item">
                            @if (hasCustomIcon(child.iconId)) {
                              <img slot="start" [src]="getIconPath(child.iconId)" class="menu-icon-small" alt="">
                            } @else {
                              <ion-icon slot="start" name="folder-outline" size="small"></ion-icon>
                            }
                            <ion-label>{{ child.caption }}</ion-label>
                            <ion-icon
                              slot="end"
                              [name]="isExpanded(child.leafId) ? 'chevron-down-outline' : 'chevron-forward-outline'"
                              size="small">
                            </ion-icon>
                          </ion-item>
                          @if (isExpanded(child.leafId)) {
                            <div class="submenu-level-2">
                              @for (subChild of child.children; track subChild.leafId) {
                                <ion-item button (click)="onMenuItemClick(subChild)" detail="false" class="submenu-item-2">
                                  @if (hasCustomIcon(subChild.iconId)) {
                                    <img slot="start" [src]="getIconPath(subChild.iconId)" class="menu-icon-small" alt="">
                                  } @else {
                                    <ion-icon slot="start" name="document-outline" size="small"></ion-icon>
                                  }
                                  <ion-label>{{ subChild.caption }}</ion-label>
                                </ion-item>
                              }
                            </div>
                          }
                        } @else {
                          <!-- Foglia -->
                          <ion-item button (click)="onMenuItemClick(child)" detail="false" class="submenu-item">
                            @if (hasCustomIcon(child.iconId)) {
                              <img slot="start" [src]="getIconPath(child.iconId)" class="menu-icon-small" alt="">
                            } @else {
                              <ion-icon slot="start" name="document-outline" size="small"></ion-icon>
                            }
                            <ion-label>{{ child.caption }}</ion-label>
                          </ion-item>
                        }
                      }
                    </div>
                  }
                } @else {
                  <!-- Nodo foglia senza figli -->
                  <ion-item button (click)="onMenuItemClick(item)" detail="false">
                    @if (hasCustomIcon(item.iconId)) {
                      <img slot="start" [src]="getIconPath(item.iconId)" class="menu-icon" alt="">
                    } @else {
                      <ion-icon slot="start" name="document-outline" color="primary"></ion-icon>
                    }
                    <ion-label>{{ item.caption }}</ion-label>
                  </ion-item>
                }
              </div>
            }
          </ion-list>
        } @else {
          <div class="empty-menu">
            <p>Nessun menu disponibile</p>
          </div>
        }
      </ion-content>
    </ion-menu>

    <!-- Contenuto principale con router outlet -->
    <div id="main-content">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            @if (!hasHomePath()) {
              <ion-button (click)="toggleMenu()">
                <ion-icon name="menu-outline"></ion-icon>
              </ion-button>
            }
          </ion-buttons>
          <ion-title>
            {{ currentProjectInfo?.description || 'GTSuite' }}
            @if (hasMultipleConnections()) {
              <span class="connection-badge">{{ getActiveConnectionLabel() }}</span>
            }
          </ion-title>
          <ion-buttons slot="end">
            <!-- Language indicator -->
            <div class="language-indicator">
              @if (getCurrentLanguageFlagIcon()) {
                <img [src]="getCurrentLanguageFlagIcon()" [alt]="getCurrentLanguage()" class="flag-image">
              } @else {
                <span class="flag-emoji">{{ getCurrentLanguageFlag() }}</span>
              }
            </div>

            <!-- Debug button (only for developers) -->
            @if (isDeveloper()) {
              <ion-button (click)="openDebugModal()" [color]="actionsDebugActive ? 'success' : 'warning'" [class.debug-active]="actionsDebugActive">
                <ion-icon slot="icon-only" [name]="actionsDebugActive ? 'bug' : 'bug-outline'"></ion-icon>
              </ion-button>
            }

            <ion-button (click)="navigateToProfile()">
              <ion-icon slot="start" name="person-circle-outline"></ion-icon>
              {{ getText(600) }}
            </ion-button>
            <ion-button (click)="onLogout()">
              <ion-icon slot="start" name="log-out-outline"></ion-icon>
              {{ getText(601) }}
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <!-- Router outlet per caricare le pagine figlie -->
        <router-outlet></router-outlet>
      </ion-content>
    </div>

    <!-- Debug Modal -->
    <ion-modal
      [isOpen]="debugModalOpen"
      (didDismiss)="debugModalOpen = false"
      [initialBreakpoint]="0.9"
      [breakpoints]="[0, 0.5, 0.75, 0.9, 1]"
    >
      <ng-template>
        <ion-header>
          <ion-toolbar color="warning">
            <ion-title>Debug Panel</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="debugModalOpen = false">
                <ion-icon name="close-outline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <app-gts-debug
            [prjId]="debugPrjId"
            [metaData]="debugMetaData"
            [pageData]="debugPageData"
            [dbLog]="debugDbLog"
            [pageRules]="debugPageRules"
            (debugStateChanged)="onDebugStateChanged($event)"
          ></app-gts-debug>
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- Actions Debug Component -->
    <app-gts-actions-debug></app-gts-actions-debug>
  `,
  styles: [`
    /* Contenitore principale */
    #main-content {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
    }

    #main-content ion-content {
      --background: #f4f5f8;
      flex: 1;
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 16px;
    }

    /* Menu laterale */
    ion-menu {
      --width: 280px;
    }

    /* Menu laterale */
    .loading-container,
    .empty-menu {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: var(--ion-color-medium);
    }

    .submenu {
      background: var(--ion-color-light);
    }

    .submenu-item {
      --padding-start: 32px;
      font-size: 0.9em;
    }

    .submenu-level-2 {
      background: var(--ion-color-light-shade);
    }

    .submenu-item-2 {
      --padding-start: 48px;
      font-size: 0.85em;
    }

    /* Custom menu icons */
    .menu-icon {
      width: 24px;
      height: 24px;
      margin-right: 16px;
      object-fit: contain;
    }

    .menu-icon-small {
      width: 20px;
      height: 20px;
      margin-right: 12px;
      object-fit: contain;
    }

    /* Language indicator */
    .language-indicator {
      display: flex;
      align-items: center;
      padding: 0 12px;
    }

    .language-indicator .flag-emoji {
      font-size: 28px;
      line-height: 1;
      display: block;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif;
    }

    .language-indicator .flag-image {
      width: 28px;
      height: 28px;
      object-fit: contain;
      display: block;
    }

    /* Connection badge in header */
    .connection-badge {
      display: inline-block;
      margin-left: 12px;
      padding: 4px 12px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: 500;
      vertical-align: middle;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    /* Abilita selezione testo nel debug modal */
    ion-modal {
      user-select: text !important;
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
    }

    /* Forza larghezza per il debug modal */
    ion-modal ion-content {
      --padding-start: 0;
      --padding-end: 0;
      user-select: text !important;
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
    }

    ion-modal::part(content) {
      width: 80vw !important;
      max-width: 80vw !important;
      user-select: text !important;
      -webkit-user-select: text !important;
    }

    /* Abilita selezione su tutti gli elementi dentro il modal */
    ion-modal * {
      user-select: text !important;
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
    }
  `]
})
export class ShellPage implements OnInit {
  private authService = inject(AuthService);
  private menuService = inject(MenuService);
  private dynamicRoutesService = inject(DynamicRoutesService);
  private translationService = inject(TranslationService);
  private router = inject(Router);
  private menuCtrl = inject(MenuController);
  private gtsDataService = inject(GtsDataService);
  private appInfoService = inject(AppInfoService);

  user = this.authService.getCurrentUser();
  menuItems: MenuItem[] = [];
  currentProjectInfo: ProjectInfo | null = null;
  loading = false;
  expandedItems = new Set<number>();

  // Debug modal
  debugModalOpen = false;
  debugPrjId = '';
  debugMetaData: any = [];
  debugPageData: any = [];
  debugDbLog: any = [];
  debugPageRules: any = [];
  actionsDebugActive = false;

  constructor() {
    // Registra le icone necessarie
    addIcons({
      logOutOutline,
      menuOutline,
      chevronForwardOutline,
      chevronDownOutline,
      folderOutline,
      documentOutline,
      homeOutline,
      closeOutline,
      personCircleOutline,
      bugOutline,
      bug
    });

    // Sottoscrivi ai cambiamenti dell'utente
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });

    // Sottoscrivi ai cambiamenti del menu
    this.menuService.menuItems$.subscribe(items => {
      this.menuItems = items;
    });

    // Sottoscrivi ai cambiamenti del progetto corrente (projectId string)
    this.menuService.currentProject$.subscribe(prjId => {
      if (prjId) {
        // Ottieni le informazioni complete del progetto
        this.currentProjectInfo = this.menuService.getCurrentProjectInfo();
      }
    });

    // Sottoscrivi ai cambiamenti di navigazione per ricaricare i dati del debug
    this.router.events.subscribe((event) => {
      if (event.constructor.name === 'NavigationEnd') {
        // Ricarica sempre i dati del debug quando cambia la pagina
        setTimeout(() => {
          this.loadDebugData();
        }, 500); // Piccolo delay per assicurarsi che i dati siano aggiornati
      }
    });
  }

  async ngOnInit() {
    this.user = this.authService.getCurrentUser();
    await this.initializeTranslations();

    // Non caricare il menu se l'utente non è autenticato
    // (es. quando siamo in change-password con password scaduta)
    if (this.user) {
      this.loadMenuData();
    }

    // Inizializza lo stato del debug e sottoscrivi ai cambiamenti
    this.actionsDebugActive = this.appInfoService.appActionsDebug;
    this.appInfoService.getAppActionsDebugListener().subscribe((active) => {
      this.actionsDebugActive = active;
    });
  }

  /**
   * Inizializza le traduzioni
   */
  private async initializeTranslations() {
    try {
      await this.translationService.initialize();
    } catch (error) {
      console.error('Error initializing translations:', error);
    }
  }

  /**
   * Carica menu e progetti
   */
  loadMenuData() {
    if (!this.user) {
      console.error('User not found');
      return;
    }

    this.loading = true;
    this.menuService.loadMenu().subscribe({
      next: (response) => {
        this.menuItems = this.menuService.getCurrentMenu();
        this.currentProjectInfo = this.menuService.getCurrentProjectInfo();
        this.loading = false;

        // Registra le route dinamiche basate sul menu
        this.dynamicRoutesService.registerDynamicRoutes(this.menuItems);
      },
      error: (error) => {
        console.error('Error loading menu:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Toggle espansione item del menu
   */
  toggleMenuItem(leafId: number) {
    if (this.expandedItems.has(leafId)) {
      this.expandedItems.delete(leafId);
    } else {
      this.expandedItems.add(leafId);
    }
  }

  /**
   * Verifica se un item è espanso
   */
  isExpanded(leafId: number): boolean {
    return this.expandedItems.has(leafId);
  }

  /**
   * Ottiene il path dell'icona custom se disponibile
   */
  getIconPath(iconId: number): string | null {
    if (!iconId) return null;
    // Try SVG first, then PNG
    return `assets/icons/icon_${iconId}.svg`;
  }

  /**
   * Verifica se esiste un'icona custom per l'iconId
   */
  hasCustomIcon(iconId: number): boolean {
    return iconId !== undefined && iconId !== null && iconId > 0;
  }

  /**
   * Naviga alla home
   */
  async navigateToHome() {
    // Chiudi il menu prima di navigare (solo se in modalità overlay)
    await this.menuCtrl.close('main-menu');
    this.router.navigate(['/home']);
  }

  /**
   * Naviga al profilo
   */
  async navigateToProfile() {
    this.router.navigate(['/profile']);
  }

  /**
   * Verifica se il progetto corrente ha più connessioni
   */
  hasMultipleConnections(): boolean {
    return (this.currentProjectInfo?.dbConnections?.length || 0) > 1;
  }

  /**
   * Ottiene il label della connessione attiva
   */
  getActiveConnectionLabel(): string {
    if (!this.currentProjectInfo?.dbConnections) return '';

    const activeConnection = this.currentProjectInfo.dbConnections.find(conn => conn.connDefault);
    return activeConnection?.dataKey || '';
  }

  /**
   * Click su item del menu (foglia)
   */
  async onMenuItemClick(item: MenuItem) {
    // Chiudi il menu prima di navigare (solo se in modalità overlay)
    await this.menuCtrl.close('main-menu');

    // Usa il DynamicRoutesService per navigare
    this.dynamicRoutesService.navigateToMenuItem(item);
  }

  /**
   * Toggle menu laterale
   */
  async toggleMenu() {
    await this.menuCtrl.toggle('main-menu');
  }

  /**
   * Logout
   */
  async onLogout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Ottiene un testo tradotto
   */
  getText(txtId: number): string {
    return this.translationService.getText(txtId, '');
  }

  /**
   * Ottiene la lingua corrente
   */
  getCurrentLanguage(): string {
    return this.translationService.getCurrentLanguage();
  }

  /**
   * Ottiene la bandierina della lingua corrente
   */
  getCurrentLanguageFlag(): string {
    const currentLang = this.translationService.getCurrentLanguage();
    const flags: { [key: string]: string } = {
      'IT': '🇮🇹',
      'EN': '🇬🇧',
      'ES': '🇪🇸',
      'FR': '🇫🇷',
      'DE': '🇩🇪'
    };
    return flags[currentLang.toUpperCase()] || '🌐';
  }

  /**
   * Ottiene l'icona (immagine PNG) della bandierina della lingua corrente
   */
  getCurrentLanguageFlagIcon(): string | undefined {
    const currentLang = this.translationService.getCurrentLanguage();
    const languages = this.translationService.getLanguages();
    const language = languages.find(l => l.languageId.toUpperCase() === currentLang.toUpperCase());
    return language?.flagIcon;
  }

  /**
   * Verifica se l'utente è developer
   */
  isDeveloper(): boolean {
    return this.authService.isDeveloper();
  }

  /**
   * Verifica se l'utente ha un homePath dedicato (accesso limitato a una sola pagina)
   */
  hasHomePath(): boolean {
    return this.authService.hasHomePath();
  }

  /**
   * Carica i dati per il debug panel
   */
  private loadDebugData() {
    // Ottieni i dati della pagina corrente
    const actualData = this.gtsDataService.getActualDebugData();
    const actualPrjId = actualData.actualPrjId;
    const actualFormId = actualData.actualFormId;

    this.debugPrjId = actualPrjId || this.user?.prjId || '';

    // Filtra i dati per la pagina corrente
    this.debugMetaData = actualData.metaData.filter((page: any) =>
      page.prjId === actualPrjId && page.formId === actualFormId
    );
    this.debugPageData = actualData.pageData.filter((page: any) =>
      page.prjId === actualPrjId && page.formId === actualFormId
    );
    this.debugPageRules = actualData.pageRules.filter((page: any) =>
      page.prjId === actualPrjId && page.formId === actualFormId
    );
    this.debugDbLog = this.gtsDataService.getAllDbLog().filter((log: any) =>
      log.prjId === actualPrjId && log.formId === actualFormId
    );
  }

  /**
   * Apre il modal di debug
   */
  openDebugModal() {
    // Chiudi temporaneamente il modal per forzare la reinizializzazione del componente
    this.debugModalOpen = false;

    // Carica i nuovi dati
    this.loadDebugData();

    // Riapri il modal dopo un breve delay per permettere la distruzione del componente
    setTimeout(() => {
      this.debugModalOpen = true;
    }, 50);
  }

  /**
   * Gestisce il cambio di stato del debug actions
   */
  onDebugStateChanged(active: boolean) {
    this.actionsDebugActive = active;
    if (active) {
      // Chiudi il modal quando si attiva il debug
      this.debugModalOpen = false;
    }
  }
}
