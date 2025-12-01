import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GtsDataService } from '../../services/gts-data.service';
import { Subscription } from 'rxjs';
import { GtsLoaderComponent } from '../gts-loader/gts-loader.component';
import { DxPopupModule, DxFileUploaderModule } from 'devextreme-angular';

@Component({
  selector: 'app-gts-file-uploader',
  standalone: true,
  imports: [CommonModule, GtsLoaderComponent, DxPopupModule, DxFileUploaderModule],
  templateUrl: './gts-file-uploader.component.html',
  styleUrls: ['./gts-file-uploader.component.scss']
})
export class GtsFileUploaderComponent implements OnInit, OnDestroy {
  constructor(
    private gtsDataService: GtsDataService
  ) { }

  ngOnInit() {
    this.fileLoaderListenerSubs = this.gtsDataService
    .getFileLoaderListener()
    .subscribe((status) => {
      this.fileUploadVisible = status.fileUploadVisible;
    });
  }

  ngOnDestroy(): void {
    if (this.fileLoaderListenerSubs) {
      this.fileLoaderListenerSubs.unsubscribe();
    }
  }

  @Input()
  fileUploadPath: string ='';

  @Input()
  fileUploadName: string = '';

  @Input()
  uploaderTitle: string = 'Upload File';

  @Input()
  allowedExtensions: string[] = [];

  @Input()
  maxFileSize: number = 0;

  loading: boolean = false;
  fileUploadVisible: boolean = false;
  fileLoaderComponent: any;

  fileUploadedName: string = '';

  fileLoaderListenerSubs: Subscription | undefined;

  fileUploadTD = async (file: any) => {
    this.fileUpload(file);
  };


  async fileUploadService(fileData: string, fileName: string) {
    let filePath = fileName;

    if (this.fileUploadPath !== undefined && this.fileUploadPath !== '') {
      const fileNameClean = fileName.split('/').pop();
      filePath = this.fileUploadPath + '/' + fileNameClean;
    }

    const params = {
      fileData: fileData,
      filePath: filePath
    };

    const result = await this.gtsDataService.execMethod('file', 'uploadfile', params);
    this.gtsDataService.sendFormRequest({
      typeRequest: 'fileUpload',
      message: result.message,
      valid: result.valid
    });
    return result;
  }

  fileUpload = async (file: any) => {
    this.loading = true;

    // get file.name extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (this.fileUploadName === '') {
      this.fileUploadName = file.name.split('.').shift();
    }

    let base64 = '';
    // file reader
    let reader = new FileReader();

    reader.onloadend = async (e: any) => {
      this.fileUploadedName = this.fileUploadName + '.' + ext;
      let result = await this.fileUploadService(
        base64,
        this.fileUploadPath+'/'+this.fileUploadedName
      );

      this.fileUploadName = '';

      if (result.valid) {
        this.gtsDataService.sendFileLoaderListener({
          fileUploadVisible: false,
          fileUploadedName: this.fileUploadedName,
          result: result.valid
        });
        this.fileLoaderComponent.reset();
        this.loading = false;
      }
    };

    reader.onload = e => {
      const dataURL: any = reader.result;
      base64 = dataURL.slice(dataURL.indexOf(',')+1);
    };

    // read as data url
    reader.readAsDataURL(file);
  };

  onFileUploadInitialized(e: any) {
    this.fileLoaderComponent = e.component;
  }
}
