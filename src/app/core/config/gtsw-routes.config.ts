// src/app/core/config/gtsw-routes.config.ts
/**
 * Mapping tra gli URL del menu GTSW e i componenti Angular
 * Questo file mappa automaticamente gli URL ricevuti dal backend alle route Angular
 */

export interface GTSWRouteMapping {
  url: string;           // URL dal menu JSON (es. '/gtsusers')
  path: string;          // Path Angular (es. 'gtsusers')
  componentPath: string; // Path del file del componente
  componentName: string; // Nome della classe del componente
  folderName: string;    // Nome della cartella del componente
}

/**
 * Configurazione delle route GTSW
 * Ogni voce mappa un URL del menu a un componente Angular
 */
export const GTSW_ROUTES_CONFIG: GTSWRouteMapping[] = [
  {
    url: '/gtsusers',
    path: 'gtsusers',
    componentPath: './features/GTSW/users/users.page',
    componentName: 'GTSW_UsersComponent',
    folderName: 'users'
  },
  {
    url: '/gtsauthmails',
    path: 'gtsauthmails',
    componentPath: './features/GTSW/auth-mails/auth-mails.page',
    componentName: 'GTSW_AuthMailsComponent',
    folderName: 'auth-mails'
  },
  {
    url: '/gtsauthrules',
    path: 'gtsauthrules',
    componentPath: './features/GTSW/authrules/authrules.page',
    componentName: 'GTSW_AuthRulesComponent',
    folderName: 'authrules'
  },
  {
    url: '/gtsgrantedobjs',
    path: 'gtsgrantedobjs',
    componentPath: './features/GTSW/granted-objs/granted-objs.page',
    componentName: 'GTSW_GrantedObjsComponent',
    folderName: 'granted-objs'
  },
  {
    url: '/gtsdbconn',
    path: 'gtsdbconn',
    componentPath: './features/GTSW/db-conn/db-conn.page',
    componentName: 'GTSW_DbConnComponent',
    folderName: 'db-conn'
  },
  {
    url: '/gtssetup',
    path: 'gtssetup',
    componentPath: './features/GTSW/setup/setup.page',
    componentName: 'GTSW_SetupComponent',
    folderName: 'setup'
  },
  {
    url: '/gtslanguages',
    path: 'gtslanguages',
    componentPath: './features/GTSW/languages/languages.page',
    componentName: 'GTSW_LanguagesComponent',
    folderName: 'languages'
  },
  {
    url: '/gtsscheduler',
    path: 'gtsscheduler',
    componentPath: './features/GTSW/scheduler/scheduler.page',
    componentName: 'GTSW_SchedulerComponent',
    folderName: 'scheduler'
  },
  {
    url: '/gtsmailmerge',
    path: 'gtsmailmerge',
    componentPath: './features/GTSW/mailmerge/mailmerge.page',
    componentName: 'GTSW_MailMergeComponent',
    folderName: 'mailmerge'
  },
  {
    url: '/gtssequences',
    path: 'gtssequences',
    componentPath: './features/GTSW/sequences/sequences.page',
    componentName: 'GTSW_SequencesComponent',
    folderName: 'sequences'
  },
  {
    url: '/gtsaiInstr',
    path: 'gtsaiInstr',
    componentPath: './features/GTSW/ai-instr/ai-instr.page',
    componentName: 'GTSW_AiInstrComponent',
    folderName: 'ai-instr'
  },
  {
    url: '/gtslogs',
    path: 'gtslogs',
    componentPath: './features/GTSW/logs/logs.page',
    componentName: 'GTSW_LogsComponent',
    folderName: 'logs'
  }
];

/**
 * Helper function per ottenere la configurazione di una route dato l'URL
 */
export function getRouteConfigByUrl(url: string): GTSWRouteMapping | undefined {
  return GTSW_ROUTES_CONFIG.find(config => config.url === url);
}

/**
 * Helper function per ottenere la configurazione di una route dato il path
 */
export function getRouteConfigByPath(path: string): GTSWRouteMapping | undefined {
  return GTSW_ROUTES_CONFIG.find(config => config.path === path);
}
