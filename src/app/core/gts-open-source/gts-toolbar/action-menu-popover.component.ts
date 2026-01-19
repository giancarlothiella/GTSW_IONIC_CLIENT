import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonList, IonItem, IonLabel, IonIcon, PopoverController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-action-menu-popover',
  standalone: true,
  imports: [CommonModule, IonList, IonItem, IonLabel, IonIcon],
  template: `
    <ion-list class="action-menu-list">
      @for (item of items; track item.text) {
        <ion-item button (click)="selectItem(item)" lines="none">
          @if (item.ionIcon) {
            <ion-icon [name]="item.ionIcon" slot="start"></ion-icon>
          } @else if (item.icon) {
            <img [src]="item.icon" class="menu-icon" slot="start" />
          }
          <ion-label>{{ item.text }}</ion-label>
        </ion-item>
      }
    </ion-list>
  `,
  styles: [`
    .action-menu-list {
      padding: 4px;
      min-width: 180px;
      max-width: 300px;
    }

    ion-item {
      --padding-start: 12px;
      --padding-end: 12px;
      --min-height: 40px;
      font-size: 14px;
      border-radius: 6px;
      margin-bottom: 2px;
      cursor: pointer;
      border: 1px solid #ddd;
      --background: #ffffff;

      &:last-child {
        margin-bottom: 0;
      }

      &:hover {
        --background: #f0f0f0;
        border-color: #bbb;
      }
    }

    ion-icon {
      font-size: 20px;
      margin-right: 8px;
    }

    .menu-icon {
      width: 20px;
      height: 20px;
      margin-right: 8px;
    }

    ion-label {
      font-size: 14px;
      font-weight: 500;
    }
  `]
})
export class ActionMenuPopoverComponent {
  @Input() items: any[] = [];

  constructor(private popoverController: PopoverController) {}

  selectItem(item: any) {
    this.popoverController.dismiss(item);
  }
}
