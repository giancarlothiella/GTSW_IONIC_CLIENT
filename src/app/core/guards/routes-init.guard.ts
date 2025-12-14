// src/app/core/guards/routes-init.guard.ts
import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { MenuService } from '../services/menu.service';
import { AuthService } from '../services/auth.service';
import { DynamicRoutesService } from '../services/dynamic-routes.service';
import { firstValueFrom } from 'rxjs';

/**
 * Guard che inizializza le route dinamiche quando necessario
 * Questo previene il problema del refresh della pagina che causa redirect a /home
 */
export const routesInitGuard: CanMatchFn = async (route, segments) => {
  const menuService = inject(MenuService);
  const authService = inject(AuthService);
  const dynamicRoutesService = inject(DynamicRoutesService);
  const router = inject(Router);

  try {
    // Verifica se l'utente è autenticato
    const isAuthenticated = await authService.isAuthenticated();

    if (!isAuthenticated) {
      return false;
    }

    const user = authService.getCurrentUser();
    if (!user) {
      return false;
    }

    // Verifica se il menu è già stato caricato
    let currentMenu = menuService.getCurrentMenu();

    if (!currentMenu || currentMenu.length === 0) {
      // Carica il menu in modo sincrono (questo registrerà anche le route)
      // Passa esplicitamente il prjId dell'utente per evitare inconsistenze
      await firstValueFrom(menuService.loadMenu(user.prjId));
      currentMenu = menuService.getCurrentMenu();
    }

    // Costruisci il path dalla route segments
    const path = segments.map(s => s.path).join('/');

    // Verifica se esiste una route dinamica per questo path
    // Cerca negli item del menu
    const flatMenu = flattenMenu(currentMenu);
    const menuItem = flatMenu.find(item => {
      if (!item.url || !item.formId) return false;

      let urlPath = item.url.startsWith('/') ? item.url.substring(1) : item.url;
      if (urlPath.startsWith('gts')) {
        urlPath = urlPath.substring(3);
      }
      const itemPath = `${item.prjId}/${urlPath}`;

      return itemPath === path;
    });

    if (menuItem) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('RoutesInitGuard - Error:', error);
    return false;
  }
};

/**
 * Appiattisce ricorsivamente l'albero del menu
 */
function flattenMenu(items: any[]): any[] {
  const result: any[] = [];

  for (const item of items) {
    result.push(item);
    if (item.children && item.children.length > 0) {
      result.push(...flattenMenu(item.children));
    }
  }

  return result;
}
