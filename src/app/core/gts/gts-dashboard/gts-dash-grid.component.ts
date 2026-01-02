/**
 * GTS Dashboard Grid Component
 *
 * Visualizza una tabella dati con formattazione, paginazione e click su riga.
 */

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DashboardItem, DashboardGridColumn } from '../../services/dashboard.service';

@Component({
  selector: 'app-gts-dash-grid',
  standalone: true,
  imports: [CommonModule, TableModule],
  template: `
    <div class="dash-grid">
      <!-- Title -->
      <div class="grid-header" *ngIf="item.title">
        <h3 class="grid-title">{{ item.title }}</h3>
        <span class="grid-subtitle" *ngIf="item.subtitle">{{ item.subtitle }}</span>
        <span class="grid-count" *ngIf="data.length > 0">({{ data.length }} righe)</span>
      </div>

      <!-- Table -->
      <p-table
        [value]="data"
        [columns]="columns"
        [paginator]="showPagination"
        [rows]="pageSize"
        [rowsPerPageOptions]="[10, 25, 50]"
        [showCurrentPageReport]="showPagination"
        currentPageReportTemplate="{first} - {last} di {totalRecords}"
        [scrollable]="true"
        [scrollHeight]="scrollHeight"
        [rowHover]="isClickable"
        [selectionMode]="isClickable ? 'single' : undefined"
        (onRowSelect)="onRowSelect($event)"
        styleClass="p-datatable-sm p-datatable-striped">

        <!-- Header -->
        <ng-template pTemplate="header">
          <tr>
            <th *ngFor="let col of columns"
                [style.width]="col.width || 'auto'"
                [style.text-align]="col.align || 'left'"
                [pSortableColumn]="col.sortable !== false ? col.field : undefined">
              {{ col.header }}
              <p-sortIcon *ngIf="col.sortable !== false" [field]="col.field"></p-sortIcon>
            </th>
          </tr>
        </ng-template>

        <!-- Body -->
        <ng-template pTemplate="body" let-row>
          <tr [class.clickable-row]="isClickable">
            <td *ngFor="let col of columns"
                [style.text-align]="col.align || 'left'"
                (click)="handleRowClick(row)">
              <span [innerHTML]="formatCell(row[col.field], col)"></span>
            </td>
          </tr>
        </ng-template>

        <!-- Footer con totali -->
        <ng-template pTemplate="footer" *ngIf="showTotals && totals">
          <tr class="totals-row">
            <td *ngFor="let col of columns; let i = index"
                [style.text-align]="col.align || 'left'">
              <strong *ngIf="i === 0">Totale</strong>
              <strong *ngIf="i > 0 && totals[col.field] !== undefined">
                {{ formatCell(totals[col.field], col) }}
              </strong>
            </td>
          </tr>
        </ng-template>

        <!-- Empty -->
        <ng-template pTemplate="emptymessage">
          <tr>
            <td [attr.colspan]="columns.length" class="empty-message">
              <i class="pi pi-inbox"></i>
              <span>Nessun dato disponibile</span>
            </td>
          </tr>
        </ng-template>

      </p-table>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      max-height: 100%;
      overflow: hidden;
    }

    .dash-grid {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 100%;
      padding: 1rem;
      padding-top: 0.5rem;
      overflow: hidden;
    }

    .grid-header {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      flex-wrap: wrap;
      padding-left: 2.5rem; /* Spazio per il back button */
      min-height: 1.5rem;
    }

    .grid-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-color, #212529);
    }

    .grid-subtitle {
      font-size: 0.8rem;
      color: var(--text-color-secondary, #6c757d);
    }

    .grid-count {
      font-size: 0.75rem;
      color: var(--text-color-secondary, #6c757d);
      margin-left: auto;
    }

    :host ::ng-deep {
      p-table {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      .p-datatable {
        font-size: 0.85rem;
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      .p-datatable-wrapper {
        flex: 1;
        min-height: 0;
        overflow: auto !important;
      }

      .p-datatable .p-datatable-thead > tr > th {
        background: var(--surface-100, #f8f9fa);
        font-weight: 600;
        padding: 0.5rem 0.75rem;
        position: sticky;
        top: 0;
        z-index: 1;
      }

      .p-datatable .p-datatable-tbody > tr > td {
        padding: 0.5rem 0.75rem;
      }

      .p-datatable .p-datatable-tbody > tr.clickable-row {
        cursor: pointer;

        &:hover {
          background: var(--primary-50, #e3f2fd) !important;
        }
      }

      .p-paginator {
        padding: 0.5rem;
        font-size: 0.8rem;
        flex-shrink: 0;
      }
    }

    .totals-row {
      background: var(--surface-100, #f8f9fa);
      font-weight: 600;
    }

    .empty-message {
      text-align: center;
      padding: 2rem !important;
      color: var(--text-color-secondary, #6c757d);

      i {
        display: block;
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.5;
      }
    }

    .positive-value {
      color: var(--green-600, #43a047);
    }

    .negative-value {
      color: var(--red-600, #e53935);
    }
  `]
})
export class GtsDashGridComponent implements OnChanges {

