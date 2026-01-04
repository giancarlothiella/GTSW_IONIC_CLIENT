// src/app/features/GTSW/users/users.page.ts
import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
import { GtsLoaderComponent } from '../../../core/gts/gts-loader/gts-loader.component';
import { GtsToolbarComponent } from '../../../core/gts/gts-toolbar/gts-toolbar.component';
import { GtsGridComponent } from '../../../core/gts/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts/gts-form-popup/gts-form-popup.component';
import { GtsMessageComponent } from '../../../core/gts/gts-message/gts-message.component';
import { AuthDetailsComponent } from '../auth-details/auth-details.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    GtsLoaderComponent,
    GtsToolbarComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsMessageComponent,
    AuthDetailsComponent
  ],
  template: `
    @if (!nestedFormActive) {
      <div class="users-container">
        <app-gts-toolbar
          [prjId]="prjId"
          [formId]="formId"
          [objectName]="'mainToolbar'"
          (newValueEvent)="gtsDataService.toolbarSelectEvent($event)">
        </app-gts-toolbar>

        @if (loading) {
        <app-gts-loader></app-gts-loader>
        }

        <div [style]="viewStyle">
          @for (element of metaData.grids; track element.objectName) {
            @if (element.visible) {
              <app-gts-grid
                [style]="'grid-area: ' + element.gridArea"
                [prjId]="prjId"
                [formId]="formId"
                [objectName]="element.objectName">
              </app-gts-grid>
            }
          }

          @for (element of metaData.forms; track element.objectName) {
            @if (element.visible && !element.groupShowPopUp) {
              <app-gts-form
                [style]="'grid-area: ' + element.gridArea"
                [prjId]="prjId"
                [formId]="formId"
                [objectName]="element.objectName">
              </app-gts-form>
            }

            @if (element.visible && element.groupShowPopUp) {
              <app-gts-form-popup
                [prjId]="prjId"
                [formId]="formId"
                [objectName]="element.objectName">
              </app-gts-form-popup>
            }
          }
        </div>

        <app-gts-message
          [prjId]="prjId"
          [formId]="formId">
        </app-gts-message>
      </div>
    }

    @if (nestedFormActive && nestedFormId === 99) {
      <app-auth-details
        [nestedFormCargo]="nestedFormCargo">
      </app-auth-details>
    }
  `,
  styles: [`
    .users-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class GTSW_UsersComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);
  private cd = inject(ChangeDetectorRef);

  // Page params
  prjId = 'GTSW';
  formId = 1;

  // Subscriptions
  private appViewListenerSubs?: Subscription;
  private formReqListenerSubs?: Subscription;
  private pageCustomListenerSubs?: Subscription;
  private appLoaderListenerSubs?: Subscription;
  private messageListenerSubs?: Subscription;

  // State
  metaData: any = {};
  actualView = '';
  viewStyle = '';
  loading = true;
  pageData: any = {};
  action: any = {};

  nestedFormActive = false;
  nestedFormId = 0;
  nestedFormCargo: any = {};

  ngOnInit(): void {
    // ======= All pages should check token =======
    if (this.authService.autoAuthUser()) {
      this.authService.checkToken();
    }

    // Loader Listener
    this.appLoaderListenerSubs = this.gtsDataService
      .getAppLoaderListener()
      .subscribe((loading: boolean) => {
        this.loading = loading;
      });

    // View Listener
    this.appViewListenerSubs = this.gtsDataService
      .getAppViewListener()
      .subscribe((actualView: string) => {
        this.actualView = actualView;
        this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
        this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'all', 'all');

        if (this.metaData.views?.filter((view: any) => view.viewName === actualView).length > 0) {
          this.viewStyle = this.metaData.views.filter((view: any) => view.viewName === actualView)[0].viewStyle;
        }
      });

    // Form Req Listener
    this.formReqListenerSubs = this.gtsDataService
      .getFormReqListener()
      .subscribe((formRequestField: any) => {
        let reply: any = {
          valid: true,
          message: ''
        };

        // Handle EXIT request
        if (formRequestField.typeRequest === 'EXIT') {
          if (formRequestField.formId === this.nestedFormId && this.nestedFormActive) {
            this.closeNestedForm();
          }
        }

        // Handle GRID_ROW_DATA request for params grid
        if (formRequestField.typeRequest === 'GRID_ROW_DATA') {
          let disabled = true;

          if (formRequestField.row.data.paramType === 'String' && formRequestField.fieldName === 'paramDefaultChar') {
            disabled = false;
          }
          if (formRequestField.row.data.paramType === 'Number' && formRequestField.fieldName === 'paramDefaultNum') {
            disabled = false;
          }
          if (formRequestField.row.data.paramType === 'Boolean' && formRequestField.fieldName === 'paramDefaultBool') {
            disabled = false;
          }
          if (formRequestField.fieldName === 'assigned') {
            disabled = false;
          }

          reply = {
            valid: true,
            message: 'GRID_ROW_DATA replay',
            fieldName: formRequestField.fieldName,
            disabled: disabled
          };
        }

        if (formRequestField.typeRequest !== 'EXIT') {
          this.gtsDataService.sendFormReply(reply);
        }
      });

    // Custom Code Listener
    this.pageCustomListenerSubs = this.gtsDataService
      .getPageCustomListener()
      .subscribe(async (customCode: string) => {
        // Riattiva il loader per il custom code
        this.gtsDataService.sendAppLoaderListener(true);

        await this.handleCustomCode(customCode);

        // Disattiva il loader dopo che i dati sono stati elaborati e la griglia renderizzata
        setTimeout(() => {
          this.gtsDataService.sendAppLoaderListener(false);
        }, 500);
      });

    // Run Page
    this.gtsDataService.runPage(this.prjId, this.formId);
  }

  ngOnDestroy(): void {
    this.appViewListenerSubs?.unsubscribe();
    this.pageCustomListenerSubs?.unsubscribe();
    this.appLoaderListenerSubs?.unsubscribe();
    this.formReqListenerSubs?.unsubscribe();
    this.messageListenerSubs?.unsubscribe();
  }

  private async handleCustomCode(customCode: string): Promise<void> {
    switch (customCode) {
      case 'USER_DET':
        this.openUserDetails();
        break;

      case 'LOCK':
      case 'DELETE':
        this.handleLockOrDelete();
        break;

      case 'UNLOCK':
        this.handleUnlock();
        break;

      case 'SETUSER':
        this.handleSetUser();
        break;

      case 'ROLES':
        this.handleRoles();
        break;

      case 'REMOVE_ROLE':
        this.handleRemoveRole();
        break;

      case 'ADD_ROLE':
        this.handleAddRole();
        break;

      case 'GET_PARAMS':
        this.handleGetParams();
        break;

      case 'POST_PARAMS':
        this.handlePostParams();
        break;
    }
  }

  private openUserDetails(): void {
    const cargo: any = {
      dataSource: 'User',
      email: this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daUsers', 'qUsers').email
    };

    this.nestedFormCargo = cargo;
    this.nestedFormId = 99;
    this.nestedFormActive = true;
  }

  closeNestedForm(): void {
    this.nestedFormActive = false;
    this.nestedFormId = 0;
    this.cd.detectChanges();
  }

  private handleLockOrDelete(): void {
    const userEmail = this.authService.getUserEmail();
    const selectedEmail = this.gtsDataService.getPageFieldValue(this.prjId, this.formId, 'gtsFldqUsers_email');

    if (userEmail !== selectedEmail) {
      this.gtsDataService.setDataEntryFormFieldValue(this.prjId, this.formId, 2, 'gtsFldqUsers_active', false);
    } else {
      this.gtsDataService.setActionCanRun(false);
      // TODO: Show toast notification
      console.warn('You cannot lock or delete yourself!');
    }
  }

  private handleUnlock(): void {
    this.gtsDataService.setDataEntryFormFieldValue(this.prjId, this.formId, 2, 'gtsFldqUsers_active', true);
  }

  private handleSetUser(): void {
    const user = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daUsers', 'qUsers');
    if (user.active) {
      this.gtsDataService.setPageRule(this.prjId, this.formId, 1, 1);
    } else {
      this.gtsDataService.setPageRule(this.prjId, this.formId, 1, 2);
    }
  }

  private handleRoles(): void {
    this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
    const userRoles: any[] = [];

    const authRoles = this.pageData
      .filter((adapter: any) => adapter.dataAdapter === 'daUserRoles')[0]
      .data.filter((row: any) => row.dataSetName === 'qUserRoles')[0]
      .rows;

    authRoles.forEach((role: any) => {
      userRoles.push({ role: role });
    });

    this.pageData
      .filter((adapter: any) => adapter.dataAdapter === 'daUserRoles')[0]
      .data.filter((row: any) => row.dataSetName === 'qUserRoles')[0]
      .rows = userRoles;

    this.gtsDataService.setPageDataSet(this.prjId, this.formId, 'daUserRoles', 'qUserRoles', userRoles);
  }

  private handleRemoveRole(): void {
    const role = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daUserRoles', 'qUserRoles');
    const userRoleDS = this.gtsDataService
      .getDataSet(this.prjId, this.formId, 'daUserRoles', 'qUserRoles')
      .filter((row: any) => row.role !== role.role);

    this.gtsDataService.setPageDataSet(this.prjId, this.formId, 'daUserRoles', 'qUserRoles', userRoleDS);

    const roles: string[] = [];
    this.gtsDataService
      .getDataSet(this.prjId, this.formId, 'daUserRoles', 'qUserRoles')
      .forEach((row: any) => {
        roles.push(row.role);
      });

    this.gtsDataService.setFieldsValue(this.prjId, this.formId, [{ pageFieldName: 'gtsFldqUsers_roles', value: roles }]);
    this.gtsDataService.sendGridReload('qUserRoles');
  }

  private handleAddRole(): void {
    const role = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daUserRoles', 'qAllRoles');
    const userRoleDS = this.gtsDataService
      .getDataSet(this.prjId, this.formId, 'daUserRoles', 'qUserRoles')
      .filter((row: any) => row.role !== role.role);

    userRoleDS.push({ role: role.role });

    this.gtsDataService.setPageDataSet(this.prjId, this.formId, 'daUserRoles', 'qUserRoles', userRoleDS);

    const roles: string[] = [];
    userRoleDS.forEach((row: any) => {
      roles.push(row.role);
    });

    this.gtsDataService.setFieldsValue(this.prjId, this.formId, [{ pageFieldName: 'gtsFldqUsers_roles', value: roles }]);
    this.gtsDataService.sendGridReload('qUserRoles');
  }

  private handleGetParams(): void {
    const userParamsData = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daParams', 'qUserParams')[0];

    if (userParamsData.params !== undefined) {
      const userParams = userParamsData.params;
      const allParams: any[] = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daParams', 'qParams');

      allParams.forEach((param: any) => {
        if (param.paramType === 'String') {
          param.paramDefaultChar = userParams[param.paramCode];
        } else if (param.paramType === 'Number') {
          param.paramDefaultNum = userParams[param.paramCode];
        } else if (param.paramType === 'Boolean') {
          param.paramDefaultBool = userParams[param.paramCode];
        }

        param['assigned'] = userParams[param.paramCode] !== undefined;
      });
    }
  }

  private handlePostParams(): void {
    const userParams: any = {};

    this.gtsDataService
      .getDataSet(this.prjId, this.formId, 'daParams', 'qParams')
      .forEach((param: any) => {
        if (param.assigned) {
          if (param.paramType === 'String') {
            userParams[param.paramCode] = param.paramDefaultChar;
          } else if (param.paramType === 'Number') {
            userParams[param.paramCode] = param.paramDefaultNum;
          } else if (param.paramType === 'Boolean') {
            let boolValue = param.paramDefaultBool;
            if (boolValue === 'true') boolValue = true;
            if (boolValue === 'false') boolValue = false;
            userParams[param.paramCode] = boolValue;
          }
        }
      });

    let paramNew = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daParams', 'qUserParams')[0].params;
    if (!paramNew) {
      paramNew = {};
    }

    // Merge user params with existing params
    Object.keys(paramNew).forEach((key: any) => {
      if (userParams[key] !== undefined) {
        paramNew[key] = userParams[key];
      }
    });

    Object.keys(userParams).forEach((key: any) => {
      if (paramNew[key] === undefined && userParams[key] !== undefined) {
        paramNew[key] = userParams[key];
      }
    });

    this.gtsDataService.setFieldsValue(this.prjId, this.formId, [{ pageFieldName: 'gtsFldqUsers_params', value: paramNew }]);
    this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daUsers', 'qUsers').params = paramNew;
  }
}
