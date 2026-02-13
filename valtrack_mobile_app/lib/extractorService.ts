/**
 * Utility service to extract structured data from raw OCR text using regex and fuzzy matching.
 */

export interface ExtractedData {
    surname: string | null;
    firstname: string | null;
    middlename: string | null;
    dateofbirth: string | null;
    id_number: string | null;
}

const ID_PATTERNS = {
    'Drivers License': /[A-Z]\d{2}-\d{2}-\d{6}/i,
    'National ID': /\b\d{16}\b/,
    'UMID': /\b\d{4}-\d{7}-\d{1}\b/,
    'Passport': /\b[A-Z]\d{7}[A-Z]\b|\b[A-Z][0-9]{7}\b/i,
};

const DOB_PATTERNS = [
    /\b\d{2}\/\d{2}\/\d{4}\b/, // MM/DD/YYYY
    /\b\d{2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/i, // DD MMM YYYY
    /\b\d{4}-\d{2}-\d{2}\b/, // YYYY-MM-DD
];

const normalizeDate = (dateStr: string): string => {
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // MM/DD/YYYY to YYYY-MM-DD
    const mdy = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (mdy) return `${mdy[3]}-${mdy[1]}-${mdy[2]}`;

    // DD MMM YYYY to YYYY-MM-DD
    const months: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const dmy = dateStr.match(/^(\d{2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (dmy) {
        const m = months[dmy[2].toLowerCase().substring(0, 3)];
        if (m) return `${dmy[3]}-${m}-${dmy[1]}`;
    }

    return dateStr;
};

/**
 * Extracts structured data from raw OCR text based on ID type.
 * @param rawText The raw text output from the OCR service.
 * @param idType The type of ID being processed.
 */
export function extractDataFromOCR(rawText: string, idType: string): ExtractedData {
    const result: ExtractedData = {
        surname: null,
        firstname: null,
        middlename: null,
        dateofbirth: null,
        id_number: null,
    };

    if (!rawText) return result;

    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const normalizedText = rawText.replace(/\s+/g, ' ');

    // 1. Extract ID Number
    const idPattern = ID_PATTERNS[idType as keyof typeof ID_PATTERNS];
    if (idPattern) {
        const match = normalizedText.match(idPattern);
        if (match) {
            result.id_number = match[0].toUpperCase();
        }
    }

    // 2. Extract Date of Birth
    let rawDob: string | null = null;
    const dobLabelMatch = rawText.match(/(?:Date of Birth|DOB)[:\s]+(.+)/i);
    if (dobLabelMatch) {
        const potentialDatePart = dobLabelMatch[1].trim();
        for (const pattern of DOB_PATTERNS) {
            const match = potentialDatePart.match(pattern);
            if (match) {
                rawDob = match[0];
                break;
            }
        }
    }

    if (!rawDob) {
        for (const pattern of DOB_PATTERNS) {
            const match = normalizedText.match(pattern);
            if (match) {
                rawDob = match[0];
                break;
            }
        }
    }

    if (rawDob) {
        result.dateofbirth = normalizeDate(rawDob);
    }

    // 3. Extract Names
    // Surname
    const surnameMatch = rawText.match(/(?:Surname|Last Name)[:\s]+([A-Z\s]+)/i);
    if (surnameMatch) {
        result.surname = surnameMatch[1].trim().split('\n')[0].toUpperCase();
    }

    // First Name
    const firstNameMatch = rawText.match(/(?:First Name|Given Name)[:\s]+([A-Z\s]+)/i);
    if (firstNameMatch) {
        result.firstname = firstNameMatch[1].trim().split('\n')[0].toUpperCase();
    }

    // Fallback fuzzy logic for names if labels aren't found
    if (!result.surname || !result.firstname) {
        // Identify 2-3 longest uppercase lines as potential name candidates
        const uppercaseLines = lines
            .filter(line => /^[A-Z\s,.-]+$/.test(line) && line.length > 3)
            .sort((a, b) => b.length - a.length);

        if (uppercaseLines.length > 0) {
            // Very rough heuristic: First longest typically contains the name or address
            // If we have "Lastname, Firstname" format
            if (uppercaseLines[0].includes(',')) {
                const parts = uppercaseLines[0].split(',');
                if (!result.surname) result.surname = parts[0].trim().toUpperCase();
                if (!result.firstname) result.firstname = parts[1].trim().toUpperCase();
            } else {
                // Assume longest is Firstname/Lastname combination if we don't have labels
                if (!result.surname && uppercaseLines.length > 1) {
                    result.surname = uppercaseLines[0].toUpperCase();
                }
                if (!result.firstname && uppercaseLines.length > 0) {
                    result.firstname = result.surname === uppercaseLines[0].toUpperCase()
                        ? (uppercaseLines[1] ? uppercaseLines[1].toUpperCase() : null)
                        : uppercaseLines[0].toUpperCase();
                }
            }
        }
    }

    // Final trim and normalization
    Object.keys(result).forEach(key => {
        const k = key as keyof ExtractedData;
        if (result[k]) {
            result[k] = result[k]!.trim();
            // Remove any trailing non-alphanumeric except for common separators in id_number
            if (k !== 'id_number' && k !== 'dateofbirth') {
                result[k] = result[k]!.replace(/[^A-Z\s]/g, '');
            }
        }
    });

    return result;
}
