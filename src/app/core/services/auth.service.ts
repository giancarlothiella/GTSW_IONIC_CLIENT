// src/app/core/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, firstValueFrom } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import { environment } from '../../../environments/environment';
import { EncryptionService } from './encryption.service';
import { TranslationService } from './translation.service';

export interface LoginCredentials {
  email: string;
  password: string;
  loginType: string;
}

export interface ProjectConnection {
  connCode: string;
  connDefault: boolean;
  dataKey: string;
}

export interface UserData {
  name: string;
  email: string;
  loginType: string;
  picture: string;
  languageId: string;
  authProfileCode: string;
  token: string;
  expireMinutes: number;
  expireDate: string;
  dbMode: string;
  webAdmin: string | boolean;
  webDevel: boolean;
  prjId: string;
  prjConnections: ProjectConnection[];
  homePath?: string;  // Path dedicato per utenti con accesso limitato (es. '/webapp')
}

export interface AuthResponse {
  valid: boolean;
  message: string;
  data: UserData;
  totp2FAenabled?: boolean;
  totp2FAToken?: string;
  totp2FAsaved?: boolean;
  totp2FAQRCode?: string;
  totp2FAAppCode?: string;
  passwordExpired?: boolean;
}

// Interfaccia semplificata per l'utente in sessione
export interface User {
  name: string;
  email: string;
  picture: string;
  picturePath: string;  // Nome file originale dal server (es. "giancarlo.thiella@gtsoftware.ch.png")
  languageId: string;
  authProfileCode: string;
  isAdmin: boolean;
  isDeveloper: boolean;
  prjId: string;
  prjConnections: ProjectConnection[];
  homePath?: string;  // Path dedicato per utenti con accesso limitato (es. '/webapp')
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private encryption = inject(EncryptionService);
  private translationService = inject(TranslationService);
  private storage!: Storage;
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private tokenKey = 'auth_token';
  private userKey = 'user_data';
  private tokenExpiryKey = 'token_expiry';

  // Flag per abilitare/disabilitare encryption del token in storage locale
  // Il token è GIÀ criptato dal server, questa è una protezione aggiuntiva
  private readonly USE_LOCAL_ENCRYPTION = true;

  constructor() {
    this.initStorage();
  }

  private async initStorage() {
    this.storage = new Storage();
    await this.storage.create();
    await this.loadStoredUser();
  }

  /**
   * Login con username e password
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${environment.apiUrl}/user/login`,
      credentials
    ).pipe(
      tap(async (response) => {
        if (response.valid && response.data) {
          // NON salvare i dati se 2FA è abilitato - verranno salvati dopo la verifica TOTP
          if (!response.totp2FAenabled) {
            await this.saveAuthData(response);
          }
        } else {
          throw new Error(response.message || 'Login failed');
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout - rimuove tutti i dati salvati
   */
  async logout(): Promise<void> {
    // Rimuovi i dati dall'Ionic Storage
    await this.storage.remove(this.tokenKey);
    await this.storage.remove(this.userKey);
    await this.storage.remove(this.tokenExpiryKey);

    // Pulisci tutti i dati sensibili dal localStorage
    localStorage.removeItem('totpData');
    localStorage.removeItem('authUserData');
    localStorage.removeItem('languageId');
    localStorage.removeItem('languages');
    localStorage.removeItem('stdMLTexts');
    localStorage.removeItem('connCode');

    // Reset dello stato utente corrente
    this.currentUserSubject.next(null);

    // NON puliamo i dati del menu qui perché causerebbe che i subscriber
    // ricevano array vuoti prima del prossimo caricamento.
    // I dati verranno sovrascritti al prossimo login quando loadMenu() viene chiamato.
  }

  /**
   * Ottiene il token salvato (decriptato se encryption locale è abilitata)
   * NOTA: Il token è già criptato dal server con iv + content
   */
  async getToken(): Promise<string | null> {
    const stored = await this.storage.get(this.tokenKey);
    if (!stored) return null;

    // Decripta solo se abbiamo aggiunto encryption LOCALE aggiuntiva
    if (this.USE_LOCAL_ENCRYPTION) {
      try {
        return this.encryption.decrypt(stored);
      } catch (error) {
        console.error('Error decrypting token from local storage:', error);
        await this.logout();
        return null;
      }
    }

    return stored;
  }

