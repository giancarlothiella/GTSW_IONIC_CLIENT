import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GetFileData } from './pages.model';
import { environment } from '../../../environments/environment';
import { lastValueFrom } from 'rxjs';

const BACKEND_URL = () => environment.apiUrl + '/data';
const DB_URL = () => environment.apiUrl + '/db';
const USER_URL = () => environment.apiUrl + '/user';
const MAIL_URL = () => environment.apiUrl + '/mail';
const FILE_URL = () => environment.apiUrl + '/files';
const SETUP_URL = () => environment.apiUrl + '/setup';
const TASK_URL = () => environment.apiUrl + '/task';
const PRJ_URL = () => environment.apiUrl + '/prj';

@Injectable({ providedIn: 'root' })
export class PageService {
    constructor(
        private http: HttpClient
    ) { }

    days_between = function (date1: Date, date2: Date) {
        // The number of milliseconds in one day
        const ONE_DAY = 1000 * 60 * 60 * 24;

        // Convert both dates to milliseconds
        let date1_ms = date1.getTime();
        let date2_ms = date2.getTime();

        // Calculate the difference in milliseconds
        let difference_ms = date1_ms - date2_ms;

        // Convert back to days and return
        return Math.round(difference_ms / ONE_DAY);
    };

    formatDate(date: Date) {
        let day: number = date.getDate();
        let month: number = date.getMonth() + 1;
        let year: number = date.getFullYear();

        let daystr: string = day.toString();
        let monstr: string = month.toString();
        let yeastr: string = year.toString();

        while (daystr.length < 2) daystr = '0' + daystr;
        while (monstr.length < 2) monstr = '0' + monstr;

        return [daystr, monstr, yeastr].join('/');
    }

    formatDateTime(date: Date) {
        let hour: number = date.getHours();
        let min: number = date.getMinutes();
        let sec: number = date.getSeconds();

        let houstr: string = hour.toString();
        let minstr: string = min.toString();
        let secstr: string = sec.toString();

        while (houstr.length < 2) houstr = '0' + houstr;
        while (minstr.length < 2) minstr = '0' + minstr;
        while (secstr.length < 2) secstr = '0' + secstr;

        let time: string = [houstr, minstr, secstr].join(':');
        return this.formatDate(date) + ' ' + time;
    }

    async getDirFiles(getFileData: GetFileData) {
        try {
            let responseData = await this.postServerData(
                'files',
                'getdirfiles',
                getFileData
            );
            return responseData;
        } catch (error) {
            // this.authService.authStatusListener.next(false);
            return error;
        }
    }

    async uploadFile(fileData: string, fileName: string, filePath: string) {
        try {
            let params: any;
            if (filePath === '') {
                params = {
                    fileData: fileData,
                    fileName: fileName,
                };
            }
            else {
                params = {
                    fileData: fileData,
                    filePath: filePath,
                };
            }

            let responseData = await this.postServerData(
                'file',
                'uploadfile',
                params
            );
            return responseData;
        } catch (error) {
            // this.authService.authStatusListener.next(false);
            return error;
        }
    }

    async downloadFile(fileName: string) {
        try {
            let params = {
                fileName: fileName,
            };
            let responseData = await this.postServerData(
                'file',
                'downloadfile',
                params
            );
            return responseData;
        } catch (error) {
            // this.authService.authStatusListener.next(false);
            return error;
        }
    }

    async deleteFile(fileName: string) {
        try {
            let params = {
                fileName: fileName,
            };
            let responseData = await this.postServerData(
                'file',
                'deletefile',
                params
            );
            return responseData;
        } catch (error) {
            // this.authService.authStatusListener.next(false);
            return error;
        }
    }

    async postServerData(apiRoute: string, url: string, params: any) {
        // try {
            if (apiRoute === 'data') {
                url = BACKEND_URL()+'/'+url;
            } else if (apiRoute === 'db') {
                url = DB_URL()+'/'+url;
            } else if (apiRoute === 'file') {
                url = FILE_URL()+'/'+url;
            } else if (apiRoute === 'auth') {
                url = USER_URL()+'/'+url;
            } else if (apiRoute === 'mail') {
                url = MAIL_URL()+'/'+url;
            } else if (apiRoute === 'setup') {
                url = SETUP_URL()+'/'+url;
            } else if (apiRoute === 'task') {
                url = TASK_URL()+'/'+url;
            } else if (apiRoute === 'prj') {
                url = PRJ_URL()+'/'+url; 
            }

            const postHttp = this.http.post(url, params);
            const response: any = await lastValueFrom(postHttp);
            
            return response;        
    }

    
    
}
export class PageTab {
	id!: number;
	text!: string;
}
export class PageTabIcon {
	id!: number;
	viewName?: string;
	text!: string;
	icon?: string;
}
    

  