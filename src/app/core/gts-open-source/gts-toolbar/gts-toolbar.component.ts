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

  // Task List mode (flagPopover = true)
  isTaskList: boolean = false;
  taskListGroups: { groupText: string; groupColor: string; items: any[] }[] = [];

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

    // Check se questa toolbar dovrebbe essere mergiata/nascosta
    //
    // I 3 flag sono sempre boolean (true/false), mai undefined:
    // - flagAction = true → action list collegata a un bottone (mostrata via popover)
    // - flagPopover = true (con flagAction = false) → task list indipendente con checkbox
    // - toolbarFlagSubmit = true → toolbar submit form (Cancel/OK)
    //
    // MERGE: tutti i flag false + no gridArea → merge nella mainToolbar
    // HIDE: flagAction = true → nasconde (mostrata via popover dal bottone)
    // RENDER: flagPopover = true → renderizza come task list
    // RENDER: toolbarFlagSubmit = true → renderizza separatamente (di solito ha gridArea)
    const hasNoGridArea = !this.metaData.gridArea || this.metaData.gridArea === null || this.metaData.gridArea === '';
    const isActionList = this.metaData.flagAction === true;
    const isTaskList = this.metaData.flagPopover === true;
    const isSubmitToolbar = this.metaData.toolbarFlagSubmit === true;
    const isRegularToolbar = !isActionList && !isTaskList && !isSubmitToolbar;

    if (this.objectName !== 'mainToolbar' && hasNoGridArea) {
      if (isActionList) {
        // Action list - nasconde, mostrata via popover quando clicchi il bottone
        this.toolbarVisible = false;
        return;
      } else if (isRegularToolbar) {
        // Toolbar normale senza gridArea - merge nella mainToolbar
        this.isMerged = true;
        this.toolbarVisible = false;
        return;
      }
      // Task list o submit toolbar senza gridArea - continua e renderizza
    }

    this.isMerged = false;
    this.itemsList = [];
    this.titleItem = null;
    this.centerItems = [];
    this.startItems = [];
    this.endItems = [];

    // Check if this toolbar should render as Task List
    this.isTaskList = this.metaData.flagPopover === true;
    this.taskListGroups = [];

    // Raccogli tutti gli items da processare
    let allItems: any[] = [...this.metaData.itemsList];

    // Se questa è la mainToolbar, cerca altre toolbar senza gridArea da mergiare
    if (this.objectName === 'mainToolbar') {
      // getPageMetaData con 'all' ritorna pageData, quindi prendiamo .toolbars
      const pageData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'all', 'all');
      const allToolbars = pageData?.toolbars;
      if (Array.isArray(allToolbars)) {
        allToolbars.forEach((toolbar: any) => {
          // Merge solo toolbar "regolari" (tutti i flag false) senza gridArea
          // I 3 flag sono sempre boolean:
          // - flagAction = true → action list (NO merge)
          // - flagPopover = true → task list (NO merge)
          // - toolbarFlagSubmit = true → submit toolbar (NO merge)
          const isActionList = toolbar.flagAction === true;
          const isTaskList = toolbar.flagPopover === true;
          const isSubmitToolbar = toolbar.toolbarFlagSubmit === true;
          const isRegularToolbar = !isActionList && !isTaskList && !isSubmitToolbar;

          const shouldMerge = toolbar.objectName !== 'mainToolbar' &&
              toolbar.visible === true &&
              (!toolbar.gridArea || toolbar.gridArea === null || toolbar.gridArea === '') &&
              isRegularToolbar &&
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

    // If Task List mode, group items by groupText
    if (this.isTaskList) {
      this.prepareTaskListGroups();
    }
  }

  /**
   * Groups items by groupText for Task List rendering
   */
  prepareTaskListGroups(): void {
    const groupMap = new Map<string, { groupText: string; groupColor: string; items: any[] }>();

    for (const item of this.itemsList) {
      const groupText = item.groupText || 'Default';
      const groupColor = item.groupColor || '#00838f'; // Default teal color

      if (!groupMap.has(groupText)) {
        groupMap.set(groupText, { groupText, groupColor, items: [] });
      }
      groupMap.get(groupText)!.items.push(item);
    }

    this.taskListGroups = Array.from(groupMap.values());
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

    // Get checkbox value for Task List mode (from pageFieldName/dbField)
    let checkboxValue = false;
    if (item.pageFieldName) {
      const fieldValue = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, item.pageFieldName);
      checkboxValue = fieldValue === true || fieldValue === 1 || fieldValue === '1' || fieldValue === 'Y';
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
      location: item.location,
      // Task List properties
      groupText: item.groupText || '',
      groupColor: item.groupColor || '',
      pageFieldName: item.pageFieldName || '',
      checked: checkboxValue
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

  // ============================================
  // Task List Methods
  // ============================================

  /**
   * Handle task item click - runs the action
   */
  onTaskItemClick(item: any): void {
    if (!item.disabled && item.actionName) {
      this.gtsDataService.runAction(this.prjId, this.formId, item.actionName);
    }
  }

  /**
   * Handle checkbox change in task list
   * Updates the pageField value in the dataset
   */
  onTaskCheckboxChange(item: any, event: Event): void {
    event.stopPropagation(); // Prevent triggering onTaskItemClick

    if (item.pageFieldName) {
      const newValue = !item.checked;
      item.checked = newValue;

      // Update the field value in the dataset
      this.gtsDataService.setPageFieldValue(
        this.prjId,
        this.formId,
        item.pageFieldName,
        newValue
      );
    }
  }
}
