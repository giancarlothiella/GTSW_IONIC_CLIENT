import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type AnalyzerFieldType = 'string' | 'integer' | 'number' | 'date' | 'datetime' | 'boolean';

export interface AnalyzerField {
  name: string;
  type: AnalyzerFieldType;
  description?: string;
}

export interface AnalyzerAnalysis {
  _id?: string;
  analysisName: string;
  description?: string;
  userRequest: string;
  aggregationRule?: any;
  chartConfig?: any;
  gridConfig?: any;
  author?: string;
  usageCount?: number;
  lastUsed?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AnalyzerDialogConfig {
  title?: string;
  width?: string;
  height?: string;
}

export interface Analyzer {
  _id?: string;
  prjId: string;
  code: string;
  description?: string;
  sqlId: number;
  dataStructure?: {
    availableFields: AnalyzerField[];
    analyzedAt?: Date;
    sampleSize?: number;
  };
  dialogConfig?: AnalyzerDialogConfig;
  analyses?: AnalyzerAnalysis[];
  status?: 'draft' | 'active' | 'archived';
  author?: string;
  version?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({ providedIn: 'root' })
export class GtsAiAnalyzerApiService {

  private apiUrl = `${environment.apiUrl}/ai-analyzer`;

  constructor(private http: HttpClient) {}

  list(prjId?: string, status?: string): Observable<{ valid: boolean; items: Analyzer[] }> {
    let params = new HttpParams();
    if (prjId) params = params.set('prjId', prjId);
    if (status) params = params.set('status', status);
    return this.http.get<any>(this.apiUrl, { params });
  }

  get(prjId: string, code: string): Observable<{ valid: boolean; analyzer: Analyzer }> {
    return this.http.get<any>(`${this.apiUrl}/${prjId}/${code}`);
  }

  create(payload: Partial<Analyzer>): Observable<{ valid: boolean; analyzer: Analyzer; message?: string }> {
    return this.http.post<any>(this.apiUrl, payload);
  }

  update(prjId: string, code: string, payload: Partial<Analyzer>): Observable<{ valid: boolean; analyzer: Analyzer }> {
    return this.http.put<any>(`${this.apiUrl}/${prjId}/${code}`, payload);
  }

  remove(prjId: string, code: string): Observable<{ valid: boolean; message?: string }> {
    return this.http.delete<any>(`${this.apiUrl}/${prjId}/${code}`);
  }

  analyzeSchema(prjId: string, code: string): Observable<{ valid: boolean; availableFields: AnalyzerField[] }> {
    return this.http.post<any>(`${this.apiUrl}/${prjId}/${code}/analyzeSchema`, {});
  }

  updateFields(prjId: string, code: string, availableFields: AnalyzerField[]): Observable<{ valid: boolean; analyzer: Analyzer }> {
    return this.http.put<any>(`${this.apiUrl}/${prjId}/${code}/fields`, { availableFields });
  }

  addAnalysis(prjId: string, code: string, analysis: Partial<AnalyzerAnalysis>): Observable<{ valid: boolean; analysis: AnalyzerAnalysis; updated: boolean }> {
    return this.http.post<any>(`${this.apiUrl}/${prjId}/${code}/analyses`, analysis);
  }

  updateAnalysis(prjId: string, code: string, analysisId: string, update: Partial<AnalyzerAnalysis>): Observable<{ valid: boolean; analysis: AnalyzerAnalysis }> {
    return this.http.put<any>(`${this.apiUrl}/${prjId}/${code}/analyses/${analysisId}`, update);
  }

  deleteAnalysis(prjId: string, code: string, analysisId: string): Observable<{ valid: boolean }> {
    return this.http.delete<any>(`${this.apiUrl}/${prjId}/${code}/analyses/${analysisId}`);
  }

  trackUsage(prjId: string, code: string, analysisId: string): Observable<{ valid: boolean; usageCount: number; lastUsed: Date }> {
    return this.http.post<any>(`${this.apiUrl}/${prjId}/${code}/analyses/${analysisId}/use`, {});
  }

  runtime(prjId: string, code: string): Observable<{ valid: boolean; analyzer: Analyzer }> {
    return this.http.get<any>(`${this.apiUrl}/runtime/${prjId}/${code}`);
  }
}
