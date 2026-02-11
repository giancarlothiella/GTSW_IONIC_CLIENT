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
      column.columnType = col.columnType; // Preserve columnType for multiline (B), checkbox (C), image (X)
      column.colType = col.colType; // Preserve colType (String, Integer, Float, Date, etc.)
      column.visible = col.visible;

      // Summary properties for pinned bottom row (sum, count, avg, weightedAvg)
      if (col.summaryType) {
        column.summaryType = col.summaryType;
      }
      if (col.summaryProductCol) {
        column.summaryProductCol = col.summaryProductCol;
      }
      if (col.summaryWeightCol) {
        column.summaryWeightCol = col.summaryWeightCol;
      }

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

    // Filter by dataAdapter first if specified, then by dataSetName
    // This ensures grids get data from their specific adapter, not from any adapter with matching dataSetName
    pageData
    .forEach((adapter: any) => {
      // If metaData.dataAdapter is specified, only look in that adapter
      // Otherwise, search all adapters (backward compatibility)
      if (metaData.dataAdapter && adapter.dataAdapter !== metaData.dataAdapter) {
        return; // Skip this adapter
      }
      adapter.data.forEach((set: any) => {
        if (set.dataSetName === metaData.dataSetName) {
          dataSet = set.rows;
          // Controlla se c'è totalCount (indica paginazione lato server)
          if (set.totalCount !== undefined && set.totalCount !== null) {
            totalCount = set.totalCount;
          }

          // Estrai info sul limite iniziale dal server
          if (set.limitApplied !== undefined) {
            data.limitApplied = set.limitApplied;
          }
          if (set.limitInitialLoad !== undefined) {
            data.limitInitialLoad = set.limitInitialLoad;
          }
          if (set.initialLoadLimit !== undefined) {
            data.initialLoadLimit = set.initialLoadLimit;
          }
          if (set.paginationMode !== undefined) {
            data.paginationMode = set.paginationMode;
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

    // Apply external filter (e.g., from toolbar) to the dataset
    // filterRule format: ['fieldName', 'operator', 'value'] or [['field1', '=', 'val1'], 'and', ['field2', '=', 'val2']]
    let filteredDataSet = dataSet;
    if (dataFilter && dataFilter.length > 0) {
      filteredDataSet = this.applyFilterRule(dataSet, dataFilter);
    }

    // Per AG Grid: restitui direttamente i dati come array
    // Mantieni compatibilità con DevExtreme API structure per existing code (es. auth-details)
    data.dataSource = {
      _store: {
        _array: filteredDataSet // AG Grid component estrae i dati da qui
      },
      _items: filteredDataSet // For compatibility with code that accesses data.dataSource._items
    };

    // Mark if data is filtered by external rule
    if (dataFilter && dataFilter.length > 0) {
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
      dataSetName: metaData.dataSetName,
      // Initial load limit info from server
      limitApplied: data.limitApplied || false,
      limitInitialLoad: data.limitInitialLoad || false,
      initialLoadLimit: data.initialLoadLimit || 0,
      totalCount: totalCount,
      paginationMode: data.paginationMode || 1
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

  /**
   * Apply filter rule to dataset (for external filters like toolbar)
   * Supports simple format: ['fieldName', 'operator', 'value']
   * Supports compound format: [['field1', '=', 'val1'], 'and', ['field2', '=', 'val2']]
   */
  private applyFilterRule(dataSet: any[], filterRule: any[]): any[] {
    if (!dataSet || dataSet.length === 0 || !filterRule || filterRule.length === 0) {
      return dataSet;
    }

    // Check if it's a simple filter: ['fieldName', 'operator', 'value']
    if (filterRule.length === 3 && typeof filterRule[0] === 'string' && typeof filterRule[1] === 'string') {
      const [fieldName, operator, value] = filterRule;
      return dataSet.filter(row => this.evaluateCondition(row, fieldName, operator, value));
    }

    // Check if it's a compound filter: [condition1, 'and'/'or', condition2, ...]
    if (Array.isArray(filterRule[0])) {
      return dataSet.filter(row => this.evaluateCompoundFilter(row, filterRule));
    }

    // Unknown format, return original data
    console.warn('[gts-grid.service] Unknown filterRule format:', filterRule);
    return dataSet;
  }

  /**
   * Evaluate a single condition against a row
   */
  private evaluateCondition(row: any, fieldName: string, operator: string, value: any): boolean {
    const rowValue = row[fieldName];

    switch (operator.toLowerCase()) {
      case '=':
      case 'equals':
        return rowValue === value;
      case '<>':
      case '!=':
      case 'notequals':
        return rowValue !== value;
      case '>':
        return rowValue > value;
      case '>=':
        return rowValue >= value;
      case '<':
        return rowValue < value;
      case '<=':
        return rowValue <= value;
      case 'contains':
        return rowValue && String(rowValue).toLowerCase().includes(String(value).toLowerCase());
      case 'startswith':
        return rowValue && String(rowValue).toLowerCase().startsWith(String(value).toLowerCase());
      case 'endswith':
        return rowValue && String(rowValue).toLowerCase().endsWith(String(value).toLowerCase());
      default:
        console.warn('[gts-grid.service] Unknown operator:', operator);
        return true;
    }
  }

  /**
   * Evaluate compound filter with 'and'/'or' logic
   */
  private evaluateCompoundFilter(row: any, filterRule: any[]): boolean {
    let result = true;
    let currentOperator = 'and';

    for (let i = 0; i < filterRule.length; i++) {
      const part = filterRule[i];

      if (typeof part === 'string' && (part.toLowerCase() === 'and' || part.toLowerCase() === 'or')) {
        currentOperator = part.toLowerCase();
      } else if (Array.isArray(part) && part.length === 3) {
        const conditionResult = this.evaluateCondition(row, part[0], part[1], part[2]);

        if (currentOperator === 'and') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }
    }

    return result;
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
    this.gtsDataService.setSelectedRows(prjId, formId, dataAdapter, dataSetName, selectedRowsData, selectedRowKeys);
    if (selectedRowKeys.length > 0 && sAction !== undefined && sAction !== null && sAction !== '') {
      this.gtsDataService.runAction(prjId, formId, sAction);
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
