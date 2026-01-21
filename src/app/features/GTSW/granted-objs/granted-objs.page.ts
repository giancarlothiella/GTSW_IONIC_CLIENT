// src/app/features/GTSW/granted-objs/granted-objs.page.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { GtsDataService } from '../../../core/services/gts-data.service';
// Import GTS Components - Open Source Versions
import { GtsLoaderComponent } from '../../../core/gts-open-source/gts-loader/gts-loader.component';
import { GtsToolbarComponent } from '../../../core/gts-open-source/gts-toolbar/gts-toolbar.component';
import { GtsGridComponent } from '../../../core/gts-open-source/gts-grid/gts-grid.component';
import { GtsFormComponent } from '../../../core/gts-open-source/gts-form/gts-form.component';
import { GtsFormPopupComponent } from '../../../core/gts-open-source/gts-form-popup/gts-form-popup.component';
import { GtsMessageComponent } from '../../../core/gts-open-source/gts-message/gts-message.component';
import { GtsTabsComponent } from '../../../core/gts-open-source/gts-tabs/gts-tabs.component';
import { GtsReportsComponent } from '../../../core/gts-open-source/gts-reports/gts-reports.component';

@Component({
  selector: 'app-granted-objs',
  standalone: true,
  imports: [
    CommonModule,
    GtsLoaderComponent,
    GtsToolbarComponent,
    GtsGridComponent,
    GtsFormComponent,
    GtsFormPopupComponent,
    GtsMessageComponent,
    GtsTabsComponent,
    GtsReportsComponent
  ],
  template: `
    <ng-container class="pageFormat">
      <app-gts-toolbar
        [prjId]="prjId"
        [formId]="formId"
        [objectName]="'mainToolbar'"
        [customData]="customData"
        (newValueEvent)="gtsDataService.toolbarSelectEvent($event)"
      ></app-gts-toolbar>
      <div [style]="viewStyle">
        @if (loading) {
          <app-gts-loader></app-gts-loader>
        }
        @for (element of metaData.tabs; track element) {
          @if (element.visible) {
            <app-gts-tabs
              [style]="'grid-area: '+element.gridArea"
              [prjId]="prjId"
              [formId]="formId"
              [objectName]="element.objectName"
            ></app-gts-tabs>
          }
        }
        @for (element of metaData.reports; track element) {
          @if (element.visible) {
            <app-gts-reports
              [style]="'grid-area: '+element.gridArea"
              [prjId]="prjId"
              [formId]="formId"
              [fieldGrpId]="element.fieldGrpId"
            ></app-gts-reports>
          }
        }
        @for (element of metaData.toolbars; track element) {
          @if (element.visible && element.objectName != 'mainToolbar' && !element.toolbarFlagSubmit) {
            <app-gts-toolbar
              [style]="'grid-area: '+element.gridArea"
              [prjId]="prjId"
              [formId]="formId"
              [objectName]="element.objectName"
              [customCssClass]="element.customCssClass"
              (newValueEvent)="gtsDataService.toolbarSelectEvent($event)"
            ></app-gts-toolbar>
          }
        }
        @for (element of metaData.grids; track element) {
          @if (element.visible) {
            <app-gts-grid
              [style]="'grid-area: '+element.gridArea"
              [prjId]="prjId"
              [formId]="formId"
              [objectName]="element.objectName"
            ></app-gts-grid>
          }
        }
        @for (element of metaData.forms; track element) {
          @if (element.visible && !element.groupShowPopUp) {
            <app-gts-form
              [style]="'grid-area: '+element.gridArea"
              [prjId]="prjId"
              [formId]="formId"
              [objectName]="element.objectName"
            ></app-gts-form>
          }
          @if (element.visible && element.groupShowPopUp) {
            <app-gts-form-popup
              [prjId]="prjId"
              [formId]="formId"
              [objectName]="element.objectName"
            ></app-gts-form-popup>
          }
        }
      </div>
      <app-gts-message
        [prjId]="prjId"
        [formId]="formId"
      ></app-gts-message>
    </ng-container>
  `,
  styles: [`
    .pageFormat {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class GTSW_GrantedObjsComponent implements OnInit, OnDestroy {
  // Services
  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);

  // Page params
  prjId = 'GTSW';
  formId = 10;

  // Subscriptions
  appViewListenerSubs: Subscription | undefined;
  formReqListenerSubs: Subscription | undefined;
  pageCustomListenerSubs: Subscription | undefined;
  appLoaderListenerSubs: Subscription | undefined;
  toolbarListenerSubs: Subscription | undefined;

  // Component state
  metaData: any = {};
  actualView = '';
  loading = true;
  pageData: any = {};
  viewStyle = '';
  customData: any[] = [];
  toolbarSelectedValue = '';

  ngOnInit(): void {
    // Reset viewStyle immediately to prevent NG0100 when navigating between pages
    this.viewStyle = '';

    // ======= All pages should check token =======
    if (this.authService.autoAuthUser()) {
      this.authService.checkToken();
    }

    // Loader Listener
    this.appLoaderListenerSubs = this.gtsDataService
      .getAppLoaderListener()
      .subscribe((loading) => {
        this.loading = loading;
      });

    // View Listener
    this.appViewListenerSubs = this.gtsDataService
      .getAppViewListener()
      .subscribe((actualView) => {
        this.actualView = actualView;
        this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
        this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'all', 'all');
        if (this.metaData.views.filter((view: any) => view.viewName === actualView) !== undefined &&
            this.metaData.views.filter((view: any) => view.viewName === actualView).length > 0) {
          this.viewStyle = this.metaData.views.filter((view: any) => view.viewName === actualView)[0].viewStyle;
        }
      });

    // Form Req Listener
    this.formReqListenerSubs = this.gtsDataService
      .getFormReqListener()
      .subscribe((formRequestField) => {
        const reply: any = {
          valid: true,
          message: ''
        };
        //===== START FORM REQUEST CUSTOM CODE =====

        if (formRequestField.field.customCode === 'OBJ_TYPE') {
          formRequestField.formData.forEach((row: any) => {
            if (row.objectName !== 'gtsFldObj_objectType' &&
              row.objectName !== 'gtsFldObj_objectId' &&
              row.objectName !== 'gtsFldObj_formId' &&
              row.objectName !== 'lookup_F_10_page_formName') {
              row.disabled = true;
              row.value = null;
            }
          });

          // Trim the formRequestField.field.value to avoid issues with spaces
          const objType = formRequestField.field.value.trim();

          if (objType === 'Report') {
            formRequestField.formData.filter((row: any) => row.objectName === 'gtsFldObj_reportGroupCode')[0].disabled = false;
            formRequestField.formData.filter((row: any) => row.objectName === 'gtsFldObj_reportCode')[0].disabled = false;
            formRequestField.formData.filter((row: any) => row.objectName === 'lookup_F_10_rpt_reportName')[0].disabled = false;
            formRequestField.formData.filter((row: any) => row.objectName === 'lookup_F_10_reportDescr')[0].disabled = false;
          } else if (objType === 'Toolbar Item') {
            formRequestField.formData.filter((row: any) => row.objectName === 'gtsFldObj_toolbarId')[0].disabled = false;
            formRequestField.formData.filter((row: any) => row.objectName === 'gtsFldObj_tlbItem_objectName')[0].disabled = false;
            formRequestField.formData.filter((row: any) => row.objectName === 'lookup_F_10_tlb_objectName')[0].disabled = false;
            formRequestField.formData.filter((row: any) => row.objectName === 'lookup_F_10_tlb_objectDescr')[0].disabled = false;
            formRequestField.formData.filter((row: any) => row.objectName === 'lookup_F_10_tlbItem_actionName')[0].disabled = false;
          } else if (objType === 'Grid Column') {
            formRequestField.formData.filter((row: any) => row.objectName === 'gtsFldObj_grid_objectName')[0].disabled = false;
            formRequestField.formData.filter((row: any) => row.objectName === 'gtsFldObj_grid_colId')[0].disabled = false;
            formRequestField.formData.filter((row: any) => row.objectName === 'lookup_F_10_grid_sqlId')[0].disabled = false;
            formRequestField.formData.filter((row: any) => row.objectName === 'lookup_F_10_grid_dataSetName')[0].disabled = false;
            formRequestField.formData.filter((row: any) => row.objectName === 'lookup_F_10_gridCol_fieldName')[0].disabled = false;
            formRequestField.formData.filter((row: any) => row.objectName === 'lookup_F_10_gridCol_text')[0].disabled = false;
          } else if (objType === 'Tabs Page') {
            formRequestField.formData.filter((row: any) => row.objectName === 'gtsFldObj_tabs_objectName')[0].disabled = false;
            formRequestField.formData.filter((row: any) => row.objectName === 'gtsFldObj_tabs_tabId')[0].disabled = false;
            formRequestField.formData.filter((row: any) => row.objectName === 'lookup_F_10_tab_text')[0].disabled = false;
          }
        }

        //===== END FORM REQUEST CODE =====
        if (formRequestField.typeRequest !== 'EXIT') {
          this.gtsDataService.sendFormReply(reply);
        }
      });

    // Custom Code Listener
    this.pageCustomListenerSubs = this.gtsDataService
      .getPageCustomListener()
      .subscribe(async (customCode) => {
        //===== START CUSTOM CODE =====
        if (customCode === 'setCtxProject') {
          this.toolbarSelectedValue = this.pageData
            .filter((element: any) => element.dataAdapter === 'daProjects')[0]
            .data[0]
            .rows[0].prjId;

          this.metaData.pageFields
            .filter((field: any) => field.pageFieldName === 'gtsFldqProjects_prjId')[0].value = this.toolbarSelectedValue;

          const qProjects = this.pageData
            .filter((element: any) => element.dataAdapter === 'daProjects')[0]
            .data[0]
            .rows;
          this.customData[0].value = this.toolbarSelectedValue;
          this.customData[0].items = qProjects;

          this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'gtsFldqProjects_prjId')[0].value = this.toolbarSelectedValue;
          this.filterProject('gtsGridMenu', this.toolbarSelectedValue, 'qMenu');
          this.filterProject('gtsGridObjects', this.toolbarSelectedValue, 'qObjects');

          let allRoles = this.pageData
            .filter((adapter: any) => adapter.dataAdapter === 'daPrjData')[0]
            .data
            .filter((ds: any) => ds.dataSetName === 'qAllRoles')[0]
            .rows;

          if (allRoles !== undefined && allRoles.length > 0) {
            allRoles = allRoles.map((role: any) => {
              return { role: role.role, roleDescr: role.roleDescr, DDStatus: 1 }; // Default status for drag and drop
            });
          }

          this.gtsDataService.setPageDataSet(this.prjId, this.formId, 'daPrjData', 'qAllRoles', allRoles);

          console.log('Custom Data after setCtxProject:', this.customData);
        }

        if (customCode === 'setCtxProject2') {
          this.toolbarSelectedValue = this.metaData.pageFields
            .filter((field: any) => field.pageFieldName === 'gtsFldqProjects_prjId')[0].value;

          this.customData[0].value = this.toolbarSelectedValue;

          this.filterProject('gtsGridMenu', this.toolbarSelectedValue, 'qMenu');
          this.filterProject('gtsGridObjects', this.toolbarSelectedValue, 'qObjects');
        }

        if (customCode === 'MENU_ROLES') {
          this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
          let roles: any[] = [];

          const menuRoles = this.pageData.filter((adapter: any) => adapter.dataAdapter === 'daMenuRoles')[0].data.filter((row: any) => row.dataSetName === 'qMenuRoles')[0].rows;

          if (menuRoles !== undefined && +menuRoles.length > 0) {
            menuRoles
              .forEach((role: any) => {
                roles.push({
                  role: role,
                  DDStatus: 2 // Default status for drag and drop
                });
              });

            this.pageData.filter((adapter: any) => adapter.dataAdapter === 'daMenuRoles')[0].data.filter((row: any) => row.dataSetName === 'qMenuRoles')[0]
              .rows = roles;

            this.gtsDataService.setPageDataSet(this.prjId, this.formId, 'daMenuRoles', 'qMenuRoles', roles);
          }
        }

        if (customCode === 'OBJECT_ROLES') {
          this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
          let roles: any[] = [];

          const objectRoles = this.pageData.filter((adapter: any) => adapter.dataAdapter === 'daObjectRoles')[0].data.filter((row: any) => row.dataSetName === 'qObjectRoles')[0].rows;

          if (objectRoles !== undefined && +objectRoles.length > 0) {
            objectRoles
              .forEach((role: any) => {
                roles.push({
                  role: role,
                  DDStatus: 3 // Default status for drag and drop
                });
              });

            this.pageData.filter((adapter: any) => adapter.dataAdapter === 'daObjectRoles')[0].data.filter((row: any) => row.dataSetName === 'qObjectRoles')[0]
              .rows = roles;

            this.gtsDataService.setPageDataSet(this.prjId, this.formId, 'daObjectRoles', 'qObjectRoles', roles);
          }
          await this.gtsDataService.runAction(this.prjId, this.formId, 'showObj');
        }

        if (customCode === 'MENU_ROLE_ADD') {
          const role = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daPrjData', 'qAllRoles');

          let rolesDS = [];
          if (this.gtsDataService.getDataSet(this.prjId, this.formId, 'daMenuRoles', 'qMenuRoles') !== undefined) {
            rolesDS = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daMenuRoles', 'qMenuRoles')
              .filter((row: any) => row.role !== role.role);
          }

          rolesDS.push({ role: role.role });

          this.gtsDataService.setPageDataSet(this.prjId, this.formId, 'daMenuRoles', 'qMenuRoles', rolesDS);
          this.gtsDataService.sendGridReload('qMenuRoles');

          // extract roles from rolesDS array only
          const rolesArray: any[] = [];
          rolesDS.forEach((row: any) => {
            rolesArray.push(row.role);
          });
          this.gtsDataService.setPageFieldValue(this.prjId, this.formId, 'gtsFldqMenu_roles', rolesArray);
        }

        if (customCode === 'MENU_ROLE_REMOVE') {
          const role = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daMenuRoles', 'qMenuRoles');
          const rolesDS = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daMenuRoles', 'qMenuRoles')
            .filter((row: any) => row.role !== role.role);

          this.gtsDataService.setPageDataSet(this.prjId, this.formId, 'daMenuRoles', 'qMenuRoles', rolesDS);
          this.gtsDataService.sendGridReload('qMenuRoles');

          // extract roles from rolesDS array only
          const rolesArray: any[] = [];
          rolesDS.forEach((row: any) => {
            rolesArray.push(row.role);
          });
          this.gtsDataService.setPageFieldValue(this.prjId, this.formId, 'gtsFldqMenu_roles', rolesArray);
        }

        if (customCode === 'OBJ_ROLE_ADD') {
          const role = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daPrjData', 'qAllRoles');

          let rolesDS = [];
          if (this.gtsDataService.getDataSet(this.prjId, this.formId, 'daObjectRoles', 'qObjectRoles') !== undefined) {
            rolesDS = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daObjectRoles', 'qObjectRoles')
              .filter((row: any) => row.role !== role.role);
          }

          rolesDS.push({ role: role.role });

          this.gtsDataService.setPageDataSet(this.prjId, this.formId, 'daObjectRoles', 'qObjectRoles', rolesDS);
          this.gtsDataService.sendGridReload('qObjectRoles');

          // extract roles from rolesDS array only
          const rolesArray: any[] = [];
          rolesDS.forEach((row: any) => {
            rolesArray.push(row.role);
          });
          this.gtsDataService.setPageFieldValue(this.prjId, this.formId, 'gtsFldqObjects_roles', rolesArray);
        }

        if (customCode === 'OBJ_ROLE_REMOVE') {
          const role = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daObjectRoles', 'qObjectRoles');
          const rolesDS = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daObjectRoles', 'qObjectRoles')
            .filter((row: any) => row.role !== role.role);

          this.gtsDataService.setPageDataSet(this.prjId, this.formId, 'daObjectRoles', 'qObjectRoles', rolesDS);
          this.gtsDataService.sendGridReload('qObjectRoles');

          // extract roles from rolesDS array only
          const rolesArray: any[] = [];
          rolesDS.forEach((row: any) => {
            rolesArray.push(row.role);
          });
          this.gtsDataService.setPageFieldValue(this.prjId, this.formId, 'gtsFldqObjects_roles', rolesArray);
        }

        if (customCode === 'REFRESH_GRID_OBJS') {
          this.gtsDataService.sendGridReload('qMenu');
          this.gtsDataService.sendGridReload('qObjects');
        }

        //===== END CUSTOM CODE =====

        this.gtsDataService.sendAppLoaderListener(false);
      });

    // Toolbar Events Listener
    this.toolbarListenerSubs = this.gtsDataService
      .getToolbarEventListener()
      .subscribe((data) => {
        //===== START CUSTOM_TOOLBAR_EVENT_CODE =====

        console.log('Toolbar Event Received:', data);

        this.toolbarSelectedValue = data.selectedValue;
        this.customData[0].value = this.toolbarSelectedValue;
        this.gtsDataService.runAction(this.prjId, this.formId, 'projectDS');

        //===== END CUSTOM_TOOLBAR_EVENT_CODE =====
      });

    // CUSTOM DATA
    this.customData = [{
      type: 'select',
      label: 'Project: ',
      items: null,
      value: null,
      field: 'prjId',
    }];

    // Run Page
    this.gtsDataService.runPage(this.prjId, this.formId);
  }

  ngOnDestroy(): void {
    this.appViewListenerSubs?.unsubscribe();
    this.pageCustomListenerSubs?.unsubscribe();
    this.appLoaderListenerSubs?.unsubscribe();
    this.formReqListenerSubs?.unsubscribe();
    this.toolbarListenerSubs?.unsubscribe();
  }

  // METHODS
  filterProject(objectName: string, selectedValue: any, dataSetName: string) {
    if (this.metaData.grids
        .filter((element: any) => element.objectName === objectName)[0]
        .data !== undefined) {

      this.metaData.grids
        .filter((element: any) => element.objectName === objectName)[0]
        .data.dataSource.load();
    }

    this.metaData.dataSets.forEach((dataSet: any) => {
      if (dataSet.dataSetName === dataSetName) {
        dataSet.filterObject = { 'prjId': selectedValue };
      }
    });
  }
}
