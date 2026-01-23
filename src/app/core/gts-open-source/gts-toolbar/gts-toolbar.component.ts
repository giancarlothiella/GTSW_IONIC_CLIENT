import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { PageService } from '../../services/pages.service';
import { Subscription } from 'rxjs';
import {
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  PopoverController
} from '@ionic/angular/standalone';

/**
 * GTS Toolbar Component - Open Source Version
 *
 * Componente per toolbar usando Ionic Toolbar invece di DevExtreme.
 * Supporta: bottoni, titoli, campi read-only, dropdown, action sheets.
 *
 * Compatibile con i metadati GTS esistenti e gtsDataService.
 */
@Component({
  selector: 'app-gts-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption
  ],
  templateUrl: './gts-toolbar.component.html',
  styleUrls: ['./gts-toolbar.component.scss']
})
export class GtsToolbarComponent implements OnInit, OnDestroy {

  private gtsDataService = inject(GtsDataService);
  private pageService = inject(PageService);
  private popoverController = inject(PopoverController);

  @Input() prjId: string = '';
  @Input() formId: number = 0;
  @Input() objectName: string = '';
  @Input() customData: any[] = [];
  @Input() customCssClass: string = '';

  @Output() newFormEvent = new EventEmitter<any>();
  @Output() newValueEvent = new EventEmitter<string>();

  appViewListenerSubs: Subscription | undefined;

  // Globals
  metaData: any = {};
  actualView: string = '';
  pageData: any = {};
  viewData: any = {};
  toolbarVisible: boolean = true;

  // Toolbar data
  toolbarReady: boolean = false;
  itemsList: any[] = [];
  cssClass: string = '';
  isMerged: boolean = false; // Se true, questa toolbar è stata mergiata nella mainToolbar

  // Items categorizzati per posizionamento
  titleItem: any = null;
  centerItems: any[] = []; // Titoli e fields al centro
  startItems: any[] = [];
  endItems: any[] = [];

  constructor() {
    // Ionic standalone components non richiedono registrazione manuale delle icone
  }

