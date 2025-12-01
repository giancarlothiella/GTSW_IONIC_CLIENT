import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';
import { 
  DxButtonModule, 
  DxColorBoxModule, 
  DxDataGridModule, 
  DxHtmlEditorModule, 
  DxPopupModule, 
  DxTabsModule, 
  DxTextAreaModule, 
  DxTextBoxModule, 
  DxToolbarModule 
} from 'devextreme-angular';
import { ArrayStore, DataSource } from 'devextreme/common/data';

@Component({
  selector: 'app-gts-html',
  standalone: true,
  imports: [
    CommonModule, 
    DxButtonModule, 
    DxColorBoxModule, 
    DxDataGridModule, 
    DxHtmlEditorModule, 
    DxPopupModule, 
    DxTabsModule, 
    DxTextAreaModule, 
    DxTextBoxModule, 
    DxToolbarModule
  ],
  templateUrl: './gts-html.component.html',
  styleUrls: ['./gts-html.component.scss']
})
export class GtsHtmlComponent implements OnInit {
  constructor(
    private gtsDataService: GtsDataService,
    private changeDetector: ChangeDetectorRef
  ) { }


  @Input()
  mode: string = 'view';

  @Input()
  data: any = {};

  @Output()
  dataSaved = new EventEmitter<any>();

  sessionData: any = {};
  editToolbarList: any = [];
  
  showMMTags: boolean = false;
  showHtmlEditor: boolean = false;

  htmlEditor: any = {};
  htmlTitle: string = '';
  htmlPosition: any = {};
  valueContent: string = '';
  testData: any = {};
  languageTabs: any[] = [];
  languageDataStore: any = {};
  languageDataSource: any = {};
  languageIndex: number = 0;
  colorValue: string = '#000000';
  rowHeight: string = '40px';
  languageTabsComponent: any = {};
  languageTabsDataStore: any = {};
  languageTabsDataSource: any = {};

  fieldsDataStore: any = {};
  fieldsDataSource: any = {};

  testDataVisible: boolean = false;
  testDataString: string = '';
  testValueContent: string = '';

  resultDataVisible: boolean = false; 

  languages: any = [];
  languageToolbarList: any = [];
  languagesVisible: boolean = false;
  languagesDataStore: any = {};
  languagesDataSource: any = {};
  languageFocusedRowIndex: number = -1;
  languagesPopupHeight: number = 400;
  
  changed: boolean = false;
  saved: boolean = false;


