/**
 * ═══════════════════════════════════════════════════════════════════
 * Distance Calculation Service
 * ═══════════════════════════════════════════════════════════════════
 *
 * Strategy:
 *  1. Google Distance Matrix API  → real road/travel distance + ETA
 *  2. Haversine formula (fallback) → straight-line distance, no quota used
 *
 * All public functions return distances in KILOMETRES.
 */

import { GOOGLE_MAPS_API_KEY, DISTANCE_MATRIX_URL } from '../config/maps';

// ─── Haversine (fallback) ────────────────────────────────────────────────────

/**
 * Calculate straight-line distance between two GPS points using the
 * Haversine formula.  No API call, no quota consumed.
 *
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distance in kilometres (rounded to 1 decimal place)
 */
export const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// ─── Google Distance Matrix API ─────────────────────────────────────────────

/**
 * Fetch real driving distances for ONE origin against MULTIPLE destinations
 * using the Google Distance Matrix API.
 *
 * @param {{ lat: number, lng: number }} origin        Patient location
 * @param {Array<{ lat: number, lng: number, id: string }>} destinations  Caregiver locations
 * @returns {Promise<Array<{ id: string, distanceKm: number, durationMin: number }>>}
 */
export const getDistancesFromMatrix = async (origin, destinations) => {
  if (!destinations.length) return [];

  try {
    const origStr = `${origin.lat},${origin.lng}`;
    // Google accepts up to 25 destinations per call
    const CHUNK = 25;
    const results = [];

    for (let i = 0; i < destinations.length; i += CHUNK) {
      const chunk = destinations.slice(i, i + CHUNK);
      const destStr = chunk.map((d) => `${d.lat},${d.lng}`).join('|');

      const url =
        `${DISTANCE_MATRIX_URL}?origins=${origStr}` +
        `&destinations=${encodeURIComponent(destStr)}` +
        `&key=${GOOGLE_MAPS_API_KEY}` +
        `&units=metric` +
        `&mode=driving`;

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Distance Matrix HTTP ${resp.status}`);

      const json = await resp.json();

      if (json.status !== 'OK') {
        console.warn('[DistanceService] Matrix API status:', json.status);
        // Fall back to Haversine for this chunk
        chunk.forEach((d) => {
          results.push({
            id: d.id,
            distanceKm: haversineDistanceKm(origin.lat, origin.lng, d.lat, d.lng),
            durationMin: null,
            source: 'haversine',
          });
        });
        continue;
      }

      const elements = json.rows[0]?.elements || [];
      chunk.forEach((d, idx) => {
        const el = elements[idx];
        if (el?.status === 'OK') {
          results.push({
            id: d.id,
            distanceKm: Math.round((el.distance.value / 1000) * 10) / 10,
            durationMin: Math.round(el.duration.value / 60),
            source: 'google',
          });
        } else {
          // Element-level fallback
          results.push({
            id: d.id,
            distanceKm: haversineDistanceKm(origin.lat, origin.lng, d.lat, d.lng),
            durationMin: null,
            source: 'haversine',
          });
        }
      });
    }

    return results;
  } catch (err) {
    console.warn('[DistanceService] Matrix API error, falling back to Haversine:', err.message);
    // Full Haversine fallback
    return destinations.map((d) => ({
      id: d.id,
      distanceKm: haversineDistanceKm(origin.lat, origin.lng, d.lat, d.lng),
      durationMin: null,
      source: 'haversine',
    }));
  }
};

/**
 * Attach real or estimated distance/duration info to an array of caregiver objects.
 *
 * Each caregiver must have: id, location.coordinates = [lng, lat]
 *
 * @param {{ lat: number, lng: number }} patientLocation
 * @param {Array<Object>} caregivers
 * @returns {Promise<Array<Object>>} caregivers with distanceKm and durationMin added
 */
export const enrichCaregiversWithDistance = async (patientLocation, caregivers) => {
  // Build destinations list only for caregivers that have real coordinates
  const withCoords = caregivers
    .map((c) => {
      const coords = c.location?.coordinates; // [lng, lat]
      if (!coords || (coords[0] === 0 && coords[1] === 0)) return null;
      return { id: c.id || c._id?.toString(), lat: coords[1], lng: coords[0] };
    })
    .filter(Boolean);

  const distMap = {};

  if (withCoords.length) {
    const distances = await getDistancesFromMatrix(patientLocation, withCoords);
    distances.forEach((d) => {
      distMap[d.id] = d;
    });
  }

  return caregivers.map((c) => {
    const id = c.id || c._id?.toString();
    const info = distMap[id];
    const coords = c.location?.coordinates;
    const fallbackKm =
      coords && (coords[0] !== 0 || coords[1] !== 0)
        ? haversineDistanceKm(patientLocation.lat, patientLocation.lng, coords[1], coords[0])
        : null;

    return {
      ...c,
      distanceKm: info?.distanceKm ?? fallbackKm,
      durationMin: info?.durationMin ?? null,
      distanceLabel:
        info?.distanceKm != null
          ? `${info.distanceKm} km`
          : fallbackKm != null
          ? `~${fallbackKm} km`
          : 'Distance N/A',
      distanceSource: info?.source ?? 'unknown',
    };
  });
};

export default {
  haversineDistanceKm,
  getDistancesFromMatrix,
  enrichCaregiversWithDistance,
};
