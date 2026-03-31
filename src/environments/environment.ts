// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  localUrl: 'http://localhost:8100',
  
  reCaptchaEnabled: false,
  reCaptchaKey: '6LcCP9gpAAAAAP-tR83NsGBoL5tm--Odo1DvmmOm',
  //reCaptchaKey: '6LdSfB0nAAAAAFGSuYGivNfrGyIyo10jancaixg7',
   
  languageId: 'EN',

  aiEnabled: true,
  aiChatgptEnabled: true,
  aiClaudeEnabled: true,
  aiGeminiEnabled: true,

};

export const webInfo = {
  appCode: 'GTSuiteWeb',
  appOwner: 'GTsoftware di Giancarlo Thiella',
  homeLogo: '/assets/images/GTS.png',
  termsURL: 'https://gtsoftware.ch/terms',
  policyURL: 'https://gtsoftware.ch/privacy',
  cookiesURL: 'https://gtsoftware.ch/cookies',
  footerURL: 'https://www.gtsoftware.ch',
  footerText: 'GTsoftware web site',
  websiteUrl: 'http://localhost:4200'
};


/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
