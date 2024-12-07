"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LyricsService = void 0;
const openai_1 = __importDefault(require("openai"));
class LyricsService {
    openai;
    constructor(apiKey, siteUrl, appName) {
        this.openai = new openai_1.default({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: apiKey,
            defaultHeaders: {
                'HTTP-Referer': siteUrl,
                'X-Title': appName,
            }
        });
    }
    async getLyrics(searchTerm, context) {
        if (!searchTerm) {
            throw new Error('Search term is required');
        }
        const prompt = `You are an assistant that looks up song lyrics and delivers them to the user. Never use citations, always give direct links, always deliver full lyrics or apologize and deliver a snippet and a link to where you got it from.\n\nContext:\n${context}\n\nSearch Term:\n${searchTerm}`;
        const completion = await this.openai.chat.completions.create({
            model: 'perplexity/llama-3.1-sonar-large-128k-online',
            messages: [{ role: 'user', content: prompt }]
        });
        return completion.choices[0].message.content || 'Could not find lyrics.';
    }
}
exports.LyricsService = LyricsService;
