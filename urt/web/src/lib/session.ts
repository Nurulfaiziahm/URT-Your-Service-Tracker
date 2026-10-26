const DEVICE_KEY = 'urt_device_id';
let csrfToken: string | null = null;
let deviceId: string | null = null;
let bootstrapPromise: Promise<boolean> | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function getCsrfToken() {
  return csrfToken;
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export function getDeviceId(): string | null {
  if (deviceId) return deviceId;
  try {
    deviceId = localStorage.getItem(DEVICE_KEY);
  } catch {
    /* Storage may be disabled. */
  }
  return deviceId;
}

/** Use the API-issued device ID; it is a nonsecret hint, never authorization. */
export function setDeviceId(value: string | null) {
  deviceId = value;
  if (!value) {
    try {
      localStorage.removeItem(DEVICE_KEY);
    } catch {
      /* In-memory fallback. */
    }
    return;
  }
  try {
    localStorage.setItem(DEVICE_KEY, value);
  } catch {
    /* In-memory fallback. */
  }
}

export function getBootstrapPromise() {
  return bootstrapPromise;
}

export function setBootstrapPromise(promise: Promise<boolean> | null) {
  bootstrapPromise = promise;
}

export function getRefreshPromise() {
  return refreshPromise;
}

export function setRefreshPromise(promise: Promise<string | null> | null) {
  refreshPromise = promise;
}

export function clearSessionState() {
  csrfToken = null;
  refreshPromise = null;
}
