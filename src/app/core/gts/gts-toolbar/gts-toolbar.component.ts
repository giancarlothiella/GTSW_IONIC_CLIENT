import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';
import { AUTO_STYLE } from '@angular/animations';
import { DxToolbarModule, DxActionSheetModule } from 'devextreme-angular';

@Component({
  selector: 'app-gts-toolbar',
  standalone: true,
  imports: [CommonModule, DxToolbarModule, DxActionSheetModule],
  templateUrl: './gts-toolbar.component.html',
  styleUrls: ['./gts-toolbar.component.scss']
})
export class GtsToolbarComponent implements OnInit, OnDestroy {
  constructor(
    private gtsDataService: GtsDataService,
  ) {}

  @Input()
  prjId: string = '';

  @Input()
  formId: number = 0;

  @Input()
  objectName: string = '';

  @Input()
  customData: any[] = [];

  @Input()
  customCssClass: string = '';

  appViewListenerSubs: Subscription | undefined; 
  
  @Output() newFormEvent = new EventEmitter<any>();
  @Output() newValueEvent = new EventEmitter<string>();
  
  //========= ON DESTROY =================
  ngOnDestroy(): void {
    this.appViewListenerSubs?.unsubscribe();    
  }

  
  //========= ON INIT =================
  ngOnInit(): void {
    this.appViewListenerSubs = this.gtsDataService
    .getAppViewListener()
    .subscribe((actualView) => {
      this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId); 
      this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'toolbars', this.objectName);
      this.viewData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'views', actualView);
      
      this.actualView = actualView;

