import { Component, OnInit, OnDestroy, ElementRef, ViewChild, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonRange } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, trashOutline } from 'ionicons/icons';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';

addIcons({ closeOutline, trashOutline });

@Component({
  selector: 'app-gts-demo-log',
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, IonRange],
  template: `
    <div class="demo-log-panel">
      <!-- Header -->
      <div class="demo-log-header">
        <span class="demo-log-title">Action Log</span>
        <div class="demo-log-controls">
          <ion-button fill="clear" size="small" (click)="clearLog()" class="ctrl-btn">
            <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
          </ion-button>
          <ion-button fill="clear" size="small" (click)="close()" class="ctrl-btn">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </div>
      </div>

      <!-- Speed slider -->
      <div class="demo-log-speed">
        <span class="speed-label">Speed</span>
        <ion-range
          [min]="0" [max]="4" [step]="1" [snaps]="true"
          [value]="speedLevel"
          [ticks]="true"
          (ionChange)="onSpeedChange($event)"
          class="speed-range"
        ></ion-range>
        <span class="speed-value">{{ speedLabel }}</span>
      </div>

      <!-- Log entries -->
      <div class="demo-log-body" #logBody>
        @for (entry of entries; track $index) {
          <div class="log-entry" [class.skipped]="!entry.active">
            <span class="log-time">{{ formatTime(entry.time) }}</span>
            <span class="log-action" [title]="entry.objectName">{{ entry.actionType }}</span>
            <span class="log-detail">{{ entry.detail }}</span>
            @if (entry.rule) {
              <span class="log-rule" title="execCond">{{ entry.rule }}</span>
            }
          </div>
        } @empty {
          <div class="log-empty">Waiting for actions...</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .demo-log-panel {
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      width: 340px;
      background: #1e1e2e;
      color: #cdd6f4;
      display: flex;
      flex-direction: column;
      z-index: 100000;
      box-shadow: -2px 0 8px rgba(0,0,0,0.3);
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 11px;
    }

    .demo-log-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      background: #313244;
      border-bottom: 1px solid #45475a;
      min-height: 36px;
    }

    .demo-log-title {
      font-weight: 600;
      font-size: 12px;
      color: #cba6f7;
    }

    .demo-log-controls {
      display: flex;
      gap: 0;
    }

    .ctrl-btn {
      --color: #a6adc8;
      --padding-start: 4px;
      --padding-end: 4px;
      height: 28px;
      font-size: 14px;
    }

    /* Speed slider bar */
    .demo-log-speed {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 2px 10px;
      background: #2a2a3c;
      border-bottom: 1px solid #45475a;
    }

    .speed-label {
      color: #6c7086;
      font-size: 10px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .speed-range {
      flex: 1;
      --bar-height: 3px;
      --bar-background: #45475a;
      --bar-background-active: #cba6f7;
      --knob-size: 14px;
      --knob-background: #cba6f7;
      --pin-background: #cba6f7;
      --height: 24px;
    }

    .speed-value {
      color: #cba6f7;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
      min-width: 28px;
      text-align: right;
    }

    .demo-log-body {
      flex: 1;
      overflow-y: auto;
      padding: 4px 0;
    }

    .log-entry {
      display: flex;
      gap: 6px;
      padding: 2px 8px;
      align-items: baseline;
      border-bottom: 1px solid #313244;
    }

    .log-entry:hover {
      background: #313244;
    }

    .log-entry.skipped {
      opacity: 0.4;
      text-decoration: line-through;
    }

    .log-time {
      color: #6c7086;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .log-action {
      color: #89b4fa;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .log-detail {
      color: #a6e3a1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }

    .log-rule {
      color: #fab387;
      white-space: nowrap;
      flex-shrink: 0;
      font-style: italic;
    }

    .log-empty {
      padding: 20px;
      text-align: center;
      color: #6c7086;
      font-style: italic;
    }

    /* Scrollbar */
    .demo-log-body::-webkit-scrollbar {
      width: 6px;
    }
    .demo-log-body::-webkit-scrollbar-track {
      background: #1e1e2e;
    }
    .demo-log-body::-webkit-scrollbar-thumb {
      background: #45475a;
      border-radius: 3px;
    }
  `]
})
export class GtsDemoLogComponent implements OnInit, OnDestroy {
  @ViewChild('logBody') logBody!: ElementRef;
  @Output() closed = new EventEmitter<void>();

  private gtsDataService = inject(GtsDataService);
  private sub: Subscription | undefined;

  entries: any[] = [];

  // Speed: 0=real-time, 1=250ms, 2=500ms, 3=1s, 4=2s
  private speedDelays = [0, 250, 500, 1000, 2000];
  private speedLabels = ['Real', '0.25s', '0.5s', '1s', '2s'];
  speedLevel = 0;
  speedLabel = 'Real';

  ngOnInit(): void {
    this.entries = [...this.gtsDataService.getDemoLogEntries()];

    // Sync slider with current delay
    const currentDelay = this.gtsDataService.demoLogDelay;
    const idx = this.speedDelays.indexOf(currentDelay);
    if (idx >= 0) {
      this.speedLevel = idx;
      this.speedLabel = this.speedLabels[idx];
    }

    this.sub = this.gtsDataService.getDemoLogListener().subscribe((entry) => {
      this.entries.push(entry);
      setTimeout(() => this.scrollToBottom(), 0);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onSpeedChange(event: any): void {
    const level = event.detail.value;
    this.speedLevel = level;
    this.speedLabel = this.speedLabels[level];
    this.gtsDataService.demoLogDelay = this.speedDelays[level];
  }

  formatTime(date: Date): string {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  clearLog(): void {
    this.entries = [];
    this.gtsDataService.clearDemoLog();
  }

  close(): void {
    this.gtsDataService.demoLogActive = false;
    this.gtsDataService.demoLogDelay = 0;
    this.closed.emit();
  }

  private scrollToBottom(): void {
    if (this.logBody?.nativeElement) {
      const el = this.logBody.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
