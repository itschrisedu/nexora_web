import { ApiService } from "./api.service";

export class GeolocationService {
  static async captureAndReportLocation(): Promise<boolean> {
    if (typeof window === "undefined" || !navigator.geolocation) return false;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            await ApiService.post("/configuracion/geolocalizacion", { lat, lng });
            resolve(true);
          } catch (e) {
            resolve(false);
          }
        },
        (err) => {
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }
}
