export const environment = {
  production: true,
  apiUrl: 'https://www.gtsoftware.ch/api',
  localUrl: 'https://www.gtsoftware.ch',
  
  // apiUrl: 'http://192.168.75.130/api',
  // localUrl: 'http://192.168.75.130',

  reCaptchaEnabled: false,
  reCaptchaKey: '6LcCP9gpAAAAAP-tR83NsGBoL5tm--Odo1DvmmOm',

  dbMode: 'P',
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
  termsURL: '/assets/disclaimers/terms.html',
  policyURL: '/assets/disclaimers/privacy.html',
  cookiesURL: '/assets/disclaimers/cookies.html',
  footerURL: 'https://www.gtsoftware.ch',
  footerText: 'GTsoftware web site'
};
