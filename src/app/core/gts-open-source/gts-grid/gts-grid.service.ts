import { Injectable } from '@angular/core';
import { GtsDataService } from '../../services/gts-data.service';
@Injectable({
  providedIn: 'root'
})
export class GtsGridService {
  constructor(private gtsDataService: GtsDataService) { }

  async getGridData(prjId: string, formId: number, metaData: any, pageData: any, getCustomVerifyResult: any) {
    let data: any = {};
    data.columns = [];
    data.lookUps = [];
    let fieldWithImageList: any[] = []; 
    let groupData: any = [];

    const allowDeleting = true; //metaData.allowDeleting;

    if (this.gtsDataService.getPageMetaData(prjId, formId, 'all', 'all')
      .forms 
      .filter((form: any) => form.groupId === metaData.groupId).length > 0) {

      groupData = this.gtsDataService.getPageMetaData(prjId, formId, 'all', 'all')
      .forms 
      .filter((form: any) => form.groupId === metaData.groupId)[0].fields;

      groupData.forEach((field: any) => {
        field['dbFieldName'] = this.gtsDataService.getPageMetaData(prjId, formId, 'all', 'all').
        pageFields
        .filter((pageField: any) => pageField.pageFieldName === field.objectName)[0].dbFieldName;    
      });
    }
    
    const columns = metaData.columns;
    let colBands: any = [];
    let colBand: any = {};

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];      
      let column: any = {};
      column.index = i;

      if (col.bandId !== null  && colBands.filter((band: any) => band.bandId === col.bandId).length === 0) {
        colBand = {
          bandId: col.bandId,
          caption: metaData.bands.filter((band: any) => band.bandId === col.bandId)[0].bandText,
          columns: []
        };

        colBands.push(colBand);
      } else {
        colBand = null;
      }
      column.dataField = col.fieldName;
      column.caption = col.text;
      column.allowEditing = col.allowEditing;

      if (groupData.length > 0) {
        let field = groupData.filter((field: any) => field.dbFieldName === col.fieldName)[0];

        if (!field.allowEmpty) {
          column.validationRules = [{ type: 'required' }];
        }

        if (field.fieldRangeLow !== null && field.fieldRangeHigh !== null) {
          column.validationRules = [{ type: 'range', min: field.fieldRangeLow, max: field.fieldRangeHigh }];
        }

        // async validation
        if (field.fieldCode !== null && field.fieldCode !== undefined && field.fieldCode !== '') {
          column.fieldCode = field.fieldCode;
          column.validationRules = [{ type: 'async', validationCallback: async (e: any) => {
            const formRequest = {
              typeRequest: 'grid',
              gridName: metaData.objectName,
              field: field.fieldCode,                  
              value: e.value,
              data: e.data
            }

            e.formRequest = formRequest;
            const valid = await getCustomVerifyResult(e);
            return valid;            
          } }];
        }
      
        if (col.editorType === 'Lookup' || col.editorType === 'Dropdown') {
          // Cache: usa i dati già caricati se disponibili
          if (!field.rows || field.rows.length === 0) {
            const form = this.gtsDataService.getPageMetaData(prjId, formId, 'all', 'all')
            .forms
            .filter((form: any) => form.groupId === metaData.groupId)[0];

            const responseData = await this.gtsDataService.getExportedDSData(prjId, formId, metaData.groupId, field.fieldName, form, field.objectName);
            field.rows = responseData.data[0].rows;
          }

          column.lookup = {
            dataSource: field.rows,
            valueExpr: field.fieldName,
            displayExpr: field.fieldName
          };
        }
      }

