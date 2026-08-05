import { ApiService } from "./api.service";

export class GeolocationService {
  static async captureAndReportLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          await ApiService.post("/configuracion/geolocalizacion", { lat, lng });
        } catch (e) {
          // Ignorar errores silenciosamente para no interrumpir al usuario
        }
      },
      (err) => {
        // Permiso denegado o no disponible
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }
}
