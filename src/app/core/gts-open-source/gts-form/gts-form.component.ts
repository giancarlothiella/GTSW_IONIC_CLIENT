import { Component, AfterViewInit, ChangeDetectorRef, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';

// PrimeNG Imports
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Checkbox } from 'primeng/checkbox';
import { RadioButton } from 'primeng/radiobutton';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { Tooltip } from 'primeng/tooltip';

import { GtsToolbarComponent } from '../gts-toolbar/gts-toolbar.component';
// import { GtsLookupComponent } from '../../gts/gts-lookup/gts-lookup.component'; // DevExtreme version
import { GtsLookupComponent } from '../gts-lookup/gts-lookup.component'; // Open-source version ✨

/**
 * GTS Form Component - Open Source Version
 *
 * Componente form usando PrimeNG invece di DevExtreme.
 * Compatibile con i metadati GTS esistenti e gtsDataService.
 *
 * Funzionalità implementate:
 * - Tutti i tipi di editor (TextBox, TextArea, DateBox, CheckBox, RadioGroup, DropDown, LookUp)
 * - Validazione completa (required, range, dataType, lookup, custom code)
 * - Layout dinamico con CSS Grid
 * - Integrazione con GTS Toolbar
 * - Integrazione con GTS Lookup
 * - Master-detail fields
 * - Force uppercase
 * - Password mode toggle
 */
