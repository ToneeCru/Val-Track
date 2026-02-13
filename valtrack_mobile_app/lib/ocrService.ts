import * as FileSystem from 'expo-file-system/legacy';

// Define ID Anchors
const ID_ANCHORS: Record<string, string[]> = {
    'Passport': ['PASAPORTE', 'REPUBLIC OF THE PHILIPPINES', 'P<PHL'],
    'National ID': ['PHILIPPINE IDENTIFICATION', 'REPUBLIC OF THE PHILIPPINES', 'PhilSys'],
    'Drivers License': ["DRIVER'S LICENSE", 'REPUBLIC OF THE PHILIPPINES', 'RESTRICTIONS'],
    'UMID': ['UNIFIED MULTI-PURPOSE ID', 'CRN', 'SSS'],
    'Voters ID': ["VOTER'S ID", 'COMMISSION ON ELECTIONS', 'PRECINCT'],
    'Senior Citizen ID': ['SENIOR CITIZEN', 'OSCA', 'RA 9994', 'ID. NO.'],
    'PWD ID': ['PERSONS WITH DISABILITY', 'PWD ID', 'RA 9442', 'BARANGAY'],
    'PRC ID': ['PROFESSIONAL REGULATION COMMISSION', 'PRC ID', 'LICENSURE'],
    'Student ID': ['STUDENT ID', 'SCHOOL ID', 'UNIVERSITY', 'PAMANTASAN'],
    'Others': [], // No specific validation for others
};

export const validateID = (rawText: string, selectedType: string): boolean => {
    const upperText = rawText.toUpperCase();
    const anchors = ID_ANCHORS[selectedType];

    if (!anchors || anchors.length === 0) {
        return true; // Always valid if no anchors defined (e.g. Others)
    }

    return anchors.some(anchor => upperText.includes(anchor.toUpperCase()));
};

export const processOCR = async (imageUri: string, selectedType: string) => {
    try {
        console.log(`Starting OCR for ${selectedType}`);

        // Get base64 for API
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: 'base64',
        });

        // OCR.space API (Free Tier / Test Key)
        const formData = new FormData();
        formData.append('apikey', 'helloworld'); // Test key
        formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('filetype', 'JPG');

        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (result.IsErroredOnProcessing) {
            throw new Error(result.ErrorMessage?.[0] || 'OCR API Error');
        }

        const text = result.ParsedResults?.[0]?.ParsedText || '';
        const isValid = validateID(text, selectedType);

        return { text, isValid };
    } catch (error) {
        console.error('OCR Processing Error:', error);
        return { text: '', isValid: false, error };
    }
};
