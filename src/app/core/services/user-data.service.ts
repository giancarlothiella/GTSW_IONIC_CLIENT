/**
 * User Data Service
 *
 * Service per gestione dati utente generici (cache, preferenze, etc.)
 * Supporta compressione automatica lato server per dati grandi
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type UserDataType = 'excelCache' | 'userPrefs' | 'sessionData' | 'formState' | 'custom';

export interface UserDataMetadata {
  originalSize: number;
  compressedSize: number;
  recordCount: number;
  fileName?: string;
  contentType?: string;
  checksum?: string;
  uploadedBy?: string;
}

export interface SaveUserDataResponse {
  success: boolean;
  id: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: string;
  recordCount: number;
  expiresAt?: Date;
}

export interface LoadUserDataResponse<T = any> {
  success: boolean;
  data: T;
  metadata: UserDataMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDataExistsResponse {
  exists: boolean;
  id?: string;
  metadata?: UserDataMetadata;
  createdAt?: Date;
  updatedAt?: Date;
  expiresAt?: Date;
}

export interface UserDataListItem {
  id: string;
  dataType: UserDataType;
  connCode: string;
  metadata: UserDataMetadata;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class UserDataService {

  private apiUrl = `${environment.apiUrl}/user-data`;

  constructor(private http: HttpClient) {}

  // ============================================
  // SAVE DATA
  // ============================================

  /**
   * Salva dati utente con compressione automatica
   *
   * @param config Configurazione salvataggio
   * @returns Observable con info salvataggio
   */
  save<T = any>(config: {
    prjId: string;
    pageCode: string;
    dataType: UserDataType;
    userId: string;
    data: T;
    connCode?: string;
    metadata?: Partial<UserDataMetadata>;
    ttlDays?: number;
  }): Observable<SaveUserDataResponse> {
    return this.http.post<SaveUserDataResponse>(`${this.apiUrl}/save`, config);
  }

  /**
   * Salva cache Excel per una pagina
   * Shortcut per save con dataType='excelCache'
   */
  saveExcelCache(
    prjId: string,
    pageCode: string,
    userId: string,
    data: any[],
    fileName?: string,
    ttlDays: number = 30,
    uploadedBy?: string,
    connCode?: string
  ): Observable<SaveUserDataResponse> {
    return this.save({
      prjId,
      pageCode,
      dataType: 'excelCache',
      userId,
      data,
      connCode,
      metadata: { fileName, uploadedBy },
      ttlDays
    });
  }

  // ============================================
  // LOAD DATA
  // ============================================

  /**
   * Carica dati utente con decompressione automatica
   */
  load<T = any>(
    prjId: string,
    pageCode: string,
    dataType: UserDataType,
    userId: string,
    connCode?: string
  ): Observable<LoadUserDataResponse<T>> {
    let url = `${this.apiUrl}/load/${prjId}/${pageCode}/${dataType}/${userId}`;
    if (connCode) {
      url += `?connCode=${encodeURIComponent(connCode)}`;
    }
    return this.http.get<LoadUserDataResponse<T>>(url);
  }

  /**
   * Carica cache Excel per una pagina
   * Shortcut per load con dataType='excelCache'
   */
  loadExcelCache<T = any[]>(
    prjId: string,
    pageCode: string,
    userId: string,
    connCode?: string
  ): Observable<LoadUserDataResponse<T>> {
    return this.load<T>(prjId, pageCode, 'excelCache', userId, connCode);
  }

  // ============================================
  // CHECK EXISTS
  // ============================================

  /**
   * Verifica se esistono dati salvati (senza scaricarli)
   */
  exists(
    prjId: string,
    pageCode: string,
    dataType: UserDataType,
    userId: string,
    connCode?: string
  ): Observable<UserDataExistsResponse> {
    let url = `${this.apiUrl}/exists/${prjId}/${pageCode}/${dataType}/${userId}`;
    if (connCode) {
      url += `?connCode=${encodeURIComponent(connCode)}`;
    }
    return this.http.get<UserDataExistsResponse>(url);
  }

  /**
   * Verifica se esiste cache Excel per una pagina
   */
  excelCacheExists(
    prjId: string,
    pageCode: string,
    userId: string,
    connCode?: string
  ): Observable<UserDataExistsResponse> {
    return this.exists(prjId, pageCode, 'excelCache', userId, connCode);
  }

  // ============================================
  // DELETE DATA
  // ============================================

  /**
   * Elimina dati utente specifici
   */
  delete(
    prjId: string,
    pageCode: string,
    dataType: UserDataType,
    userId: string,
    connCode?: string
  ): Observable<{ success: boolean; deleted: boolean }> {
    let url = `${this.apiUrl}/${prjId}/${pageCode}/${dataType}/${userId}`;
    if (connCode) {
      url += `?connCode=${encodeURIComponent(connCode)}`;
    }
    return this.http.delete<{ success: boolean; deleted: boolean }>(url);
  }

  /**
   * Elimina cache Excel per una pagina
   */
  deleteExcelCache(
    prjId: string,
    pageCode: string,
    userId: string,
    connCode?: string
  ): Observable<{ success: boolean; deleted: boolean }> {
    return this.delete(prjId, pageCode, 'excelCache', userId, connCode);
  }

  // ============================================
  // LIST DATA
  // ============================================

  /**
   * Lista tutti i dati salvati per un utente su una pagina
   */
  list(
    prjId: string,
    pageCode: string,
    userId: string
  ): Observable<{ items: UserDataListItem[]; count: number }> {
    return this.http.get<{ items: UserDataListItem[]; count: number }>(
      `${this.apiUrl}/list/${prjId}/${pageCode}/${userId}`
    );
  }

  // ============================================
  // LIST EXCEL CACHES
  // ============================================

  /**
   * Lista tutte le cache Excel disponibili per un progetto
   */
  listExcelCaches(prjId: string): Observable<{
    success: boolean;
    caches: { pageCode: string; metadata?: UserDataMetadata; updatedAt?: Date }[];
  }> {
    return this.http.get<any>(`${this.apiUrl}/list-caches/${prjId}/excelCache/shared`);
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Statistiche cache per un utente
   */
  getStats(userId: string): Observable<{
    userId: string;
    totalSize: number;
    totalSizeMB: string;
    totalItems: number;
    byType: Record<string, { size: number; count: number }>;
  }> {
    return this.http.get<any>(`${this.apiUrl}/stats/${userId}`);
  }
}
