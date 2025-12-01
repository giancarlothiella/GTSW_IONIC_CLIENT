import { Injectable,  } from '@angular/core';

import { PageService } from '../../services/pages.service';
import { GetRptGroup } from '../../services/pages.model';

@Injectable({
  providedIn: 'root'
})
export class GtsItemsService {
  constructor(private pageService: PageService) { }

  async getReportList(prjId: string, formId: number, rptGroup: number) {
    const dataReq: GetRptGroup = { prjId: prjId, formId: formId, rptGroup: rptGroup };
    //const responseData: any = await this.pageService.getReportGroup(dataReq);
    const responseData: any = { valid: true, reportsList: []}
    if (responseData.valid) {
      return responseData.reportsList;
    } else {
      return [];
    }
  }

  async getReport(rptHdrCode: string, params: any) {
    let rpt = {
      prjId: 'WCS',
      reportCode: rptHdrCode,
      params: params
    };

    //const responseData: any = await this.pageService.getReport(rpt);
    const responseData: any = { valid: true, reportsList: []}
    return responseData;
  }


}