  ngOnInit(): void {
    this.showMMTags = this.mode === 'edit' ? true : false;
    this.languageTabs = [];

    // Controllo di sicurezza: se data è null o undefined, inizializza con un oggetto vuoto
    if (!this.data) {
      this.data = {
        htmlArray: [],
        languages: [],
        fields: [],
        code: '',
        description: '',
        testData: {
          htmlParams: {},
          htmlArray: []
        }
      };
    }

    if (this.data.htmlArray === undefined) {
      this.data.htmlArray = [];
    } else if (this.data.languages && this.data.languages.length > 0) {
      this.data.htmlArray.forEach((html: any) => {
        const languageMatch = this.data.languages.filter((language: any) => language.languageId === html.languageId);
        if (languageMatch.length > 0) {
          const stdImageId = languageMatch[0].stdImageId;

          this.languageTabs.push({
            id: html.languageId,
            icon: '/assets/icons/stdImage_'+stdImageId+'.png',
            text: html.languageId,
            visible: true
          });
        }
      });
    }

    this.languageTabsDataStore = new ArrayStore({
      data: this.languageTabs,
      key: ['id']
    });

    this.languageTabsDataSource = new DataSource({
      store: this.languageTabsDataStore        
    });

    this.sessionData = structuredClone(this.data);
    if (this.data.htmlArray !== undefined && this.data.htmlArray.length > 0) {
      this.valueContent = this.sessionData.htmlArray[this.languageIndex].text;
      this.colorValue = this.sessionData.htmlArray[this.languageIndex].titleColor;
      this.rowHeight = this.sessionData.htmlArray[this.languageIndex].rowHeight;
      this.testData = this.sessionData.testData;    
    } else {
      this.data.languages
      .filter((language: any) => language.active)
      .forEach((language: any) => {
        this.sessionData.htmlArray.push({
          languageId: language.languageId,
          text: 'Empty HTML',
          titleColor: '#000000',
          rowHeight: '40px'
        });
      });

      this.data.languages
      .filter((language: any) => language.active)
      .forEach((language: any) => {
        this.data.htmlArray.push({
          languageId: language.languageId,
          text: 'Empty HTML',
          titleColor: '#000000',
          rowHeight: '40px'
        });
      });
      this.valueContent = 'Empty HTML';
      this.colorValue = '#000000';
      this.rowHeight = '40px';
      this.testData = {
        "htmlParams": {},
        "htmlArray": []
      };

      if (this.data.languages && this.data.languages.length > 0) {
        this.data.htmlArray.forEach((html: any) => {
          const languageMatch = this.data.languages.filter((language: any) => language.languageId === html.languageId);
          if (languageMatch.length > 0) {
            const stdImageId = languageMatch[0].stdImageId;

            this.languageTabs.push({
              id: html.languageId,
              icon: '/assets/icons/stdImage_'+stdImageId+'.png',
              text: html.languageId,
              visible: true
            });
          }
        });
      }
    }

    if (this.sessionData.fields === undefined || this.sessionData.fields.length === 0) {
      this.sessionData.fields = [];
      this.sessionData.fields.push({
        fieldName: 'undefined_field',
      });  
    }
    
    this.fieldsDataStore = new ArrayStore({
      data: this.sessionData.fields,
      key: ['fieldName']
    });       
      
    this.fieldsDataSource = new DataSource({
      store: this.fieldsDataStore
    });

    // Controllo di sicurezza per languages
    if (!this.data.languages) {
      this.data.languages = [];
    }

    this.data.languages.forEach((language: any) => {
      this.languages.push({
        flag: '/assets/icons/stdImage_'+language.stdImageId+'.png',
        languageId: language.languageId,
        description: language.description,
        selected: this.data.htmlArray.filter((html: any) => html.languageId === language.languageId).length > 0 ? true : false
      });
    });

    this.languagesDataStore = new ArrayStore({
      data: this.languages,
      key: ['languageId']
    });       
      
    this.languagesDataSource = new DataSource({
      store: this.languagesDataStore        
    });
      
      
    this.htmlTitle = this.data.description;

    this.loadToolbar();
    this.languageIndex = 0;
    this.showHtmlEditor = true;
  }

  loadToolbar() {
    this.editToolbarList.push({
      name: 'htmlTitle',
      widget: 'dxButton',
      location: 'center',
      locateInMenu: 'never',   
      visible: true,
      readOnly: true,
      options: {
        text: this.sessionData.code +' - '+ this.sessionData.description,          
      }
    });

    let button: any = {
      name: 'getLanguage',
      widget: 'dxButton',
      location: 'before',
      locateInMenu: 'auto',   
      visible: this.showMMTags,  
      options: {
        stylingMode: 'contained',            
        text: 'Languages',        
        icon: 'add',
        type: 'normal',
        onClick: (el: any) => {
          this.prepareLanguages();
          this.languagesVisible = true;
        }
      }            
    };

    this.editToolbarList.push(button);

    button = {
      name: 'editTestData',
      widget: 'dxButton',
      location: 'before',
      locateInMenu: 'auto',   
      visible: this.showMMTags,  
      options: {
        stylingMode: 'contained',            
        text: 'Edit Test Data',        
        icon: 'edit',
        type: 'normal',
        onClick: (el: any) => {
          // stringigy and beautify testData Object
          this.testDataString = JSON.stringify(this.sessionData.testData, null, 2);
          this.testDataVisible = true;
        }
      }            
    };

    this.editToolbarList.push(button);

    button = {
      name: 'testResult',
      widget: 'dxButton',
      location: 'before',
      locateInMenu: 'auto',   
      visible: true,  
      options: {
        stylingMode: 'contained',            
        text: 'Test Result',        
        icon: 'check',
        type: 'default',
        onClick: async (el: any) => {
          const previewResult = {
            htmlString: this.valueContent,
            htmlParams: this.testData.htmlParams,
            htmlArray: this.testData.htmlArray,
            titleColor: this.colorValue,
            rowHeight: this.rowHeight
          }
          
          const resultData = await this.gtsDataService.execMethod('data', 'getMailMergeHtml', previewResult);
          this.testValueContent = resultData.htmlString;
          this.resultDataVisible = true;
        }
      }            
    };

    this.editToolbarList.push(button);

    button = {
      name: 'rollBack',
      widget: 'dxButton',
      location: 'after',
      locateInMenu: 'auto',   
      visible: false,  
      options: {
        stylingMode: 'contained',            
        text: 'Roll Back',        
        icon: 'remove',
        type: 'danger',
        onClick: (el: any) => {
          this.rollBackClick();
        }
      }            
    };

    this.editToolbarList.push(button);

    button = {
      name: 'saveChanges',
      widget: 'dxButton',
      location: 'after',
      locateInMenu: 'auto',   
      visible: false,  
      options: {
        stylingMode: 'contained',            
        text: 'Save Changes',        
        icon: 'save',
        type: 'success',
        onClick: (el: any) => {
          this.saveClick();
        }
      }            
    };

    this.editToolbarList.push(button);
  }

