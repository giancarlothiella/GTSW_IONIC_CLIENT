/**
 * GTS Dashboard Card Component
 *
 * Visualizza una card KPI con valore principale, icona e trend opzionale.
 */

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardItem } from '../../services/dashboard.service';

@Component({
  selector: 'app-gts-dash-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dash-card" [style.border-left-color]="accentColor" (click)="handleClick()">
      <!-- Icon -->
      @if (item.cardConfig?.icon) {
        <div class="card-icon">
          @if (isImageIcon()) {
            <img
              [src]="item.cardConfig?.icon"
              [alt]="item.title || 'icon'"
              class="icon-image"
              [style.background-color]="item.cardConfig?.iconColor || 'transparent'">
          } @else if (isPrimeIcon()) {
            <i [class]="item.cardConfig?.icon" [style.color]="item.cardConfig?.accentColor || item.cardConfig?.iconColor"></i>
          } @else {
            <span class="icon-emoji">{{ item.cardConfig?.icon }}</span>
          }
        </div>
      }

      <!-- Content -->
      <div class="card-content">
        <span class="card-label">{{ item.cardConfig?.label || item.title }}</span>
        <span class="card-value">{{ formattedValue }}</span>

        <!-- Subtitle/Trend -->
        @if (subtitleValue !== null) {
          <span
            class="card-subtitle"
            [class.positive]="isPositiveTrend"
            [class.negative]="isNegativeTrend">
            @if (item.cardConfig?.showTrend) {
              <i [class]="trendIcon"></i>
            }
            {{ formattedSubtitle }}
          </span>
        }
      </div>
    </div>
  `,
  styles: [`
    .dash-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      height: 100%;
      min-height: 100px;
      border-left: 4px solid var(--primary-500, #2196F3);
      cursor: pointer;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: var(--surface-hover, #f8f9fa);
      }
    }

    .card-icon {
      flex-shrink: 0;

      .icon-image {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        object-fit: contain;
        padding: 4px;
      }

      i {
        font-size: 2rem;
      }

      .icon-emoji {
        font-size: 2.5rem;
      }
    }

    .card-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .card-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-color-secondary, #6c757d);
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-color, #212529);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-subtitle {
      font-size: 0.85rem;
      color: var(--text-color-secondary, #6c757d);
      display: flex;
      align-items: center;
      gap: 0.25rem;

      &.positive {
        color: var(--green-600, #43a047);
      }

      &.negative {
        color: var(--red-600, #e53935);
      }

      i {
        font-size: 0.75rem;
      }
    }

    @media screen and (max-width: 768px) {
      .dash-card {
        padding: 1rem;
      }

      .card-icon .icon-image {
        width: 40px;
        height: 40px;
      }

      .card-value {
        font-size: 1.25rem;
      }
    }
  `]
})
export class GtsDashCardComponent implements OnChanges {

  @Input() item!: DashboardItem;
  @Input() data: any[] = [];
  @Output() onClick = new EventEmitter<any>();

  formattedValue: string = '-';
  formattedSubtitle: string = '';
  subtitleValue: number | null = null;
  isPositiveTrend: boolean = false;
  isNegativeTrend: boolean = false;
  trendIcon: string = '';
  accentColor: string = '#2196F3';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['item']) {
      this.processData();
    }
  }

  private processData(): void {
    if (!this.item?.cardConfig || !this.data || this.data.length === 0) {
      this.formattedValue = '-';
      this.subtitleValue = null;
      return;
    }

    const config = this.item.cardConfig;
    this.accentColor = config.accentColor || '#2196F3';

    // Prendi il primo record (card di solito mostra un aggregato)
    const record = this.data[0];
    if (!record) return;

    // Valore principale
    const rawValue = record[config.valueField];
    this.formattedValue = this.formatValue(rawValue, config.format, config.decimals);

    // Sottotitolo/trend
    if (config.subtitleField && record[config.subtitleField] !== undefined) {
      this.subtitleValue = parseFloat(record[config.subtitleField]) || 0;
      this.formattedSubtitle = this.formatValue(
        this.subtitleValue,
        config.subtitleFormat || 'percent',
        1
      );

      // Trend
      if (config.showTrend) {
        const trendValue = config.trendField ? record[config.trendField] : this.subtitleValue;
        this.isPositiveTrend = trendValue > 0;
        this.isNegativeTrend = trendValue < 0;
        this.trendIcon = this.isPositiveTrend ? 'pi pi-arrow-up' : (this.isNegativeTrend ? 'pi pi-arrow-down' : 'pi pi-minus');
      }
    }
  }

  private formatValue(value: any, format?: string, decimals?: number): string {
    if (value === null || value === undefined) return '-';

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return String(value);

    const dec = decimals ?? 0;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('it-IT', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: dec,
          maximumFractionDigits: dec
        }).format(numValue);

      case 'percent':
        const sign = numValue > 0 ? '+' : '';
        return `${sign}${numValue.toFixed(dec)}%`;

      case 'integer':
        return new Intl.NumberFormat('it-IT', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(Math.round(numValue));

      case 'number':
      default:
        return new Intl.NumberFormat('it-IT', {
          minimumFractionDigits: dec,
          maximumFractionDigits: dec
        }).format(numValue);
    }
  }

  isImageIcon(): boolean {
    const icon = this.item.cardConfig?.icon || '';
    return icon.startsWith('assets/') || icon.startsWith('http') || icon.includes('.');
  }

  isPrimeIcon(): boolean {
    const icon = this.item.cardConfig?.icon || '';
    return icon.startsWith('pi ');
  }

  handleClick(): void {
    if (this.data.length > 0) {
      this.onClick.emit(this.data[0]);
    }
  }
}
