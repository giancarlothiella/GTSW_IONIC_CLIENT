import { Component, AfterViewInit, ChangeDetectorRef, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';
import {
  DxButtonModule,
  DxCheckBoxModule,
  DxDateBoxModule,
  DxRadioGroupModule,
  DxSelectBoxModule,
  DxTextAreaModule,
  DxTextBoxModule
} from 'devextreme-angular';
import { GtsToolbarComponent } from '../gts-toolbar/gts-toolbar.component';
import notify from 'devextreme/ui/notify';
import { GtsLookupComponent } from '../gts-lookup/gts-lookup.component';

@Component({
  selector: 'app-gts-form',
  standalone: true,
  imports: [
    CommonModule,
    DxButtonModule,
    DxCheckBoxModule,
    DxDateBoxModule,
    DxRadioGroupModule,
    DxSelectBoxModule,
    DxTextAreaModule,
    DxTextBoxModule,
    GtsToolbarComponent,
    GtsLookupComponent
  ],
  templateUrl: './gts-form.component.html',
  styleUrls: ['./gts-form.component.scss']
})
export class GtsFormComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    private gtsDataService: GtsDataService,
    private changeDetector: ChangeDetectorRef
  ) { }

  @Input()
  prjId: string ='';

  @Input()
  formId: number = 0;

  @Input()
  objectName: string = '';

  formRepListenerSubs: Subscription | undefined; 
  formExternalListenerSubs: Subscription | undefined; 
  formFormFocusListenerSubs: Subscription | undefined; 

  ngAfterViewInit() {
    this.changeDetector.detectChanges();
    for (let i = 0; i < this.formData.length; i++) {
      if (!this.formData[i].disabled && !this.formData[i].readOnly  ) {
        this.focusComponent = this.formData[i].component;
        if (this.focusComponent !== undefined && this.focusComponent !== null && this.focusComponent.focus !== undefined && this.focusComponent.focus !== null) {
          this.focusComponent.focus(); 
        }
        if (this.focusComponent !== undefined) {
          this.focusComponent.focus();        
          break;
        }
      }
    }
  }

  //========= ON INIT =================
  async ngOnInit() {
    this.passwMode = 'password';

    // Form Focus Listener
    this.formFormFocusListenerSubs = this.gtsDataService
    .getFormFocusListener()
    .subscribe(() => { 
      this.formReady = true;
      this.changeDetector.detectChanges();
      if (this.focusComponent !== undefined && this.focusComponent !== null && this.focusComponent.focus !== undefined && this.focusComponent.focus !== null) {
        this.focusComponent.focus();   
      }            
    });

    // Form Req Listener
    this.formRepListenerSubs = this.gtsDataService
    .getFormRepListener()
    .subscribe((reply) => { 
      if (reply.message === 'POPUP_HIDDEN') {
        this.gtsDataService.sendAppLoaderListener(false);
      }

      if (reply.message === 'aiInstrAnswer') {
        if (reply.valid) {
          this.formData.forEach((field: any) => {
            if (field.objectName === 'gtsFldqSchedule_taskSchedule') {
              field.value = reply.data.cronString;
            }

            if (field.objectName === 'gtsFldqSchedule_taskNarrative') {
              field.value = reply.data.period;
            }
          });
        }
        this.gtsDataService.sendAppLoaderListener(false);
      }

      this.customDecodeResult = reply.valid;    
      this.customDecodeMessage = reply.message; 
      this.waitForCustomDecode = false;

      // ======= PASSWORD DECODE =======
      if (this.customDecodeMessage === 'PASSWORD') {
        this.passwMode = reply.showPassw === true ? '' : 'password';
        this.formData.forEach((field: any) => {
          if (field.objectName.toLowerCase().includes('password')) {
            field.mode = this.passwMode;
          }
        });       
        this.gtsDataService.sendAppLoaderListener(false);
      }      
    });

    // Form External Data Listener
    this.formExternalListenerSubs = this.gtsDataService
    .getFormExternalListener()
    .subscribe((fields) => {
      if (fields === undefined || fields === null) {
        return;
      }      
      
      fields.forEach((field: any) => {        
        this.formData
        .filter((f: any) => f.objectName === field.fieldName)
        .forEach((formField: any) => {
          formField.updateFromLookUp = true
          formField.value = field.fieldValue;           
        });
      });
    });
    
    this.formReady = false;
    this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'forms', this.objectName);   
    if ( this.metaData !== undefined && this.metaData !== null && this.metaData.groupType !== 'PSO' && this.metaData.groupType !== 'WSO')  {
      let toolbar = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'toolbars', this.objectName); 
      // assign visigble to submit toolbar buttons
      toolbar.itemsList.forEach((item: any) => {
        item.visible = true;       
      });

      this.showToolbar = true;
    }

    this.prepareFormData();
  }

  ngAfterContentChecked(): void {
    this.changeDetector.detectChanges();
  }

  //========= ON DESTROY =================
  ngOnDestroy(): void {
    this.formRepListenerSubs?.unsubscribe();    
    this.formFormFocusListenerSubs?.unsubscribe();
    this.formExternalListenerSubs?.unsubscribe();
  } 

  //========= GLOBALS =================
  metaData: any = {};
  metaDataTB: any = {};
  actualView: string = '';
  formReady: boolean = false;
  waitForCustomDecode: boolean = false;
  customDecodeResult: boolean = false;
  customDecodeMessage: string = '';
  showToolbar: boolean = true;

  //========= FORM DATA =================
  formTitle: string = '';
  formTitleStyle: string = '';
  formLayout: string = '';  
  showPopUp: boolean = false;
  showTitle: boolean = false;
  formStyle: string = 'width: 100%; height: 100%;';
  formData: any[] = [];
  formHeight: number = 0;
  formWidth: number = 0;
  lookUpField: any = {};
  focusComponent: any = {};
  passwMode: string = 'password';
  
  //========= FORM CSS =================  
  formCSSTitle: string = '';
  formCSSBody: string = '';
  formCSSToolbar: string = '';
  formCSSField: string = '';
  formCSSPkField: string = '';
  formCSSRoField: string = '';

  //========= FORM EVENTS =================
  async toolbarSubmitEvent(event: any) {    
    const valid = await this.formValidation();
    if (valid) {
      console.log('Form is valid, submitting...', this.formData);
      this.formData.forEach((field: any) => {
        // convert value format depending if dataType is N or D
        if (field.dataType === 'N' && field.value !== undefined && field.value !== null && field.value !== '') {
          field.value = Number(field.value);
        }

        this.gtsDataService.setFormFieldValue(this.prjId, this.formId, this.objectName, field.objectName, field.value);        
      });
      this.gtsDataService.runAction(this.prjId, this.formId, event.actionName);
    }
  }

  lookUpSubmitEvent(event: any) {
    let field = this.formData.filter(f => f.sqlQueryField === this.lookUpField.fieldName && f.objectName === this.lookUpField.lookUpName)[0];
    if (event !== null) {
      field.updateFromLookUp = true;
      field.validated = true;
      field.value = event.fieldValue;

      // Aggiorna anche metaData.fields per sincronizzare i params nelle validazioni successive
      const metaField = this.metaData.fields.filter((f: any) => f.objectName === field.objectName)[0];
      if (metaField) {
        metaField.value = event.fieldValue;
      }

      this.formData
      .filter((f: any) => f.masterFieldName === field.objectName)
      .forEach((formField: any) => {
        formField.value = event.data[formField.fieldName];
      });
    }

    this.changeDetector.detectChanges();
    field.component.focus();
  }

  //========= FORM FUNCTIONS =================
  prepareFormData() {
    this.formTitle = this.metaData.groupCaption;
    this.formLayout = this.metaData.cssStyle;    
    this.showPopUp = this.metaData.groupShowPopUp;  
    this.showTitle = this.metaData.groupCaption !== '' && this.metaData.groupCaption !== undefined && this.metaData.groupCaption !== null;  
    this.formWidth = this.metaData.groupWidth;   
    this.formTitleStyle = 'width: '+this.metaData.groupWidth+'px;'; 
    this.formHeight = this.metaData.groupHeight;
    if (this.formHeight === undefined || this.formHeight === null || this.formHeight === 0) {
      // use metadata label mode
      this.formHeight = 60 + this.metaData.groupRows * (this.metaData.labelMode === 'outside' && this.metaData.stylingMode === 'outlined' ? 48 : 41);
    }
    this.formStyle = 'width: '+this.metaData.groupWidth+'px; height: '+this.formHeight+'px;';    
    
    this.formCSSTitle = this.metaData.cssClass+'Title';
    this.formCSSBody = this.metaData.cssClass+'Body';
    this.formCSSToolbar = this.metaData.cssClass+'Toolbar';
    
    this.formData = [];
    
    for (let i = 0; i < this.metaData.fields.length; i++) {      
      let field: any = {
        id: this.metaData.fields[i].fieldId,
        groupId: this.metaData.groupId,
        fieldId: this.metaData.fields[i].fieldId,
        objectName: this.metaData.fields[i].objectName,
        label: this.metaData.fields[i].fieldLabel,
        type: this.metaData.fields[i].fieldType,
        customCode: this.metaData.fields[i].fieldCode,
        actionName: this.metaData.fields[i].actionName,
        editorType: this.metaData.fields[i].editorType,
        editorTypeML: this.metaData.fields[i].editorTypeML,
        pk: this.metaData.fields[i].isPK,        
        disabled: this.metaData.fields[i].initAsDisabled || this.metaData.fields[i].disabled,
        readOnly: this.metaData.fields[i].initAsReadOnly || this.metaData.fields[i].readOnly,
        gridArea: this.metaData.fields[i].gridArea,
        value: this.gtsDataService.getPageFieldValue(this.prjId, this.formId, this.metaData.fields[i].objectName),
        sqlId: this.metaData.fields[i].sqlId, 
        columns: this.metaData.fields[i].columns,
        sqlKeys: this.metaData.fields[i].sqlKeys,
        sqlQueryField: this.metaData.fields[i].fieldName,
        dataType: this.metaData.fields[i].dataType,
        allowEmpty: this.metaData.fields[i].allowEmpty,
        fieldRangeHigh: this.metaData.fields[i].fieldRangeHigh,
        fieldRangeLow: this.metaData.fields[i].fieldRangeLow,
        forceCheck: this.metaData.fields[i].forceCheck,
        forceUpperCase: this.metaData.fields[i].upperCaseForced,
        style: this.metaData.fields[i].style,
        cssClass: this.metaData.cssClass+'Field',
        cssClassStd: this.metaData.cssClass+'Field',
        cssClassError: this.metaData.cssClass+'FieldError',
        validated: false,   
        updateFromLookUp: false,     
        buttonAction: this.metaData.fields[i].buttonAction,
        areaHeight: this.metaData.fields[i].areaHeight, 
        valueChecked: this.metaData.fields[i].valueChecked,
        valueUnChecked: this.metaData.fields[i].valueUnchecked, 
        sqlCaption: this.metaData.fields[i].sqlCaption,
        visible: true
      }

      // set mode = password if objectname contains password
      if (field.objectName.toLowerCase().includes('password')) {
        field.mode = this.passwMode;
      }      

      let icon = '';
      if (this.metaData.fields[i].stdImageId !== undefined && this.metaData.fields[i].stdImageId !== null && this.metaData.fields[i].stdImageId !== '') {
        icon = '/assets/icons/stdImage_'+this.metaData.fields[i].stdImageId+'.png';
      } else {
        if (this.metaData.fields[i].iconId !== undefined && this.metaData.fields[i].iconId !== null && this.metaData.fields[i].iconId !== '') {
          icon = '/assets/icons/icon_'+this.metaData.fields[i].iconId+'.svg';
        } else {
          icon = '';
        }
      }
      field.buttonIcon = icon;
      field.buttonText = this.metaData.fields[i].buttonText;

      if (field.forceUpperCase) {
        field.inputAttr = { 'style':  "text-transform: uppercase"}  
      }   

      if (this.metaData.fields[i].gridArea !== null && this.metaData.fields[i].gridArea !== undefined && this.metaData.fields[i].gridArea !== '') {
        field.visible = true;
      }
       else {
        field.visible = false;
      }

      if (field.value === undefined || field.value === null) {
        if (this.metaData.fields[i].defaultValue !== undefined && this.metaData.fields[i].defaultValue !== null) {
          if (isNaN(this.metaData.fields[i].defaultValue)) {
            // check for @NEXT first 5 chars
            if (this.metaData.fields[i].defaultValue.substring(0, 5) === '@NEXT') {
              field.value = this.gtsDataService.getNextFieldValue(this.prjId, this.formId, this.metaData.fields[i].defaultValue.substring(6));
            } else {
              // check for @FIELD first 6 chars
              if (this.metaData.fields[i].defaultValue.substring(0, 6) === '@FIELD') {
                field.value = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, this.metaData.fields[i].defaultValue.substring(7));
              } else {
                field.value = this.metaData.fields[i].defaultValue;
              }
            }
          } else {
            field.value = this.metaData.fields[i].defaultValue;
          } 
        }        
      }  
      
      if (this.metaData.fields[i].editorType === 'CheckBox') {
        field.value = field.value === field.valueChecked || field.value === true;
      }

      if (this.metaData.fields[i].editorType === 'TextButtonBox') {
        field.cssClass = this.metaData.cssClass+'LookUpField';
        field.cssClassStd = this.metaData.cssClass+'LookUpField';

        if (this.metaData.fields[i].isPK) {
          field.cssClass = this.metaData.cssClass+'LookUpPKField';
        }
      }

      if (this.metaData.fields[i].editorType === 'RadioGroup') {
        if  (this.metaData.fields[i].isPK) {
          field.cssClass = this.metaData.cssClass+'RadioGroupPKField';
        } else {
          field.cssClass = this.metaData.cssClass+'RadioGroup';
        }
      }
      
      if (this.metaData.fields[i].sqlId !== undefined && this.metaData.fields[i].sqlId !== null && this.metaData.fields[i].sqlId !== '' && this.metaData.fields[i].editorType === 'LookUpBox') {
        field.cssClass = this.metaData.cssClass+'LookUpField';
        field.cssClassStd = this.metaData.cssClass+'LookUpField';

        if (this.metaData.fields[i].isPK) {
          field.cssClass = this.metaData.cssClass+'LookUpPKField';
        }
      }

      if (this.metaData.fields[i].editorType === 'DropDownBox') {
        let dropList: any[] = [];
        if (this.metaData.fields[i].dropDownRows !== undefined && this.metaData.fields[i].dropDownRows !== null && this.metaData.fields[i].dropDownRows.length > 0) {
          this.metaData.fields[i].dropDownRows
          .forEach((item: any) => {
            let row: any = {
              'code': item[this.metaData.fields[i].fieldName],
              'text': item[this.metaData.fields[i].details[0].detailFieldName]
            };
            dropList.push(row);         
          });       
          field.dropDown = dropList;
        } else {
          this.metaData.fields[i].dropDownList
          .forEach((item: any) => {
            let row: any = {
              'code': item.trim(),
              'text': item.trim()
            };
            dropList.push(row);         
          });       
          field.dropDown = dropList;          
        }
      };

      if (this.metaData.fields[i].editorType === 'RadioGroup') {
        // check id field value is equal to default value
        if (field.value === this.metaData.fields[i].defaultValue) {
          field.value = null;
        }
        let radioDefault = this.metaData.fields[i].defaultValue.split(';');
        radioDefault[1] = radioDefault[1].split(',');
        let radioValues: any[] = [];
        
        for (let j = 0; j < this.metaData.fields[i].details.length; j++) {
          let radioValue: any = {
            id: j,
            value: radioDefault[1][j],
            text: this.metaData.fields[i].details[j].pageFieldLabel
          };
          radioValues.push(radioValue);     
        }
        field.radioValues = radioValues;
        
        if (field.value === undefined || field.value === null) {
          field.radioIndex = field.radioValues.findIndex((element: any) => element.value === radioDefault[0]);          
        } else {
          field.radioIndex = field.radioValues.findIndex((element: any) => element.value === field.value);
        }

        if (this.metaData.fields[i].isPK) {
          field.cssClass = this.metaData.cssClass+'PKField';
        }

        field.value = field.radioValues[field.radioIndex].value;
      }
      
      if (this.metaData.fields[i].visible !== undefined && this.metaData.fields[i].visible !== null) {
        field.visible = this.metaData.fields[i].visible;
      }

      this.formData.push(field);

      if (this.metaData.fields[i].details !== undefined && this.metaData.fields[i].details !== null && this.metaData.fields[i].editorType !== 'DropDownBox' && this.metaData.fields[i].editorType !== 'RadioGroup') {
        for (let j = 0; j < this.metaData.fields[i].details.length; j++) {
          let fieldDetail: any = {
            masterFieldName: this.metaData.fields[i].objectName,
            objectName: this.metaData.fields[i].details[j].pageFieldName,
            fieldName: this.metaData.fields[i].details[j].detailFieldName,
            label: this.metaData.fields[i].details[j].pageFieldLabel,
            value: this.metaData.fields[i].details[j].value,
            style: 'grid-area: '+this.metaData.fields[i].details[j].pageFieldName+';',
            readOnly: this.metaData.fields[i].details[j].detailFieldLocked,
            focusStateEnabled: !this.metaData.fields[i].details[j].detailFieldLocked,            
            cssClass: this.metaData.cssClass+'Field',
            editorType: 'TextBox',
            visible: true            
          }        
          
          if (this.metaData.fields[i].details[j].detailFieldLocked) {
            fieldDetail.editorType = 'TextBoxRO';
            field.focusStateEnabled = false;
          } 
          
          this.formData.push(fieldDetail);
        }
      }

      if (this.metaData.fields[i].editorType === 'GroupHdr') {
        field.cssClass = this.metaData.cssClass+'GroupHdr';
        field.focusStateEnabled = false;
      }
    }

    for (let i = 0; i < this.formData.length; i++) {
      if (!this.formData[i].focusStateEnabled) {
        this.formData[i].tabIndex = -1; 
      }
    }

    if (this.metaData.groupType === 'PSO' || this.metaData.groupType === 'WSO') {
      if (this.showPopUp) {
        this.showToolbar = true;
      } else {
        this.showToolbar = false;
        
      }
        this.formHeight = this.formHeight - 44;
        this.formStyle = 'width: '+this.metaData.groupWidth+'px; height: '+this.formHeight+'px;';
        this.formData.forEach((field: any) => {
        field.readOnly = true;
      });
    } else {
      this.showToolbar = true;
    }

    if (!this.showPopUp) {
      this.formReady = true;
    }
  }

  onFieldInput(event: any, element: any)  {
    const field = this.formData.filter(f => f.objectName === element.objectName)[0];
    field.validated = false;
    field.updateFromLookUp = false;
  }

  async onFieldDataChanged(event: any, element: any)  {
    let valid: boolean = true;
    const field = this.formData.filter(f => f.objectName === element.objectName)[0];

    // convert event.previousValue to string if it is not null or undefined
    let previousValue = event.previousValue;
    let currentValue = event.value;
    if (event.previousValue !== null && event.previousValue !== undefined) {
      previousValue = event.previousValue.toString();
    } else {
      previousValue = '';
    }
    if (event.value !== null && event.value !== undefined) {
      currentValue = event.value.toString();
    } else {
      currentValue = '';
    }

    // Only validate if value actually changed
    if (currentValue !== previousValue) {
      field.validated = false;
      valid = await this.fieldValidation(field);

      if (valid) {
        field.validated = true;
        if (field.editorType !== 'RadioGroup') {
          field.value = event.value;
        } else {
          field.value = event.value.value;
        }
      } else {
        field.component.focus();
      }
    }
    return valid;
  }

  async formValidation()  {
    let valid: boolean = true;
    
    for (let i = 0; i < this.formData.length; i++) {      
      if (!this.formData[i].validated || this.formData[i].forceCheck) {
        let field = this.formData[i];
        field.validated = false;
        field.updateFromLookUp = false;
        if (!field.disabled && !field.readOnly) {
          if (field.allowEmpty && (field.value === undefined || field.value === null || field.value === '')) {
            return valid;
          } else {
            valid = await this.fieldValidation(this.formData[i]);              
          }          
        }
      }
    }
    
    return valid;
  }

  getCustomVerifyResult(field: any) {
    return new Promise((resolve) => {
      // Wait for Custom Decode Loop        
      let loopCount = 0;
      let loop = setInterval(() => {
        loopCount++;
        if (!this.waitForCustomDecode || loopCount > 3000) {
          clearInterval(loop);
          field.validationMessage = this.customDecodeMessage;
          resolve(this.customDecodeResult);
        }
      }, 1);          
    })
  };

  async fieldValidation(field: any)  {
    let valid: boolean = true;
    field.validated = true;

    // this.changeDetector.detach();
    let value = field.value;

    // convert to value to number if dataType is N
    if (field.dataType === 'N') {
      // Only parse if value is not empty/null/undefined
      if (value !== undefined && value !== null && value !== '') {
        value = parseFloat(value);
        if (!isNaN(value)) {
          field.value = value;
        }
      }
    }

    if (field.editorType !== 'RadioGroup' && field.editorType !== 'CheckBox') {
      // Force UpperCase
      if (field.forceUpperCase) {
        if (value !== undefined && value !== null) {
          field.value = value.toUpperCase();        
        }
        value = field.value;
      }    
      
      // Validate Required
      if (!field.allowEmpty && (value === undefined || value === null || value === '')) {
        field.validationMessage = 'Field required';
        valid = false;
      }

      // Validate Range
      if (valid && field.fieldRangeLow !== undefined && field.fieldRangeLow !== null && field.fieldRangeLow !== '' && value < field.fieldRangeLow) {
        field.validationMessage = 'Field value is lower than allowed';
        valid = false;
      }
      if (field.fieldRangeHigh !== undefined && field.fieldRangeHigh !== null && field.fieldRangeHigh !== '' && value > field.fieldRangeHigh) {
        field.validationMessage = 'Field value is higher than allowed';
        valid = false;
      }

      // Validate DataType
      if (valid && field.dataType === 'N' && isNaN(value)) {
        field.validationMessage = 'Field value is not a number';
        valid = false;
      }

      if (valid && field.sqlId !== undefined && field.sqlId !== null && field.sqlId !== '' && !field.updateFromLookUp && field.editorType === 'LookUpBox') {
        const responseData: any = await this.gtsDataService.getExportedData(this.prjId, this.formId, field.groupId, field.sqlQueryField, value, field.objectName);
        // Verifica che la risposta sia valida E che ci siano righe nei dati
        if (responseData.valid && responseData.data && responseData.data.length > 0 && responseData.data[0].rows && responseData.data[0].rows.length > 0) {
          this.metaData
          .fields
          .filter((f: any) => f.objectName === field.objectName)[0]
          .value = value;

          // Marca i campi correlati come già validati per evitare loop infiniti
          this.formData
          .filter((f: any) => f.masterFieldName === field.objectName)
          .forEach((formField: any) => {
            formField.validated = true; // Previene la ri-validazione
            formField.value = responseData.data[0].rows[0][formField.fieldName];
          });
        } else {
          field.validationMessage = 'Field value not found';
          valid = false;
        }
      }

      // Validate Custom Code
      if (valid && field.customCode !== undefined && field.customCode !== null && field.customCode !== '') {
        this.waitForCustomDecode = true;
        this.customDecodeResult = false;
        let formRequest = {
          typeRequest: 'form',
          field: field,
          formData: this.formData
        }
        this.gtsDataService.sendFormRequest(formRequest);
        valid = await this.getCustomVerifyResult(field) as boolean;
      }

      if (valid) {
        field.validationMessage = '';
        field.validated = true;
        this.formData.filter(f => f.objectName === field.objectName)[0]
        .validated = true;
        this.formData.filter(f => f.objectName === field.objectName)[0]
        .cssClass = field.cssClassStd;      
      } else {
        this.formData.filter(f => f.objectName === field.objectName)[0]
        .validated = false;
        field.validated = false;

        this.formData.filter(f => f.objectName === field.objectName)[0]
        .cssClass = field.cssClassError;
        notify(field.validationMessage, 'error', 3000);
      }

      if (field.actionName !== undefined && field.actionName !== null) {
        this.gtsDataService.setPageFieldValue(this.prjId, this.formId, field.objectName, value);  
        this.gtsDataService.runAction(this.prjId, this.formId, field.actionName);
        field.component.focus();
      }
    }
    
    if (!valid) {
      field.component.focus();
      field.validated = false;
    } else {
      field.validated = true;
    }

    return valid;
  }

  onFieldInitialized(event: any, element: any)  {
    this.formData.filter(f => f.objectName === element.objectName)[0]
    .component = event.component;
  }

  onLookUpButtonClick(event: any, objectName: string = '') { 
    let lookUpName = '';
    if (objectName !== '') {
      // if objectName is provided, use it to find the field
      lookUpName = objectName
    } else {
      // otherwise, use the event element
      lookUpName = event.element.$V.props.id;
    } 

    const field = this.formData.filter(f => f.objectName === lookUpName)[0]; 

    if (field !== undefined && field !== null && !(field.readOnly || field.disabled)) {
      this.lookUpField = {
        groupId: field.groupId,
        sqlId: field.sqlId,
        fieldName: field.sqlQueryField,
        lookUpName: lookUpName,
        formName: this.objectName,
        columns: field.columns,
        keys: field.sqlKeys,
        caption: field.sqlCaption,
        value: field.value,
        formData: this.formData,
        objectName: field.objectName,
        editorTypeML: field.editorTypeML || false,
      }

      this.gtsDataService.showLookUp(this.lookUpField);
    }
  } 

  onActionButtonClick(event: any) {
    const actionName = event.element.$V.props.action;
    this.gtsDataService.runAction(this.prjId, this.formId, actionName);
  }

  onFieldKeyDown(event: any, element: any) {
    // check if key is F2
    console.log(event, element);
    if (event.event.originalEvent.key === 'F2') {
      this.onLookUpButtonClick(event, element.objectName);
    } 
  }

  async onFieldFocusOut(event: any, element: any) {
    console.log(event)
    let valid: boolean = true;
    if (this.formReady && !element.readOnly && (element.forceCheck || !element.validated)) {
      valid = await this.fieldValidation(element);   
    }
    return valid;
  }
}


