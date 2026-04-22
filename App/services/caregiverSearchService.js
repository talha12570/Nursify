/**
 * ═══════════════════════════════════════════════════════════════════
 * Caregiver Search Service – Progressive Radius Expansion
 * ═══════════════════════════════════════════════════════════════════
 *
 * Algorithm:
 *  1. Start at 1 km radius
 *  2. Query server for available caregivers within that radius
 *  3. If zero results → expand to next stage (3 → 5 → 7 → 10 km)
 *  4. Stop as soon as results are found, or after 10 km
 *  5. Enrich results with real distances via Google Distance Matrix / Haversine
 *  6. Sort by nearest distance
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, NETWORK_CONFIG } from '../config/api';
import { RADIUS_STAGES_M } from '../config/maps';

// ─── Internal helpers ────────────────────────────────────────────────────────

const authHeaders = async () => {
  const token = await AsyncStorage.getItem('authToken');
  return {
    Authorization: `Bearer ${token}`,
    'ngrok-skip-browser-warning': 'true',
  };
};

/**
 * Hit the server endpoint for caregivers within a specific radius.
 *
 * @param {{ lat: number, lng: number }} location
 * @param {number} radiusM  radius in metres
 * @returns {Promise<Array>} raw caregiver array from server
 */
const fetchWithinRadius = async (location, radiusM) => {
  const headers = await authHeaders();

  const params = {
    lat: location.lat,
    lng: location.lng,
    radiusKm: radiusM / 1000,
    limit: 30, // fetch more so we can sort client-side
  };

  try {
    // Preferred: all active caregivers (nurses + caretakers)
    const response = await axios.get(`${API_URL}/patient/caregivers/nearby`, {
      headers,
      params,
      timeout: NETWORK_CONFIG.timeout.default,
    });

    if (response.data.success) {
      return response.data.caregivers || [];
    }
  } catch (error) {
    // Fallback for compatibility with older route wiring
  }

  const fallbackResponse = await axios.get(`${API_URL}/patient/nearby-nurses`, {
    headers,
    params,
    timeout: NETWORK_CONFIG.timeout.default,
  });

  if (fallbackResponse.data.success) {
    return fallbackResponse.data.nurses || [];
  }

  return [];
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Progressive radius search.
 * Expands from 1 km up to 10 km until caregivers are found.
 *
 * @param {{ lat: number, lng: number } | null} patientLocation
 *   Pass null to skip distance filtering and return all available caregivers.
 * @param {{ onRadiusChange?: (km: number) => void }} options
 * @returns {Promise<{
 *   caregivers: Array,
 *   radiusUsedM: number,
 *   locationAvailable: boolean
 * }>}
 */
export const searchCaregiversWithinRadius = async (
  patientLocation,
  { onRadiusChange } = {}
) => {
  // ── No location: fall back to plain available list ───────────────
  if (!patientLocation) {
    const headers = await authHeaders();
    const response = await axios.get(`${API_URL}/patient/caregivers/approved`, {
      headers,
      params: { limit: 20 },
      timeout: NETWORK_CONFIG.timeout.default,
    });
    return {
      caregivers: response.data?.caregivers || [],
      radiusUsedM: null,
      locationAvailable: false,
    };
  }

  // ── Progressive radius expansion ─────────────────────────────────
  let found = [];
  let radiusUsedM = RADIUS_STAGES_M[0];

  for (const radiusM of RADIUS_STAGES_M) {
    radiusUsedM = radiusM;
    onRadiusChange?.(radiusM / 1000); // notify UI with km

    const results = await fetchWithinRadius(patientLocation, radiusM);

    if (results.length > 0) {
      found = results;
      break;
    }
  }

  // ── Sort by nearest (server already sends distanceKm, we keep this guard) ──
  found.sort((a, b) => {
    const da = a.distanceKm ?? Infinity;
    const db = b.distanceKm ?? Infinity;
    return da - db;
  });

  return {
    caregivers: found,
    radiusUsedM,
    locationAvailable: true,
  };
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isCaregiverAvailable = (caregiver) => {
  if (typeof caregiver?.isAvailable === 'boolean') return caregiver.isAvailable;
  return (caregiver?.availabilityStatus || '').toLowerCase() === 'available';
};

const getExactCoordinate = (caregiver) => {
  const fromLocation = caregiver?.location?.coordinates;
  if (Array.isArray(fromLocation) && fromLocation.length >= 2) {
    const longitude = toFiniteNumber(fromLocation[0]);
    const latitude = toFiniteNumber(fromLocation[1]);
    if (latitude != null && longitude != null) {
      return { latitude, longitude };
    }
  }

  const latitude =
    toFiniteNumber(caregiver?.latitude) ??
    toFiniteNumber(caregiver?.lat) ??
    toFiniteNumber(caregiver?.location?.latitude) ??
    toFiniteNumber(caregiver?.location?.lat);
  const longitude =
    toFiniteNumber(caregiver?.longitude) ??
    toFiniteNumber(caregiver?.lng) ??
    toFiniteNumber(caregiver?.location?.longitude) ??
    toFiniteNumber(caregiver?.location?.lng);

  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
};

/**
 * Build map-marker objects from an enriched caregiver array.
 *
 * @param {Array} caregivers enriched caregiver list (output of searchCaregiversWithinRadius)
 * @returns {Array<{ id, coordinate: { latitude, longitude }, title, description, caregiver }>}
 */
export const buildMapMarkers = (caregivers) => {
  if (!Array.isArray(caregivers) || caregivers.length === 0) return [];

  return caregivers
    .filter((caregiver) => caregiver && isCaregiverAvailable(caregiver))
    .map((caregiver, index) => {
      const coordinate = getExactCoordinate(caregiver);

      if (!coordinate) return null;

      return {
        id: String(caregiver.id || caregiver._id || `caregiver-${index}`),
        coordinate,
        title: caregiver.name || caregiver.fullName || 'Caregiver',
        description: `${caregiver.specialization || caregiver.role || 'Healthcare Professional'} • ${
          caregiver.distanceLabel || 'Nearby'
        }`,
        caregiver,
      };
    })
    .filter(Boolean);
};

export default {
  searchCaregiversWithinRadius,
  buildMapMarkers,
};
