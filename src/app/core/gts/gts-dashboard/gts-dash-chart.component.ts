/**
 * GTS Dashboard Chart Component
 *
 * Visualizza grafici (line, bar, pie, etc.) usando Chart.js via PrimeNG.
 */

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { DashboardItem } from '../../services/dashboard.service';

@Component({
  selector: 'app-gts-dash-chart',
  standalone: true,
  imports: [CommonModule, ChartModule],
  template: `
    <div class="dash-chart">
      <!-- Title -->
      @if (item.title) {
        <div class="chart-header">
          <h3 class="chart-title">{{ item.title }}{{ drillDownLabel ? ': ' + drillDownLabel : '' }}</h3>
          @if (hasChildren) {
            <span class="chart-subtitle clickable-hint">Click for details</span>
          } @else if (item.subtitle) {
            <span class="chart-subtitle">{{ item.subtitle }}</span>
          }
        </div>
      }

      <!-- Chart -->
      <div class="chart-container" [style.min-height.px]="chartHeight">
        @if (chartData && chartOptions) {
          <p-chart
            [type]="chartType"
            [data]="chartData"
            [options]="chartOptions"
            (onDataSelect)="onChartClick($event)">
          </p-chart>
        } @else {
          <!-- Empty state -->
          <div class="chart-empty">
            <i class="pi pi-chart-bar"></i>
            <span>Nessun dato disponibile</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .dash-chart {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 100%;
      padding: 1rem;
      overflow: hidden;
    }

    .chart-header {
      margin-bottom: 0.75rem;
      flex-shrink: 0;
      padding-left: 2.5rem; /* Spazio per il back button */
    }

    .chart-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-color, #212529);
    }

    .chart-subtitle {
      font-size: 0.8rem;
      color: var(--text-color-secondary, #6c757d);
    }

    .chart-subtitle.clickable-hint {
      color: var(--primary-color, #2196F3);
      font-style: italic;
    }

    .chart-container {
      flex: 1;
      position: relative;
      min-height: 0;  /* Important: allows flex child to shrink */
      overflow: hidden;
    }

    :host ::ng-deep p-chart {
      display: block;
      height: 100%;
      width: 100%;
    }

    :host ::ng-deep p-chart > div {
      height: 100% !important;
      width: 100% !important;
    }

    :host ::ng-deep canvas {
      width: 100% !important;
      height: 100% !important;
    }

    .chart-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 0.5rem;
      color: var(--text-color-secondary, #6c757d);
      opacity: 0.5;

      i {
        font-size: 3rem;
      }
    }
  `]
})
export class GtsDashChartComponent implements OnChanges {

  @Input() item!: DashboardItem;
  @Input() data: any[] = [];
  @Input() drillDownLabel: string = '';  // Label del dato selezionato nel drill-down
  @Input() hasChildren: boolean = false;  // True se esistono items figli per drill-down
  @Output() onElementClick = new EventEmitter<any>();

  chartType: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'bubble' | 'polarArea' | 'radar' = 'bar';
  chartData: any = null;
  chartOptions: any = null;
  chartHeight: number = 300;

