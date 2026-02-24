import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GtsDataService } from '../../services/gts-data.service';
import { QuillModule, QuillEditorComponent } from 'ngx-quill';
import {
  IonButton,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonInput,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonTextarea,
  IonFooter
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-gts-html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    QuillModule,
    IonButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonInput,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonTextarea,
    IonFooter
  ],
  templateUrl: './gts-html.component.html',
  styleUrls: ['./gts-html.component.scss']
})
export class GtsHtmlComponent implements OnInit {
  constructor(
    private gtsDataService: GtsDataService,
    private changeDetector: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) { }

  @Input() mode: string = 'view';
  @Input() data: any = {};
  @Output() dataSaved = new EventEmitter<any>();

  @ViewChild('quillEditor') quillEditor: QuillEditorComponent | undefined;

  sessionData: any = {};
  showMMTags: boolean = false;
  showHtmlEditor: boolean = false;

  htmlTitle: string = '';
  valueContent: string = '';
  testData: any = {};
  languageTabs: any[] = [];
  languageIndex: number = 0;
  colorValue: string = '#000000';
  rowHeight: string = '40px';

  fieldsData: any[] = [];
  testDataVisible: boolean = false;
  testDataString: string = '';
  testValueContent: SafeHtml = '';
  resultDataVisible: boolean = false;

  languages: any = [];
  languagesVisible: boolean = false;
  languageFocusedRowIndex: number = -1;

  changed: boolean = false;
  saved: boolean = false;