  /**
   * Verifica se l'utente è autenticato
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    // Verifica se il token è scaduto usando la data salvata
    const expiry = await this.storage.get(this.tokenExpiryKey);
    if (!expiry) return false;

    const expiryDate = new Date(expiry);
    const now = new Date();

    // Considera scaduto se mancano meno di 5 minuti
    const bufferTime = 5 * 60 * 1000;
    const timeRemaining = expiryDate.getTime() - now.getTime();
    return timeRemaining > bufferTime;
  }

  /**
   * Verifica la validità del token chiamando il server
   * Utilizzato per controllare periodicamente se il token è ancora valido
   */
  async checkToken(): Promise<{valid: boolean, message?: string}> {
    try {
      const response = await firstValueFrom(this.http.get<{valid: boolean, message?: string}>(
        `${environment.apiUrl}/user/checktoken`
      ));

      if (response && response.valid) {
        return { valid: true };
      } else {
        // Token non valido, esegui logout
        await this.logout();
        return { valid: false, message: response?.message || 'Token non valido' };
      }
    } catch (error: any) {
      console.error('Error checking token:', error);

      // Se l'errore è dovuto a problemi di rete (status 0), non fare logout
      // Questo permette all'app di continuare a funzionare anche se il server è temporaneamente non disponibile
      if (error.status === 0) {
        console.warn('Server not reachable - skipping token check');
        return { valid: true, message: 'Server non raggiungibile - controllo token saltato' };
      }

      // Per altri errori (401, 403, etc.), esegui logout
      await this.logout();
      return { valid: false, message: 'Errore durante la verifica del token' };
    }
  }

  /**
   * Auto-autentica l'utente verificando il token salvato
   * Restituisce true se l'utente ha un token valido (controllo di base)
   * Questo metodo è sincrono e verifica solo se c'è un utente corrente in memoria
   * La verifica completa viene fatta da checkToken()
   */
  autoAuthUser(): boolean {
    const user = this.getCurrentUser();
    return user !== null;
  }

  /**
   * Ottiene i dati dell'utente corrente
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getUserEmail(): string | null {
    const user = this.getCurrentUser();
    return user ? user.email : null;
  }

  /**
   * Ottiene la connessione di default del progetto
   */
  getDefaultConnection(): ProjectConnection | null {
    const user = this.getCurrentUser();
    if (!user || !user.prjConnections) return null;
    
    return user.prjConnections.find(conn => conn.connDefault) || 
           user.prjConnections[0] || 
           null;
  }

  /**
   * Verifica se l'utente è amministratore
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.isAdmin || false;
  }

  /**
   * Verifica se l'utente è sviluppatore
   */
  isDeveloper(): boolean {
    const user = this.getCurrentUser();
    return user?.isDeveloper || false;
  }

  /**
   * Verifica se l'utente ha un homePath dedicato (accesso limitato a una sola pagina)
   */
  hasHomePath(): boolean {
    const user = this.getCurrentUser();
    return !!(user?.homePath && user.homePath.trim() !== '');
  }

  /**
   * Ottiene l'homePath completo dell'utente (prjId/homePath)
   * Combina il prjId con l'homePath per costruire il path del component registry
   * Es: prjId='GTR', homePath='/webapp' -> 'GTR/webapp'
   */
  getHomePath(): string | null {
    const user = this.getCurrentUser();
    if (!user?.homePath || !user?.prjId) return null;

    // Rimuovi slash iniziale se presente (es. '/webapp' -> 'webapp')
    let path = user.homePath.trim();
    while (path.startsWith('/')) {
      path = path.substring(1);
    }

    if (!path) return null;

    // Combina prjId con homePath (es. 'GTR' + 'webapp' -> 'GTR/webapp')
    return `${user.prjId}/${path}`;
  }

