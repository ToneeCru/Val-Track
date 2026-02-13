/**
 * Service to interact with the PSGC (Philippine Standard Geographic Code) API.
 * API Documentation: https://psgc.gitlab.io/api/
 */

const BASE_URL = 'https://psgc.gitlab.io/api';
const TIMEOUT_MS = 10000; // 10 seconds timeout

export interface AddressOption {
    label: string;
    value: string;
}

/**
 * Helper to fetch with a timeout using AbortController.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(id);
        return response;
    } catch (error: any) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please check your internet connection.');
        }
        throw error;
    }
}

/**
 * Standardizes API responses into Label/Value pairs.
 */
function mapToOptions(data: any[]): AddressOption[] {
    return data
        .map((item) => ({
            label: item.name,
            value: item.code,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Fetches all regions in the Philippines.
 */
export async function getRegions(): Promise<AddressOption[]> {
    try {
        const response = await fetchWithTimeout(`${BASE_URL}/regions/`);
        if (!response.ok) throw new Error('Failed to fetch regions');
        const data = await response.json();
        return mapToOptions(data);
    } catch (error) {
        console.error('getRegions Error:', error);
        throw error;
    }
}

/**
 * Fetches provinces for a specific region.
 */
export async function getProvincesByRegion(regionCode: string): Promise<AddressOption[]> {
    try {
        const response = await fetchWithTimeout(`${BASE_URL}/regions/${regionCode}/provinces/`);
        if (!response.ok) throw new Error('Failed to fetch provinces');
        const data = await response.json();
        return mapToOptions(data);
    } catch (error) {
        console.error('getProvincesByRegion Error:', error);
        throw error;
    }
}

/**
 * Fetches cities/municipalities for regions without provinces (e.g., NCR).
 */
export async function getCitiesByRegion(regionCode: string): Promise<AddressOption[]> {
    try {
        const response = await fetchWithTimeout(`${BASE_URL}/regions/${regionCode}/cities-municipalities/`);
        if (!response.ok) throw new Error('Failed to fetch cities');
        const data = await response.json();
        return mapToOptions(data);
    } catch (error) {
        console.error('getCitiesByRegion Error:', error);
        throw error;
    }
}

/**
 * Fetches cities/municipalities for a specific province.
 */
export async function getCitiesByProvince(provinceCode: string): Promise<AddressOption[]> {
    try {
        const response = await fetchWithTimeout(`${BASE_URL}/provinces/${provinceCode}/cities-municipalities/`);
        if (!response.ok) throw new Error('Failed to fetch cities');
        const data = await response.json();
        return mapToOptions(data);
    } catch (error) {
        console.error('getCitiesByProvince Error:', error);
        throw error;
    }
}

/**
 * Fetches barangays for a specific city or municipality.
 */
export async function getBarangaysByCity(cityCode: string): Promise<AddressOption[]> {
    try {
        const response = await fetchWithTimeout(`${BASE_URL}/cities-municipalities/${cityCode}/barangays/`);
        if (!response.ok) throw new Error('Failed to fetch barangays');
        const data = await response.json();
        return mapToOptions(data);
    } catch (error) {
        console.error('getBarangaysByCity Error:', error);
        throw error;
    }
}
