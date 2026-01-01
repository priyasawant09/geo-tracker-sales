import { Geolocation } from '@capacitor/geolocation';

export async function checkLocationReady(): Promise<{
  ok: boolean;
  reason?: 'NO_PERMISSION' | 'GPS_OFF';
}> {
  const perm = await Geolocation.checkPermissions();

  if (perm.location !== 'granted') {
    const req = await Geolocation.requestPermissions();
    if (req.location !== 'granted') {
      return { ok: false, reason: 'NO_PERMISSION' };
    }
  }

  try {
    await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 5000
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'GPS_OFF' };
  }
}

export async function getCurrentPosition() {
  return Geolocation.getCurrentPosition({
    enableHighAccuracy: true
  });
}
