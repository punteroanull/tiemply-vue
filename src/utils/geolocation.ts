// src/utils/geolocation.ts

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  /** i18n key under `geolocation.errors.*`, so the caller can show a translated message. */
  messageKey: string;
  /** Untranslated detail from the browser, kept for logging. */
  message: string;
}

/** Maps a browser PositionError code to the i18n key that explains what to do about it. */
function errorKeyFor(code: number): string {
  switch (code) {
    case 1: // PERMISSION_DENIED
      return 'geolocation.errors.permissionDenied';
    case 2: // POSITION_UNAVAILABLE
      return 'geolocation.errors.positionUnavailable';
    case 3: // TIMEOUT
      return 'geolocation.errors.timeout';
    default:
      return 'geolocation.errors.unknown';
  }
}

function requestPosition(options: PositionOptions): Promise<GeolocationData> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => reject({
        code: error.code,
        messageKey: errorKeyFor(error.code),
        message: error.message
      } as GeolocationError),
      options
    );
  });
}

/**
 * Obtiene la posición actual del usuario.
 *
 * Dos intentos deliberados: primero una posición rápida por red/wifi, que en interiores suele ser
 * la única que resuelve, y solo si esa falla se pide GPS de alta precisión. El orden inverso
 * (alta precisión con 30 s de espera) dejaba sin fichar a quien trabaja dentro de un edificio,
 * que es justo donde más se ficha.
 */
export function getCurrentPosition(): Promise<GeolocationData> {
  if (!navigator.geolocation) {
    return Promise.reject<GeolocationData>({
      code: 0,
      messageKey: 'geolocation.errors.notSupported',
      message: 'Geolocation is not supported by this browser.'
    } as GeolocationError);
  }

  const coarse: PositionOptions = {
    enableHighAccuracy: false,
    timeout: 8000,
    maximumAge: 120000
  };

  const precise: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 60000
  };

  return requestPosition(coarse).catch((coarseError: GeolocationError) => {
    // Permission denied is definitive: retrying with GPS only makes the user wait again.
    if (coarseError.code === 1) {
      return Promise.reject(coarseError);
    }

    return requestPosition(precise);
  });
}

/**
 * Formatea las coordenadas para mostrar al usuario
 */
export function formatCoordinates(lat: number, lng: number, accuracy?: number): string {
  const latFormatted = lat.toFixed(6);
  const lngFormatted = lng.toFixed(6);
  const accuracyText = accuracy ? ` (±${Math.round(accuracy)}m)` : '';
  
  return `${latFormatted}, ${lngFormatted}${accuracyText}`;
}

/**
 * Verifica si la geolocalización está disponible en el navegador
 */
export function isGeolocationAvailable(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Verifica si se han otorgado permisos de geolocalización
 */
export async function checkGeolocationPermission(): Promise<boolean> {
  return (await getGeolocationPermissionState()) === 'granted';
}

/**
 * Estado del permiso de ubicación. `unknown` cuando el navegador no expone la Permissions API
 * (Safari antiguo): ahí solo se sabe pidiendo la posición. Distinguir `denied` de `prompt`
 * importa: con el permiso bloqueado volver a pedirlo no hace nada y hay que explicarlo.
 */
export type GeolocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

export async function getGeolocationPermissionState(): Promise<GeolocationPermissionState> {
  try {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state as GeolocationPermissionState;
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}