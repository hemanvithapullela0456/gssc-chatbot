// Conversation Summarizer - Long-Short Term Memory System.
export class ConversationSummarizer {
    constructor(cohereClient, modelName, options = {}) {
        this.cohere = cohereClient;
        this.modelName = modelName;
        this.summaryThreshold = options.summaryThreshold || 12;
        this.recentMessagesCount = options.recentMessagesCount || 6;
    }

    needsSummarization(history) {
        return Array.isArray(history) && history.length >= this.summaryThreshold;
    }

    async generateSummary(messages, language = 'english', currentSummary = null) {
        if (!messages || messages.length === 0) {
            return currentSummary || null;
        }

        const conversationText = messages
            .map((msg) => {
                const role = msg.role === 'user' ? 'User' : 'Assistant';
                return `${role}: ${msg.content}`;
            })
            .join('\n');

        const languageInstruction =
            language === 'hindi' ? 'Respond in Hindi (Natural Hinglish).' : 'Respond in English.';

        const existingSummarySection = currentSummary
            ? `\n\nPrevious Summary:\n${currentSummary}\n`
            : '';

        const prompt = `You are a conversation summarizer for a GSCC scheme assistant. Extract only stable user context and key discussion facts.

${existingSummarySection}
Conversation to summarize:
${conversationText}

Instructions:
1. Extract factual user profile signals (role, academic level, financial concerns, required process stage).
2. Keep key topics and unanswered follow-ups.
3. Keep it concise: 5-6 bullet points maximum.
4. Skip greetings and pleasantries.
5. Merge with previous summary and deduplicate repeated facts.
6. ${languageInstruction}

Return only bullet points.`;

        try {
            const response = await this.cohere.chat({
                model: this.modelName,
                message: prompt,
                temperature: 0.2,
                maxTokens: 350,
            });
            const summary = response?.text?.trim() || currentSummary || null;
            if (summary) {
                console.log(
                    `[Summarizer] Generated summary (${summary.length} chars) from ${messages.length} messages`
                );
            }
            return summary;
        } catch (error) {
            console.error('[Summarizer] Failed to generate summary:', error?.message || error);
            return currentSummary || null;
        }
    }

    async processHistory(history, language = 'english', existingSummary = null) {
        if (!Array.isArray(history) || history.length === 0) {
            return {
                summary: existingSummary,
                recent: [],
                shouldUpdate: false,
            };
        }

        if (!this.needsSummarization(history)) {
            return {
                summary: existingSummary,
                recent: history,
                shouldUpdate: false,
            };
        }

        const splitPoint = history.length - this.recentMessagesCount;
        const olderMessages = history.slice(0, splitPoint);
        const recentMessages = history.slice(splitPoint);

        console.log(
            `[Summarizer] Processing: ${history.length} total -> ${olderMessages.length} to summarize, ${recentMessages.length} recent`
        );

        const newSummary = await this.generateSummary(olderMessages, language, existingSummary);

        return {
            summary: newSummary,
            recent: recentMessages,
            shouldUpdate: Boolean(newSummary && newSummary !== existingSummary),
        };
    }

    formatForPrompt(summary, recentMessages) {
        let formatted = '';

        if (summary) {
            formatted += `\n\nConversation Summary (Long-term Context):\n${summary}\n`;
        }

        if (recentMessages && recentMessages.length > 0) {
            const recentText = recentMessages
                .map((msg) => {
                    const role = msg.role === 'user' ? 'User' : 'Assistant';
                    return `${role}: ${msg.content}`;
                })
                .join('\n');
            formatted += `\n\nRecent Conversation (Short-term Context):\n${recentText}\n`;
        }

        return formatted;
    }
}
