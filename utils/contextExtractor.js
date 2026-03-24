// Extracts GSCC-relevant user context from conversational text.
export class ContextExtractor {
    constructor() {
        this.academicLevels = [
            'class 10',
            'class 12',
            'intermediate',
            'graduation',
            'undergraduate',
            'bachelor',
            'diploma',
            'polytechnic',
            'iti',
            'postgraduate',
            'masters',
            'phd',
            'medical',
            'engineering',
            'management',
            'law',
        ];

        this.applicantRoles = [
            'student',
            'parent',
            'guardian',
            'faculty',
            'counselor',
            'visitor',
        ];
    }

    extractAcademicLevel(text) {
        const lowerText = text.toLowerCase();

        const levelPatterns = [
            /(?:i am|i\'m|im)\s+(?:in|doing|pursuing)?\s*([a-z0-9\s]+?)\s*(?:student|course|program)?$/i,
            /(?:i (?:have|had) completed)\s+([a-z0-9\s]+)/i,
            /(?:i want to study|planning to study)\s+([a-z0-9\s]+)/i,
        ];

        for (const pattern of levelPatterns) {
            const match = lowerText.match(pattern);
            if (match && match[1]) {
                const normalized = this.normalizeAcademicLevel(match[1]);
                if (normalized) return normalized;
            }
        }

        for (const level of this.academicLevels) {
            if (lowerText.includes(level)) {
                return this.normalizeAcademicLevel(level);
            }
        }

        return null;
    }

    normalizeAcademicLevel(level) {
        const normalized = level.toLowerCase().trim();

        if (['class 10', '10th', 'matric'].some((v) => normalized.includes(v))) {
            return 'Class 10';
        }
        if (['class 12', '12th', 'intermediate'].some((v) => normalized.includes(v))) {
            return 'Class 12';
        }
        if (['diploma', 'polytechnic', 'iti'].some((v) => normalized.includes(v))) {
            return 'Diploma/Technical';
        }
        if (
            ['graduation', 'undergraduate', 'bachelor', 'btech', 'be', 'mbbs', 'bsc', 'ba', 'bcom'].some((v) =>
                normalized.includes(v)
            )
        ) {
            return 'Undergraduate';
        }
        if (['postgraduate', 'masters', 'mtech', 'mba', 'msc', 'ma', 'mcom', 'phd'].some((v) => normalized.includes(v))) {
            return 'Postgraduate';
        }

        return null;
    }

    extractRole(text) {
        const lowerText = text.toLowerCase();

        if (/\b(?:i am|i\'m|im)\s+(?:a|an)?\s*student\b/i.test(lowerText)) {
            return 'student';
        }
        if (/\b(?:i am|i\'m|im)\s+(?:a|an)?\s*(?:parent|father|mother)\b/i.test(lowerText)) {
            return 'parent';
        }
        if (/\b(?:i am|i\'m|im)\s+(?:a|an)?\s*guardian\b/i.test(lowerText)) {
            return 'guardian';
        }
        if (/\b(?:i am|i\'m|im)\s+(?:a|an)?\s*(?:faculty|teacher|counselor)\b/i.test(lowerText)) {
            return 'faculty';
        }
        if (/\b(?:i am|i\'m|im)\s+(?:just\s+)?(?:visiting|a visitor)\b/i.test(lowerText)) {
            return 'visitor';
        }

        return null;
    }

    extractIntentHints(text) {
        const lowerText = text.toLowerCase();
        const hints = [];

        if (/(?:interest|rate|roi|percentage)/i.test(lowerText)) hints.push('interest_rate');
        if (/(?:loan amount|max loan|limit|maximum)/i.test(lowerText)) hints.push('loan_limit');
        if (/(?:eligibility|eligible|criteria)/i.test(lowerText)) hints.push('eligibility');
        if (/(?:document|certificate|paper|required)/i.test(lowerText)) hints.push('documents');
        if (/(?:apply|application|registration|portal)/i.test(lowerText)) hints.push('application_process');

        return hints.length ? hints : null;
    }

    extractContext(message) {
        const context = {};

        const role = this.extractRole(message);
        if (role) context.role = role;

        const academicLevel = this.extractAcademicLevel(message);
        if (academicLevel) context.academicLevel = academicLevel;

        const intentHints = this.extractIntentHints(message);
        if (intentHints) context.intentHints = intentHints;

        return Object.keys(context).length > 0 ? context : null;
    }

    buildContextSummary(userContext) {
        if (!userContext) return '';

        const parts = [];
        if (userContext.role) parts.push(`Role: ${userContext.role}`);
        if (userContext.academicLevel) parts.push(`Academic Level: ${userContext.academicLevel}`);
        if (Array.isArray(userContext.intentHints) && userContext.intentHints.length > 0) {
            parts.push(`Interests: ${userContext.intentHints.join(', ')}`);
        }

        if (parts.length === 0) return '';

        return `\n\nUser Context:\n${parts.join('\n')}\nUse this context to personalize responses and disambiguate queries.\n`;
    }
}
