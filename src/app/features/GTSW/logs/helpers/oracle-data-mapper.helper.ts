/**
 * Oracle Data Mapper Helper
 *
 * Utility per mappare i dati Oracle nel formato richiesto dal Template Builder
 */

export interface OracleData {
  main: Record<string, unknown>[];
  subreports: Record<string, Record<string, unknown>[]>;
}

export interface FieldMetadata {
  name: string;
  dbType: {
    num: number;
    name: string;
    columnTypeName: string;
  };
  nullable: boolean;
  precision?: number;
  scale?: number;
  dbTypeName: string;
}

export interface OracleMetadata {
  main: FieldMetadata[];
  subreports: Record<string, FieldMetadata[]>;
}

/**
 * Pattern per identificare il dataset principale
 * Riconosce: main, MAIN, P_MAIN_SESS, MAIN_DATA, etc.
 */
function isMainDataset(name: string): boolean {
  const upperName = name.toUpperCase();
  return upperName === 'MAIN' ||
         upperName === '' ||
         upperName.includes('MAIN') ||
         upperName.startsWith('P_MAIN');
}

/**
 * Mappa i dati del report Oracle nel formato per il Template Builder
 * @param reportData - Risposta da getReportData()
 * @returns OracleData formattato
 */
export function mapOracleDataForTemplateBuilder(reportData: any): OracleData {
  console.log('[OracleDataMapper] mapOracleDataForTemplateBuilder - INPUT reportData:', reportData);
  console.log('[OracleDataMapper] reportData keys:', reportData ? Object.keys(reportData) : 'null');

  const oracleData: OracleData = {
    main: [],
    subreports: {}
  };

  if (!reportData) {
    console.log('[OracleDataMapper] reportData is null/undefined, returning empty');
    return oracleData;
  }

  // Funzione helper per processare le rows
  const processRows = (source: any, prefix: string = '') => {
    Object.keys(source).forEach((key: string) => {
      if (key.startsWith('rows_')) {
        const datasetName = key.replace('rows_', '');
        const rows = source[key] || [];
        console.log(`[OracleDataMapper] ${prefix}Processing rows key:`, key, '-> datasetName:', datasetName, '-> rowCount:', rows.length);

        if (isMainDataset(datasetName)) {
          // Se main è già popolato, non sovrascriverlo (priorità al primo match)
          if (oracleData.main.length === 0) {
            oracleData.main = rows;
            console.log('[OracleDataMapper] Assigned to MAIN (matched pattern), count:', oracleData.main.length);
          } else {
            console.log('[OracleDataMapper] MAIN already populated, skipping:', datasetName);
          }
        } else {
          oracleData.subreports[datasetName] = rows;
          console.log('[OracleDataMapper] Assigned to subreport:', datasetName, 'count:', rows.length);
        }
      }
    });
  };

  // 1. Prima cerca nel livello principale (nuovo formato)
  const rowsKeys = Object.keys(reportData).filter(k => k.startsWith('rows_'));
  console.log('[OracleDataMapper] Found rows_* keys at root level:', rowsKeys);

  if (rowsKeys.length > 0) {
    processRows(reportData, '[ROOT] ');
  }

  // 2. Fallback: cerca in procResult (vecchio formato)
  if (reportData.procResult) {
    const procRowsKeys = Object.keys(reportData.procResult).filter(k => k.startsWith('rows_'));
    console.log('[OracleDataMapper] Found rows_* keys in procResult:', procRowsKeys);

    if (procRowsKeys.length > 0) {
      processRows(reportData.procResult, '[procResult] ');
    }
  }

  console.log('[OracleDataMapper] mapOracleDataForTemplateBuilder - OUTPUT:', oracleData);
  console.log('[OracleDataMapper] FINAL: main rows:', oracleData.main.length, '| subreports:', Object.keys(oracleData.subreports));
  return oracleData;
}

/**
 * Mappa i metadati dei campi nel formato per il Template Builder
 * @param reportData - Risposta da getReportData()
 * @returns OracleMetadata formattato
 */
