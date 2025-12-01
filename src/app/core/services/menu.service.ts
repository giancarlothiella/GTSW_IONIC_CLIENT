// src/app/core/services/menu.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
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
   */
  loadMenu(prjId?: string, languageId?: string, preserveConnectionState?: string): Observable<MenuResponse> {
    const user = this.authService.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const request: MenuRequest = {
      prjId: prjId || user.prjId,
      languageId: languageId || user.languageId
    };

    return this.http.post<MenuResponse>(
      `${environment.apiUrl}/data/getmenudata`,
      request
    ).pipe(
      tap(async response => {
        if (response.valid) {
          // Registra le route dinamiche dal menu
          this.dynamicRoutesService.registerDynamicRoutes(response.menu);

          // Costruisci l'albero del menu
          const menuTree = this.buildMenuTree(response.menu);
          this.menuItemsSubject.next(menuTree);

          // Scarica le immagini dei progetti e aggiorna
          let projectsWithImages = await this.downloadProjectImages(response.projects);

          // Se c'è una connessione da preservare, aggiorna lo stato
          if (preserveConnectionState && request.prjId) {
            projectsWithImages = projectsWithImages.map(project => {
              if (project.prjId === request.prjId && project.dbConnections) {
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
          }

          this.projectsSubject.next(projectsWithImages);

          // Imposta il progetto corrente
          this.currentProjectSubject.next(request.prjId);
        }
      })
    );
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
