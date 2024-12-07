"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LyricsService = void 0;
const genius_service_1 = require("./genius.service");
const openai_1 = __importDefault(require("openai"));
class LyricsService {
    genius;
    openai;
    MAX_DISCORD_LENGTH = 1900;
    heliconeEnabled;
    heliconeApiKey;
    constructor(openaiApiKey, siteUrl, appName, geniusApiKey) {
        // Pass both required arguments to GeniusService
        this.genius = new genius_service_1.GeniusService(geniusApiKey, openaiApiKey);
        // Helicone configuration
        this.heliconeEnabled = process.env.HELICONE_ENABLED === 'true';
        this.heliconeApiKey = process.env.HELICONE_API_KEY;
        const baseHeaders = {
            "HTTP-Referer": siteUrl,
            "X-Title": appName,
        };
        // Add Helicone headers if enabled
        if (this.heliconeEnabled && this.heliconeApiKey) {
            baseHeaders['Helicone-Auth'] = `Bearer ${this.heliconeApiKey}`;
            baseHeaders['Helicone-Property-App'] = appName;
        }
        this.openai = new openai_1.default({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: openaiApiKey,
            defaultHeaders: baseHeaders
        });
    }
    splitLyrics(lyrics) {
        const chunks = [];
        const lines = lyrics.split('\n');
        let currentChunk = '';
        for (const line of lines) {
            if ((currentChunk.length + line.length + 1) > this.MAX_DISCORD_LENGTH) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                }
                // If the line itself is too long, split it
                if (line.length > this.MAX_DISCORD_LENGTH) {
                    let remainingLine = line;
                    while (remainingLine.length > 0) {
                        const chunk = remainingLine.substring(0, this.MAX_DISCORD_LENGTH - 3);
                        chunks.push(chunk + '...');
                        remainingLine = remainingLine.substring(this.MAX_DISCORD_LENGTH - 3);
                    }
                    currentChunk = '';
                }
                else {
                    currentChunk = line;
                }
            }
            else {
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }
        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }
        return chunks;
    }
    truncateMessage(message) {
        if (message.length <= this.MAX_DISCORD_LENGTH) {
            return message;
        }
        const truncatePoint = message.lastIndexOf('.', this.MAX_DISCORD_LENGTH - 4);
        return truncatePoint > 0
            ? message.substring(0, truncatePoint + 1) + '...'
            : message.substring(0, this.MAX_DISCORD_LENGTH - 3) + '...';
    }
    parseXMLTags(text) {
        if (text === null) {
            return '';
        }
        return text.replace(/<[^>]+>/g, '');
    }
    async enhanceSearchQuery(query, context) {
        try {
            console.log('Enhancing search query:', { query, context });
            const completion = await this.openai.chat.completions.create({
                model: "perplexity/llama-3.1-sonar-large-128k-chat",
                messages: [
                    {
                        role: "system",
                        content: `🎵 Advanced Music Query Refinement System 🎵

Your mission is to transform raw, potentially imperfect song queries into precise, discoverable search terms. You are a musical detective, decoding user intentions with expert precision.

Core Objectives:
1. Standardize Inconsistent Inputs
   - Correct common misspellings
   - Resolve artist/song name ambiguities
   - Handle partial or fragmented queries

2. Context-Aware Query Enhancement
   - Leverage surrounding context
   - Identify potential genre, era, or mood hints
   - Disambiguate between similar song titles

3. Search Optimization Strategies
   - Prioritize canonical song/artist names
   - Include alternative spellings or known variations
   - Consider featured artists or remix versions

Output Requirements:
- Return the exact song title and artist name in their original format
- Maximize search accuracy and discoverability
- Keep response concise and unambiguous`
                    },
                    {
                        role: "user",
                        content: `Query: ${this.parseXMLTags(query)}\nContext from recent messages:\n${this.parseXMLTags(context)}`
                    }
                ]
            });
            console.log('Enhanced query result:', completion.choices[0].message?.content);
            return completion.choices[0].message?.content || query;
        }
        catch (error) {
            console.error('Error enhancing search query:', error);
            return query; // Proceed with original query if enhancement fails
        }
    }
    async recallLyricsFromMemory(query) {
        try {
            console.log('Attempting lyrics recall from memory:', query);
            const completion = await this.openai.chat.completions.create({
                model: "perplexity/llama-3.1-sonar-huge-128k-online",
                messages: [
                    {
                        role: "system",
                        content: `🎵 Lyrical Memory Recall System 🎵

You are an advanced AI with comprehensive musical knowledge. When asked about song lyrics:

Objectives:
1. Recall lyrics with high accuracy
2. Provide full lyrics ONLY
3. Maintain original formatting (verse/chorus structure)
4. Include attribution to original artist

Guidelines:
- Prioritize complete, verbatim lyrics
- If full lyrics are unavailable, provide most memorable sections to you with complete accuracy.
- If full lyrics are unavailable, provide direct links in markdown formatting to sources that may have it. 
- Ensure lyrics match the specific version/recording

- Include section headers (Verse, Chorus, Bridge)

Output Format:
[Artist Name]
[Song Title]

[Lyrics with section headers]

[Optional: Brief context or interesting fact]`
                    },
                    {
                        role: "user",
                        content: `Please recall the complete lyrics for: ${query}`
                    }
                ]
            });
            const lyricsResponse = completion.choices[0].message?.content;
            console.log('Memory recall response length:', lyricsResponse?.length || 0);
            if (lyricsResponse && lyricsResponse.length > 50) {
                return lyricsResponse;
            }
            return null;
        }
        catch (error) {
            console.error('Error recalling lyrics from memory:', error);
            return null; // Return null if memory recall fails
        }
    }
    async getLyrics(searchTerm, context) {
        if (!searchTerm) {
            return ['Please provide a song to search for.'];
        }
        try {
            const cleanSearchTerm = this.parseXMLTags(searchTerm);
            const cleanContext = context ? this.parseXMLTags(context) : undefined;
            console.log('Original search term:', cleanSearchTerm);
            let enhancedQuery = cleanSearchTerm;
            // Stage 1: Enhance Search Query
            if (cleanContext) {
                enhancedQuery = await this.enhanceSearchQuery(cleanSearchTerm, cleanContext);
            }
            console.log('Final search query:', enhancedQuery);
            if (this.heliconeEnabled) {
                console.log('Using Helicone support...');
            }
            // Stage 2: Genius Search
            await this.genius.searchLyrics(enhancedQuery); //genius.searchLyrics now returns void
            // Stage 3: Memory Recall with LLM
            console.log('Attempting memory recall stage...');
            const memoryLyrics = await this.recallLyricsFromMemory(enhancedQuery);
            if (memoryLyrics) {
                const response = [];
                response.push('🎵 Lyrics Recalled from AI Memory:');
                const lyricChunks = this.splitLyrics(memoryLyrics);
                response.push(...lyricChunks);
                return response;
            }
            // Stage 4: AI Fallback Response
            console.log('Falling back to AI-generated response...');
            const completion = await this.openai.chat.completions.create({
                model: "perplexity/llama-3.1-sonar-large-128k-chat",
                messages: [
                    {
                        role: "system",
                        content: `🕵️ Lyrics Search Intelligence System 🕵️

When lyrics cannot be found, provide a strategic, user-empowering response:

Objectives:
1. Diagnose Search Failure
2. Offer Precise Guidance
3. Suggest Alternative Approaches

Response Components:
- Concise explanation of search limitations
- Specific, actionable search refinement tips
- Optional genre-specific or contextual insights`
                    },
                    {
                        role: "user",
                        content: `Could not find lyrics for: ${cleanSearchTerm}\nContext: ${cleanContext || 'No context provided'}`
                    }
                ]
            });
            const aiResponse = this.truncateMessage(completion.choices[0].message?.content || '');
            return [aiResponse];
        }
        catch (error) {
            console.error('Error fetching lyrics:', error);
            return ['⚠️ An error occurred while fetching lyrics. Please try again.'];
        }
    }
}
exports.LyricsService = LyricsService;