  prepareLanguages() {
    let button: any = {
      name: 'addLanguage',
      widget: 'dxButton',
      location: 'before',
      locateInMenu: 'auto',   
      visible: false, 
      options: {
        stylingMode: 'contained',            
        text: 'Add Language',        
        icon: 'add',
        type: 'default',
        onClick: (el: any) => {
          this.addLanguage();
        }
      }            
    };

    this.languageToolbarList.push(button);

    button = {
      name: 'removeLanguage',
      widget: 'dxButton',
      location: 'before',
      locateInMenu: 'auto',   
      visible: false,
      options: {
        stylingMode: 'contained',            
        text: 'Remove Language',        
        icon: 'remove',
        type: 'danger',
        onClick: (el: any) => {
          this.removeLanguage();
        }
      }            
    };

    this.languageToolbarList.push(button);

    this.languagesPopupHeight = this.languages.length * 55 + 144;
  }

  onRowDblClick(event: any) {
    this.htmlPosition = this.htmlEditor.getSelection(true);
    this.htmlEditor.insertText(this.htmlPosition.index, '{{'+event.data.fieldName+'}}');
    this.changed = true;
    this.saved = false;
  }

  onLanguageTabClick(event: any) {
    const savedChandedStatus = this.changed;
    this.showHtmlEditor = false;
    this.sessionData.htmlArray[this.languageIndex].text = this.valueContent;
    this.sessionData.htmlArray[this.languageIndex].titleColor = this.colorValue;
    this.sessionData.htmlArray[this.languageIndex].rowHeight = this.rowHeight;

    this.languageIndex = event.itemIndex;    
    this.valueContent = this.sessionData.htmlArray[this.languageIndex].text;    
    this.colorValue = this.sessionData.htmlArray[this.languageIndex].titleColor;
    this.rowHeight = this.sessionData.htmlArray[this.languageIndex].rowHeight;
    this.changeDetector.detectChanges();
    this.showHtmlEditor = true;

    this.changed = savedChandedStatus;
    if (this.changed === true) {
      this.showSaveRollBackButtons();
    } else {
      this.hideSaveRollBackButtons();
    }
  }

  rollBackClick() {
    // clear sessionData
    this.sessionData = structuredClone(this.data);

    this.fieldsDataStore = new ArrayStore({
      data: this.sessionData.fields,
      key: ['fieldName']
    });       
      
    this.fieldsDataSource = new DataSource({
      store: this.fieldsDataStore        
    });

    this.valueContent = this.sessionData.htmlArray[this.languageIndex].text; 
    this.colorValue = this.sessionData.htmlArray[this.languageIndex].titleColor;
    this.rowHeight = this.sessionData.htmlArray[this.languageIndex].rowHeight;   
    this.testData = this.sessionData.testData;

    setTimeout(() => {
      this.changed = false;
      this.saved = false;    
      this.hideSaveRollBackButtons();
    }, 10);
  }

  saveClick() {
    this.saved = true;

    // Aggiorna i dati della lingua corrente prima di salvare
    this.sessionData.htmlArray[this.languageIndex].text = this.valueContent;
    this.sessionData.htmlArray[this.languageIndex].titleColor = this.colorValue;
    this.sessionData.htmlArray[this.languageIndex].rowHeight = this.rowHeight;

    console.log('Saving sessionData:', this.sessionData);

    // save sessionData to data without reclone the data
    this.data['savedFields'] = this.sessionData.fields;
    this.data['savedHtmlArray'] = this.sessionData.htmlArray;
    this.data['savedTestData'] = this.sessionData.testData;
    this.data['saved'] = this.saved;
    this.hideSaveRollBackButtons();

    // Emetti i dati salvati al parent component
    // Il parent si occuperà di inviare il form request dopo aver aggiornato i dati
    this.dataSaved.emit({
      savedFields: this.sessionData.fields,
      savedHtmlArray: this.sessionData.htmlArray,
      savedTestData: this.sessionData.testData,
      saved: this.saved
    });
  }

