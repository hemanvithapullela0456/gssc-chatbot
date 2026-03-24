import { z } from 'zod';

const sessionIdSchema = z.string().min(1, 'Session ID is required').max(200);
const questionSchema = z
    .string()
    .trim()
    .min(1, 'Question cannot be empty')
    .max(5000, 'Question too long');
const languageSchema = z.enum(['english', 'hindi'], {
    errorMap: () => ({ message: 'Language must be "english" or "hindi"' }),
});

export const chatStreamSchema = z.object({
    question: questionSchema,
    sessionId: sessionIdSchema.optional(),
    language: languageSchema.optional().default('english'),
});

export const setLanguageSchema = z.object({
    sessionId: sessionIdSchema,
    language: languageSchema,
});

export const getLanguageSchema = z.object({
    sessionId: sessionIdSchema,
});

export const clearConversationSchema = z.object({
    sessionId: sessionIdSchema,
});

function toValidationResponse(error) {
    if (error instanceof z.ZodError) {
        return {
            status: 400,
            body: {
                success: false,
                error: 'Validation failed',
                details: error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                })),
            },
        };
    }

    return {
        status: 400,
        body: {
            success: false,
            error: error?.message || 'Invalid request',
        },
    };
}

export function validateBody(schema) {
    return (req, res, next) => {
        try {
            req.validatedBody = schema.parse(req.body || {});
            next();
        } catch (error) {
            const response = toValidationResponse(error);
            return res.status(response.status).json(response.body);
        }
    };
}

export function validateParams(schema) {
    return (req, res, next) => {
        try {
            req.validatedParams = schema.parse(req.params || {});
            next();
        } catch (error) {
            const response = toValidationResponse(error);
            return res.status(response.status).json(response.body);
        }
    };
}

export function validateQuery(schema) {
    return (req, res, next) => {
        try {
            req.validatedQuery = schema.parse(req.query || {});
            next();
        } catch (error) {
            const response = toValidationResponse(error);
            return res.status(response.status).json(response.body);
        }
    };
}