  // Default colors
  private defaultColors = [
    '#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0',
    '#00BCD4', '#795548', '#607D8B', '#3F51B5', '#009688'
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['item']) {
      this.buildChart();
    }
  }

  private buildChart(): void {
    if (!this.item?.chartConfig || !this.data || this.data.length === 0) {
      this.chartData = null;
      return;
    }

    const config = this.item.chartConfig;
    this.chartHeight = config.height || 300;

    // Map chart type
    this.chartType = this.mapChartType(config.chartType);

    // Build chart based on type
    if (config.chartType === 'pie' || config.chartType === 'doughnut') {
      this.buildPieChart(config);
    } else {
      this.buildAxisChart(config);
    }

    // Build options
    this.buildChartOptions(config);
  }

  private mapChartType(type: string): 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'bubble' | 'polarArea' | 'radar' {
    switch (type) {
      case 'horizontalBar': return 'bar';
      case 'area': return 'line';
      case 'combo': return 'bar';
      case 'pie': return 'pie';
      case 'doughnut': return 'doughnut';
      case 'line': return 'line';
      case 'bar': return 'bar';
      default: return 'bar';
    }
  }

  private buildAxisChart(config: any): void {
    const colors = config.colors || this.defaultColors;
    const xField = config.xAxis?.field;

    if (!xField) {
      this.chartData = null;
      return;
    }

    // Labels dall'asse X
    const labels = this.data.map(row => row[xField]);

    // Dataset per ogni serie
    const datasets: any[] = [];

    if (config.series && config.series.length > 0) {
      config.series.forEach((serie: any, index: number) => {
        const serieData = this.data.map(row => row[serie.field] ?? 0);
        const color = serie.color || colors[index % colors.length];

        const dataset: any = {
          label: serie.label || serie.field,
          data: serieData,
          borderColor: color,
          backgroundColor: config.chartType === 'line' || config.chartType === 'area'
            ? this.hexToRgba(color, 0.2)
            : color
        };

        // Per area chart
        if (config.chartType === 'area' || (config.chartType === 'combo' && serie.type === 'area')) {
          dataset.fill = true;
        }

        // Per combo chart
        if (config.chartType === 'combo' && serie.type === 'line') {
          dataset.type = 'line';
        }

        datasets.push(dataset);
      });
    } else if (config.yAxis?.field) {
      // Singola serie
      const serieData = this.data.map(row => row[config.yAxis.field] ?? 0);
      datasets.push({
        label: config.yAxis.label || config.yAxis.field,
        data: serieData,
        borderColor: colors[0],
        backgroundColor: config.chartType === 'line' ? this.hexToRgba(colors[0], 0.2) : colors[0]
      });
    }

    this.chartData = { labels, datasets };
  }

  private buildPieChart(config: any): void {
    const baseColors = config.colors || this.defaultColors;
    const labelField = config.labelField;
    const valueField = config.valueField;

    if (!labelField || !valueField) {
      console.warn('Pie chart missing labelField or valueField', { labelField, valueField });
      this.chartData = null;
      return;
    }

    // DEBUG: log first row to see available fields
    if (this.data.length > 0) {
      console.log('Pie chart data sample:', this.data[0]);
      console.log('Looking for labelField:', labelField, 'valueField:', valueField);
    }

    const labels = this.data.map(row => row[labelField] || 'N/A');
    const values = this.data.map(row => row[valueField] ?? 0);

    // DEBUG: check if labels are valid
    console.log('Pie labels:', labels);
    console.log('Pie values:', values);

    // Genera abbastanza colori per tutte le labels (cicla se necessario)
    const colors: string[] = [];
    for (let i = 0; i < labels.length; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }

    this.chartData = {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        hoverBackgroundColor: colors.map((c: string) => this.lightenColor(c, 20))
      }]
    };

    console.log('Pie chartData:', this.chartData);
  }

  private buildChartOptions(config: any): void {
    const isHorizontal = config.chartType === 'horizontalBar';
    const isPie = config.chartType === 'pie' || config.chartType === 'doughnut';

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: config.showLegend !== false,
          position: config.legendPosition || 'top'
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              let label = context.dataset?.label || context.label || '';
              if (label) label += ': ';
              // Per bar orizzontali il valore è in parsed.x, per verticali in parsed.y
              // Per pie/doughnut è in parsed o raw
              let value: number | string;
              if (context.parsed !== null && typeof context.parsed === 'object') {
                // Bar chart: usa x per orizzontale, y per verticale
                value = isHorizontal ? context.parsed.x : context.parsed.y;
              } else {
                // Pie/doughnut: usa parsed direttamente o raw
                value = context.parsed ?? context.raw;
              }
              if (typeof value === 'number') {
                label += new Intl.NumberFormat('it-IT').format(value);
              } else {
                label += value;
              }
              return label;
            }
          }
        }
      }
    };

    // Axis options for non-pie charts
    if (!isPie) {
      this.chartOptions.indexAxis = isHorizontal ? 'y' : 'x';

      this.chartOptions.scales = {
        x: {
          display: config.showGrid !== false,
          stacked: config.stacked || false,
          grid: {
            display: config.showGrid !== false
          },
          title: {
            display: !!config.xAxis?.label,
            text: config.xAxis?.label || ''
          },
          ticks: isHorizontal ? {
            callback: (value: any) => {
              if (typeof value === 'number') {
                return new Intl.NumberFormat('it-IT', { notation: 'compact' }).format(value);
              }
              return value;
            }
          } : {}
        },
        y: {
          display: true,
          stacked: config.stacked || false,
          grid: {
            display: isHorizontal ? false : (config.showGrid !== false)
          },
          title: {
            display: !!config.yAxis?.label,
            text: config.yAxis?.label || ''
          },
          ticks: isHorizontal ? {
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0
          } : {
            callback: (value: any) => {
              if (typeof value === 'number') {
                return new Intl.NumberFormat('it-IT', { notation: 'compact' }).format(value);
              }
              return value;
            }
          }
        }
      };
    }
  }

  onChartClick(event: any): void {
    if (!event || event.element === undefined) return;

    const dataIndex = event.element.index;
    if (dataIndex !== undefined && this.data[dataIndex]) {
      this.onElementClick.emit(this.data[dataIndex]);
    }
  }

  // ============================================
  // COLOR UTILITIES
  // ============================================

  private hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private lightenColor(hex: string, percent: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;

    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);

    r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
