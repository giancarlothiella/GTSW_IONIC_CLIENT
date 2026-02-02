// src/app/features/GTSW/auth-details/auth-details.component.ts
import { Component, Input, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
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
  selector: 'app-auth-details',
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
    <app-gts-toolbar
      [prjId]="prjId"
      [formId]="formId"
      [objectName]="'mainToolbar'"
      [customData]="customData"
      (newValueEvent)="gtsDataService.toolbarSelectEvent($event)">
    </app-gts-toolbar>

    <div [style]="viewStyle">
      @if (loading) {
      <app-gts-loader></app-gts-loader>
      }

      @for (element of metaData.tabs; track element.objectName) {
        @if (element.visible) {
          <app-gts-tabs
            [style]="'grid-area: ' + element.gridArea"
            [prjId]="prjId"
            [formId]="formId"
            [objectName]="element.objectName">
          </app-gts-tabs>
        }
      }

      @for (element of metaData.reports; track element.fieldGrpId) {
        @if (element.visible) {
          <app-gts-reports
            [style]="'grid-area: ' + element.gridArea"
            [prjId]="prjId"
            [formId]="formId"
            [fieldGrpId]="element.fieldGrpId">
          </app-gts-reports>
        }
      }

      @for (element of metaData.toolbars; track element.objectName) {
        @if (element.visible && element.objectName != 'mainToolbar' && !element.toolbarFlagSubmit) {
          <app-gts-toolbar
            [style]="'grid-area: ' + element.gridArea"
            [prjId]="prjId"
            [formId]="formId"
            [objectName]="element.objectName"
            [customCssClass]="element.customCssClass"
            (newValueEvent)="gtsDataService.toolbarSelectEvent($event)">
          </app-gts-toolbar>
        }
      }

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
  `,
  styleUrls: ['./auth-details.component.scss']
})
export class AuthDetailsComponent implements OnInit, OnDestroy {
  @Input() nestedFormCargo: any = {};

  private authService = inject(AuthService);
  public gtsDataService = inject(GtsDataService);
  private cd = inject(ChangeDetectorRef);

  // Page params
  prjId = 'GTSW';
  formId = 99;

  // Subscriptions
  private appViewListenerSubs?: Subscription;
  private formReqListenerSubs?: Subscription;
  private pageCustomListenerSubs?: Subscription;
  private appLoaderListenerSubs?: Subscription;
  private messageListenerSubs?: Subscription;

  // State
  metaData: any = {};
  actualView = '';
  loading = true;
  pageData: any = {};
  viewStyle = '';
  customData: any[] = [];
  toolbarSelectedValue = '';

  ngOnInit(): void {
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

        if (this.metaData.views?.filter((view: any) => view.viewName === actualView).length > 0) {
          this.viewStyle = this.metaData.views.filter((view: any) => view.viewName === actualView)[0].viewStyle;
        }
      });

    // Form Req Listener
    this.formReqListenerSubs = this.gtsDataService
      .getFormReqListener()
      .subscribe((formRequestField: any) => {
        const reply: any = {
          valid: true,
          message: ''
        };

        this.gtsDataService.sendFormReply(reply);
      });

    // Custom Code Listener
    this.pageCustomListenerSubs = this.gtsDataService
      .getPageCustomListener()
      .subscribe(async (customCode: string) => {
        await this.handleCustomCode(customCode);
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
    let dataAdapter = '';
    let connAdapter = '';

    // Determine data adapter based on data source
    if (this.nestedFormCargo.dataSource === 'Profile') {
      dataAdapter = 'daAuthDetails';
      connAdapter = 'daAuthConn';
    } else if (this.nestedFormCargo.dataSource === 'User') {
      dataAdapter = 'daUserDetails';
      connAdapter = 'daUserConn';
    } else if (this.nestedFormCargo.dataSource === 'Key') {
      dataAdapter = 'daKeyDetails';
      connAdapter = 'daKeyConn';
    }

    switch (customCode) {
      case 'FORM_EXIT':
        this.handleFormExit();
        break;

      case 'MAIN_INIT':
        this.handleMainInit(dataAdapter);
        break;

      case 'GET_CONN':
        this.handleGetConn();
        break;

      case 'AUTH_ROLES':
        this.handleAuthRoles(dataAdapter);
        break;

      case 'AUTH_PARAMS':
        this.handleAuthParams(dataAdapter);
        break;

      case 'PRJ_ADD':
        this.handlePrjAdd(dataAdapter);
        break;

      case 'PRJ_REMOVE':
        this.handlePrjRemove(dataAdapter);
        break;

      case 'PRJ_SET_DEFAULT':
        this.handlePrjSetDefault(dataAdapter);
        break;

      case 'CONN_ADD':
        this.handleConnAdd(connAdapter);
        break;

      case 'CONN_REMOVE':
        this.handleConnRemove(connAdapter);
        break;

      case 'CONN_SET_DEFAULT':
        this.handleConnSetDefault(connAdapter);
        break;

      case 'ROLE_ADD':
        this.handleRoleAdd(dataAdapter);
        break;

      case 'ROLE_REMOVE':
        this.handleRoleRemove(dataAdapter);
        break;

      case 'SAVE_ALL':
        this.handleSaveAll();
        break;

      case 'SAVE_ALL_EXIT':
        this.handleSaveAllExit();
        break;
    }
  }

  private handleFormExit(): void {
    const formRequest = {
      typeRequest: 'EXIT',
      formId: this.formId
    };
    this.gtsDataService.sendFormRequest(formRequest);
  }

  private handleMainInit(dataAdapter: string): void {
    this.gtsDataService.removePageData(this.prjId, this.formId);
    this.metaData = this.gtsDataService.getPageMetaData(this.prjId, this.formId, 'all', 'all');

    this.metaData.tabs[0].tabIndex = 0;
    this.metaData.tabs[0].visible = false;

    if (this.nestedFormCargo.dataSource === 'Profile') {
      this.gtsDataService.setPageRule(this.prjId, this.formId, 10, 1);

      this.metaData.grids.filter((ds: any) => ds.objectName === 'gtsGridProjects')[0].sqlId = 21;
      this.metaData.grids.filter((ds: any) => ds.objectName === 'gtsGridProjects')[0].dataAdapter = dataAdapter;
      this.metaData.grids.filter((ds: any) => ds.objectName === 'gtsGridRoles')[0].sqlId = 17;
      this.metaData.grids.filter((ds: any) => ds.objectName === 'gtsGridRoles')[0].dataAdapter = dataAdapter;

      this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'gtsFldqProfiles_authProfileCode')[0].value = this.nestedFormCargo.authProfileCode;
      this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'gtsFldqUsers_email')[0].value = '';
      this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'gtsFldqProfiles_authKey')[0].value = '';
    } else if (this.nestedFormCargo.dataSource === 'User') {
      this.gtsDataService.setPageRule(this.prjId, this.formId, 10, 2);

      this.metaData.grids.filter((ds: any) => ds.objectName === 'gtsGridProjects')[0].sqlId = 23;
      this.metaData.grids.filter((ds: any) => ds.objectName === 'gtsGridProjects')[0].dataAdapter = dataAdapter;
      this.metaData.grids.filter((ds: any) => ds.objectName === 'gtsGridRoles')[0].sqlId = 3;
      this.metaData.grids.filter((ds: any) => ds.objectName === 'gtsGridRoles')[0].dataAdapter = dataAdapter;

      this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'gtsFldqProfiles_authProfileCode')[0].value = '';
      this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'gtsFldqUsers_email')[0].value = this.nestedFormCargo.email;
      this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'gtsFldqProfiles_authKey')[0].value = '';
    } else if (this.nestedFormCargo.dataSource === 'Key') {
      this.gtsDataService.setPageRule(this.prjId, this.formId, 10, 3);

      this.metaData.grids.filter((ds: any) => ds.objectName === 'gtsGridProjects')[0].sqlId = 45;
      this.metaData.grids.filter((ds: any) => ds.objectName === 'gtsGridProjects')[0].dataAdapter = dataAdapter;
      this.metaData.grids.filter((ds: any) => ds.objectName === 'gtsGridRoles')[0].sqlId = 46;
      this.metaData.grids.filter((ds: any) => ds.objectName === 'gtsGridRoles')[0].dataAdapter = dataAdapter;

      this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'gtsFldqProfiles_authProfileCode')[0].value = '';
      this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'gtsFldqUsers_email')[0].value = '';
      this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'gtsFldqProfiles_authKey')[0].value = this.nestedFormCargo.authKey;
    }
  }

  private handleGetConn(): void {
    this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'qProjects_prjId')[0].value =
      this.metaData.pageFields.filter((field: any) => field.pageFieldName === 'authFldqProjects_prjId')[0].value;
  }

  private handleAuthRoles(dataAdapter: string): void {
    this.pageData = this.gtsDataService.getPageData(this.prjId, this.formId);
    const userRoles: any[] = [];

    const authRoles = this.pageData.filter((adapter: any) => adapter.dataAdapter === dataAdapter)[0]
      .data.filter((row: any) => row.dataSetName === 'qRoles')[0].rows;

    if (authRoles !== undefined && authRoles.length > 0) {
      authRoles.forEach((role: any) => {
        userRoles.push({ role: role });
      });

      this.pageData.filter((adapter: any) => adapter.dataAdapter === dataAdapter)[0]
        .data.filter((row: any) => row.dataSetName === 'qRoles')[0].rows = userRoles;

      this.gtsDataService.setPageDataSet(this.prjId, this.formId, dataAdapter, 'qRoles', userRoles);
    }
  }

  private handleAuthParams(dataAdapter: string): void {
    const assignedParams = this.pageData.filter((adapter: any) => adapter.dataAdapter === dataAdapter)[0]
      .data.filter((row: any) => row.dataSetName === 'qParams')[0].rows[0];

    if (assignedParams.params !== undefined) {
      const userParams = assignedParams.params;
      const allParams: any[] = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daAll', 'qAllParams');

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

  private handlePrjAdd(dataAdapter: string): void {
    const project = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daAll', 'qAllPrj');
    let userProjectDS = this.gtsDataService.getDataSet(this.prjId, this.formId, dataAdapter, 'qProjects');

    if (userProjectDS === undefined) {
      userProjectDS = [];
    } else {
      userProjectDS = userProjectDS.filter((row: any) => row.prjId !== project.prjId);
    }

    userProjectDS.push({
      prjId: project.prjId,
      description: project.description,
      prjDefault: false,
      dbConnections: project.dbConnections
    });

    this.gtsDataService.setPageDataSet(this.prjId, this.formId, dataAdapter, 'qProjects', userProjectDS);
    this.gtsDataService.sendGridReload('qProjects');
  }

  private handlePrjRemove(dataAdapter: string): void {
    const project = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, dataAdapter, 'qProjects');
    const userProjectDS = this.gtsDataService.getDataSet(this.prjId, this.formId, dataAdapter, 'qProjects')
      .filter((row: any) => row.prjId !== project.prjId);

    this.gtsDataService.setPageDataSet(this.prjId, this.formId, dataAdapter, 'qProjects', userProjectDS);
    this.gtsDataService.sendGridReload('qProjects');
  }

  private handlePrjSetDefault(dataAdapter: string): void {
    const project = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, dataAdapter, 'qProjects');
    const userProjectDS = this.gtsDataService.getDataSet(this.prjId, this.formId, dataAdapter, 'qProjects')
      .map((row: any) => {
        if (row.prjId === project.prjId) {
          row.prjDefault = true;
        } else {
          row.prjDefault = false;
        }
        return row;
      });

    this.gtsDataService.setPageDataSet(this.prjId, this.formId, dataAdapter, 'qProjects', userProjectDS);
    this.gtsDataService.sendGridReload('qProjects');
  }

  private handleConnAdd(connAdapter: string): void {
    const selectedConn = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daPrjConn', 'qPrjConn');
    if (selectedConn.connDefault === undefined) {
      selectedConn.connDefault = false;
    }

    let allConn: any[] = [];
    allConn = this.gtsDataService.getDataSet(this.prjId, this.formId, connAdapter, 'qConn');

    if (allConn === null) {
      allConn = [];
    } else {
      if (this.gtsDataService.getDataSet(this.prjId, this.formId, connAdapter, 'qConn') !== null) {
        allConn = this.gtsDataService.getDataSet(this.prjId, this.formId, connAdapter, 'qConn')
          .filter((row: any) => row.connCode !== selectedConn.connCode);
      }
    }

    allConn.push({
      connCode: selectedConn.connCode,
      dataKey: selectedConn.dataKey,
      connDefault: false
    });

    this.gtsDataService.setPageDataSet(this.prjId, this.formId, connAdapter, 'qConn', allConn);
    this.gtsDataService.sendGridReload('qConn');

    // Update project connections
    const prjConns: any[] = [];
    let allConnDS = this.gtsDataService.getDataSet(this.prjId, this.formId, connAdapter, 'qConn');

    if (allConnDS === null) {
      allConnDS = allConn;
      allConnDS = [];
      allConnDS.push({
        connCode: selectedConn.connCode,
        dataKey: selectedConn.dataKey,
        connDefault: false
      });

      prjConns.push({
        connCode: selectedConn.connCode,
        dataKey: selectedConn.dataKey,
        connDefault: false
      });
    } else {
      allConnDS.forEach((conn: any) => {
        prjConns.push({
          connCode: conn.connCode,
          connDefault: conn.connDefault,
          dataKey: conn.dataKey
        });
      });
    }

    const dataAdapter = this.getDataAdapter();
    const selectedProject = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, dataAdapter, 'qProjects');
    selectedProject.dbConnections = prjConns;

    // Also update the project in rows array (selectedRows might be a copy)
    const allProjects = this.gtsDataService.getDataSet(this.prjId, this.formId, dataAdapter, 'qProjects');
    if (allProjects) {
      const projectInRows = allProjects.find((p: any) => p.prjId === selectedProject.prjId);
      if (projectInRows) {
        projectInRows.dbConnections = prjConns;
      }
    }
  }

  private handleConnRemove(connAdapter: string): void {
    const selectedConn = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, connAdapter, 'qConn');
    const allConn = this.gtsDataService.getDataSet(this.prjId, this.formId, connAdapter, 'qConn')
      .filter((row: any) => row.connCode !== selectedConn.connCode);

    this.gtsDataService.setPageDataSet(this.prjId, this.formId, connAdapter, 'qConn', allConn);
    this.gtsDataService.sendGridReload('qConn');

    // Update project connections
    const prjConns: any[] = [];
    const connData = this.gtsDataService.getDataSet(this.prjId, this.formId, connAdapter, 'qConn');
    if (connData) {
      connData.forEach((conn: any) => {
        prjConns.push({
          connCode: conn.connCode,
          connDefault: conn.connDefault ?? false,
          dataKey: conn.dataKey
        });
      });
    }

    const dataAdapter = this.getDataAdapter();
    const selectedProject = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, dataAdapter, 'qProjects');
    selectedProject.dbConnections = prjConns;

    // Also update the project in rows array (selectedRows might be a copy)
    const allProjects = this.gtsDataService.getDataSet(this.prjId, this.formId, dataAdapter, 'qProjects');
    if (allProjects) {
      const projectInRows = allProjects.find((p: any) => p.prjId === selectedProject.prjId);
      if (projectInRows) {
        projectInRows.dbConnections = prjConns;
      }
    }
  }

  private handleConnSetDefault(connAdapter: string): void {
    const selectedConn = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, connAdapter, 'qConn');
    const allConn = this.gtsDataService.getDataSet(this.prjId, this.formId, connAdapter, 'qConn');

    allConn.forEach((row: any) => {
      if (row.connCode === selectedConn.connCode) {
        row.connDefault = true;
      } else {
        row.connDefault = false;
      }
      return row;
    });

    // Update project connections
    const prjConns: any[] = [];
    this.gtsDataService.getDataSet(this.prjId, this.formId, connAdapter, 'qConn')
      .forEach((conn: any) => {
        prjConns.push({
          connCode: conn.connCode,
          connDefault: conn.connDefault,
          dataKey: conn.dataKey
        });
      });

    const dataAdapter = this.getDataAdapter();
    const selectedProject = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, dataAdapter, 'qProjects');
    selectedProject.dbConnections = prjConns;

    // Also update the project in rows array (selectedRows might be a copy)
    const allProjects = this.gtsDataService.getDataSet(this.prjId, this.formId, dataAdapter, 'qProjects');
    if (allProjects) {
      const projectInRows = allProjects.find((p: any) => p.prjId === selectedProject.prjId);
      if (projectInRows) {
        projectInRows.dbConnections = prjConns;
      }
    }

    this.gtsDataService.setPageDataSet(this.prjId, this.formId, connAdapter, 'qConn', allConn);
    this.gtsDataService.sendGridReload('qConn');
  }

  private handleRoleAdd(dataAdapter: string): void {
    const role = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, 'daAll', 'qAllRoles');

    let userRoleDS = [];
    if (this.gtsDataService.getDataSet(this.prjId, this.formId, dataAdapter, 'qRoles') !== undefined) {
      userRoleDS = this.gtsDataService.getDataSet(this.prjId, this.formId, dataAdapter, 'qRoles')
        .filter((row: any) => row.role !== role.role);
    }

    userRoleDS.push({ role: role.role });

    this.gtsDataService.setPageDataSet(this.prjId, this.formId, dataAdapter, 'qRoles', userRoleDS);
    this.gtsDataService.sendGridReload('qRoles');
  }

  private handleRoleRemove(dataAdapter: string): void {
    const role = this.gtsDataService.getDataSetSelectRow(this.prjId, this.formId, dataAdapter, 'qRoles');
    const userRoleDS = this.gtsDataService.getDataSet(this.prjId, this.formId, dataAdapter, 'qRoles')
      .filter((row: any) => row.role !== role.role);

    this.gtsDataService.setPageDataSet(this.prjId, this.formId, dataAdapter, 'qRoles', userRoleDS);
    this.gtsDataService.sendGridReload('qRoles');
  }

  private handleSaveAll(): void {
    const dataAdapter = this.getDataAdapter();

    // PARAMS - read from gtsDataService for consistency
    const allParams = this.gtsDataService.getDataSet(this.prjId, this.formId, 'daAll', 'qAllParams');
    if (allParams && allParams.length > 0) {
      let detailParams: any = {};

      allParams.forEach((param: any) => {
        if (param.paramType === 'String') {
          detailParams[param.paramCode] = param.paramDefaultChar;
        } else if (param.paramType === 'Number') {
          detailParams[param.paramCode] = param.paramDefaultNum;
        } else if (param.paramType === 'Boolean') {
          detailParams[param.paramCode] = param.paramDefaultBool;
        }
      });

      let paramNew: any = {};

      Object.keys(detailParams).forEach((key: any) => {
        if (detailParams[key] !== null && detailParams[key] !== '') {
          paramNew[key] = detailParams[key];
        }
      });

      allParams.forEach((param: any) => {
        if (param['assigned'] === false) {
          delete paramNew[param.paramCode];
        }
      });

      this.gtsDataService.setFieldsValue(this.prjId, this.formId, [{ pageFieldName: 'saveParamJson', value: paramNew }]);
    }

    // ROLES - read from gtsDataService for consistency
    const roles = this.gtsDataService.getDataSet(this.prjId, this.formId, dataAdapter, 'qRoles');
    if (roles && roles.length > 0) {
      const detailRoles: any[] = [];
      roles.forEach((role: any) => {
        detailRoles.push(role.role);
      });

      this.gtsDataService.setFieldsValue(this.prjId, this.formId, [{ pageFieldName: 'saveRolesArray', value: detailRoles }]);
    }

    // PROJECTS - read from gtsDataService for consistency (includes updated dbConnections)
    const projects = this.gtsDataService.getDataSet(this.prjId, this.formId, dataAdapter, 'qProjects');
    if (projects && projects.length > 0) {
      const detailProjects: any[] = [];
      projects.forEach((project: any) => {
        // Ensure dbConnections always have connDefault property
        const dbConnections = project.dbConnections?.map((conn: any) => ({
          connCode: conn.connCode,
          dataKey: conn.dataKey,
          connDefault: conn.connDefault ?? false // Default to false if not set
        })) || [];

        detailProjects.push({
          prjId: project.prjId,
          prjDefault: project.prjDefault,
          description: project.description,
          dbConnections: dbConnections
        });
      });

      this.gtsDataService.setFieldsValue(this.prjId, this.formId, [{ pageFieldName: 'saveProjectsArray', value: detailProjects }]);
    }
  }

  private handleSaveAllExit(): void {
    // Exit after save all
    this.gtsDataService.runAction(this.prjId, this.formId, 'formExit');
  }

  private getDataAdapter(): string {
    if (this.nestedFormCargo.dataSource === 'Profile') {
      return 'daAuthDetails';
    } else if (this.nestedFormCargo.dataSource === 'User') {
      return 'daUserDetails';
    } else if (this.nestedFormCargo.dataSource === 'Key') {
      return 'daKeyDetails';
    }
    return '';
  }
}