  /**
   * Salva token e dati utente con encryption locale opzionale
   */
  private async saveAuthData(response: AuthResponse): Promise<void> {
    const data = response.data;

    // Salva il token (con encryption locale aggiuntiva opzionale)
    // NOTA: Il token contiene già iv + content criptato dal server
    const tokenToSave = this.USE_LOCAL_ENCRYPTION
      ? this.encryption.encrypt(data.token)
      : data.token;
    await this.storage.set(this.tokenKey, tokenToSave);

    // Salva data di scadenza
    await this.storage.set(this.tokenExpiryKey, data.expireDate);

    // Scarica l'immagine del profilo se disponibile
    let profilePicture = data.picture;
    if (data.picture && data.picture !== '/assets/images/profile.jpg') {
      profilePicture = await this.getProfileImage(data.picture);
    }

    // Crea oggetto User semplificato (dati per UI, non sensibili)
    const userData: User = {
      name: data.name,
      email: data.email,
      picture: profilePicture,
      picturePath: data.picture || '',  // Nome file originale dal server
      languageId: data.languageId,
      authProfileCode: data.authProfileCode,
      isAdmin: this.parseBoolean(data.webAdmin),
      isDeveloper: data.webDevel,
      prjId: data.prjId,
      prjConnections: data.prjConnections,
      homePath: data.homePath || ''  // Path dedicato per utenti con accesso limitato
    };

    // Salva dati utente (criptati se abilitato)
    const userToSave = this.USE_LOCAL_ENCRYPTION
      ? this.encryption.encryptObject(userData)
      : JSON.stringify(userData);
    await this.storage.set(this.userKey, userToSave);

    this.currentUserSubject.next(userData);

    // Applica la lingua dell'utente se diversa da quella corrente
    if (userData.languageId) {
      const currentLang = this.translationService.getCurrentLanguage();
      if (currentLang.toUpperCase() !== userData.languageId.toUpperCase()) {
        await this.translationService.setLanguage(userData.languageId.toUpperCase());
      }
    }
  }

  /**
   * Carica utente salvato all'avvio
   */
  private async loadStoredUser(): Promise<void> {
    const stored = await this.storage.get(this.userKey);
    if (!stored) return;

    try {
      let user: User | null = null;

      if (this.USE_LOCAL_ENCRYPTION) {
        user = this.encryption.decryptObject<User>(stored);
      } else {
        user = JSON.parse(stored);
      }

      if (user) {
        // Verifica che il token non sia scaduto prima di ripristinare la sessione
        const isAuth = await this.isAuthenticated();
        if (isAuth) {
          this.currentUserSubject.next(user);

          // Applica la lingua dell'utente se diversa da quella corrente
          if (user.languageId) {
            const currentLang = this.translationService.getCurrentLanguage();
            if (currentLang.toUpperCase() !== user.languageId.toUpperCase()) {
              await this.translationService.setLanguage(user.languageId.toUpperCase());
            }
          }
        } else {
          // Token scaduto, pulisci tutto
          await this.logout();
        }
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
      await this.logout();
    }
  }

  /**
   * Helper per convertire string/boolean in boolean
   */
  private parseBoolean(value: string | boolean): boolean {
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === '1';
  }

  /**
   * Ottiene informazioni sul database mode
   */
  getDbMode(): string {
    // Potresti salvare anche questo in storage se necessario
    return 'D'; // Default, oppure recuperalo dai dati salvati
  }

  /**
   * Cambia la lingua dell'utente
   */
  async changeLanguage(languageId: string): Promise<void> {
    const user = this.getCurrentUser();
    if (user) {
      user.languageId = languageId;
      await this.updateUserData(user);
    }
  }

  /**
   * Aggiorna i dati utente in storage
   */
  private async updateUserData(user: User): Promise<void> {
    const userToSave = this.USE_LOCAL_ENCRYPTION
      ? this.encryption.encryptObject(user)
      : JSON.stringify(user);
    await this.storage.set(this.userKey, userToSave);
    this.currentUserSubject.next(user);
  }

  /**
   * Cambia il progetto corrente dell'utente
   */
  async changeCurrentProject(prjId: string, connCode?: string, newConnections?: ProjectConnection[]): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No user logged in');
    }

