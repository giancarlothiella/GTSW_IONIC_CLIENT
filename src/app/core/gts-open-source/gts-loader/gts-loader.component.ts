import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GtsDataService } from '../../services/gts-data.service';
import { IonSpinner } from '@ionic/angular/standalone';

@Component({
  selector: 'app-gts-loader',
  standalone: true,
  imports: [CommonModule, IonSpinner],
  templateUrl: './gts-loader.component.html',
  styleUrls: ['./gts-loader.component.scss']
})
export class GtsLoaderComponent implements OnInit, OnDestroy {

  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  appLoaderListenerSubs: Subscription | undefined;

  constructor(
    public gtsDataService: GtsDataService
  ) { }

  loading: boolean = false;

  ngOnInit(): void {
    // Loader Listener - force change detection in Angular 18+ standalone
    this.appLoaderListenerSubs = this.gtsDataService
    .getAppLoaderListener()
    .subscribe((loading) => {
      this.ngZone.run(() => {
        this.loading = loading;
        this.cdr.detectChanges();
      });
    })
  }

  ngOnDestroy(): void {
    this.appLoaderListenerSubs?.unsubscribe();
  }
}
