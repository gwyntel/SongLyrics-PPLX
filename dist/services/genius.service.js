"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeniusService = void 0;
const apify_client_1 = require("apify-client");
const openai_1 = __importDefault(require("openai"));
const crypto_1 = __importDefault(require("crypto"));
const node_cache_1 = __importDefault(require("node-cache"));
class GeniusService {
    client;
    openai;
    cache;
    constructor(apiToken, openaiApiKey) {
        this.client = new apify_client_1.ApifyClient({
            token: apiToken,
        });
        this.openai = new openai_1.default({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: openaiApiKey,
        });
        // Cache with 24 hour TTL
        this.cache = new node_cache_1.default({ stdTTL: 86400 });
    }
    getCacheKey(query) {
        return crypto_1.default.createHash('md5').update(query.toLowerCase()).digest('hex');
    }
    formatLyrics(lyricSections) {
        return lyricSections
            .map(section => {
            if (section.type === 'header') {
                return `[${section.text.replace(/[\[\]]/g, '')}]`;
            }
            return section.text;
        })
            .join('\n')
            .trim();
    }
    async getSongBackground(title, artist, lyrics) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: "perplexity/llama-3.1-sonar-large-128k-chat",
                messages: [
                    {
                        role: "system",
                        content: `You are a music expert providing interesting background information about songs. Focus on the song's history, meaning, and cultural impact.`
                    },
                    {
                        role: "user",
                        content: `Provide a brief background about "${title}" by ${artist}. Here are the lyrics for context:\n\n${lyrics}`
                    }
                ]
            });
            return completion.choices[0].message?.content || '';
        }
        catch (error) {
            console.error('Error getting song background:', error);
            return '';
        }
    }
    async searchLyrics(query) {
        try {
            if (!query) {
                console.warn('Empty query provided');
                return;
            }
            // Check cache first
            const cacheKey = this.getCacheKey(query);
            const cachedResult = this.cache.get(cacheKey);
            if (cachedResult) {
                console.log('Returning cached result for:', query);
                return;
            }
            console.log(`Searching lyrics with query: "${query}"`);
            // Use the correct endpoint and schema
            const response = await fetch('https://api.apify.com/v2/acts/easyapi~song-lyrics-scraper/run-sync-get-dataset-items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query
                })
            });
            if (!response.ok) {
                console.error('API request failed:', response.statusText);
                throw new Error(`API request failed with status ${response.status}`);
            }
            const items = await response.json();
            console.log('API Response:', JSON.stringify(items, null, 2));
            if (!items || !Array.isArray(items) || items.length === 0) {
                console.warn(`No results found for query: "${query}"`);
                return;
            }
            const validItem = items[0];
            // Removed complex validation as schema doesn't specify response body
            console.log('First item:', JSON.stringify(validItem, null, 2));
            // Cache the result
            this.cache.set(cacheKey, validItem);
            // Log the final result
            console.log('Processed result:', JSON.stringify(validItem, null, 2));
        }
        catch (error) {
            console.error('Error searching lyrics:', error);
            throw error; // Re-throw the error to be handled by calling function
        }
    }
}
exports.GeniusService = GeniusService;
