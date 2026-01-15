
const API_BASE_URL = import.meta.env.VITE_API_URL || ''; // Fallback to empty if not set, but it should be set

export const aiService = {
    /**
     * Generate a one-sentence summary strictly based on facts.
     * @param {string} content 
     * @returns {Promise<{ok: boolean, text?: string, reason?: string}>}
     */
    async generateSummary(content) {
        return this._callWorker('/ai/summary', content);
    },

    /**
     * Polish fact description (de-oralize, fix grammar).
     * @param {string} content 
     * @returns {Promise<{ok: boolean, text?: string, reason?: string}>}
     */
    async polishContent(content) {
        return this._callWorker('/ai/polish', content);
    },

    async _callWorker(endpoint, content) {
        if (!content) return { ok: false, reason: 'Empty content' };

        try {
            // Ensure we don't have double slashes if base has trailing slash
            const baseUrl = API_BASE_URL.replace(/\/$/, '');
            const url = `${baseUrl}${endpoint}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { ok: false, reason: `Server error: ${response.status} ${errorText}` };
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('AI Service Error:', error);
            return { ok: false, reason: error.message || 'Network error' };
        }
    }
};
