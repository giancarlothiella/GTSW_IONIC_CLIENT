// src/app/core/services/encryption.service.ts
import { Injectable } from '@angular/core';
import CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class EncryptionService {
  // IMPORTANTE: In produzione, questa chiave dovrebbe essere generata 
  // dinamicamente o derivata da credenziali utente
  // NON hardcodare chiavi sensibili nel codice in produzione!
  private readonly SECRET_KEY = 'YOUR-SECRET-KEY-CHANGE-IN-PROD';

  /**
   * Cripta una stringa
   */
  encrypt(value: string): string {
    try {
      return CryptoJS.AES.encrypt(value, this.SECRET_KEY).toString();
    } catch (error) {
      console.error('Encryption error:', error);
      throw error;
    }
  }

  /**
   * Decripta una stringa
   */
  decrypt(encryptedValue: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedValue, this.SECRET_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      throw error;
    }
  }

  /**
   * Cripta un oggetto JSON
   */
  encryptObject(obj: any): string {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  /**
   * Decripta e ritorna un oggetto JSON
   */
  decryptObject<T>(encryptedValue: string): T | null {
    try {
      const decrypted = this.decrypt(encryptedValue);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error('Decryption object error:', error);
      return null;
    }
  }

  /**
   * Genera un hash SHA256 (utile per fingerprinting)
   */
  hash(value: string): string {
    return CryptoJS.SHA256(value).toString();
  }
}


// Installazione CryptoJS:
// npm install crypto-js
// npm install --save-dev @types/crypto-js