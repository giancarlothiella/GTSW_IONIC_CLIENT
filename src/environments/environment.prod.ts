export const environment = {
  production: true,
  apiUrl: 'https://www.gtsoftware.ch/api',
  //apiUrl: 'http://localhost:3000/api',
  localUrl: 'https://www.gtsoftware.ch',

  reCaptchaEnabled: false,
  reCaptchaKey: '6LcCP9gpAAAAAP-tR83NsGBoL5tm--Odo1DvmmOm',

  dbMode: 'P',
  languageId: 'EN',
  signWithGoogle: false,
  signWithMicrosoft: false,
  TOTP2FAEnabled: true,

  aiEnabled: true,
  aiChatgptEnabled: true,
  aiClaudeEnabled: true,
  aiGeminiEnabled: true,
};

export const webInfo = {
  appCode: 'GTSuiteWeb',
  appTitle: 'GTSW App Portal',
  appOwner: 'GTsoftware di Giancarlo Thiella',
  homeLogo: '/assets/images/GTS.png',
  termsURL: '/assets/disclaimers/terms.html',
  policyURL: '/assets/disclaimers/privacy.html',
  cookiesURL: '/assets/disclaimers/cookies.html',
  footerURL: 'https://www.gtsoftware.ch',
  footerText: 'GTsoftware web site'
};