  onRowChanged(event: any) {
    this.changed = true;
    this.saved = false;
    this.showSaveRollBackButtons();      
  }

  onHtmlEditorInitialized(event: any) {
    this.htmlEditor = event.component;
  }

  onHtmlValueChanged(event: any) {
    this.sessionData.htmlArray[this.languageIndex].text = event.value;
    this.changed = true;
    this.saved = false;
    this.showSaveRollBackButtons();  
  }

  hideSaveRollBackButtons() {
    this.editToolbarList.filter((button: any) => button.name === 'saveChanges')[0].visible = false;
    this.editToolbarList.filter((button: any) => button.name === 'rollBack')[0].visible = false;
  }

  showSaveRollBackButtons() {
    this.editToolbarList.filter((button: any) => button.name === 'saveChanges')[0].visible = true;
    this.editToolbarList.filter((button: any) => button.name === 'rollBack')[0].visible = true;
  }

  onColorValueChanged(event: any) {
    this.sessionData.htmlArray[this.languageIndex].titleColor = event.value;
    this.changed = true;
    this.saved = false;
    this.showSaveRollBackButtons();  
  }

  onRowHeightChanged(event: any) {
    this.sessionData.htmlArray[this.languageIndex].rowHeight = event.value;
    this.changed = true;
    this.saved = false;
    this.showSaveRollBackButtons();  
  }

  onSaveTestData() {
    this.sessionData.testData = JSON.parse(this.testDataString);
    this.testData = this.sessionData.testData;
    this.testDataVisible = false;
    this.changed = true;
    this.saved = false;
    this.showSaveRollBackButtons();  
  }

  onCancelTestData() {
    this.testDataVisible = false;
  }

  onLanguageRowDblClick(event: any) {
    // Language row double click handler
  }

  addLanguage() {
    this.sessionData.htmlArray.push({
      languageId: this.languages[this.languageFocusedRowIndex].languageId,
      text: '',
      titleColor: '#000000',
      rowHeight: '40px'
    });

    const languageMatch = this.data.languages?.filter((language: any) => language.languageId === this.languages[this.languageFocusedRowIndex].languageId);
    const stdImageId = languageMatch && languageMatch.length > 0 ? languageMatch[0].stdImageId : 1922;
    this.languageTabs.push({
      id: this.languages[this.languageFocusedRowIndex].languageId,
      text: this.languages[this.languageFocusedRowIndex].languageId,  
      icon: '/assets/icons/stdImage_'+stdImageId+'.png',    
      visible: true
    });

    this.languageTabsDataSource.load();
    
    this.languageIndex = this.sessionData.htmlArray.length - 1;

    this.languages[this.languageFocusedRowIndex].selected = true;
    this.valueContent = '';
    this.colorValue = '#000000';
    this.rowHeight = '40px';
    this.testData = {
      "htmlParams": {},
      "htmlArray": []
    };

    this.languagesVisible = false;
    this.languageFocusedRowIndex = -1;
    this.changed = true;
    this.saved = false;
    this.showSaveRollBackButtons();
  }

  removeLanguage() {
    this.sessionData.htmlArray.splice(this.languageIndex, 1);
    this.languageTabs.splice(this.languageIndex, 1);
    this.languageTabsDataSource.load();
    this.languageIndex = 0;
    this.valueContent = this.sessionData.htmlArray[this.languageIndex].text;
    this.colorValue = this.sessionData.htmlArray[this.languageIndex].titleColor;
    this.rowHeight = this.sessionData.htmlArray[this.languageIndex].rowHeight;
    this.languages[this.languageFocusedRowIndex].selected = false;

    this.languagesVisible = false;
    this.languageFocusedRowIndex = -1;
    this.changed = true;
    this.saved = false;
    this.showSaveRollBackButtons();
  }

  onLanguageFocusedRowChanging(event: any) {
    this.languageToolbarList.filter((button: any) => button.name === 'addLanguage')[0].visible = !this.languages[event.newRowIndex].selected ;
    this.languageToolbarList.filter((button: any) => button.name === 'removeLanguage')[0].visible = this.languages[event.newRowIndex].selected ;
  }

  onLanguageTabsInitialized(event: any) {
    this.languageTabsComponent = event.component;
  }
}
