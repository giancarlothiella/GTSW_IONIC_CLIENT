// src/app/core/services/dynamic-routes.service.ts
import { Injectable } from '@angular/core';
import { Route, Router } from '@angular/router';
import { MenuItem } from '../models/menu.model';
import { getComponentLoader } from '../config/component-registry';

/**
 * Servizio per generare route dinamiche basate sul menu
 * Crea automaticamente le route nel formato: {prjId}/{path}
 */
@Injectable({
  providedIn: 'root'
})
export class DynamicRoutesService {
  private routesInitialized = false;

  constructor(private router: Router) {}

  /**
   * Registra le route dinamiche basate sui menu items
   * @param menuItems Array di voci di menu dal backend
   */
  registerDynamicRoutes(menuItems: MenuItem[]): void {
    if (this.routesInitialized) {
      return;
    }

    // Filtra solo le voci con URL (esclude le voci parent senza formId)
    const routeItems = this.extractAllRouteItems(menuItems);

    // Trova la route shell (parent delle route protette)
    const config = this.router.config;
    const shellRoute = config.find(route => route.loadComponent && route.children);

    if (!shellRoute || !shellRoute.children) {
      console.error('Shell route not found');
      return;
    }

    // Mappa per evitare route duplicate
    const existingPaths = new Set(shellRoute.children.map(r => r.path));

    // Crea le route dinamiche
    routeItems.forEach(item => {
      const path = this.buildRoutePath(item);

      // Non aggiungere se già esiste
      if (existingPaths.has(path)) {
        return;
      }

      // Verifica se il componente è registrato
      const componentLoader = getComponentLoader(path);

      if (!componentLoader) {
        console.warn(`DynamicRoutesService - Component not registered for path: ${path}`);
        return;
      }

      const route: Route = {
        path: path,
        loadComponent: componentLoader
      };

      shellRoute.children!.push(route);
      existingPaths.add(path);
    });

    // Aggiorna la configurazione del router
    this.router.resetConfig(config);
    this.routesInitialized = true;
  }

  /**
   * Estrae ricorsivamente tutti gli item con URL e formId dal menu
   */
  private extractAllRouteItems(items: MenuItem[]): MenuItem[] {
    const result: MenuItem[] = [];

    for (const item of items) {
      if (item.url && item.formId) {
        result.push(item);
      }

      if (item.children && item.children.length > 0) {
        result.push(...this.extractAllRouteItems(item.children));
      }
    }

    return result;
  }

  /**
   * Costruisce il path della route: {prjId}/{urlPath}
   * Es: "GTSW" + "/gtsusers" -> "GTSW/users"
   */
  private buildRoutePath(item: MenuItem): string {
    // Rimuovi lo slash iniziale dall'URL
    let urlPath = item.url!.startsWith('/') ? item.url!.substring(1) : item.url!;

    // Rimuovi il prefisso "gts" se presente (es: gtsusers -> users)
    if (urlPath.startsWith('gts')) {
      urlPath = urlPath.substring(3);
    }

    return `${item.prjId}/${urlPath}`;
  }

  /**
   * Componenti che richiedono formId nei query params (componenti condivisi)
   */
  private readonly SHARED_COMPONENTS = [
    'stdTable',
    'stdtable'
  ];

  /**
   * Verifica se un path corrisponde a un componente condiviso che richiede formId
   */
  private isSharedComponent(path: string): boolean {
    const pathLower = path.toLowerCase();
    return this.SHARED_COMPONENTS.some(comp => pathLower.includes(comp.toLowerCase()));
  }

  /**
   * Naviga a una voce di menu
   */
  navigateToMenuItem(item: MenuItem): void {
    const path = this.buildRoutePath(item);

    // Costruisci i query params
    const queryParams: any = {};

    // Aggiungi formId SOLO se è un componente condiviso (es: stdTable)
    // Per gli altri componenti, il formId è hardcoded nel componente stesso
    if (this.isSharedComponent(path) && item.formId) {
      queryParams.formId = item.formId;
    }

    // Aggiungi menuParam solo se è presente E diverso dal formId
    // (viene usato per distinguere diverse viste dello stesso componente, es: logs con param='auth', 'db', 'errors')
    if (item.menuParam && item.menuParam !== null && item.menuParam !== String(item.formId)) {
      queryParams.param = item.menuParam;
    }

    // Se non ci sono query params, naviga senza
    if (Object.keys(queryParams).length === 0) {
      this.router.navigate([path]);
    } else {
      this.router.navigate([path], { queryParams });
    }
  }
}
