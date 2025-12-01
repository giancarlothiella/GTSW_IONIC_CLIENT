export interface GetFileData {
    directoryBase: string;
    directoryScan: string;
  }
  
  export interface GetDBData {
    dataAdapterName: string;
    prjId: string;
    formId: number;
    params: any;
    connCode: string;
  }
  export interface ExecProcData {
    prjId: string;
    sqlId: number;
    params: any;
    connCode: string;
  }
  
  export interface ExecReportData {
    prjId: string;
    formId: number;
    fieldGrpId : number;
    reportCode: string;
    reportName: string;
    sqlId: number;
    params: any;
    connCode: string;
    goToNextStep: boolean;
    sessionId: number;
  }

  export interface GetOraDataProc {
    procSQLId: number;
    execProc: boolean;
    dataAdapter: string;
    prjId: string;
    formId: number;
    params: any;
    connCode: string;
  }
  
  export interface ExecProcDataNA {
    prjId: string;
    sqlId: number;
    flagNA: boolean;
    runListId: number;
    params: any;
  }
  
  export interface GetFormData {
    prjId: string;
    dataAdapter: string;
    formId: number;
  }
  
  export interface GetFieldsData {
    prjId: string;
    formId: number;
    fieldGroupId: number;
  }
  
  export interface GetRptGroup {
    prjId: string;
    formId: number;
    rptGroup: number;
  }
  
  export interface Report {
    RPTHDR_CODE: string;
    RPTHDR_DESCR: string;
  }
  
  export interface PDF {
    text: string;
    file: string;
  }
  
  export interface SavePDF {
    fileName: string;
    fileData: string;
  }
  
  export interface List {
    id: number;
    text: string;
    icon: string;
  }
  