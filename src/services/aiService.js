
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const aiService = {
    /**
     * Process note: Polish fact AND Generate Summary in one go.
     * @param {string} content 
     * @returns {Promise<{ok: boolean, polishedFact?: string, summary?: string, reason?: string}>}
     */
    async processNote(content) {
        return this._callWorker('/ai/process', content);
    },

    // Deprecated single purpose methods kept for compatibility if needed, 
    // but effectively we are moving to processNote.
    async generateSummary(content) {
        return this.processNote(content).then(res => ({
            ok: res.ok,
            text: res.summary,
            reason: res.reason
        }));
    },

    async polishContent(content) {
        return this.processNote(content).then(res => ({
            ok: res.ok,
            text: res.polishedFact,
            reason: res.reason
        }));
    },

    async _callWorker(endpoint, content) {
        if (!content) return { ok: false, reason: 'Empty content' };

        try {
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
