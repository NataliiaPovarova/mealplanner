const ERROR_KEYS = {
  "auth/invalid-email": "auth.errorInvalidEmail",
  "auth/missing-password": "auth.errorMissingPassword",
  "auth/user-not-found": "auth.errorInvalidCredential",
  "auth/wrong-password": "auth.errorInvalidCredential",
  "auth/invalid-credential": "auth.errorInvalidCredential",
  "auth/email-already-in-use": "auth.errorEmailInUse",
  "auth/weak-password": "auth.errorWeakPassword",
  "auth/too-many-requests": "auth.errorTooManyRequests",
  "auth/network-request-failed": "auth.errorNetwork",
  "auth/unauthorized-domain": "auth.errorUnauthorizedDomain",
  "auth/operation-not-allowed": "auth.errorOperationNotAllowed",
};

/** Maps a Firebase auth error code to a translation key. */
export function authErrorKey(error) {
  return ERROR_KEYS[error?.code] || "auth.errorGeneric";
}
