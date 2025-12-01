import { Injectable } from '@angular/core';
import { webInfo, environment } from '../../../environments/environment';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppInfoService {
  constructor() {}

  resetPassword: boolean = true;
  signUp: boolean = true;
  
  private directPath: string = '/home';

  public get getDirectPath() {
    return this.directPath;
  }

  public setDirectPath(value: string) {
    this.directPath = value;
  }

  menuVisible: boolean = true;

  showGTSW: boolean = false;

  languageId: string = '';

  stdMLTexts: any[] = [];

  public setShowGTSW(value: boolean) {
    this.showGTSW = value;
  }

  public get getShowGTSW() {
    return this.showGTSW;
  }

  homePrjListShow: boolean = false;

  pageTitle: string = webInfo.appTitle;

  private languageListener = new Subject<string>();
  getLanguageListener() {
    return this.languageListener.asObservable();
  }

  sendLanguageListener() {
    this.languageListener.next(this.languageId);
  }


  // DEBUG LISTENER ==============
  appDebug: boolean = false;
  private appDebugListener = new Subject<boolean>();  
  getAppDebugListener() {
    return this.appDebugListener.asObservable();
  }  

  public appDebugToggle() {    
    this.appDebug = !this.appDebug;
    this.appDebugListener.next(this.appDebug);   
  }

  public appDebugHide() {    
    this.appDebug = false;
    this.appDebugListener.next(this.appDebug);   
  }
  // ============

  // ACTIONS DEBUG LISTENER ===
  appActionsDebug: boolean = false;
  private appActionsDebugListener = new Subject<boolean>();
  getAppActionsDebugListener() {
    return this.appActionsDebugListener.asObservable();
  }  

  public appActionsDebugShow() {    
    this.appActionsDebug = true;
    this.appActionsDebugListener.next(this.appActionsDebug);   
  }

  public appActionsDebugHide() {    
    this.appActionsDebug = false;
    this.appActionsDebugListener.next(this.appActionsDebug);   
  }
  // ============


  isHomePage: boolean = false;  

  setHomePage(value: boolean) {
    this.isHomePage = value;
    this.sendHomePageListener();
  }
  
  private homepageListener = new Subject<boolean>();
  getHomePageListener() {
    return this.homepageListener.asObservable();
  }

  sendHomePageListener() {
    this.homepageListener.next(this.isHomePage);
  }


  public get getAppDebug() {
    return this.appDebug;
  }

  public appHomePrjListToggle() {    
    this.homePrjListShow = !this.homePrjListShow;
  }

  public appHomeShowPrjList() {    
    this.homePrjListShow = true;
  }

  public appHomeHidePrjList() {    
    this.homePrjListShow = false;
    this.showGTSW = false;
  }

  public getHomePrjList() {
    return this.homePrjListShow;
  }

  public get getMenuVisible() {
    return this.menuVisible;
  }

  public setMenuVisible(value: boolean) {
    this.menuVisible = value;
  }

  
  public get getAppCode() {
    return webInfo.appCode;
  }

  public setAppCode(value: string) {
    webInfo.appCode = value;
  }

  public get getAppTitle() {
    return webInfo.appTitle;
  }

  public get getAppOwner() {
    return webInfo.appOwner;
  }

  public get getHomeLogo() {
    return webInfo.homeLogo;
  }

  public get getFooterText() {
    return webInfo.footerText;
  }

  public get getTermsURL() {
    return webInfo.termsURL;
  }

  public get getCookiesURL() {
    return webInfo.cookiesURL;
  }


  public get getFooterURL() {
    return webInfo.footerURL;
  }

  public get getPolicyURL() {
    return webInfo.policyURL;
  }

  public get getResetPassword() {
    return this.resetPassword;
  }

  public get getSignUp() {
    return this.signUp;
  }

  public get getLocalUrl() {
    return environment.localUrl;
  }

  public get getLanguageId() {
    if (this.languageId == '') {
      if (localStorage.getItem('languageId') !== null && localStorage.getItem('languageId') !== undefined) {
        this.languageId = localStorage.getItem('languageId') || environment.languageId; 
      } else {
        if (localStorage.getItem('authUserData') !== null && localStorage.getItem('authUserData') !== undefined) {
          this.languageId = JSON.parse(localStorage.getItem('authUserData') || '{}').languageId;
        } else {
          this.languageId = environment.languageId;
        }     
      } 
    }
    return this.languageId;
  }

  public setLanguageId(languageId: string) {
    this.languageId = languageId;
  }

  public get getCurrentYear() {
    return new Date().getFullYear();
  }

  public get getStdMLTexts() {
    if (this.stdMLTexts.length == 0) {
      this.stdMLTexts = JSON.parse(localStorage.getItem('stdMLTexts') || '[]');
    } 
    return this.stdMLTexts;
  }

  public setStdMLTexts(stdMLTexts: any[]) {    
    this.stdMLTexts = stdMLTexts;
  }


  /*
  =====================
  STANDARD ML TEXTS
  =====================
  -
  */

  public getMLText(txtId: number) {    
    if (this.stdMLTexts.length == 0) {
      this.stdMLTexts = JSON.parse(localStorage.getItem('stdMLTexts') || '[]');
    }

    const mlEnArray = 
    [
      {id: -1 , text: 'OK'},
      {id: -2 , text: 'CANCEL'},
      {id: -3 , text: 'CLOSE'},
      {id: -11, text: 'PROJECTS'},
      {id: -12, text: 'SETTINGS'},
      {id: -13, text: 'Profile'},
      {id: -14, text: 'Change Password'},
      {id: -15, text: 'Logout'},
      {id: -16, text: 'Click Here to Signin / Signup'},
      {id: -17, text: 'Signin'},
      {id: -18, text: 'Signup'},
      {id: -19, text: 'Select Project'},
      {id: -20, text: 'Settings Menu'},
      {id: -21, text: 'Reset Two Factor Authentication'},
      {id: -22, text: 'Icon'},
      {id: -23, text: 'Id#'},
      {id: -24, text: 'Language'},
      {id: -25, text: 'SET LANGUAGE'},
      {id: -26, text: 'LANGUAGES'},
      {id: -27, text: 'Email'},
      {id: -28, text: 'Name'},
      {id: -29, text: 'Authenticated As'},
      {id: -30, text: 'Password'},
      {id: -31, text: 'Forgotten Password?'},
      {id: -32, text: 'SignIn'},
      {id: -33, text: 'Authenticate'},
      {id: -34, text: 'An error occurred'},
      {id: -35, text: 'SignUp'},
      {id: -36, text: 'Reset 2Factor Authentication'},  
      {id: -37, text: 'Change Password'},
      {id: -38, text: 'Reset Password'},
      {id: -39, text: 'Please enter your credentials to proceed or click the external provider button.'},
      {id: -40, text: 'Please enter your credentials to proceed.'},
      {id: -41, text: '2FA authentication using a mobile Aunthenticator app.'},
      {id: -42, text: 'Sorry there is an error processing your request.'},
      {id: -43, text: 'Please enter your activation key to proceed and then fill the form or use the external provider button. A mail will be sent to your email address containing an activation link. Please click on that link to activate your account.'},
      {id: -44, text: 'Please enter your activation key to proceed and then fill the form. A mail will be sent to your email address containing an activation link. Please click on that link to activate your account.'},
      {id: -45, text: 'Please enter your email address to proceed. A mail will be sent to your email address containing a link to reset your 2FA.'},
      {id: -46, text: 'Please enter your new password to proceed.'},
      {id: -47, text: 'Please enter your email address to proceed. A mail will be sent to your email address containing a link to reset your password.'},
      {id: -48, text: 'Reset 2Factor Authentication'},
      {id: -49, text: 'Reset Password'},
      {id: -50, text: '2Factor TOTP Secret Key'},
      {id: -51, text: 'Reset Key is required'},
      {id: -52, text: 'Account Mail'},
      {id: -53, text: 'Activation Key'},
      {id: -54, text: 'Activation key is required'},
      {id: -55, text: 'Name is required'},
      {id: -56, text: 'Email is required'},
      {id: -57, text: 'Email is already registered'},
      {id: -58, text: 'By creating an account, you agree to the'},
      {id: -59, text: 'Privacy Policy'},
      {id: -60, text: 'Terms of Service'},
      {id: -61, text: 'Have an account?'},
      {id: -62, text: 'Create a new account'},
      {id: -63, text: 'Continue'},
      {id: -64, text: 'Password Strength'},
      {id: -65, text: 'Password is required'},
      {id: -66, text: 'Passwords do not match'},
      {id: -67, text: 'Confirm Password'},
      {id: -68, text: 'Password not respecting the rules!'},
      {id: -69, text: 'Password'},
      {id: -70, text: 'Al least one special char of this set:'},
      {id: -71, text: 'Al least one uppercase char'},
      {id: -72, text: 'Al least one lowercase char'},
      {id: -73, text: 'Length'},
      {id: -74, text: 'Password rules'},
      {id: -75, text: 'Al least one number'},
      {id: -76, text: 'Email is invalid'},
      {id: -77, text: 'Please open the Authenticator app on your device.'},
      {id: -78, text: 'Enter the code that you see in the Authenticator app in the text field and click Enter.'},
      {id: -79, text: 'Download the Authenticator app from the App Store or Google Play Store.'},
      {id: -80, text: 'Scan the QR Code in the Authenticator app then enter the code that you see in the app in the text field and click Submit.'},
      {id: -81, text: 'Password is required'},
      {id: -82, text: 'Have you forgotten your password?'},
    ]

    const mlTextRow = this.stdMLTexts.filter((item) => item.languageId == this.languageId && item.txtId == txtId)[0];
    if (mlTextRow) {
      return mlTextRow.text;
    } else {
      return mlEnArray.filter((item) => item.id == txtId)[0].text;
    }      
  }
}



