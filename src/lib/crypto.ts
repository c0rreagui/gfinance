/**
 * G-Finance — Secure Client-Side PIN Cryptography Wrapper
 * Encrypts the user's password using their 4-digit PIN as a secret key.
 * This guarantees the password is never stored in plaintext in localStorage.
 */

export const encryptPassword = (password: string, pin: string): string => {
  let result = '';
  for (let i = 0; i < password.length; i++) {
    result += String.fromCharCode(password.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
  }
  return btoa(unescape(encodeURIComponent(result)));
};

export const decryptPassword = (encrypted: string, pin: string): string => {
  try {
    const decoded = decodeURIComponent(escape(atob(encrypted)));
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
    }
    return result;
  } catch (e) {
    return '';
  }
};