      if (col.flagGroupBy) {
        column.groupIndex = '0';
      }
      if (col.colType === 'DateTime') {
        column.dataType = 'date';
        column.format = 'dd/MM/yyyy HH:mm:ss';
      } else if (col.colType === 'Array') {
        column.dataType = 'string';
      } else if (col.colType === 'Object') {
        column.dataType = 'string';        
      } else if (col.colType === 'Date') {
        column.dataType = 'date';
        column.format = 'dd/MM/yyyy';
      } else if (col.columnType === 'C') {
        column.checkedValue = col.checkedValue || true;
        column.uncheckedValue = col.uncheckedValue || false;
        column.dataType = 'boolean';        
      } else if (col.colType === 'String') {
        column.dataType = 'string';       
      } else if (col.colType === 'Float') {
        column.dataType = 'number';
        column.precision = 2;
        if (col.mask !== undefined && col.mask !== null) {
          column.format = col.mask;
        } else {
          column.format = '#,###.00';
        }
      } else if (col.colType === 'Integer') {
        column.dataType = 'integer';
      }

      if (col.columnType === 'X') {
        column.cellTemplate="cellTemplate";
        column.images = col.images; // Copy images metadata to column for AG Grid cellRenderer

        fieldWithImageList.push({
          fieldName: col.fieldName,
          images: col.images
        });
      }
      
      
      if (col.bandId !== null) {
        const bandColumns = colBands.filter((band: any) => band.bandId === col.bandId)[0].columns;
        bandColumns.push(column);
      } else {
        data.columns.push(column);
      }


