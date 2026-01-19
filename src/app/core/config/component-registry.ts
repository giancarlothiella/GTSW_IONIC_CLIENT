// src/app/core/config/component-registry.ts
/**
 * Registro centralizzato dei componenti per il caricamento dinamico
 * Mappa {prjId}/{path} ai componenti Angular
 */

export interface ComponentRegistryEntry {
  path: string;
  loadComponent: () => Promise<any>;
}

/**
 * Registro dei componenti disponibili
 * Ogni entry mappa un path a una funzione di caricamento lazy
 */
export const COMPONENT_REGISTRY: { [key: string]: () => Promise<any> } = {
  // GTR Components
  'GTR/fatture': () => import('../../features/GTR/fatture/fatture.page').then(m => m.GTR_FattureComponent),
  'GTR/stdTable': () => import('../../features/GTR/std-table/std-table.page').then(m => m.GTR_StdTableComponent),
  'GTR/webapp': () => import('../../features/GTR/web-app/web-app.page').then(m => m.GTR_WebAppComponent),

  'GTR/sitpagam': () => import('../../features/GTR/sitPagamenti/sitPagamenti.page').then(m => m.GTR_SitPagamentiComponent),
  // GTSW Components
  'GTSW/users': () => import('../../features/GTSW/users/users.page').then(m => m.GTSW_UsersComponent),
  'GTSW/authrules': () => import('../../features/GTSW/authrules/authrules.page').then(m => m.GTSW_AuthrulesComponent),
  'GTSW/authmails': () => import('../../features/GTSW/auth-mails/auth-mails.page').then(m => m.GTSW_AuthMailsComponent),
  'GTSW/grantedobjs': () => import('../../features/GTSW/granted-objs/granted-objs.page').then(m => m.GTSW_GrantedObjsComponent),
  'GTSW/dbconn': () => import('../../features/GTSW/db-conn/db-conn.page').then(m => m.GTSW_DbConnComponent),
  'GTSW/setup': () => import('../../features/GTSW/setup/setup.page').then(m => m.GTSW_SetupComponent),
  'GTSW/logs': () => import('../../features/GTSW/logs/logs.page').then(m => m.GTSW_LogsComponent),
  'GTSW/languages': () => import('../../features/GTSW/languages/languages.page').then(m => m.GTSW_LanguagesComponent),
  'GTSW/scheduler': () => import('../../features/GTSW/scheduler/scheduler.page').then(m => m.GTSW_SchedulerComponent),
  'GTSW/mailmerge': () => import('../../features/GTSW/mailmerge/mailmerge.page').then(m => m.GTSW_MailMergeComponent),
  'GTSW/sequences': () => import('../../features/GTSW/sequences/sequences.page').then(m => m.GTSW_SequencesComponent),
  'GTSW/aiInstr': () => import('../../features/GTSW/ai-instr/ai-instr.page').then(m => m.GTSW_AiInstrComponent),
  'GTSW/templateBuilder': () => import('../../features/ai-template-builder/ai-template-builder.component').then(m => m.AiTemplateBuilderComponent),
  'GTSW/dashboardBuilder': () => import('../../features/GTSW/dashboardBuilder/dashboardBuilder.page').then(m => m.GTSW_DashboardBuilderComponent),

  'GTSW/reporttemplates': () => import('../../features/GTSW/report-templates/report-templates.page').then(m => m.GTSW_ReportTemplatesComponent),
  // DCW Components
  'DCW/schedeContabili': () => import('../../features/DCW/schede-contabili/schede-contabili.page').then(m => m.DCW_SchedeContabiliComponent),

  'DCW/bilancio': () => import('../../features/DCW/bilancio/bilancio.page').then(m => m.DCW_BilancioComponent),
  'DCW/salesDashboard': () => import('../../features/DCW/salesDashboard/salesDashboard.page').then(m => m.DCW_SalesDashboardComponent),
  // Altri progetti qui...
};

/**
 * Helper per ottenere il loader di un componente dato il path
 */
export function getComponentLoader(path: string): (() => Promise<any>) | undefined {
  return COMPONENT_REGISTRY[path];
}

/**
 * Helper per verificare se un componente è registrato
 */
export function isComponentRegistered(path: string): boolean {
  return path in COMPONENT_REGISTRY;
}
