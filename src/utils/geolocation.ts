// src/utils/geolocation.ts

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

export interface GeolocationError {
  code: number;
  message: string;
}

/**
 * Obtiene la posición actual del usuario
 */
export function getCurrentPosition(): Promise<GeolocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: 'Geolocation is not supported by this browser.'
      });
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 30000, // 30 segundos - GPS en interiores o señal débil necesita más tiempo
      maximumAge: 60000 // 1 minuto máximo para posiciones cached
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        let message = 'Unknown error occurred';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'User denied the request for Geolocation.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message = 'The request to get user location timed out.';
            break;
        }

        reject({
          code: error.code,
          message
        });
      },
      options
    );
  });
}

/**
 * Obtiene la dirección aproximada usando reverse geocoding (opcional)
 * Nota: Esto requeriría una API externa como Google Maps o OpenStreetMap
 */
export async function getAddressFromCoords(lat: number, lng: number): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

  try {
    // Usando Nominatim (OpenStreetMap) - gratuito pero con límites de uso
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch address');
    }

    const data = await response.json();
    return data.display_name || null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Geocoding request timed out after 5s');
    } else {
      console.warn('Failed to get address from coordinates:', error);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
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
  try {
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state === 'granted';
    }
    return false;
  } catch (error) {
    console.warn('Could not check geolocation permission:', error);
    return false;
  }
}