      if (col.editorType === 'Lookup') {        
        data.lookUps.push({
          name: 'lookup_'+col.fieldName,
          colIndex: data.columns.length,
          fieldName: col.fieldName,
          lookup: column.lookup,
          visible: false
        });

        column = {
          type: 'buttons',
          name: 'lookup_'+col.fieldName,
          visible: false,
          width: 40,
          buttons: [ {
            name: 'lookup',
            hint: 'Lookup',
            icon: '/assets/images/lookUp16.png',
            visible(e: any) {
              return e.row.isEditing;
            },            
            onClick(e: any) {
              e.component.onLookupClick(e);              
            },
          }],
        };

        data.columns.push(column);
      }
      
    }

    if (colBands.length > 0) {
      colBands.forEach((band: any) => {
        data.columns.push(band);
      });        
    }

    
    if (allowDeleting) {
      let column = {
        type: 'buttons',
        name: 'delete',
        visible: false,
        width: 45,
      };
      data.columns.push(column);
    }   

    let keys: any[] = [];
    metaData
    .sqlKeys
    .forEach((key: any) => {
      keys.push(key.keyField);
    });

    let dataSet: any[] = [];
    let selectedRowKeys: any[] = [];
    let totalCount: number | null = null;

    pageData
    .forEach((adapter: any) => {
      adapter.data.forEach((set: any) => {
        if (set.dataSetName === metaData.dataSetName) {
          dataSet = set.rows;
          // Controlla se c'è totalCount (indica paginazione lato server)
          if (set.totalCount !== undefined && set.totalCount !== null) {
            totalCount = set.totalCount;
          }

          



          // Stringify any column that is a JSON Object
          if (dataSet !== undefined && dataSet !== null) {
            dataSet.forEach((row: any) => {
              metaData.columns.forEach((col: any) => {
                if (col.colType === 'Object' && typeof row[col.fieldName] !== 'string') {
                  row[col.fieldName] = JSON.stringify(row[col.fieldName]);
                }
              });
            });
          }

          if (set.selectedKeys !== undefined && set.selectedKeys !== null) {
            selectedRowKeys = set.selectedKeys;
          }
        }
      })
    });

    let dataFilter: any = [];
    if (metaData.filterRule !== undefined && metaData.filterRule !== null ) {
      dataFilter = metaData.filterRule;
    }
    const summary: any = [];

    data.summary = summary;
    data.dataFilter = dataFilter;
    data.keys = keys;

    // Per AG Grid: restitui direttamente i dati come array
    // Mantieni compatibilità con DevExtreme API structure per existing code (es. auth-details)
    data.dataSource = {
      _store: {
        _array: dataSet // AG Grid component estrae i dati da qui
      },
      _items: dataSet // For compatibility with code that accesses data.dataSource._items
    };

    // Nota: il filtering in AG Grid è gestito nativamente dal component
    // Non serve più applicare filtri qui
    if (data.dataFilter !== undefined && data.dataFilter !== null && data.dataFilter.length > 0) {
      data.filtered = true;
    }

    // copy dataset array to new backup array
    let backupDataSet: any[] = [];
    if (dataSet !== undefined && dataSet !== null) {
      backupDataSet = dataSet.map((row: any) => {
        return Object.assign({}, row);
      });
    }
    
    data.gridObject = {
      backupDataSet: backupDataSet,
      allowDeleting: metaData.allowDeleting,
      allowColumnResizing: metaData.allowColumnResizing,
      allowColumnReordering: metaData.allowColumnReordering,
      allowHeaderFiltering: metaData.allowHeaderFiltering,
      focusedRowEnabled: metaData.focusedRowEnabled,  
      headerFilterVisible: metaData.headerFilterVisible,
      filterRowVisible: metaData.filterRowVisible,
      pageSize: metaData.pageSize,
      allowedPageSizes: metaData.pageSizes,
      searchPanelFlag: metaData.searchPanelFlag,
      showPageSizeSelector: metaData.showPageSizeSelector,
      exportFlag: metaData.exportFlag,
      exportFormats: metaData.exportFormats,
      exportFileName: metaData.exportFileName,
      showCheckBoxesMode: metaData.showCheckBoxesMode,
      selectionMode: metaData.selectionMode,
      selectAllMode: metaData.selectAllMode,
      dataSet: dataSet,
      keys: keys,
      filtered: false,
      caption: metaData.caption,
      cssClass: metaData.cssClass,
      width: metaData.width || 'auto',
      height: metaData.height || '100%',
      selectedRowKeys: selectedRowKeys,
      groupData: groupData,
      groupId: metaData.groupId,
      visible: metaData.visible,
      DDStatus: metaData.DDStatus||0,
      DDTasksGroup: metaData.DDTasksGroup,
      DDActionTo: metaData.DDActionTo,
      DDActionFrom: metaData.DDActionFrom,
      dataSetName: metaData.dataSetName
    };

    // store grid component data on metadata
    metaData.data = data;
    
    return data;      
  } 

  getImage(metaData: any, data: any) {
    const col = metaData.columns[data.columnIndex];
    const image = col.images.filter((img: any) => img.imgValue === data.value)[0];       
    return '/assets/icons/stdImage_' + image.stdImageId + '_16.png';
  }

  setGridObjectSelectedData(
    prjId: string,
    formId: number,
    dataAdapter: string,
    dataSetName: string,
    selectedRowsData: any,
    selectedRowKeys: any,
    sAction: string,
    gridObject: any
  ) {
    console.log('[gts-grid-service] setGridObjectSelectedData called');
    console.log('[gts-grid-service] selectedRowKeys.length:', selectedRowKeys.length);
    console.log('[gts-grid-service] sAction:', sAction);

    this.gtsDataService.setSelectedRows(prjId, formId, dataAdapter, dataSetName, selectedRowsData, selectedRowKeys);
    if (selectedRowKeys.length > 0 && sAction !== undefined && sAction !== null && sAction !== '') {
      console.log('[gts-grid-service] Executing action:', sAction);
      this.gtsDataService.runAction(prjId, formId, sAction);
    } else {
      console.log('[gts-grid-service] Action NOT executed - conditions not met');
    }

    gridObject.selectedRowKeys = selectedRowKeys;
  }

  setDDRules(
    prjId: string, 
    formId: number, 
    objectName: string,
    DDdata: any,
  ) {
    this.gtsDataService.setDDRules(prjId, formId, objectName, DDdata);
  }

  getDDRules(
    prjId: string, 
    formId: number
  ) {
    return this.gtsDataService.getDDRules(prjId, formId);
  }

}
