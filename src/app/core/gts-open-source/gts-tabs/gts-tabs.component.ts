import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { IonSegment, IonSegmentButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';

/**
 * GTS Tabs Component - Open Source Version
 *
 * Componente per la gestione dei tab usando Ionic Segment.
 * Compatibile con i metadati GTS esistenti.
 *
 * @example
 * <app-gts-tabs
 *   [prjId]="prjId"
 *   [formId]="formId"
 *   [objectName]="'mainTabs'"
 * ></app-gts-tabs>
 */
@Component({
  selector: 'app-gts-tabs',
  standalone: true,
  imports: [
    CommonModule,
    IonSegment,
    IonSegmentButton,
    IonIcon,
    IonLabel
  ],
  templateUrl: './gts-tabs.component.html',
  styleUrls: ['./gts-tabs.component.scss']
})
export class GtsTabsComponent implements OnInit {

  @Input() prjId: string = '';
  @Input() formId: number = 0;
  @Input() objectName: string = '';

  private gtsDataService = inject(GtsDataService);

  // Globals
  metaData: any = {};
  tabsList: any[] = [];
  tabsIndex: number = -1;
  selectedTabId: string = '';

  constructor() {}

  ngOnInit(): void {
    // Carica i metadati
    this.metaData = this.gtsDataService.getPageMetaData(
      this.prjId,
      this.formId,
      'tabs',
      this.objectName
    );

    // Prepara i tab
    this.prepareTabs();

    // Sempre inizializza al primo tab (index 0)
    this.tabsIndex = 0;
    this.metaData.tabIndex = 0;

    // Imposta l'ID del tab selezionato (CRITICO per il binding con ion-segment)
    if (this.tabsList.length > 0 && this.tabsIndex >= 0 && this.tabsIndex < this.tabsList.length) {
      this.selectedTabId = String(this.tabsList[this.tabsIndex].id);
    }

    // Esegui l'azione iniziale se presente
    if (
      this.tabsList[this.tabsIndex]?.actionName &&
      this.tabsList[this.tabsIndex].actionName !== ''
    ) {
      this.gtsDataService.runAction(
        this.prjId,
        this.formId,
        this.tabsList[this.tabsIndex].actionName
      );
    }
  }

  /**
   * Prepara la lista dei tab dai metadati
   */
  prepareTabs(): void {
    this.tabsList = [];

    if (!this.metaData.tabsData) {
      return;
    }

    this.metaData.tabsData.forEach((tab: any, index: number) => {
      // Se l'ID non esiste, usa l'indice come ID
      const tabId = tab.id !== undefined && tab.id !== null ? String(tab.id) : String(index);

      this.tabsList.push({
        id: tabId,
        text: tab.text,
        iconPath: tab.iconId ? `/assets/icons/icon_${tab.iconId}.svg` : null,
        ionIcon: tab.ionIcon || null,
        visible: tab.visible !== false,
        disabled: tab.disabled === true,
        actionName: tab.actionName || null
      });
    });
  }

  /**
   * Gestisce il click diretto su un tab (più affidabile di ionChange)
   */
  onTabClick(tabId: string | undefined, event?: Event): void {
    // Stop propagation to prevent accordion from closing
    if (event) {
      event.stopPropagation();
    }

    if (tabId === undefined || tabId === null || String(tabId) === 'undefined') {
      return;
    }

    const selectedId = String(tabId);
    const newIndex = this.tabsList.findIndex(tab => String(tab.id) === selectedId);

    if (newIndex === -1 || newIndex === this.tabsIndex) {
      return;
    }

    // Aggiorna l'indice e il tab selezionato
    this.tabsIndex = newIndex;
    this.metaData.tabIndex = this.tabsIndex;
    this.selectedTabId = selectedId;

    // Esegui l'azione associata al tab
    const selectedTab = this.tabsList[this.tabsIndex];
    if (selectedTab.actionName && selectedTab.actionName !== '') {
      this.gtsDataService.runAction(
        this.prjId,
        this.formId,
        selectedTab.actionName
      );
    } else {
      this.gtsDataService.refreshActualView(this.prjId, this.formId);
    }
  }

  /**
   * Gestisce il cambio tab da ionChange (backup method)
   */
  onTabChange(event: any): void {
    // Stop propagation to prevent accordion from closing
    if (event) {
      event.stopPropagation();
    }

    let selectedId = '';

    // Prova diverse modalità di accesso al valore
    if (event?.detail?.value !== undefined && event?.detail?.value !== null) {
      selectedId = String(event.detail.value);
    } else if (event?.value !== undefined && event?.value !== null) {
      selectedId = String(event.value);
    } else if (event?.target?.value !== undefined && event?.target?.value !== null) {
      selectedId = String(event.target.value);
    }

    if (!selectedId || selectedId === 'undefined' || selectedId === 'null') {
      return;
    }

    this.onTabClick(selectedId);
  }

  /**
   * Determina se un tab è visibile
   */
  isTabVisible(tab: any): boolean {
    return tab.visible !== false;
  }
}
