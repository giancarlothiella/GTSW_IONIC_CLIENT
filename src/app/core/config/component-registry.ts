// src/app/core/config/component-registry.ts
/**
 * Registro centralizzato dei componenti per il caricamento dinamico
 * Mappa {prjId}/{path} ai componenti Angular
 *
 * Questo è il REGISTRY BASE: contiene solo i componenti del portale di
 * amministrazione (GTSW) e i progetti demo (HRDEMO, TPXDEMO) che sono
 * SEMPRE inclusi in ogni installazione.
 *
 * I progetti operativi (GTR, WFS, DCW) sono fuori da GTSW (cartella
 * ../projects/) e vengono mergiati al volo da scripts/build-registry.js
 * nel file component-registry.generated.ts in base al profilo richiesto.
 *
 * NOTA: l'app importa il registry generato, non questo file direttamente.
 */

export interface ComponentRegistryEntry {
  path: string;
  loadComponent: () => Promise<any>;
}

export const COMPONENT_REGISTRY: { [key: string]: () => Promise<any> } = {
  // GTSW Components
  'GTSW/users':            () => import('../../features/GTSW/users/users.page').then(m => m.GTSW_UsersComponent),
  'GTSW/authrules':        () => import('../../features/GTSW/authrules/authrules.page').then(m => m.GTSW_AuthrulesComponent),
  'GTSW/authmails':        () => import('../../features/GTSW/auth-mails/auth-mails.page').then(m => m.GTSW_AuthMailsComponent),
  'GTSW/grantedobjs':      () => import('../../features/GTSW/granted-objs/granted-objs.page').then(m => m.GTSW_GrantedObjsComponent),
  'GTSW/dbconn':           () => import('../../features/GTSW/db-conn/db-conn.page').then(m => m.GTSW_DbConnComponent),
  'GTSW/setup':            () => import('../../features/GTSW/setup/setup.page').then(m => m.GTSW_SetupComponent),
  'GTSW/logs':             () => import('../../features/GTSW/logs/logs.page').then(m => m.GTSW_LogsComponent),
  'GTSW/languages':        () => import('../../features/GTSW/languages/languages.page').then(m => m.GTSW_LanguagesComponent),
  'GTSW/scheduler':        () => import('../../features/GTSW/scheduler/scheduler.page').then(m => m.GTSW_SchedulerComponent),
  'GTSW/mailmerge':        () => import('../../features/GTSW/mailmerge/mailmerge.page').then(m => m.GTSW_MailMergeComponent),
  'GTSW/sequences':        () => import('../../features/GTSW/sequences/sequences.page').then(m => m.GTSW_SequencesComponent),
  'GTSW/aiInstr':          () => import('../../features/GTSW/ai-instr/ai-instr.page').then(m => m.GTSW_AiInstrComponent),
  'GTSW/templateBuilder':  () => import('../../features/ai-template-builder/ai-template-builder.component').then(m => m.AiTemplateBuilderComponent),
  'GTSW/dashboardBuilder': () => import('../../features/GTSW/dashboardBuilder/dashboardBuilder.page').then(m => m.GTSW_DashboardBuilderComponent),
  'GTSW/reporttemplates':  () => import('../../features/GTSW/report-templates/report-templates.page').then(m => m.GTSW_ReportTemplatesComponent),
  'GTSW/actionTypes':      () => import('../../features/GTSW/actionTypes/actionTypes.page').then(m => m.GTSW_ActionTypesComponent),
  'GTSW/aiAnalyzer':       () => import('../../features/GTSW/ai-analyzer/ai-analyzer.page').then(m => m.GTSW_AiAnalyzerComponent),

  // HRDEMO Components
  'HRDEMO/employees':      () => import('../../features/HRDEMO/employees/employees.page').then(m => m.HRDEMO_EmployeesComponent),
  'HRDEMO/stdTable':       () => import('../../features/HRDEMO/std-table/std-table.page').then(m => m.HRDEMO_StdTableComponent),
  'HRDEMO/openPositions':  () => import('../../features/HRDEMO/open-positions/open-positions.page').then(m => m.HRDEMO_OpenPositionsComponent),
  'HRDEMO/applications':   () => import('../../features/HRDEMO/applications/applications.page').then(m => m.HRDEMO_ApplicationsComponent),

  // TPXDEMO Components
  'TPXDEMO/stdTable':      () => import('../../features/TPXDEMO/std-table/std-table.page').then(m => m.TPXDEMO_StdTableComponent),
  'TPXDEMO/products':      () => import('../../features/TPXDEMO/products/products.page').then(m => m.TPXDEMO_ProductsComponent),
};

export function getComponentLoader(path: string): (() => Promise<any>) | undefined {
  return COMPONENT_REGISTRY[path];
}

export function isComponentRegistered(path: string): boolean {
  return path in COMPONENT_REGISTRY;
}