      if (this.viewData !== undefined && this.metaData !== undefined && this.metaData !== null) {  
        this.toolbarReady = false; 
        this.prepareToolbarData(this.customData);
        this.toolbarReady = true;        
      }            
    });

    this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId); 
    this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'toolbars', this.objectName);
    const viewDataName = this.gtsDataService.getActualView();
    this.viewData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'views', viewDataName);
      
    if (this.viewData !== undefined && this.viewData !== null && this.viewData !== '') {
      if (this.metaData !== undefined && this.metaData !== null && this.viewData !== undefined && this.viewData !== '' ) {
        this.toolbarReady = false;
        this.prepareToolbarData(this.customData);
        this.toolbarReady = true;    
      }
    }

    this.cssClass = this.getClass();
  } 

  //========= GLOBALS =================
  metaData: any = {};
  actualView: string = '';
  pageData: any = {}; 
  viewData: any = {};
  toolbarVisible: boolean = true;

  //========= TOOLBAR DATA =================  
  toolbarReady: boolean = false;
  itemsList: any[] = [];
  toolbarComponent: any = {};
  toolbarType: string = 'default';
  cssClass: string = '';
  submitBehavior: boolean = false;  
  //========= GET OBJECT STATUS =================
  getObjectsStatus(objectName: string, objectType: string): boolean {
    //return this.gtsDataService.getObjectsStatus(objectName, objectType);
    return true
  }

  getClass(): string {
    let cssClass: string = '';
    if (this.objectName === 'mainToolbar') {
      cssClass = 'main-toolbar';
    } else {
      if (this.customCssClass !== '' && this.customCssClass !== undefined && this.customCssClass !== null) {
        cssClass = this.customCssClass
      } else {
        cssClass = 'defaultToolbar';
      }
    }
        
    return cssClass;
  }

  //========= TOOLBAR EVENTS =================
  onInitialized(e: any) {
    this.toolbarComponent = e.component;
  }

  buttonClick(objectName: string, actionName: string) {
    const submitBehavior: boolean = this.itemsList.filter((item: any) => item.objectName === objectName)[0].submitBehavior;
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

  // Toolbar DropDown Button Event
  getToolBar(prjId: string, formId: number, objectName: string) {
    let toolbar: any = {};
    this.metaData
    .pageData
    .toolbars
    .forEach((element: any) => {
      if (element.objectName === objectName) {
        toolbar = element;
      }
    });
    return toolbar;    
  }

  // TOOLBAR METHODS
  prepareToolbarData(customData: any): void {
    if (this.metaData === undefined || this.metaData === null) {
      return;
    } else {
      this.itemsList = [];
      for (let i = 0; i < this.metaData.itemsList.length; i++) {
        const item = this.metaData.itemsList[i];
        let icon: string = '';  
        if (item.stdImageId !== undefined && item.stdImageId !== null && item.stdImageId !== '') {
          icon = '/assets/icons/stdImage_'+item.stdImageId+'.png';
        } else {
          if (item.iconId !== undefined && item.iconId !== null && item.iconId !== '') {
            icon = '/assets/icons/icon_'+item.iconId+'.svg';
          } else {
            icon = '';
          }
        }

        if ((this.viewData.objects !== undefined && this.viewData.objects !== null) || this.metaData.toolbarFlagSubmit) {
          if (!this.metaData.toolbarFlagSubmit) {
            const viewItems = this.viewData.objects.filter((element: any) => element.objectName === item.objectName);
            for (let j = 0; j < viewItems.length; j++) {
              const viewItem = viewItems[j];
              if (viewItem !== undefined) {
                if (viewItem.visible) {
                  item.visible = viewItem.visible;
                  item.disabled = viewItem.disabled;
                  break;
                } else {
                  item.visible = false;
                }
              }            
            };
          }

          // check action list items with view data
          if (item.actionToolbar !== undefined) {
            item.actionToolbar.itemsList.forEach((element: any) => {
              const viewItem = this.viewData.objects.filter((viewElement: any) => viewElement.objectName === element.objectName)[0];
              if (viewItem !== undefined) {
                element.visible = viewItem.visible;
                element.disabled = viewItem.disabled;
              } else {
                element.visible = false;
              }
            });
          }
            
          if (item.visible) {
            if (item.type === 'button') {
              let button: any = {
                id: item.objectName,
                name: item.objectName,
                objectName: item.objectName,
                submitBehavior: item.submitBehavior,
                widget: 'dxButton',
                location: item.location,
                locateInMenu: 'auto',   
                visible: item.visible,  
                disabled: item.disabled,     
                options: {
                  stylingMode: item.stylingMode,            
                  text: item.text,
                  
                  icon: icon,
                  type: item.buttonType,
                  onClick: (el: any) => {
                    if (item.actionToolbar !== undefined) {
                      this.prepareActionData(el, item.actionToolbar);
                    } else {
                      this.buttonClick(item.objectName, item.actionName);
                    }
                  }
                }            
              };
            
              if (item.width !== undefined) {
                button.options.width = item.width;
              }
              this.itemsList.push(button);
            } else if (item.type === 'field') {
              const value = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, item.pageFieldName);
              const label = this.gtsDataService.getPageFieldLabel(this.prjId, this.formId, item.pageFieldName);
              const dataType = this.gtsDataService.getPageFieldDataType(this.prjId, this.formId, item.pageFieldName);
              const widget: string = (dataType === 'DateTime' || dataType === 'Date') ? 'dxDateBox' : 'dxTextBox';

              // change display format for date and datetime and set displayFormat accordingly
              let displayFormat: string = '';
              if (dataType === 'DateTime') {
                displayFormat = 'dd/MM/yyyy hh:mm:ss';
              } else if (dataType === 'Date') {
                displayFormat = 'dd/MM/yyyy';
              } else {
                displayFormat = '';
              }
              
              this.itemsList.push({
                objectName: item.objectName,
                name: item.objectName,
                widget: widget,

                location: item.location,
                locateInMenu: 'never',
                visible: item.visible,   
                options: {
                  cssClass: 'toolbar-field',
                  stylingMode:  'outlined',
                  labelMode: 'static',
                  width: // calculate width based on item.text length min 150
                    (value !== undefined && value !== null && value !== '') ? Math.max((value.length * 8), 150) : 100,
                  displayFormat: displayFormat,
                  value: value,
                  label: label,
                  readOnly: true,                           
                }
              });
            } else if (item.type === 'title') {
              let text: string = item.text;
              if (item.pageFieldName !== undefined && item.pageFieldName !== '') {
                let fieldValue: any = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, item.pageFieldName);
                if (text !== '' && text !== undefined && text !== null) {
                  text += fieldValue;            
                } else {
                  text = fieldValue;
                }
              }

              this.itemsList.push({
                objectName: item.objectName,
                name: item.objectName,
                widget: 'dxButton',
                location: item.location,
                locateInMenu: 'never',   
                visible: item.visible,
                readOnly: item.disabled,
                options: {
                  text: text,
                  icon: item.icon,            
                }
              });
            } else if (item.type === 'dropDownButton') {
              const pageField: any = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'pageFields', item.pageFieldName);
              const label = this.gtsDataService.getPageFieldLabel(this.prjId, this.formId, item.pageFieldName);
              if (pageField === undefined) {
                return;
              }
              const dropDownData: any = customData.filter((element: any) => element.field = pageField.dbFieldName)[0];

              if (dropDownData !== undefined) {
                this.itemsList.push({
                  objectName: item.objectName,
                  name: item.objectName,
                  widget: 'dxSelectBox',
                  location: item.location,
                  locateInMenu: 'never',
                  visible: item.visible,
                  disabled: item.disabled,
                  options: {
                    width: item.text || 'auto',
                    valueExpr: dropDownData.field,
                    displayExpr: dropDownData.field,
                    stylingMode:  'outlined',
                    type: 'default',
                    value: dropDownData.value,
                    items: dropDownData.items,
                    labelMode: 'static',
                    label: label || ' ',

                    onValueChanged: (args: any, ) => {
                      const value = args.value;

                      // set page field value
                      this.gtsDataService.setPageFieldValue(this.prjId, this.formId, pageField.pageFieldName, value);
                      
                      // update customData with new value              
                      this.customData
                      .filter((element: any) => element.field = pageField.dbFieldName)[0]
                      .value = value;

                      const data: any = {
                        selectedValue: value,
                        object: item.objectName,
                        pageField: pageField
                      };

                      // emit new value event
                      this.newValueEvent.emit(data);                  
                    },
                  }
                });
              }
              
            }
          }  
        }
      } 

      // check if toolbar has items visible
      if (this.itemsList.filter((element: any) => element.visible).length === 0) {
        this.toolbarVisible = false;
      } else {
        this.toolbarVisible = true;
      }
    }
  }

  //========= ACTIONS DATA AND EVENTS =================

  actionToolbar: any = {};
  actionSheetTarget: any = {};

  prepareActionData(el: any, actionToolbar: any): void {
    this.actionSheetTarget = el.element;

    this.actionToolbar = {};
    this.actionToolbar.actionList  = [];
    this.actionToolbar.flagPopover = actionToolbar.flagPopover;
    
    let actionList: any = [];
    actionToolbar
    .itemsList
    .forEach((item: any) => {
      let icon: string = '';  
      if (item.stdImageId !== undefined && item.stdImageId !== null && item.stdImageId !== '') {
        icon = '/assets/icons/stdImage_'+item.stdImageId+'.png';
      } else {
        if (item.iconId !== undefined && item.iconId !== null && item.iconId !== '') {
          icon = '/assets/icons/icon_'+item.iconId+'.svg';
        } else {
          icon = '';
        }
      }
      
      const button: any = {
        id: item.objectName,
        name: item.objectName,
        objectName: item.objectName,
        actionName: item.actionName,
        visible: item.visible,  
        disabled: item.disabled,                       
        text: item.text,        
        icon: icon,
        type: item.buttonType,
      };

      actionList.push(button);
    });

    this.actionToolbar.actionList = actionList;

    this.actionToolbar.visible = true;
  }

  actionClick(event: any) {
    this.gtsDataService.runAction(this.prjId, this.formId, event.itemData.actionName);    
  }
}
