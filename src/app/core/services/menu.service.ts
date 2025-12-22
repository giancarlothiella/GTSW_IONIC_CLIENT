// src/app/core/services/menu.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MenuResponse, MenuItem, ProjectInfo, MenuRequest } from '../models/menu.model';
import { AuthService } from './auth.service';
import { DynamicRoutesService } from './dynamic-routes.service';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private dynamicRoutesService = inject(DynamicRoutesService);

  private menuItemsSubject = new BehaviorSubject<MenuItem[]>([]);
  public menuItems$ = this.menuItemsSubject.asObservable();

  private projectsSubject = new BehaviorSubject<ProjectInfo[]>([]);
  public projects$ = this.projectsSubject.asObservable();

  private currentProjectSubject = new BehaviorSubject<string | null>(null);
  public currentProject$ = this.currentProjectSubject.asObservable();

  /**
   * Carica il menu per il progetto corrente
   * @param prjId - ID del progetto (opzionale, usa quello dell'utente se non specificato)
   * @param languageId - ID della lingua (opzionale)
   * @param requestedConnCode - Connessione specifica da usare nella richiesta (ha priorità su tutto)
   */
  loadMenu(prjId?: string, languageId?: string, requestedConnCode?: string): Observable<MenuResponse> {
    const user = this.authService.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Determina il progetto target
    const targetPrjId = prjId || user.prjId;

    // Determina la connessione da usare nella richiesta:
    // 1. Se è stata specificata una connessione esplicita (requestedConnCode), usa quella
    // 2. Altrimenti cerca nel projectsSubject (stato corrente UI) SOLO per il progetto target
    // 3. Se il progetto target non ha connessioni, NON inviare connCode
    // 4. Come ultimo fallback (primo caricamento), usa authService solo se il progetto corrisponde
    let connCode: string | undefined;

    if (requestedConnCode) {
      // Connessione esplicita richiesta (es. cambio connessione)
      connCode = requestedConnCode;
    } else {
      const projects = this.projectsSubject.value;
      const targetProject = projects.find(p => p.prjId === targetPrjId);

      if (targetProject) {
        // Progetto trovato nel projectsSubject
        if (targetProject.dbConnections && targetProject.dbConnections.length > 0) {
          // Il progetto HA connessioni - usa quella di default
          const defaultConn = targetProject.dbConnections.find(c => c.connDefault) || targetProject.dbConnections[0];
          connCode = defaultConn?.connCode;
        }
        // Se il progetto NON ha connessioni, connCode rimane undefined (corretto)
      } else {
        // Progetto non ancora caricato (primo caricamento dopo login)
        // Usa authService solo se il progetto corrente dell'utente corrisponde
        if (user.prjId === targetPrjId && user.prjConnections && user.prjConnections.length > 0) {
          const authConn = this.authService.getDefaultConnection();
          connCode = authConn?.connCode;
        }
        // Se è un progetto diverso o l'utente non ha connessioni, connCode rimane undefined
      }
    }

    const request: MenuRequest = {
      prjId: targetPrjId,
      languageId: languageId || user.languageId,
      connCode: connCode
    };

    return new Observable<MenuResponse>(observer => {
      this.http.post<MenuResponse>(
        `${environment.apiUrl}/data/getmenudata`,
        request
      ).subscribe({
        next: async (response) => {
          try {
            // Passa requestedConnCode per preservare lo stato della connessione selezionata
            const result = await this.processMenuResponse(response, request.prjId, user, requestedConnCode);
            observer.next(result);
            observer.complete();
          } catch (err) {
            console.error('MenuService loadMenu - processMenuResponse ERROR:', err);
            observer.error(err);
          }
        },
        error: (err) => {
          console.error('MenuService loadMenu - HTTP ERROR:', err);
          observer.error(err);
        }
      });
    });
  }

  /**
   * Processa la risposta del menu (operazioni asincrone)
   */
  private async processMenuResponse(
    response: MenuResponse,
    prjId: string,
    user: any,
    preserveConnectionState?: string
  ): Promise<MenuResponse> {
    if (response.valid) {
      // Registra le route dinamiche dal menu
      this.dynamicRoutesService.registerDynamicRoutes(response.menu);

      // Costruisci l'albero del menu
      const menuTree = this.buildMenuTree(response.menu);
      this.menuItemsSubject.next(menuTree);

      // Scarica le immagini dei progetti e aggiorna
      let projectsWithImages: ProjectInfo[];
      try {
        projectsWithImages = await this.downloadProjectImages(response.projects);
      } catch (imgError) {
        console.error('MenuService - downloadProjectImages ERROR:', imgError);
        // Usa i progetti senza immagini in caso di errore
        projectsWithImages = response.projects;
      }

      // Se c'è una connessione da preservare, aggiorna lo stato
      if (preserveConnectionState && prjId) {
        projectsWithImages = projectsWithImages.map(project => {
          if (project.prjId === prjId && project.dbConnections) {
            return {
              ...project,
              dbConnections: project.dbConnections.map(conn => ({
                ...conn,
                connDefault: conn.connCode === preserveConnectionState
              }))
            };
          }
          return project;
        });
      } else {
        // Se non c'è connessione da preservare, usa le connessioni dell'utente (dal login)
        // per impostare il connDefault corretto
        const userConnections = user.prjConnections || [];
        projectsWithImages = projectsWithImages.map(project => {
          if (project.prjId === prjId && project.dbConnections) {
            // Trova la connessione di default dalle prjConnections dell'utente
            const defaultUserConn = userConnections.find((uc: any) => uc.connDefault);
            if (defaultUserConn) {
              return {
                ...project,
                dbConnections: project.dbConnections.map(conn => ({
                  ...conn,
                  connDefault: conn.connCode === defaultUserConn.connCode
                }))
              };
            }
          }
          return project;
        });
      }

      this.projectsSubject.next(projectsWithImages);

      // Imposta il progetto corrente
      this.currentProjectSubject.next(prjId);
    }

    return response;
  }

  /**
   * Costruisce l'albero del menu dai dati flat
   */
  private buildMenuTree(items: MenuItem[]): MenuItem[] {
    const map = new Map<number, MenuItem>();
    const roots: MenuItem[] = [];

    // Prima passa: crea la mappa
    items.forEach(item => {
      map.set(item.leafId, { ...item, children: [] });
    });

    // Seconda passa: costruisci l'albero
    items.forEach(item => {
      const node = map.get(item.leafId);
      if (!node) return;

      if (item.parentId === 0) {
        // Nodo root
        roots.push(node);
      } else {
        // Nodo figlio
        const parent = map.get(item.parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(node);
        }
      }
    });

    return roots;
  }

  /**
   * Cambia progetto corrente e ricarica il menu
   */
  changeProject(prjId: string, connCode?: string): Observable<MenuResponse> {
    return new Observable(observer => {
      // Prima ricarica il menu per ottenere le connessioni del nuovo progetto
      this.loadMenu(prjId, undefined, connCode).subscribe({
        next: async (response) => {
          // Ottieni le connessioni del nuovo progetto dalla risposta
          const newProject = response.projects.find(p => p.prjId === prjId);
          const newConnections = newProject?.dbConnections || [];

          // Aggiorna l'utente nell'AuthService con le nuove connessioni
          await this.authService.changeCurrentProject(prjId, connCode, newConnections);

          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Aggiorna lo stato delle connessioni per un progetto specifico
   */
  private updateProjectConnections(prjId: string, connCode: string): void {
    const projects = this.projectsSubject.value;
    const updatedProjects = projects.map(project => {
      if (project.prjId === prjId && project.dbConnections) {
        return {
          ...project,
          dbConnections: project.dbConnections.map(conn => ({
            ...conn,
            connDefault: conn.connCode === connCode
          }))
        };
      }
      return project;
    });
    this.projectsSubject.next(updatedProjects);
  }

  /**
   * Ottiene il menu corrente
   */
  getCurrentMenu(): MenuItem[] {
    return this.menuItemsSubject.value;
  }

  /**
   * Ottiene i progetti disponibili
   */
  getProjects(): ProjectInfo[] {
    return this.projectsSubject.value;
  }

  /**
   * Ottiene il progetto corrente per prjId
   */
  getCurrentProjectInfo(): ProjectInfo | null {
    const currentPrjId = this.currentProjectSubject.value;
    if (!currentPrjId) return null;

    return this.projectsSubject.value.find(p => p.prjId === currentPrjId) || null;
  }

  /**
   * Pulisce tutti i dati del menu (da chiamare al logout)
   */
  clearMenuData(): void {
    this.menuItemsSubject.next([]);
    this.projectsSubject.next([]);
    this.currentProjectSubject.next(null);
  }

  /**
   * Scarica le immagini dei progetti dal server
   */
  private async downloadProjectImages(projects: ProjectInfo[]): Promise<ProjectInfo[]> {
    const projectsWithImages = await Promise.all(
      projects.map(async (project) => {
        let homeImageData = project.homeImage;
        let iconImageData = project.iconImage;

        // Scarica homeImage se disponibile e non è un path locale
        if (project.homeImage && !project.homeImage.startsWith('/assets/')) {
          try {
            // Aggiungi il prefisso 'Projects/' se non presente
            const homeImagePath = project.homeImage.startsWith('Projects/')
              ? project.homeImage
              : `Projects/${project.homeImage}`;
            homeImageData = await this.authService.downloadImage(homeImagePath);
          } catch (error) {
            console.error(`Error downloading homeImage for ${project.prjId}:`, error);
          }
        }

        // Scarica iconImage se disponibile e non è un path locale
        if (project.iconImage && !project.iconImage.startsWith('/assets/')) {
          try {
            // Aggiungi il prefisso 'Projects/' se non presente
            const iconImagePath = project.iconImage.startsWith('Projects/')
              ? project.iconImage
              : `Projects/${project.iconImage}`;
            iconImageData = await this.authService.downloadImage(iconImagePath);
          } catch (error) {
            console.error(`Error downloading iconImage for ${project.prjId}:`, error);
          }
        }

        return {
          ...project,
          homeImage: homeImageData,
          iconImage: iconImageData
        };
      })
    );

    return projectsWithImages;
  }
}
