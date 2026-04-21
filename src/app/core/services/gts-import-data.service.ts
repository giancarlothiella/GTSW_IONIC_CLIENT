import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ImportTarget {
  connCode: string;
  database: string;
  collection: string;
  dbMode?: string;
}

export interface ImportMeta {
  batchId?: string;
  importedBy?: string;
  fileName?: string;
}

export interface ImportResult {
  valid: boolean;
  insertedCount?: number;
  deletedCount?: number;
  batchId?: string | null;
  message?: string;
}

export interface ImportStats {
  valid: boolean;
  count: number;
  lastImport?: {
    batchId?: string;
    importedAt?: Date;
    importedBy?: string;
    fileName?: string | null;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class GtsImportDataService {

  private apiUrl = `${environment.apiUrl}/import-data`;

  constructor(private http: HttpClient) {}

  replace(target: ImportTarget, rows: any[], meta: ImportMeta = {}): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.apiUrl}/replace`, { ...target, rows, ...meta });
  }

  append(target: ImportTarget, rows: any[], meta: ImportMeta = {}): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.apiUrl}/append`, { ...target, rows, ...meta });
  }

  clear(target: ImportTarget, filter: any = {}): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.apiUrl}/clear`, { ...target, filter });
  }

  fromSqlId(
    prjId: string,
    sqlId: number,
    rows: any[],
    meta: ImportMeta & { mode?: 'replace' | 'append' } = {}
  ): Observable<ImportResult & { target?: any; deletedCount?: number; mode?: string }> {
    return this.http.post<any>(`${this.apiUrl}/fromSqlId`, {
      prjId, sqlId, rows, ...meta
    });
  }

  fromSqlIdFile(
    prjId: string,
    sqlId: number,
    file: File,
    meta: ImportMeta & { mode?: 'replace' | 'append'; sheet?: string } = {}
  ): Observable<ImportResult & { target?: any; deletedCount?: number; mode?: string; parsedCount?: number }> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('prjId', prjId);
    form.append('sqlId', String(sqlId));
    if (meta.mode) form.append('mode', meta.mode);
    if (meta.fileName) form.append('fileName', meta.fileName);
    if (meta.importedBy) form.append('importedBy', meta.importedBy);
    if (meta.batchId) form.append('batchId', meta.batchId);
    if (meta.sheet) form.append('sheet', meta.sheet);
    return this.http.post<any>(`${this.apiUrl}/fromSqlIdFile`, form);
  }

  stats(target: ImportTarget): Observable<ImportStats> {
    let params = new HttpParams()
      .set('connCode', target.connCode)
      .set('database', target.database)
      .set('collection', target.collection);
    if (target.dbMode) params = params.set('dbMode', target.dbMode);
    return this.http.get<ImportStats>(`${this.apiUrl}/stats`, { params });
  }
}