    // Aggiorna il progetto corrente
    user.prjId = prjId;

    // Se vengono fornite le nuove connessioni del progetto, usale
    if (newConnections && newConnections.length > 0) {
      user.prjConnections = newConnections.map(conn => ({
        ...conn,
        connDefault: connCode ? conn.connCode === connCode : conn.connDefault
      }));
    } else if (newConnections !== undefined && newConnections.length === 0) {
      // Se newConnections è un array vuoto, il progetto non ha connessioni
      // Azzera le connessioni per evitare di usare quelle del progetto precedente
      user.prjConnections = [];
    } else if (connCode && user.prjConnections) {
      // Altrimenti cerca di aggiornare il default nelle connessioni esistenti
      // (questo funziona solo se si sta cambiando connessione nello stesso progetto)
      user.prjConnections = user.prjConnections.map(conn => ({
        ...conn,
        connDefault: conn.connCode === connCode
      }));
    }

    await this.updateUserData(user);
  }

  /**
   * Scarica un'immagine dal server (profilo utente o progetto)
   */
  async downloadImage(imagePath: string): Promise<string> {
    try {
      const response = await firstValueFrom(this.http.post<{valid: boolean, fileData: string}>(
        `${environment.apiUrl}/files/downloadfile`,
        { fileName: imagePath }
      ));

      if (response && response.valid && response.fileData) {
        return 'data:image/jpeg;base64,' + response.fileData;
      }

      return '/assets/images/profile.jpg'; // Fallback default
    } catch (error) {
      console.error('Error downloading image:', error);
      return '/assets/images/profile.jpg'; // Fallback default
    }
  }

  /**
   * Scarica l'immagine del profilo utente
   */
  async getProfileImage(picture: string): Promise<string> {
    if (!picture || picture === '/assets/images/profile.jpg') {
      return '/assets/images/profile.jpg';
    }

    // Aggiungi il prefisso 'Profiles/' se necessario
    const imagePath = picture.startsWith('Profiles/') ? picture : `Profiles/${picture}`;
    return await this.downloadImage(imagePath);
  }

  /**
   * Aggiorna il profilo utente
   */
  async updateProfile(profile: { email: string; name: string; languageId: string; picture?: string }): Promise<User> {
    try {
      const response = await firstValueFrom(this.http.post<{valid: boolean, message: string}>(
        `${environment.apiUrl}/user/update`,
        profile
      ));

      if (response && response.valid) {
        const user = this.getCurrentUser();
        if (user) {
          user.name = profile.name;
          user.languageId = profile.languageId;
          if (profile.picture !== undefined) {
            user.picture = profile.picture;
          }
          await this.updateUserData(user);
          return user;
        }
      }

      throw new Error(response?.message || 'Update failed');
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Carica immagine del profilo
   */
  async uploadProfileImage(fileName: string, fileData: string): Promise<void> {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('No user logged in');

      // Estrai solo l'estensione dal file originale
      const fileExtension = fileName.split('.').pop() || 'png';
      // Il nome file è solo email.estensione (es. giancarlo.thiella@gtsoftware.ch.png)
      const uploadFileName = `Profiles/${user.email}.${fileExtension}`;

      // Upload file to server
      const uploadResponse = await firstValueFrom(this.http.post<{valid: boolean, message: string, fileName?: string}>(
        `${environment.apiUrl}/files/uploadfile`,
        {
          fileName: uploadFileName,
          fileData: fileData
        }
      ));

      if (!uploadResponse || !uploadResponse.valid) {
        throw new Error(uploadResponse?.message || 'Upload failed');
      }

      // Il nome file per il database è Profiles/email.estensione
      const uploadedFileName = uploadResponse.fileName || uploadFileName;

      // Update profile with new image
      const updateResponse = await firstValueFrom(this.http.post<{valid: boolean, message: string}>(
        `${environment.apiUrl}/user/update`,
        {
          email: user.email,
          picture: uploadedFileName
        }
      ));

      if (updateResponse && updateResponse.valid) {
        // Download the image and update user data
        const imageData = await this.getProfileImage(uploadedFileName);
        user.picture = imageData;
        // Salva il nome file senza il prefisso Profiles/
        user.picturePath = uploadedFileName.replace('Profiles/', '');
        await this.updateUserData(user);
      } else {
        throw new Error(updateResponse?.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw error;
    }
  }

  /**
   * Elimina immagine del profilo
   */
  async deleteProfileImage(): Promise<void> {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('No user logged in');

      // Usa picturePath per cancellare il file sul server
      if (user.picturePath && user.picturePath !== '') {
        try {
          await firstValueFrom(this.http.post(
            `${environment.apiUrl}/files/deletefile`,
            { fileName: `Profiles/${user.picturePath}` }
          ));
        } catch (e) {
          console.error('Error deleting file:', e);
        }
      }

      // Update profile to remove picture
      const response = await firstValueFrom(this.http.post<{valid: boolean, message: string}>(
        `${environment.apiUrl}/user/update`,
        {
          email: user.email,
          picture: null
        }
      ));

      if (response && response.valid) {
        user.picture = '/assets/images/profile.jpg';
        user.picturePath = '';
        await this.updateUserData(user);
      } else {
        throw new Error(response?.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting profile image:', error);
      throw error;
    }
  }

  // ========== Registration Methods ==========

  /**
   * Password policy dal server
   */
  psswPolicy: any;

  /**
   * Carica la password policy dal server
   */
  async getPsswPolicy(): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.http.get<{ valid: boolean; data: any }>(
        `${environment.apiUrl}/user/psswpolicy`
      ));

      if (response && response.valid) {
        this.psswPolicy = response.data;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error getting password policy:', error);
      return false;
    }
  }

  /**
   * Verifica se una chiave di attivazione è valida
   * Opzionalmente verifica anche se l'email è già registrata
   */
  async checkAuthKey(authKey: string, email?: string): Promise<{valid: boolean, message: string}> {
    try {
      const body: any = { authKey };
      if (email) {
        body.email = email;
      }

      const response = await firstValueFrom(this.http.post<{valid: boolean, message: string}>(
        `${environment.apiUrl}/user/checkauthkey`,
        body
      ));

      return response || { valid: false, message: 'No response from server' };
    } catch (error: any) {
      console.error('Error checking auth key:', error);
      return {
        valid: false,
        message: error.error?.message || 'Errore durante la verifica della chiave'
      };
    }
  }

  /**
   * Attiva un account utente con la chiave temporanea
   */
  async activateUser(temporaryKey: string): Promise<{valid: boolean, message: string, totp2FAQRCode?: string, totp2FAAppCode?: string, data?: any}> {
    try {
      const response = await firstValueFrom(this.http.post<{valid: boolean, message: string, totp2FAQRCode?: string, totp2FAAppCode?: string, data?: any}>(
        `${environment.apiUrl}/user/activate/activate/${temporaryKey}`,
        {}
      ));

      return response || { valid: false, message: 'No response from server' };
    } catch (error: any) {
      console.error('Error activating user:', error);
      return {
        valid: false,
        message: error.error?.message || 'Errore durante l\'attivazione dell\'account'
      };
    }
  }

  /**
   * Verifica se un'email è già registrata (con chiave di attivazione)
   */
  async checkEmail(authKey: string, email: string): Promise<{valid: boolean, message: string}> {
    return this.checkAuthKey(authKey, email);
  }

  /**
   * Crea un nuovo utente
   */
  async createUser(
    loginType: string,
    email: string,
    password: string,
    authKey: string,
    name: string
  ): Promise<{valid: boolean, message: string}> {
    try {
      const signupData = {
        action: 'signup',
        loginType,
        email,
        password,
        authKey,
        name,
        dbMode: environment.dbMode
      };

      const response = await firstValueFrom(this.http.post<{valid: boolean, message: string}>(
        `${environment.apiUrl}/user/create`,
        signupData
      ));

      if (!response || !response.valid) {
        throw new Error(response?.message || 'Registration failed');
      }

      return response;
    } catch (error: any) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Valida una password secondo le policy
   */
  validatePssw(
    pw: string,
    lc: boolean,
    uc: boolean,
    nm: boolean,
    sc: boolean,
    minLen: number,
    maxLen: number
  ): boolean {
    const checkLC = '(?=.*[a-z])';
    const checkUC = '(?=.*[A-Z])';
    const checkNM = '(?=.*[0-9])';
    const checkSC = '(?=.*[.,#$£€^+=!?*()@%&])';

    let pwRegExp = '^';
    if (lc) pwRegExp += checkLC;
    if (uc) pwRegExp += checkUC;
    if (nm) pwRegExp += checkNM;
    if (sc) pwRegExp += checkSC;
    pwRegExp += `(?=.{${minLen},${maxLen}})`;

    const reg = new RegExp(pwRegExp);
    return reg.test(pw);
  }

  /**
   * Calcola il livello di sicurezza della password (1-5)
   */
  getPasswStrength(pw: string): number {
    let level = 0;

    // Lowercase letters
    if (/^(?=.*[a-z]).{8,30}$/g.test(pw)) {
      level = 1;
    }

    // Uppercase letters
    if (/^(?=.*[A-Z]).{8,30}$/g.test(pw)) {
      level += 1;
    }

    // Numbers
    if (/^(?=.*\d).{8,30}$/g.test(pw)) {
      level += 1;
    }

    // Special characters
    if (/^(?=.*[.,#$£€^+=!?*()@%&]).{8,30}$/g.test(pw)) {
      level += 1;
    }

    // All requirements + min 12 chars = level 5
    if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.,#$£€^+=!?*()@%&]).{12,30}$/g.test(pw)) {
      level = 5;
    }

    return level;
  }

  /**
   * Reset password (forgot password)
   */
  async resetPassword(email: string): Promise<{valid: boolean, message: string}> {
    try {
      const response = await firstValueFrom(this.http.post<{valid: boolean, message: string}>(
        `${environment.apiUrl}/user/recover`,
        { email }
      ));

      return response || { valid: false, message: 'No response from server' };
    } catch (error: any) {
      console.error('Error resetting password:', error);
      return {
        valid: false,
        message: error.error?.message || 'Errore durante il reset della password'
      };
    }
  }

  /**
   * Reset 2FA (Two Factor Authentication)
   */
  async reset2FA(email: string, resetSecret: string): Promise<{valid: boolean, message: string}> {
    try {
      const response = await firstValueFrom(this.http.post<{valid: boolean, message: string}>(
        `${environment.apiUrl}/user/unloggedtotp2reset`,
        { email, resetSecret }
      ));

      return response || { valid: false, message: 'No response from server' };
    } catch (error: any) {
      console.error('Error resetting 2FA:', error);
      return {
        valid: false,
        message: error.error?.message || 'Errore durante il reset 2FA'
      };
    }
  }

  /**
   * Verifica il codice TOTP 2FA
   */
  async verifyTotp(email: string, totp2FAToken: string): Promise<{valid: boolean, message: string, data?: UserData}> {
    try {
      const response = await firstValueFrom(this.http.post<{valid: boolean, message: string, data?: UserData}>(
        `${environment.apiUrl}/user/totp2faverify`,
        { email, totp2FAToken }
      ));

      if (response && response.valid && response.data) {
        await this.saveAuthData({
          valid: true,
          message: response.message,
          data: response.data
        });
      }

      return response || { valid: false, message: 'No response from server' };
    } catch (error: any) {
      console.error('Error verifying TOTP:', error);
      return {
        valid: false,
        message: error.error?.message || 'Errore durante la verifica del codice 2FA'
      };
    }
  }

  /**
   * Cambia la password dell'utente corrente
   */
  async updatePassword(email: string, currentPassword: string, newPassword: string): Promise<{valid: boolean, message: string}> {
    try {
      const response = await firstValueFrom(this.http.post<{valid: boolean, message: string}>(
        `${environment.apiUrl}/user/changepssw`,
        { email, password: newPassword }
      ));

      return response || { valid: false, message: 'No response from server' };
    } catch (error: any) {
      console.error('Error changing password:', error);
      return {
        valid: false,
        message: error.error?.message || 'Errore durante il cambio password'
      };
    }
  }
}