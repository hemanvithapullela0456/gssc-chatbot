// Lightweight context extraction to enrich session memory without heavy parsing.
export class SimpleContextExtractor {
    extractBasicInfo(message) {
        const context = {};
        const lowerText = message.toLowerCase();

        if (/\b(?:i am|i\'m|im)\s+(?:a|an)?\s*student\b/i.test(lowerText)) {
            context.role = 'student';
        } else if (/\b(?:i am|i\'m|im)\s+(?:a|an)?\s*(?:parent|guardian)\b/i.test(lowerText)) {
            context.role = 'parent';
        }

        const interestPatterns = [
            /interested in (.+?)(?:\.|,|$)/i,
            /looking for (.+?)(?:\.|,|$)/i,
            /want to know about (.+?)(?:\.|,|$)/i,
            /need information on (.+?)(?:\.|,|$)/i,
        ];

        for (const pattern of interestPatterns) {
            const match = lowerText.match(pattern);
            if (match && match[1]) {
                if (!context.interests) context.interests = [];
                context.interests.push(match[1].trim());
            }
        }

        return Object.keys(context).length > 0 ? context : null;
    }

    buildContextString(userContext) {
        if (!userContext) return '';

        const parts = [];
        if (userContext.role) {
            parts.push(`User is a ${userContext.role}`);
        }
        if (userContext.academicLevel) {
            parts.push(`Academic level: ${userContext.academicLevel}`);
        }
        if (userContext.interests && userContext.interests.length > 0) {
            parts.push(`Interested in: ${userContext.interests.join(', ')}`);
        }

        return parts.length > 0 ? parts.join(' | ') : '';
    }
}
