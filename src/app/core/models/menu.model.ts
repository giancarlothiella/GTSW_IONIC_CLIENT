export interface MenuItem {
  prjId: string;
  treeId: number;
  leafId: number;
  parentId: number;
  formId: number | null;
  caption: string;
  menuParam: string | null;
  iconId: number;
  url?: string;
  children?: MenuItem[];
}

export interface ProjectInfo {
  prjId: string;
  description: string;
  iconImage: string;
  homeImage: string;
  dbConnections?: DbConnection[];
  customServerUrl?: string;
}

export interface DbConnection {
  connCode: string;
  connDefault: boolean;
  dataKey: string;
}

export interface MenuResponse {
  valid: boolean;
  message: string;
  menu: MenuItem[];
  projects: ProjectInfo[];
  customServerUrl?: string;
}

export interface MenuRequest {
  prjId: string;
  languageId: string;
  connCode?: string;
}