@Component({
  selector: 'app-gts-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    // PrimeNG
    InputText,
    Textarea,
    Select,
    DatePicker,
    Checkbox,
    RadioButton,
    Button,
    FloatLabel,
    Tooltip,
    // GTS Components
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

  @Input() prjId: string = '';
  @Input() formId: number = 0;
  @Input() objectName: string = '';

  formRepListenerSubs: Subscription | undefined;
  formExternalListenerSubs: Subscription | undefined;
  formFormFocusListenerSubs: Subscription | undefined;
  appViewListenerSubs: Subscription | undefined;

  //========= GLOBALS =================
  metaData: any = {};
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

  ngAfterViewInit() {
    this.changeDetector.detectChanges();
    // Auto-focus first non-disabled field
    for (let i = 0; i < this.formData.length; i++) {
      if (!this.formData[i].disabled && !this.formData[i].readOnly) {
        this.focusComponent = this.formData[i].component;
        if (this.focusComponent?.nativeElement) {
          setTimeout(() => this.focusComponent.nativeElement.focus(), 100);
        }
        break;
      }
    }
  }

  //========= ON INIT =================
  async ngOnInit() {
    this.passwMode = 'password';

    // App View Listener - reload form data when view changes
    this.appViewListenerSubs = this.gtsDataService
      .getAppViewListener()
      .subscribe((actualView) => {
        if (actualView !== undefined && actualView !== '' && actualView !== this.actualView) {
          this.actualView = actualView;
          // Check if this form is visible in current view before reloading
          const formMeta = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'forms', this.objectName);
          if (formMeta && formMeta.visible) {
            console.log('[GTS Form] View changed to:', actualView, '- Reloading form data for:', this.objectName);
            this.prepareFormData();
            this.changeDetector.detectChanges();
          }
        }
      });

    // Form Focus Listener
    this.formFormFocusListenerSubs = this.gtsDataService
      .getFormFocusListener()
      .subscribe(() => {
        this.formReady = true;
        this.changeDetector.detectChanges();
        if (this.focusComponent?.nativeElement) {
          this.focusComponent.nativeElement.focus();
        }
      });

    // Form Reply Listener
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

        // Password decode
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
              formField.updateFromLookUp = true;
              formField.value = field.fieldValue;
            });
        });
      });

    this.formReady = false;
    this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'forms', this.objectName);

    if (this.metaData !== undefined && this.metaData !== null &&
        this.metaData.groupType !== 'PSO' && this.metaData.groupType !== 'WSO') {
      let toolbar = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'toolbars', this.objectName);
      // Assign visible to submit toolbar buttons
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
    this.appViewListenerSubs?.unsubscribe();
  }

  //========= FORM EVENTS =================
  async toolbarSubmitEvent(event: any) {
    const valid = await this.formValidation();
    if (valid) {
      console.log('Form is valid, submitting...', this.formData);
      this.formData.forEach((field: any) => {
        // Convert value format depending if dataType is N or D
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
      // Clear validation error since a valid value was selected from lookup
      field.validationMessage = '';
      field.cssClass = field.cssClassStd;

      // Update metaData.fields to sync params in subsequent validations
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
    if (field.component?.nativeElement) {
      field.component.nativeElement.focus();
    }
  }

  //========= FORM FUNCTIONS =================
  prepareFormData() {
    this.formTitle = this.metaData.groupCaption;
    this.formLayout = this.metaData.cssStyle;
    this.showPopUp = this.metaData.groupShowPopUp;
    this.showTitle = this.metaData.groupCaption !== '' && this.metaData.groupCaption !== undefined && this.metaData.groupCaption !== null;
    this.formWidth = this.metaData.groupWidth;
    this.formTitleStyle = 'width: ' + this.metaData.groupWidth + 'px;';
    this.formHeight = this.metaData.groupHeight;

    if (this.formHeight === undefined || this.formHeight === null || this.formHeight === 0) {
      // Use metadata label mode
      this.formHeight = 60 + this.metaData.groupRows * (this.metaData.labelMode === 'outside' && this.metaData.stylingMode === 'outlined' ? 48 : 41);
    }
    this.formStyle = 'width: ' + this.metaData.groupWidth + 'px; height: ' + this.formHeight + 'px;';

    this.formCSSTitle = this.metaData.cssClass + 'Title';
    this.formCSSBody = this.metaData.cssClass + 'Body';
    this.formCSSToolbar = this.metaData.cssClass + 'Toolbar';

    this.formData = [];

    for (let i = 0; i < this.metaData.fields.length; i++) {
      let field: any = {
        id: this.metaData.fields[i].fieldId,
        trackKey: `${this.objectName}_${i}`, // Unique tracking key for Angular @for
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
        cssClass: this.metaData.cssClass + 'Field',
        cssClassStd: this.metaData.cssClass + 'Field',
        cssClassError: this.metaData.cssClass + 'FieldError',
        validated: false,
        updateFromLookUp: false,
        buttonAction: this.metaData.fields[i].buttonAction,
        areaHeight: this.metaData.fields[i].areaHeight,
        valueChecked: this.metaData.fields[i].valueChecked,
        valueUnChecked: this.metaData.fields[i].valueUnchecked,
        sqlCaption: this.metaData.fields[i].sqlCaption,
        visible: true,
        validationMessage: ''
      };

      // Set mode = password if objectname contains password
      if (field.objectName.toLowerCase().includes('password')) {
        field.mode = this.passwMode;
      }

      let icon = '';
      if (this.metaData.fields[i].stdImageId !== undefined && this.metaData.fields[i].stdImageId !== null && this.metaData.fields[i].stdImageId !== '') {
        icon = '/assets/icons/stdImage_' + this.metaData.fields[i].stdImageId + '.png';
      } else {
        if (this.metaData.fields[i].iconId !== undefined && this.metaData.fields[i].iconId !== null && this.metaData.fields[i].iconId !== '') {
          icon = '/assets/icons/icon_' + this.metaData.fields[i].iconId + '.svg';
        } else {
          icon = '';
        }
      }
      field.buttonIcon = icon;
      field.buttonText = this.metaData.fields[i].buttonText;

      if (this.metaData.fields[i].gridArea !== null && this.metaData.fields[i].gridArea !== undefined && this.metaData.fields[i].gridArea !== '') {
        field.visible = true;
      } else {
        field.visible = false;
      }

      // Handle default values
      if (field.value === undefined || field.value === null) {
        if (this.metaData.fields[i].defaultValue !== undefined && this.metaData.fields[i].defaultValue !== null) {
          if (isNaN(this.metaData.fields[i].defaultValue)) {
            // Check for @NEXT first 5 chars
            if (this.metaData.fields[i].defaultValue.substring(0, 5) === '@NEXT') {
              field.value = this.gtsDataService.getNextFieldValue(this.prjId, this.formId, this.metaData.fields[i].defaultValue.substring(6));
            } else if (this.metaData.fields[i].defaultValue.substring(0, 6) === '@FIELD') {
              field.value = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, this.metaData.fields[i].defaultValue.substring(7));
            } else {
              field.value = this.metaData.fields[i].defaultValue;
            }
          } else {
            field.value = this.metaData.fields[i].defaultValue;
          }
        }
      }

      if (this.metaData.fields[i].editorType === 'CheckBox') {
        field.value = field.value === field.valueChecked || field.value === true;
      }

      // Convert date string to Date object for DateBox
      if (this.metaData.fields[i].editorType === 'DateBox' && field.value) {
        if (typeof field.value === 'string') {
          field.value = new Date(field.value);
        }
      }

      // Apply PK field styling for TextBox, TextArea and DateBox if field is PK
      if ((this.metaData.fields[i].editorType === 'TextBox' || this.metaData.fields[i].editorType === 'TextArea' || this.metaData.fields[i].editorType === 'DateBox') && this.metaData.fields[i].isPK) {
        field.cssClass = this.metaData.cssClass + 'PKField';
        field.cssClassStd = this.metaData.cssClass + 'PKField';
      }

      if (this.metaData.fields[i].editorType === 'TextButtonBox' || this.metaData.fields[i].editorType === 'LookUpBox') {
        field.cssClass = this.metaData.cssClass + 'LookUpField';
        field.cssClassStd = this.metaData.cssClass + 'LookUpField';

        if (this.metaData.fields[i].isPK) {
          field.cssClass = this.metaData.cssClass + 'LookUpPKField';
          field.cssClassStd = this.metaData.cssClass + 'LookUpPKField';
        }
      }

      if (this.metaData.fields[i].editorType === 'RadioGroup') {
        if (this.metaData.fields[i].isPK) {
          field.cssClass = this.metaData.cssClass + 'RadioGroupPKField';
        } else {
          field.cssClass = this.metaData.cssClass + 'RadioGroup';
        }
      }

      if (this.metaData.fields[i].editorType === 'DropDownBox') {
        let dropList: any[] = [];
        if (this.metaData.fields[i].dropDownRows !== undefined && this.metaData.fields[i].dropDownRows !== null && this.metaData.fields[i].dropDownRows.length > 0) {
          this.metaData.fields[i].dropDownRows.forEach((item: any) => {
            let row: any = {
              'code': item[this.metaData.fields[i].fieldName],
              'text': item[this.metaData.fields[i].details[0].detailFieldName]
            };
            dropList.push(row);
          });
          field.dropDown = dropList;
        } else {
          this.metaData.fields[i].dropDownList.forEach((item: any) => {
            let row: any = {
              'code': item.trim(),
              'text': item.trim()
            };
            dropList.push(row);
          });
          field.dropDown = dropList;
        }
      }

      if (this.metaData.fields[i].editorType === 'RadioGroup') {
        // Check if field value is equal to default value
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
          field.cssClass = this.metaData.cssClass + 'PKField';
        }

        field.value = field.radioValues[field.radioIndex].value;
      }

      if (this.metaData.fields[i].visible !== undefined && this.metaData.fields[i].visible !== null) {
        field.visible = this.metaData.fields[i].visible;
      }

      this.formData.push(field);

      // Handle detail fields (master-detail)
      if (this.metaData.fields[i].details !== undefined && this.metaData.fields[i].details !== null &&
          this.metaData.fields[i].editorType !== 'DropDownBox' && this.metaData.fields[i].editorType !== 'RadioGroup') {
        for (let j = 0; j < this.metaData.fields[i].details.length; j++) {
          let fieldDetail: any = {
            trackKey: `${this.objectName}_${i}_detail_${j}`, // Unique tracking key for detail fields
            masterFieldName: this.metaData.fields[i].objectName,
            objectName: this.metaData.fields[i].details[j].pageFieldName,
            fieldName: this.metaData.fields[i].details[j].detailFieldName,
            label: this.metaData.fields[i].details[j].pageFieldLabel,
            value: this.metaData.fields[i].details[j].value,
            style: 'grid-area: ' + this.metaData.fields[i].details[j].pageFieldName + ';',
            readOnly: this.metaData.fields[i].details[j].detailFieldLocked,
            focusStateEnabled: !this.metaData.fields[i].details[j].detailFieldLocked,
            cssClass: this.metaData.cssClass + 'Field',
            editorType: 'TextBox',
            visible: true
          };

          if (this.metaData.fields[i].details[j].detailFieldLocked) {
            fieldDetail.editorType = 'TextBoxRO';
            field.focusStateEnabled = false;
          }

          this.formData.push(fieldDetail);
        }
      }

      if (this.metaData.fields[i].editorType === 'GroupHdr') {
        field.cssClass = this.metaData.cssClass + 'GroupHdr';
        field.focusStateEnabled = false;
        // Use defaultValue for GroupHdr text if value is empty
        if (!field.value) {
          field.value = this.metaData.fields[i].defaultValue || '';
        }
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
      this.formStyle = 'width: ' + this.metaData.groupWidth + 'px; height: ' + this.formHeight + 'px;';
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

  onFieldInput(event: any, element: any) {
    const field = this.formData.filter(f => f.objectName === element.objectName)[0];
    field.validated = false;
    field.updateFromLookUp = false;
  }

  async onFieldDataChanged(field: any, previousValue: any) {
    let valid: boolean = true;
    let currentValue = field.value;

    if (previousValue !== null && previousValue !== undefined) {
      previousValue = previousValue.toString();
    } else {
      previousValue = '';
    }
    if (currentValue !== null && currentValue !== undefined) {
      currentValue = currentValue.toString();
    } else {
      currentValue = '';
    }

    // Only validate if value actually changed
    if (currentValue !== previousValue) {
      field.validated = false;
      valid = await this.fieldValidation(field);

      if (valid) {
        field.validated = true;
      } else {
        if (field.component?.nativeElement) {
          field.component.nativeElement.focus();
        }
      }
    }
    return valid;
  }

  async formValidation() {
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
  }

  async fieldValidation(field: any) {
    let valid: boolean = true;
    field.validated = true;

    let value = field.value;

    // Convert to value to number if dataType is N
    if (field.dataType === 'N') {
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
        if (responseData.valid && responseData.data && responseData.data.length > 0 && responseData.data[0].rows && responseData.data[0].rows.length > 0) {
          this.metaData
            .fields
            .filter((f: any) => f.objectName === field.objectName)[0]
            .value = value;

          this.formData
            .filter((f: any) => f.masterFieldName === field.objectName)
            .forEach((formField: any) => {
              formField.validated = true;
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
        };
        this.gtsDataService.sendFormRequest(formRequest);
        valid = await this.getCustomVerifyResult(field) as boolean;
      }

      if (valid) {
        field.validationMessage = '';
        field.validated = true;
        this.formData.filter(f => f.objectName === field.objectName)[0].validated = true;
        this.formData.filter(f => f.objectName === field.objectName)[0].cssClass = field.cssClassStd;
      } else {
        this.formData.filter(f => f.objectName === field.objectName)[0].validated = false;
        field.validated = false;
        this.formData.filter(f => f.objectName === field.objectName)[0].cssClass = field.cssClassError;
      }

      if (field.actionName !== undefined && field.actionName !== null) {
        this.gtsDataService.setPageFieldValue(this.prjId, this.formId, field.objectName, value);
        this.gtsDataService.runAction(this.prjId, this.formId, field.actionName);
        if (field.component?.nativeElement) {
          field.component.nativeElement.focus();
        }
      }
    }

    if (!valid && field.component?.nativeElement) {
      field.component.nativeElement.focus();
      field.validated = false;
    } else {
      field.validated = true;
    }

    return valid;
  }

  onFieldInitialized(element: HTMLElement, field: any) {
    field.component = { nativeElement: element };
  }

  onLookUpButtonClick(field: any) {
    if (field !== undefined && field !== null && !(field.readOnly || field.disabled)) {
      this.lookUpField = {
        groupId: field.groupId,
        sqlId: field.sqlId,
        fieldName: field.sqlQueryField,
        lookUpName: field.objectName,
        formName: this.objectName,
        columns: field.columns,
        keys: field.sqlKeys,
        caption: field.sqlCaption,
        value: field.value,
        formData: this.formData,
        objectName: field.objectName,
        editorTypeML: field.editorTypeML || false,
      };

      this.gtsDataService.showLookUp(this.lookUpField);
    }
  }

  onActionButtonClick(field: any) {
    this.gtsDataService.runAction(this.prjId, this.formId, field.buttonAction);
  }

  onFieldKeyDown(event: KeyboardEvent, field: any) {
    if (event.key === 'F2') {
      this.onLookUpButtonClick(field);
    }
  }

  async onFieldFocusOut(field: any) {
    let valid: boolean = true;
    if (this.formReady && !field.readOnly && (field.forceCheck || !field.validated)) {
      valid = await this.fieldValidation(field);
    }
    return valid;
  }
}
