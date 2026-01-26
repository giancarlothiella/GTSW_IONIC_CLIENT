import { Component, OnInit, OnDestroy, inject, NgZone, Renderer2 } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Subscription } from 'rxjs';
import { GtsDataService } from '../../services/gts-data.service';

@Component({
  selector: 'app-gts-loader',
  standalone: true,
  imports: [CommonModule],
  template: '', // Template vuoto - il loader viene creato direttamente nel body
  styles: []
})
export class GtsLoaderComponent implements OnInit, OnDestroy {

  private ngZone = inject(NgZone);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);

  appLoaderListenerSubs: Subscription | undefined;
  private loaderElement: HTMLElement | null = null;

  constructor(
    public gtsDataService: GtsDataService
  ) { }

  ngOnInit(): void {
    // Loader Listener - crea/rimuove il loader direttamente nel body
    this.appLoaderListenerSubs = this.gtsDataService
    .getAppLoaderListener()
    .subscribe((loading) => {
      this.ngZone.run(() => {
        if (loading) {
          this.showLoader();
        } else {
          this.hideLoader();
        }
      });
    })
  }

  private showLoader(): void {
    // Se esiste già, non creare un duplicato
    if (this.loaderElement) return;

    // Crea l'overlay direttamente nel body
    this.loaderElement = this.renderer.createElement('div');
    this.renderer.setAttribute(this.loaderElement, 'id', 'gts-global-loader');
    this.renderer.setStyle(this.loaderElement, 'position', 'fixed');
    this.renderer.setStyle(this.loaderElement, 'top', '0');
    this.renderer.setStyle(this.loaderElement, 'left', '0');
    this.renderer.setStyle(this.loaderElement, 'width', '100%');
    this.renderer.setStyle(this.loaderElement, 'height', '100%');
    this.renderer.setStyle(this.loaderElement, 'background-color', 'rgba(0, 0, 0, 0.5)');
    this.renderer.setStyle(this.loaderElement, 'display', 'flex');
    this.renderer.setStyle(this.loaderElement, 'justify-content', 'center');
    this.renderer.setStyle(this.loaderElement, 'align-items', 'center');
    this.renderer.setStyle(this.loaderElement, 'z-index', '999999');

    // Crea il container dello spinner
    const container = this.renderer.createElement('div');
    this.renderer.setStyle(container, 'background', 'white');
    this.renderer.setStyle(container, 'border-radius', '8px');
    this.renderer.setStyle(container, 'padding', '32px');
    this.renderer.setStyle(container, 'box-shadow', '0 4px 12px rgba(0, 0, 0, 0.15)');

    // Crea lo spinner CSS puro (no Ionic)
    const spinner = this.renderer.createElement('div');
    this.renderer.setStyle(spinner, 'width', '48px');
    this.renderer.setStyle(spinner, 'height', '48px');
    this.renderer.setStyle(spinner, 'border', '4px solid #f3f3f3');
    this.renderer.setStyle(spinner, 'border-top', '4px solid #3880ff');
    this.renderer.setStyle(spinner, 'border-radius', '50%');
    this.renderer.setStyle(spinner, 'animation', 'gts-spin 1s linear infinite');

    // Aggiungi l'animazione CSS se non esiste
    this.addSpinnerAnimation();

    this.renderer.appendChild(container, spinner);
    this.renderer.appendChild(this.loaderElement, container);
    this.renderer.appendChild(this.document.body, this.loaderElement);
  }

  private hideLoader(): void {
    if (this.loaderElement && this.loaderElement.parentNode) {
      this.renderer.removeChild(this.document.body, this.loaderElement);
      this.loaderElement = null;
    }
  }

  private addSpinnerAnimation(): void {
    // Controlla se l'animazione esiste già
    if (this.document.getElementById('gts-spinner-style')) return;

    const style = this.renderer.createElement('style');
    this.renderer.setAttribute(style, 'id', 'gts-spinner-style');
    style.textContent = `
      @keyframes gts-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    this.renderer.appendChild(this.document.head, style);
  }

  ngOnDestroy(): void {
    this.appLoaderListenerSubs?.unsubscribe();
    // Cleanup: rimuovi il loader se il component viene distrutto
    this.hideLoader();
  }
}