  ngOnInit(): void {
    this.appViewListenerSubs = this.gtsDataService
      .getAppViewListener()
      .subscribe((actualView) => {
        this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
        this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'toolbars', this.objectName);
        this.viewData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'views', actualView);

        this.actualView = actualView;

        if (this.viewData !== undefined && this.metaData !== undefined && this.metaData !== null) {
          // Update toolbar data without hiding it to avoid flickering
          this.prepareToolbarData(this.customData);
          if (!this.toolbarReady) {
            this.toolbarReady = true;
          }
        }
      });

    // Inizializzazione iniziale
    this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
    this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'toolbars', this.objectName);
    const viewDataName = this.gtsDataService.getActualView();
    this.viewData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'views', viewDataName);

    if (this.viewData !== undefined && this.viewData !== null && this.viewData !== '') {
      if (this.metaData !== undefined && this.metaData !== null && this.viewData !== undefined && this.viewData !== '') {
        this.prepareToolbarData(this.customData);
        this.toolbarReady = true;
      }
    }

    this.cssClass = this.getClass();
  }

  ngOnDestroy(): void {
    this.appViewListenerSubs?.unsubscribe();
  }

  getClass(): string {
    if (this.objectName === 'mainToolbar') {
      return 'main-toolbar';
    } else if (this.customCssClass !== '' && this.customCssClass !== undefined && this.customCssClass !== null) {
      return this.customCssClass;
    } else {
      return 'default-toolbar';
    }
  }

  buttonClick(objectName: string, actionName: string, submitBehavior: boolean): void {
    if (submitBehavior) {
      const formEvent: any = {
        prjId: this.prjId,
        formId: this.formId,
        actionName: actionName
      };
      this.newValueEvent.emit(formEvent);
    } else {
      this.gtsDataService.runAction(this.prjId, this.formId, actionName);
    }
  }

  prepareToolbarData(customData: any): void {
    if (this.metaData === undefined || this.metaData === null) {
      return;
    }

    // Check se questa toolbar dovrebbe essere mergiata nella mainToolbar
    // (non è mainToolbar, non ha gridArea, non è un action menu, non è submit)
    if (this.objectName !== 'mainToolbar' &&
        (!this.metaData.gridArea || this.metaData.gridArea === null || this.metaData.gridArea === '') &&
        !this.metaData.flagAction &&
        !this.metaData.actionTarget &&
        !this.metaData.toolbarFlagSubmit) {
      this.isMerged = true;
      this.toolbarVisible = false;
      return; // Non preparare i dati, sarà la mainToolbar a mostrarli
    }

    this.isMerged = false;
    this.itemsList = [];
    this.titleItem = null;
    this.centerItems = [];
    this.startItems = [];
    this.endItems = [];

    // Raccogli tutti gli items da processare
    let allItems: any[] = [...this.metaData.itemsList];

    // Se questa è la mainToolbar, cerca altre toolbar senza gridArea da mergiare
    if (this.objectName === 'mainToolbar') {
      // getPageMetaData con 'all' ritorna pageData, quindi prendiamo .toolbars
      const pageData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'all', 'all');
      const allToolbars = pageData?.toolbars;
      if (Array.isArray(allToolbars)) {
        allToolbars.forEach((toolbar: any) => {
          // Merge toolbar che:
          // 1. Non sono la mainToolbar stessa
          // 2. Sono visibili
          // 3. Non hanno gridArea (o gridArea è null/undefined/empty)
          // 4. Non hanno flagAction true (sono toolbar di azioni/action list)
          // 5. Non hanno actionTarget (sono riferite da altri bottoni come action menu)
          // 6. Non hanno toolbarFlagSubmit (sono toolbar di submit con form)
          const shouldMerge = toolbar.objectName !== 'mainToolbar' &&
              toolbar.visible === true &&
              (!toolbar.gridArea || toolbar.gridArea === null || toolbar.gridArea === '') &&
              !toolbar.flagAction &&
              !toolbar.actionTarget &&
              !toolbar.toolbarFlagSubmit &&
              toolbar.itemsList && toolbar.itemsList.length > 0;

          if (shouldMerge) {
            allItems = [...allItems, ...toolbar.itemsList];
          }
        });
      }
    }

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];

      // Gestione icone
      let icon: string = '';
      if (item.stdImageId !== undefined && item.stdImageId !== null && item.stdImageId !== '') {
        icon = '/assets/icons/stdImage_' + item.stdImageId + '.png';
      } else if (item.iconId !== undefined && item.iconId !== null && item.iconId !== '') {
        icon = '/assets/icons/icon_' + item.iconId + '.svg';
      }

      // La visibilità degli item è già stata calcolata da setView() nel servizio
      // che aggiorna direttamente metaData.itemsList[].visible e .disabled
      // basandosi sulle execCond e le condizioni della view.
      // Non serve più leggere da viewData.objects perché setView() ha già fatto tutto.

      // Se l'item è visibile, preparalo e aggiungilo alla lista
      if (item.visible) {
        const preparedItem = this.prepareItem(item, icon, customData);
        if (preparedItem) {
          this.itemsList.push(preparedItem);

          // Categorizza per posizionamento
          // center → centerItems (titoli e fields al centro)
          // before/left → startItems
          // after/right o default → endItems
          if (item.type === 'title' || item.location === 'center') {
            this.centerItems.push(preparedItem);
            // Mantieni anche titleItem per retrocompatibilità (primo titolo)
            if (item.type === 'title' && !this.titleItem) {
              this.titleItem = preparedItem;
            }
          } else if (item.location === 'before' || item.location === 'left') {
            this.startItems.push(preparedItem);
          } else {
            // after, right, o qualsiasi altro valore
            this.endItems.push(preparedItem);
          }
        }
      }
    }

    // Check se toolbar ha items visibili
    this.toolbarVisible = this.itemsList.filter((element: any) => element.visible).length > 0;
  }

  prepareItem(item: any, icon: string, customData: any): any | null {
    switch (item.type) {
      case 'button':
        return this.prepareButtonItem(item, icon);
      case 'title':
        return this.prepareTitleItem(item);
      case 'field':
        return this.prepareFieldItem(item);
      case 'dropDownButton':
        return this.prepareDropDownItem(item, customData);
      default:
        return null;
    }
  }

  prepareButtonItem(item: any, icon: string): any {
    // Usa ionIcon SOLO se non c'è una icona personalizzata (stdImageId o iconId)
    const useIonIcon = !icon || icon === '';

    // Risolvi actionToolbar: può essere inline o un riferimento tramite actionTarget
    let actionToolbar = item.actionToolbar;
    if (!actionToolbar && item.actionTarget) {
      // actionTarget è un riferimento a un'altra toolbar, cercala nei metadati
      actionToolbar = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'toolbars', item.actionTarget);
    }

    return {
      type: 'button',
      objectName: item.objectName,
      text: item.text,
      icon: icon,
      ionIcon: useIonIcon ? this.mapToIonIcon(item.stdImageId) : null,
      visible: item.visible,
      disabled: item.disabled,
      submitBehavior: item.submitBehavior,
      actionName: item.actionName,
      actionToolbar: actionToolbar,
      location: item.location
    };
  }

  prepareTitleItem(item: any): any {
    let text: string = item.text || '';
    if (item.pageFieldName !== undefined && item.pageFieldName !== '') {
      const fieldValue: any = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, item.pageFieldName);
      text = text ? text + fieldValue : fieldValue;
    }

    return {
      type: 'title',
      objectName: item.objectName,
      text: text,
      visible: item.visible
    };
  }

  prepareFieldItem(item: any): any {
    let value = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, item.pageFieldName);
    const label = this.gtsDataService.getPageFieldLabel(this.prjId, this.formId, item.pageFieldName);

    // Format date values
    const dataType = this.gtsDataService.getPageFieldDataType(this.prjId, this.formId, item.pageFieldName);
    if ((dataType === 'Date' || dataType === 'DateTime') && value) {
      // Convert string ISO date to Date object if needed
      const dateValue = typeof value === 'string' ? new Date(value) : value;

      if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        if (dataType === 'DateTime') {
          value = this.pageService.formatDateTime(dateValue);
        } else {
          value = this.pageService.formatDate(dateValue);
        }
      }
    }

    return {
      type: 'field',
      objectName: item.objectName,
      value: value,
      label: label,
      visible: item.visible,
      location: item.location
    };
  }

  prepareDropDownItem(item: any, customData: any): any | null {
    const pageField: any = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'pageFields', item.pageFieldName);
    const label = this.gtsDataService.getPageFieldLabel(this.prjId, this.formId, item.pageFieldName);

    if (pageField === undefined) {
      return null;
    }

    const dropDownData: any = customData.filter((element: any) => element.field === pageField.dbFieldName)[0];

    if (dropDownData !== undefined) {
      return {
        type: 'dropdown',
        objectName: item.objectName,
        label: label,
        value: dropDownData.value,
        items: dropDownData.items,
        field: dropDownData.field,
        pageFieldName: item.pageFieldName,
        visible: item.visible,
        disabled: item.disabled,
        location: item.location
      };
    }

    return null;
  }

  onDropdownChange(event: any, item: any): void {
    const value = event.detail.value;

    // Wrap in setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      const pageField: any = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'pageFields', item.pageFieldName);

      // Set page field value
      this.gtsDataService.setPageFieldValue(this.prjId, this.formId, pageField.pageFieldName, value);

      // Update customData
      const dataItem = this.customData.filter((element: any) => element.field === item.field)[0];
      if (dataItem) {
        dataItem.value = value;
      }

      const data: any = {
        selectedValue: value,
        object: item.objectName,
        pageField: pageField
      };

      // Emit new value event
      this.newValueEvent.emit(data);
    }, 0);
  }

  async onButtonClick(item: any, event?: Event): Promise<void> {
    if (item.actionToolbar !== undefined) {
      await this.showActionMenu(item.actionToolbar, event);
    } else {
      this.buttonClick(item.objectName, item.actionName, item.submitBehavior);
    }
  }

  async showActionMenu(actionToolbar: any, event?: Event): Promise<void> {
    const { ActionMenuPopoverComponent } = await import('./action-menu-popover.component');

    const menuItems: any[] = [];

    actionToolbar.itemsList.forEach((item: any) => {
      if (item.visible) {
        // Gestione icone
        let icon: string = '';
        let ionIcon: string | null = null;

        if (item.stdImageId !== undefined && item.stdImageId !== null && item.stdImageId !== '') {
          icon = '/assets/icons/stdImage_' + item.stdImageId + '.png';
        } else if (item.iconId !== undefined && item.iconId !== null && item.iconId !== '') {
          icon = '/assets/icons/icon_' + item.iconId + '.svg';
        }

        // Usa ionIcon SOLO se non c'è una icona personalizzata
        if (!icon || icon === '') {
          ionIcon = this.mapToIonIcon(item.stdImageId);
        }

        menuItems.push({
          text: item.text,
          icon: icon,
          ionIcon: ionIcon,
          actionName: item.actionName,
          disabled: item.disabled || false
        });
      }
    });

    const popover = await this.popoverController.create({
      component: ActionMenuPopoverComponent,
      componentProps: {
        items: menuItems
      },
      event: event,
      translucent: true,
      cssClass: 'action-menu-popover'
    });

    await popover.present();

    const { data } = await popover.onDidDismiss();
    if (data && data.actionName) {
      this.gtsDataService.runAction(this.prjId, this.formId, data.actionName);
    }
  }

  // Mappa stdImageId a ionicons (usato solo se non c'è icona personalizzata)
  mapToIonIcon(stdImageId: string): string | null {
    if (!stdImageId) return null;

    const iconMap: any = {
      '1': 'add-outline',
      '2': 'create-outline',
      '3': 'trash-outline',
      '4': 'information-circle-outline',
      '5': 'document-text-outline',
      '6': 'checkmark-outline',
      '7': 'close-outline',
      '8': 'save-outline',
      '9': 'refresh-outline',
      '10': 'search-outline'
    };
    return iconMap[stdImageId] || null;
  }
}