export function mapOracleMetadataForTemplateBuilder(reportData: any): OracleMetadata {
  console.log('[OracleDataMapper] mapOracleMetadataForTemplateBuilder - INPUT reportData keys:', reportData ? Object.keys(reportData) : 'null');

  const oracleMetadata: OracleMetadata = {
    main: [],
    subreports: {}
  };

  if (!reportData) {
    console.log('[OracleDataMapper] reportData is null/undefined for metadata, returning empty');
    return oracleMetadata;
  }

  // Funzione helper per mappare i campi
  const mapFields = (fields: any[]): FieldMetadata[] => {
    return fields.map((field: any) => ({
      name: field.name,
      dbType: field.dbType || {
        num: 0,
        name: field.dbTypeName || 'VARCHAR2',
        columnTypeName: field.dbTypeName || 'VARCHAR2'
      },
      nullable: field.nullable !== false,
      precision: field.precision,
      scale: field.scale,
      dbTypeName: field.dbTypeName || 'VARCHAR2'
    }));
  };

  // Funzione helper per processare i fields
  const processFields = (source: any, prefix: string = '') => {
    Object.keys(source).forEach((key: string) => {
      if (key.startsWith('fields_')) {
        const datasetName = key.replace('fields_', '');
        const fields = source[key] || [];
        const mappedFields = mapFields(fields);
        console.log(`[OracleDataMapper] ${prefix}Processing fields key:`, key, '-> datasetName:', datasetName, '-> fieldCount:', fields.length);

        if (isMainDataset(datasetName)) {
          // Se main metadata è già popolato, non sovrascriverlo
          if (oracleMetadata.main.length === 0) {
            oracleMetadata.main = mappedFields;
            console.log('[OracleDataMapper] Assigned metadata to MAIN (matched pattern), fieldCount:', mappedFields.length);
          } else {
            console.log('[OracleDataMapper] MAIN metadata already populated, skipping:', datasetName);
          }
        } else {
          oracleMetadata.subreports[datasetName] = mappedFields;
          console.log('[OracleDataMapper] Assigned metadata to subreport:', datasetName, 'fieldCount:', mappedFields.length);
        }
      }
    });
  };

  // 1. Prima cerca nel livello principale (nuovo formato)
  const fieldsKeys = Object.keys(reportData).filter(k => k.startsWith('fields_'));
  console.log('[OracleDataMapper] Found fields_* keys at root level:', fieldsKeys);

  if (fieldsKeys.length > 0) {
    processFields(reportData, '[ROOT] ');
  }

  // 2. Fallback: cerca in procResult (vecchio formato)
  if (reportData.procResult) {
    const procFieldsKeys = Object.keys(reportData.procResult).filter(k => k.startsWith('fields_'));
    console.log('[OracleDataMapper] Found fields_* keys in procResult:', procFieldsKeys);

    if (procFieldsKeys.length > 0) {
      processFields(reportData.procResult, '[procResult] ');
    }
  }

  console.log('[OracleDataMapper] mapOracleMetadataForTemplateBuilder - OUTPUT:', oracleMetadata);
  console.log('[OracleDataMapper] FINAL: main fields:', oracleMetadata.main.length, '| subreports:', Object.keys(oracleMetadata.subreports));
  return oracleMetadata;
}

/**
 * Estrae le informazioni della sessione dal row selezionato
 * @param row - Riga selezionata dalla grid
 * @returns SessionData formattato
 */
export function extractSessionData(row: any): {
  sessionId: number;
  prjId: string;
  reportCode: string;
  reportName: string;
  sqlId: number;
  connCode: string;
  dbMode: string;
  sessionUserMail: string;
  params: Record<string, unknown>;
} {
  console.log('[OracleDataMapper] extractSessionData - INPUT row:', row);

  const sessionData = {
    sessionId: row.sessionId,
    prjId: row.prjId,
    reportCode: row.reportCode,
    reportName: row.reportName || row.reportCode,
    sqlId: row.sqlId,
    connCode: row.connCode,
    dbMode: row.dbMode || 'oracle',
    sessionUserMail: row.sessionUserMail || '',
    params: row.params || {}
  };

  console.log('[OracleDataMapper] extractSessionData - OUTPUT:', sessionData);
  return sessionData;
}
