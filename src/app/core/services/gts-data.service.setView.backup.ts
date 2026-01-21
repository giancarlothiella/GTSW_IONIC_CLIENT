/**
 * BACKUP del metodo setView originale - creato prima della modifica per eliminare il flickering
 * Data: 2026-01-21
 *
 * Per ripristinare: copiare questo metodo nel file gts-data.service.ts
 * sostituendo il metodo setView esistente (righe 2078-2271)
 */

// Reset Metadata Vibility
private resetMetadataVisibility(prjId: string, formId: number) {
  this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .tabs
    .forEach((tab: any) => {
      tab.visible = false;
    });

    this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .grids
    .forEach((grid: any) => {
      grid.visible = false;
    });

    this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .reportsGroups
    .forEach((rptGroup: any) => {
      rptGroup.visible = false;
    });

    this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .toolbars
    .forEach((toolbar: any) => {
      toolbar.visible = false;
      toolbar.itemsList.forEach((item: any) => {
        item.visible = false;
      });
    });

    this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .forms
    .forEach((form: any) => {
      form.visible = false;
    });
}

// Set View
private setView(prjId: string, formId: number, viewName: string, isPrevious: boolean) {
  let valid: boolean = true;

  if (!isPrevious) {
    if (this.actualView !== '' && this.actualView !== viewName) {
      this.previousView.push(this.actualView);
    }
    this.actualView = viewName;
  } else {
    this.actualView = this.previousView.pop() || '';
    viewName = this.actualView;
  }

  if (viewName === '') {
    valid = false;
  } else {

    let objList: any[] = [];

    // Look on all view actual viewName plus all views with viewFlagAlwaysActive order by viewLevel
    this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .views
    .filter((view: any) => view.viewName === viewName || view.viewFlagAlwaysActive)
    .sort((a: any, b: any) => a.viewLevel - b.viewLevel)
    .forEach((view: any) => {
      view.objects
      .forEach((object: any) => {
        if (object.objectType === 'tabs') {
          // search metadata tabs and set actual tab index in view tabs object
          this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
          .pageData
          .tabs
          .forEach((tab: any) => {
            if (tab.objectName === object.objectName) {
              object.tabIndex = tab.tabIndex || 0;
            }
          });
        }

        object.visible = true;

        if (object.tabsName !== undefined && object.tabsName !== null && object.tabsName !== '') {
          if (objList.filter((tab: any) => tab.objectName === object.tabsName).length > 0) {
            object.visible = objList.filter((tab: any) => tab.objectName === object.tabsName)[0].visible && objList.filter((tab: any) => tab.objectName === object.tabsName)[0].tabIndex === object.tabRN-1;
          }
        }

        if (object.visible) {
          if (object.selected === 'U') {
            object.visible = true;
          } else if (object.selected === 'Y') {
            object.visible = false;
            this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId)
            .forEach((data: any) => {
              data.data.forEach((dataSet: any) => {
                if (dataSet.dataSetName === object.selectedObjectName) {
                  if (dataSet.isSelected) {
                    object.visible = true;
                  }
                }
              });
            });
          } else if (object.selected === 'N') {
            object.visible = false;
            this.pageData.filter((data: any) => data.prjId === prjId && data.formId === formId)
            .forEach((data: any) => {
              data.data.forEach((dataSet: any) => {
                if (dataSet.dataSetName === object.selectedObjectName) {
                  if (!dataSet.isSelected) {
                    object.visible = true;
                  }
                }
              });
            });
          }
        }

        if (object.visible) {
          if (object.execCond !== undefined && object.execCond !== null && object.execCond.length > 0) {
            object.disabled = false;
            if (!this.checkPageRule(prjId, formId, object.execCond)) {
              object.disabled = true;
              if (object.execCondNotVisible) {
                object.visible = false;
              }
            }
          }
        }

        objList.push(object);
      });
    });


    // set all metadata objects tabs, grids, toolbar and toolbar.itemslist, forms as not visible
    this.resetMetadataVisibility(prjId, formId);

    // metadata status visible for tabs, grids, toolbar and toolbar.itemsList, forms from objList with visible property true
    objList.forEach((object: any) => {
      if (object.objectType === 'tabs') {
        this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
        .pageData
        .tabs
        .forEach((tab: any) => {
          if (tab.objectName === object.objectName) {
            tab.visible = object.visible;
            tab.tabIndex = object.tabIndex;
          }
        });
      }

      if (object.objectType === 'grid') {
        this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
        .pageData
        .grids
        .forEach((grid: any) => {
          if (grid.objectName === object.objectName) {
            grid.visible = object.visible;
            grid.disabled = object.disabled;
          }
        });
      }

      if (object.objectType === 'reportsGroup') {
        this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
        .pageData
        .reportsGroups
        .forEach((rptGroup: any) => {
          if (rptGroup.fieldGrpId === Number(object.objectName)) {
            rptGroup.visible = object.visible;
          }
        });
      }

      if (object.objectType === 'toolbar') {
        this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
        .pageData
        .toolbars
        .forEach((toolbar: any) => {
          if (toolbar.objectName === object.objectName) {
            toolbar.visible = object.visible;
          }
        });
      }

      if (object.objectType === 'toolbarItem') {
        this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
        .pageData
        .toolbars
        .forEach((toolbar: any) => {
          toolbar.itemsList.forEach((item: any) => {
            if (item.objectName === object.objectName) {
              item.visible = object.visible;
              item.disabled = object.disabled;
            }
          });
        });
      }

      if (object.objectType === 'form') {
        this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
        .pageData
        .forms
        .forEach((form: any) => {
          if (form.objectName === object.objectName) {
            form.visible = object.visible;
          }
        });
      }
    });


    // apply checkPageRule for each reports
    this.metaData.filter((page: any) => page.prjId === prjId && page.formId === formId)[0]
    .pageData
    .reportsGroups
    .forEach((rptGroup: any) => {
      rptGroup.reports.forEach((report: any) => {
        if (report.execCond !== undefined && report.execCond !== null && report.execCond.length > 0) {
          report.visible = false;
          if (this.checkPageRule(prjId, formId, report.execCond)) {
            report.visible = true;
          }
        }
      });
    });

    this.appViewListener.next(this.actualView);
  }

  return valid;
}