  @Input() item!: DashboardItem;
  @Input() data: any[] = [];
  @Output() onRowClick = new EventEmitter<any>();

  columns: DashboardGridColumn[] = [];
  pageSize: number = 10;
  showPagination: boolean = true;
  showTotals: boolean = false;
  isClickable: boolean = false;
  scrollHeight: string = 'auto';
  totals: { [key: string]: number } = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item'] || changes['data']) {
      this.processConfig();
      if (this.showTotals) {
        this.calculateTotals();
      }
    }
  }

  private processConfig(): void {
    if (!this.item?.gridConfig) {
      this.columns = [];
      return;
    }

    const config = this.item.gridConfig;
    this.columns = config.columns || [];
    this.pageSize = config.pageSize || 10;
    this.showPagination = config.showPagination !== false;
    this.showTotals = config.showTotals || false;
    this.isClickable = config.rowClickable || !!this.item.drillDownFilter;
    this.scrollHeight = config.height || 'auto';
  }

  private calculateTotals(): void {
    this.totals = {};

    if (!this.item.gridConfig?.totalsFields || this.data.length === 0) return;

    const totalsFields = this.item.gridConfig.totalsFields;

    totalsFields.forEach(field => {
      this.totals[field] = this.data.reduce((sum, row) => {
        const value = parseFloat(row[field]);
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
    });
  }

  formatCell(value: any, col: DashboardGridColumn): string {
    if (value === null || value === undefined) return '';

    const format = col.format || 'text';
    const decimals = col.decimals ?? 2;

    switch (format) {
      case 'currency':
        const currencyValue = parseFloat(value);
        if (isNaN(currencyValue)) return value;
        return new Intl.NumberFormat('it-IT', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(currencyValue);

      case 'number':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return value;
        return new Intl.NumberFormat('it-IT', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(numValue);

      case 'integer':
        const intValue = parseInt(value);
        if (isNaN(intValue)) return value;
        return new Intl.NumberFormat('it-IT').format(intValue);

      case 'percent':
        const pctValue = parseFloat(value);
        if (isNaN(pctValue)) return value;
        const sign = pctValue > 0 ? '+' : '';
        const cssClass = pctValue > 0 ? 'positive-value' : (pctValue < 0 ? 'negative-value' : '');
        return `<span class="${cssClass}">${sign}${pctValue.toFixed(decimals)}%</span>`;

      case 'date':
        if (!value) return '';
        try {
          const date = new Date(value);
          return new Intl.DateTimeFormat('it-IT').format(date);
        } catch {
          return value;
        }

      case 'text':
      default:
        return String(value);
    }
  }

  handleRowClick(row: any): void {
    if (this.isClickable) {
      this.onRowClick.emit(row);
    }
  }

  onRowSelect(event: any): void {
    if (event.data) {
      this.onRowClick.emit(event.data);
    }
  }
}