  // Quill configuration
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image'],
      ['clean'],
      [{ 'table': 'insert-table' }]
    ]
  };

  ngOnInit(): void {
    this.showMMTags = this.mode === 'edit';
    this.languageTabs = [];

    // Initialize data
    if (!this.data) {
      this.data = {
        htmlArray: [],
        languages: [],
        fields: [],
        code: '',
        description: '',
        testData: { htmlParams: {}, htmlArray: [] }
      };
    }

    if (!this.data.htmlArray) {
      this.data.htmlArray = [];
    }

    // Build language tabs
    if (this.data.languages && this.data.languages.length > 0 && this.data.htmlArray.length > 0) {
      this.data.htmlArray.forEach((html: any) => {
        const languageMatch = this.data.languages.find((lang: any) => lang.languageId === html.languageId);
        if (languageMatch) {
          this.languageTabs.push({
            id: html.languageId,
            icon: '/assets/icons/stdImage_' + languageMatch.stdImageId + '.png',
            text: html.languageId,
            visible: true
          });
        }
      });
    }

    this.sessionData = structuredClone(this.data);

    if (this.sessionData.htmlArray && this.sessionData.htmlArray.length > 0) {
      this.valueContent = this.sessionData.htmlArray[0].text || '';
      this.colorValue = this.sessionData.htmlArray[0].titleColor || '#000000';
      this.rowHeight = this.sessionData.htmlArray[0].rowHeight || '40px';
      this.testData = this.sessionData.testData || { htmlParams: {}, htmlArray: [] };
    } else {
      // Initialize empty HTML for active languages
      this.data.languages
        ?.filter((lang: any) => lang.active)
        .forEach((lang: any) => {
          const newHtml = {
            languageId: lang.languageId,
            text: 'Empty HTML',
            titleColor: '#000000',
            rowHeight: '40px'
          };
          this.sessionData.htmlArray.push(newHtml);
          this.data.htmlArray.push(structuredClone(newHtml));

          this.languageTabs.push({
            id: lang.languageId,
            icon: '/assets/icons/stdImage_' + lang.stdImageId + '.png',
            text: lang.languageId,
            visible: true
          });
        });

      this.valueContent = 'Empty HTML';
      this.testData = { htmlParams: {}, htmlArray: [] };
    }

    // Initialize fields
    this.fieldsData = this.sessionData.fields && this.sessionData.fields.length > 0
      ? [...this.sessionData.fields]
      : [{ fieldName: 'undefined_field' }];

    // Initialize languages list
    this.data.languages?.forEach((language: any) => {
      this.languages.push({
        flag: '/assets/icons/stdImage_' + language.stdImageId + '.png',
        languageId: language.languageId,
        description: language.description,
        selected: this.data.htmlArray.some((html: any) => html.languageId === language.languageId)
      });
    });

    this.htmlTitle = this.data.code + ' - ' + this.data.description;
    this.showHtmlEditor = true;
  }

  onLanguageTabChange(event: any) {
    const savedChangedStatus = this.changed;
    this.showHtmlEditor = false;

    // Save current language data
    this.sessionData.htmlArray[this.languageIndex].text = this.valueContent;
    this.sessionData.htmlArray[this.languageIndex].titleColor = this.colorValue;
    this.sessionData.htmlArray[this.languageIndex].rowHeight = this.rowHeight;

    // Switch to new language
    this.languageIndex = this.languageTabs.findIndex((tab: any) => tab.id === event.detail.value);
    this.valueContent = this.sessionData.htmlArray[this.languageIndex].text;
    this.colorValue = this.sessionData.htmlArray[this.languageIndex].titleColor;
    this.rowHeight = this.sessionData.htmlArray[this.languageIndex].rowHeight;

    this.changeDetector.detectChanges();
    this.showHtmlEditor = true;
    this.changed = savedChangedStatus;
  }

  onFieldClick(field: any) {
    if (this.quillEditor && this.quillEditor.quillEditor) {
      const range = this.quillEditor.quillEditor.getSelection(true);
      this.quillEditor.quillEditor.insertText(range.index, '{{' + field.fieldName + '}}');
      this.onContentChanged();
    }
  }

  addField() {
    this.fieldsData.push({ fieldName: 'new_field' });
    this.sessionData.fields = [...this.fieldsData];
    this.onContentChanged();
  }

  deleteField(index: number) {
    this.fieldsData.splice(index, 1);
    this.sessionData.fields = [...this.fieldsData];
    this.onContentChanged();
  }

  onContentChanged() {
    this.changed = true;
    this.saved = false;
  }

  onColorValueChanged(event: any) {
    this.sessionData.htmlArray[this.languageIndex].titleColor = event.detail.value;
    this.onContentChanged();
  }

  onRowHeightChanged(event: any) {
    this.sessionData.htmlArray[this.languageIndex].rowHeight = event.detail.value;
    this.onContentChanged();
  }

  openLanguages() {
    // Non resettare la selezione, mantieni l'ultima riga selezionata se presente
    this.languagesVisible = true;
  }

  openTestData() {
    this.testDataString = JSON.stringify(this.sessionData.testData, null, 2);
    this.testDataVisible = true;
  }

  saveTestData() {
    try {
      this.sessionData.testData = JSON.parse(this.testDataString);
      this.testData = this.sessionData.testData;
      this.testDataVisible = false;
      this.onContentChanged();
    } catch (e) {
      console.error('Invalid JSON:', e);
    }
  }

  cancelTestData() {
    this.testDataVisible = false;
  }

  async testResult() {
    const previewResult = {
      htmlString: this.valueContent,
      htmlParams: this.testData.htmlParams,
      htmlArray: this.testData.htmlArray,
      titleColor: this.colorValue,
      rowHeight: this.rowHeight
    };

    const resultData = await this.gtsDataService.execMethod('data', 'getMailMergeHtml', previewResult);
    this.testValueContent = this.sanitizer.bypassSecurityTrustHtml(resultData.htmlString);
    this.resultDataVisible = true;
  }

  rollBack() {
    this.sessionData = structuredClone(this.data);
    this.fieldsData = [...this.sessionData.fields];
    this.valueContent = this.sessionData.htmlArray[this.languageIndex].text;
    this.colorValue = this.sessionData.htmlArray[this.languageIndex].titleColor;
    this.rowHeight = this.sessionData.htmlArray[this.languageIndex].rowHeight;
    this.testData = this.sessionData.testData;

    setTimeout(() => {
      this.changed = false;
      this.saved = false;
    }, 10);
  }

  saveChanges() {
    this.saved = true;

    // Update current language data
    this.sessionData.htmlArray[this.languageIndex].text = this.valueContent;
    this.sessionData.htmlArray[this.languageIndex].titleColor = this.colorValue;
    this.sessionData.htmlArray[this.languageIndex].rowHeight = this.rowHeight;

    this.data['savedFields'] = this.sessionData.fields;
    this.data['savedHtmlArray'] = this.sessionData.htmlArray;
    this.data['savedTestData'] = this.sessionData.testData;
    this.data['saved'] = this.saved;

    this.dataSaved.emit({
      savedFields: this.sessionData.fields,
      savedHtmlArray: this.sessionData.htmlArray,
      savedTestData: this.sessionData.testData,
      saved: this.saved
    });

    this.changed = false;
  }

  addLanguage() {
    // Se c'è una riga selezionata, aggiungi quella lingua
    if (this.languageFocusedRowIndex >= 0) {
      const lang = this.languages[this.languageFocusedRowIndex];

      // Non aggiungere se è già selezionata
      if (lang.selected) {
        return;
      }

      this.sessionData.htmlArray.push({
        languageId: lang.languageId,
        text: '',
        titleColor: '#000000',
        rowHeight: '40px'
      });

      this.languageTabs.push({
        id: lang.languageId,
        text: lang.languageId,
        icon: lang.flag,
        visible: true
      });

      this.languageIndex = this.sessionData.htmlArray.length - 1;
      lang.selected = true;
      this.valueContent = '';
      this.colorValue = '#000000';
      this.rowHeight = '40px';

      this.languagesVisible = false;
      this.onContentChanged();
    } else {
      // Se nessuna riga è selezionata, aggiungi la prima lingua non selezionata
      const firstUnselected = this.languages.find((lang: any) => !lang.selected);
      if (firstUnselected) {
        this.sessionData.htmlArray.push({
          languageId: firstUnselected.languageId,
          text: '',
          titleColor: '#000000',
          rowHeight: '40px'
        });

        this.languageTabs.push({
          id: firstUnselected.languageId,
          text: firstUnselected.languageId,
          icon: firstUnselected.flag,
          visible: true
        });

        this.languageIndex = this.sessionData.htmlArray.length - 1;
        firstUnselected.selected = true;
        this.valueContent = '';
        this.colorValue = '#000000';
        this.rowHeight = '40px';

        this.languagesVisible = false;
        this.onContentChanged();
      }
    }
  }

  removeLanguage() {
    if (this.languageFocusedRowIndex >= 0) {
      const lang = this.languages[this.languageFocusedRowIndex];
      const tabIndex = this.languageTabs.findIndex((tab: any) => tab.id === lang.languageId);

      if (tabIndex >= 0) {
        this.sessionData.htmlArray.splice(tabIndex, 1);
        this.languageTabs.splice(tabIndex, 1);

        this.languageIndex = 0;
        this.valueContent = this.sessionData.htmlArray[0]?.text || '';
        this.colorValue = this.sessionData.htmlArray[0]?.titleColor || '#000000';
        this.rowHeight = this.sessionData.htmlArray[0]?.rowHeight || '40px';

        lang.selected = false;
        this.languagesVisible = false;
        this.onContentChanged();
      }
    }
  }

  selectLanguage(index: number) {
    this.languageFocusedRowIndex = index;
  }

  get canAddLanguage(): boolean {
    // ENABLE è attivo solo se hai selezionato una riga E quella lingua NON è ancora abilitata
    if (this.languageFocusedRowIndex < 0 || this.languageFocusedRowIndex >= this.languages.length) {
      return false;
    }
    const selectedLang = this.languages[this.languageFocusedRowIndex];
    return selectedLang && selectedLang.selected === false;
  }

  get canRemoveLanguage(): boolean {
    // REMOVE è attivo solo se hai selezionato una riga E quella lingua è già aggiunta
    if (this.languageFocusedRowIndex < 0 || this.languageFocusedRowIndex >= this.languages.length) {
      return false;
    }
    const selectedLang = this.languages[this.languageFocusedRowIndex];
    return selectedLang && selectedLang.selected === true;
  }
}
