// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  // apiUrl: 'http://192.168.75.131:3000/api',
 //  apiUrl: 'http://62.149.166.78:3000/api',
  localUrl: 'http://localhost:8100',
  
  reCaptchaEnabled: false,
  reCaptchaKey: '6LcCP9gpAAAAAP-tR83NsGBoL5tm--Odo1DvmmOm',
  //reCaptchaKey: '6LdSfB0nAAAAAFGSuYGivNfrGyIyo10jancaixg7',
   
  dbMode: 'D',
  languageId: 'EN',
  signWithGoogle: false,
  signWithMicrosoft: false,
  TOTP2FAEnabled: false,

  aiEnabled: true,
  aiChatgptEnabled: true,
  aiClaudeEnabled: true,
  aiGeminiEnabled: true,

};

export const webInfo = {
  appCode: 'GTSuiteWeb',
  appTitle: 'GTS App Portal',
  appOwner: 'GTsoftware di Giancarlo Thiella',
  homeLogo: '/assets/images/GTS.png',
  termsURL: '/assets/disclaimers/terms.html',
  policyURL: '/assets/disclaimers/privacy.html',
  cookiesURL: '/assets/disclaimers/cookies.html',
  footerURL: 'https://www.gtsoftware.ch',
  footerText: 'GTsoftware web site'
};


/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
