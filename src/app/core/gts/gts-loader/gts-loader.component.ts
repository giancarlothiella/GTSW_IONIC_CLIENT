import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GtsDataService } from '../../services/gts-data.service';
import { DxLoadPanelModule } from 'devextreme-angular';

@Component({
  selector: 'app-gts-loader',
  standalone: true,
  imports: [CommonModule, DxLoadPanelModule],
  templateUrl: './gts-loader.component.html',
  styleUrls: ['./gts-loader.component.scss']
})
export class GtsLoaderComponent implements OnInit, OnDestroy {

  appLoaderListenerSubs: Subscription | undefined; 

  constructor(
    public gtsDataService: GtsDataService
  ) { }

  loading: boolean = false;

  ngOnInit(): void {
    // Loader Listener
    this.appLoaderListenerSubs = this.gtsDataService
    .getAppLoaderListener()
    .subscribe((loading) => {
      this.loading = loading;    
    })
  }

  ngOnDestroy(): void {
    this.appLoaderListenerSubs?.unsubscribe();
  }
}
