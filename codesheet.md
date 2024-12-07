# SongLyrics-PPLX-70b Codebase Codesheet

This document provides a snapshot of the current codebase.

## File Listing and Contents:

### src/web/server.ts

```typescript
import express, { Request, Response, RequestHandler } from 'express';
import path from 'path';
import { LyricsService } from '../services/lyrics.service';
import * as dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
    'OPENROUTER_API_KEY',
    'YOUR_SITE_URL',
    'APIFY_API_KEY'
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

const app = express();
const port = process.env.PORT || 3000;

// Initialize LyricsService
const lyricsService = new LyricsService(
    process.env.OPENROUTER_API_KEY!,
    process.env.YOUR_SITE_URL!,
    process.env.YOUR_APP_NAME || 'SongLyrics-PPLX',
    process.env.APIFY_API_KEY!
);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Type definitions
interface LyricsRequest extends Request {
    body: {
        query: string;
    };
}

// Route handlers
const handleRoot: RequestHandler = (_req: Request, res: Response): void => {
    res.sendFile(path.join(__dirname, 'index.html'));
};

const handleLyricsSearch: RequestHandler = async (req: LyricsRequest, res: Response): Promise<void> => {
    const { query } = req.body;
    
    if (!query) {
        res.status(400).json({ error: 'Query is required' });
        return;
    }

    try {
        const lyrics = await lyricsService.getLyrics(query);
        res.json(lyrics);
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        res.status(500).json({ error: 'Failed to fetch lyrics' });
    }
};

// Routes
app.get('/', handleRoot);
app.post('/api/lyrics', handleLyricsSearch);

// Start server
const server = app.listen(port, () => {
    console.log(`Web server running at http://localhost:${port}`);
});

export default server;
```

### src/web/index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lyrics Lookup</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }

        .search-container {
            text-align: center;
            margin-bottom: 30px;
        }

        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }

        input[type="text"] {
            width: 60%;
            padding: 12px;
            font-size: 16px;
            border: 2px solid #ddd;
            border-radius: 4px;
            margin-right: 10px;
        }

        button {
            padding: 12px 24px;
            font-size: 16px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s;
        }

        button:hover {
            background-color: #45a049;
        }

        button:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
        }

        #results {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            white-space: pre-wrap;
        }

        .loading {
            text-align: center;
            margin: 20px 0;
            display: none;
        }

        .loading::after {
            content: "Loading...";
            animation: dots 1.5s infinite;
        }

        @keyframes dots {
            0%, 20% { content: "Loading."; }
            40% { content: "Loading.."; }
            60% { content: "Loading..."; }
            80%, 100% { content: "Loading...."; }
        }

        .error {
            color: #d32f2f;
            text-align: center;
            margin: 20px 0;
            display: none;
        }

        .metadata {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }

        .lyrics {
            line-height: 1.6;
        }

        .source {
            margin-top: 20px;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <h1>🎵 Lyrics Lookup</h1>
    
    <div class="search-container">
        <input type="text" id="searchInput" placeholder="Enter song name or lyrics..." />
        <button onclick="searchLyrics()">Search</button>
    </div>

    <div class="loading" id="loading"></div>
    <div class="error" id="error"></div>
    <div id="results"></div>

    <script>
        const searchInput = document.getElementById('searchInput');
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const results = document.getElementById('results');

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchLyrics();
            }
        });

        async function searchLyrics() {
            const query = searchInput.value.trim();
            if (!query) {
                showError('Please enter a song to search for');
                return;
            }

            showLoading();
            try {
                const response = await fetch('/api/lyrics', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ query })
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch lyrics');
                }

                const data = await response.json();
                displayResults(data);
            } catch (err) {
                showError('Error fetching lyrics. Please try again.');
                console.error('Error:', err);
            } finally {
                hideLoading();
            }
        }

        function displayResults(data) {
            error.style.display = 'none';
            results.innerHTML = '';

            if (!data || data.length === 0) {
                showError('No lyrics found');
                return;
            }

            // Process each part of the response
            data.forEach(part => {
                if (part.startsWith('🎵')) {
                    // Metadata section
                    const metadataDiv = document.createElement('div');
                    metadataDiv.className = 'metadata';
                    metadataDiv.textContent = part;
                    results.appendChild(metadataDiv);
                } else if (part.startsWith('🔗')) {
                    // Source link section
                    const sourceDiv = document.createElement('div');
                    sourceDiv.className = 'source';
                    sourceDiv.textContent = part;
                    results.appendChild(sourceDiv);
                } else {
                    // Lyrics section
                    const lyricsDiv = document.createElement('div');
                    lyricsDiv.className = 'lyrics';
                    lyricsDiv.textContent = part;
                    results.appendChild(lyricsDiv);
                }
            });
        }

        function showLoading() {
            loading.style.display = 'block';
            error.style.display = 'none';
            results.innerHTML = '';
        }

        function hideLoading() {
            loading.style.display = 'none';
        }

        function showError(message) {
            error.textContent = message;
            error.style.display = 'block';
            results.innerHTML = '';
        }
    </script>
</body>
</html>
```

### src/services/lyrics.service.ts

```typescript
import { GeniusService } from './genius.service';
import OpenAI from 'openai';

export class LyricsService {
    private genius: GeniusService;
    private openai: OpenAI;
    private readonly MAX_DISCORD_LENGTH = 1900;
    private heliconeEnabled: boolean;
    private heliconeApiKey?: string;

    constructor(
        openaiApiKey: string,
        siteUrl: string,
        appName: string,
        geniusApiKey: string
    ) {
        this.genius = new GeniusService(geniusApiKey);
        
        // Helicone configuration
        this.heliconeEnabled = process.env.HELICONE_ENABLED === 'true';
        this.heliconeApiKey = process.env.HELICONE_API_KEY;

        const baseHeaders: Record<string, string> = {
            "HTTP-Referer": siteUrl,
            "X-Title": appName,
        };

        // Add Helicone headers if enabled
        if (this.heliconeEnabled && this.heliconeApiKey) {
            baseHeaders['Helicone-Auth'] = `Bearer ${this.heliconeApiKey}`;
            baseHeaders['Helicone-Property-App'] = appName;
        }

        this.openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: openaiApiKey,
            defaultHeaders: baseHeaders
        });
    }

    private splitLyrics(lyrics: string): string[] {
        const chunks: string[] = [];
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
                } else {
                    currentChunk = line;
                }
            } else {
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    private truncateMessage(message: string): string {
        if (message.length <= this.MAX_DISCORD_LENGTH) {
            return message;
        }
        
        const truncatePoint = message.lastIndexOf('.', this.MAX_DISCORD_LENGTH - 4);
        return truncatePoint > 0 
            ? message.substring(0, truncatePoint + 1) + '...'
            : message.substring(0, this.MAX_DISCORD_LENGTH - 3) + '...';
    }

    private parseXMLTags(text: string | null): string {
        if (text === null) {
            return '';
        }
        return text.replace(/<[^>]+>/g, '');
    }

    private async enhanceSearchQuery(query: string, context: string): Promise<string> {
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
- ALWAYS return "Artist - Song Title" format
- Maximize search accuracy and discoverability
- Prefer most likely/popular interpretation
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
        } catch (error) {
            console.error('Error enhancing search query:', error);
            return query; // Proceed with original query if enhancement fails
        }
    }

    private async recallLyricsFromMemory(query: string): Promise<string | null> {
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
        } catch (error) {
            console.error('Error recalling lyrics from memory:', error);
            return null; // Return null if memory recall fails
        }
    }

    async getLyrics(searchTerm: string, context?: string): Promise<string[]> {
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

            // Stage 2: Genius Scraper
            const geniusResult = await this.genius.searchLyrics(enhancedQuery);
            if (geniusResult) {
                const response = [];
                const metadata = [];
                metadata.push(`🎵 ${geniusResult.title}`);
                metadata.push(geniusResult.artist);
                if (geniusResult.album) metadata.push(`Track from ${geniusResult.album}`);
                if (geniusResult.releaseDate) metadata.push(`Released: ${geniusResult.releaseDate}`);
                response.push(this.truncateMessage(metadata.join('\n')));

                const lyricChunks = this.splitLyrics(geniusResult.lyrics);
                response.push(...lyricChunks);

                const sourceLink = `\n🔗 Source: ${geniusResult.url}`;
                response.push(this.truncateMessage(sourceLink));

                return response;
            }

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

        } catch (error) {
            console.error('Error fetching lyrics:', error);
            return ['⚠️ An error occurred while fetching lyrics. Please try again.'];
        }
    }

    async deeperSearchLyrics(searchTerm: string, context?: string): Promise<string[]> {
        if (!searchTerm) {
            return ['Please provide a song to search for.'];
        }

        try {
            const cleanSearchTerm = this.parseXMLTags(searchTerm);
            const cleanContext = context ? this.parseXMLTags(context) : undefined;

            console.log('Original search term:', cleanSearchTerm);
            let enhancedQuery = cleanSearchTerm;

            // Enhance Search Query
            if (cleanContext) {
                enhancedQuery = await this.enhanceSearchQuery(cleanSearchTerm, cleanContext);
            }

            console.log('Final search query:', enhancedQuery);
            
            // Genius Deeper Search
            const geniusResult = await this.genius.deeperSearchLyrics(enhancedQuery);
            if (geniusResult) {
                const response = [];
                const metadata = [];
                metadata.push(`🎵 ${geniusResult.title}`);
                metadata.push(geniusResult.artist);
                if (geniusResult.album) metadata.push(`Track from ${geniusResult.album}`);
                if (geniusResult.releaseDate) metadata.push(`Released: ${geniusResult.releaseDate}`);
                response.push(this.truncateMessage(metadata.join('\n')));

                const lyricChunks = this.splitLyrics(geniusResult.lyrics);
                response.push(...lyricChunks);

                const sourceLink = `\n🔗 Source: ${geniusResult.url}`;
                response.push(this.truncateMessage(sourceLink));

                return response;
            }

            // If deeper search fails, fall back to regular search or other stages
            return await this.getLyrics(searchTerm, context);

        } catch (error) {
            console.error('Error fetching lyrics with deeper search:', error);
            return ['⚠️ An error occurred while fetching lyrics with deeper search. Please try again.'];
        }
    }
}
```

### src/services/genius.service.ts

```typescript
import { ApifyClient } from 'apify-client';

interface GeniusResult {
    title: string;
    artist: string;
    lyrics: string;
    url: string;
    album?: string;
    releaseDate?: string;
}

interface ScraperItem {
    title: string;
    artist: string;
    lyrics: string;
    url: string;
    album?: string;
    releaseDate?: string;
}

interface ScraperInput {
    searchTerms?: string[];
    startUrls?: Array<{ url: string }>;
    maxResults: number;
    includeMetadata: boolean;
    proxy: {
        useApifyProxy: boolean;
        apifyProxyGroups: string[];
    };
    customMapFunction: string;
}

export class GeniusService {
    private client: ApifyClient;

    constructor(apiToken: string) {
        this.client = new ApifyClient({
            token: apiToken,
        });
    }

    private cleanLyrics(lyrics: string): string {
        return lyrics
            .replace(/\[([^\]]+)\]/g, '\n[$1]\n') // Format section headers
            .replace(/^Lyrics\s*\d*$/gm, '')
            .replace(/Embed$/gm, '')
            .replace(/Source:.*$/gm, '') // Remove source attribution
            .replace(/Songwriters:.*$/gm, '') // Remove songwriter info
            .replace(/lyrics © .*$/gm, '') // Remove copyright info
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    private normalizeSearchQuery(query: string): string {
        // Remove special characters and normalize spaces
        return query
            .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim()
            .toLowerCase();
    }

    private isString(value: unknown): value is string {
        return typeof value === 'string';
    }

    private validateScraperItem(item: unknown): item is ScraperItem {
        if (!item || typeof item !== 'object') {
            return false;
        }

        const { title, artist, lyrics, url, album, releaseDate } = item as any;

        if (!this.isString(title) || !this.isString(artist) || 
            !this.isString(lyrics) || !this.isString(url)) {
            return false;
        }

        if (album !== undefined && !this.isString(album)) {
            return false;
        }

        if (releaseDate !== undefined && !this.isString(releaseDate)) {
            return false;
        }

        return true;
    }

    private extractScraperResult(item: unknown): ScraperItem | null {
        if (!this.validateScraperItem(item)) {
            return null;
        }

        return {
            title: item.title,
            artist: item.artist,
            lyrics: item.lyrics,
            url: item.url,
            album: item.album,
            releaseDate: item.releaseDate
        };
    }

    private async searchWithRetry(query: string, maxAttempts = 2): Promise<GeniusResult | null> {
        let attempts = 0;
        let lastError: any = null;

        while (attempts < maxAttempts) {
            try {
                console.log(`Attempt ${attempts + 1}/${maxAttempts} for query: "${query}"`);
                
                const input: ScraperInput = {
                    maxResults: 5, // Fetch more results to find best match
                    includeMetadata: true,
                    proxy: {
                        useApifyProxy: true,
                        apifyProxyGroups: ['RESIDENTIAL']
                    },
                    customMapFunction: `
                        async ({ input, $, request, html, json }) => {
                            const results = [];
                            
                            // Extract lyrics and metadata
                            const lyrics = $('.lyrics').text().trim() || 
                                         $('.Lyrics__Container-sc-1ynbvzw-6').text().trim();
                            
                            if (lyrics) {
                                const title = $('h1').first().text().trim();
                                const artist = $('.header_with_cover_art-primary_info-primary_artist').text().trim();
                                const album = $('.header_with_cover_art-primary_info-release_title').text().trim();
                                const releaseDate = $('.header_with_cover_art-primary_info-release_date').text().trim();
                                
                                results.push({
                                    title,
                                    artist,
                                    lyrics,
                                    url: request.url,
                                    album,
                                    releaseDate
                                });
                            }
                            
                            return results;
                        }
                    `
                };

                // Handle direct URLs vs search terms
                if (query.startsWith('https://genius.com/')) {
                    input.startUrls = [{ url: query }];
                } else {
                    input.searchTerms = [query];
                }

                console.log('Apify input configuration:', JSON.stringify(input, null, 2));

                const run = await this.client.actor("epctex/genius-scraper").call({
                    input
                });

                const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
                
                if (!items || !Array.isArray(items) || items.length === 0) {
                    console.warn(`No results found for query: "${query}"`);
                    attempts++;
                    continue;
                }

                // Find best matching result
                const normalizedQuery = this.normalizeSearchQuery(query);
                const validItems: ScraperItem[] = [];

                for (const item of items) {
                    const validItem = this.extractScraperResult(item);
                    if (validItem) {
                        validItems.push(validItem);
                    }
                }
                
                if (validItems.length === 0) {
                    console.warn('No valid items found in results');
                    attempts++;
                    continue;
                }

                const bestMatch = validItems.find(item => {
                    const normalizedTitle = this.normalizeSearchQuery(item.title);
                    const normalizedArtist = this.normalizeSearchQuery(item.artist);
                    return normalizedTitle.includes(normalizedQuery) || 
                           normalizedQuery.includes(normalizedTitle) ||
                           normalizedArtist.includes(normalizedQuery);
                }) || validItems[0];

                console.log(`Successfully found lyrics for: "${bestMatch.title}"`);

                return {
                    title: bestMatch.title,
                    artist: bestMatch.artist,
                    lyrics: this.cleanLyrics(bestMatch.lyrics),
                    url: bestMatch.url,
                    album: bestMatch.album,
                    releaseDate: bestMatch.releaseDate
                };

            } catch (error) {
                console.error(`Attempt ${attempts + 1} failed:`, error);
                lastError = error;
                attempts++;
            }
        }

        console.error('All attempts failed. Last error:', lastError);
        return null;
    }

    async searchLyrics(query: string): Promise<GeniusResult | null> {
        try {
            return await this.searchWithRetry(query);
        } catch (error) {
            console.error('Genius scraping error:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                query,
                error
            });
            return null;
        }
    }

    // New method for deeper search
    async deeperSearchLyrics(query: string): Promise<GeniusResult | null> {
        try {
            // Increase max attempts and results for deeper search
            return await this.searchWithRetry(query, 5);
        } catch (error) {
            console.error('Genius deeper scraping error:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                query,
                error
            });
            return null;
        }
    }
}
```

### src/services/channel.service.ts

```typescript
export class ChannelService {
    private optedInChannels: Set<string>;

    constructor() {
        this.optedInChannels = new Set<string>();
    }

    optIn(channelId: string): boolean {
        if (this.optedInChannels.has(channelId)) {
            return false;
        }
        this.optedInChannels.add(channelId);
        return true;
    }

    optOut(channelId: string): boolean {
        if (!this.optedInChannels.has(channelId)) {
            return false;
        }
        this.optedInChannels.delete(channelId);
        return true;
    }

    isOptedIn(channelId: string): boolean {
        return this.optedInChannels.has(channelId);
    }

    getOptedInChannels(): string[] {
        return Array.from(this.optedInChannels);
    }
}
```

### SongLyrics-PPLX-70b/src/index.ts

```typescript
import { Client, GatewayIntentBits, Message, IntentsBitField } from 'discord.js';
import * as dotenv from 'dotenv';
import { LyricsService } from './services/lyrics.service';
import { ChannelService } from './services/channel.service';

dotenv.config();

const client = new Client({ 
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const lyricsService = new LyricsService(
    process.env.OPENROUTER_API_KEY || '',
    process.env.YOUR_SITE_URL || '',
    process.env.YOUR_APP_NAME || 'SongLyrics-PPLX-70b'
);

const channelService = new ChannelService();

client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
});

client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;

    const content = message.content;

    // Handle ping command
    if (content === '/ping') {
        await message.reply('Pong!');
        return;
    }

    // Handle opt-in command
    if (content === '/optin') {
        if (message.member?.permissions.has('ManageChannels')) {
            const result = channelService.optIn(message.channelId);
            await message.reply(
                result 
                    ? 'Channel opted in for lyrics bot functionality!'
                    : 'Channel is already opted in.'
            );
        } else {
            await message.reply('You need the "Manage Channels" permission to opt in this channel.');
        }
        return;
    }

    // Handle opt-out command
    if (content === '/optout') {
        if (message.member?.permissions.has('ManageChannels')) {
            const result = channelService.optOut(message.channelId);
            await message.reply(
                result 
                    ? 'Channel opted out from lyrics bot functionality.'
                    : 'Channel was not opted in.'
            );
        } else {
            await message.reply('You need the "Manage Channels" permission to opt out this channel.');
        }
        return;
    }

    // Only process lyrics commands in opted-in channels
    if (!channelService.isOptedIn(message.channelId)) {
        return;
    }

    if (content.startsWith('/lyrics') || content.startsWith('!lyrics')) {
        const searchTerm = content.slice(content.indexOf(' ') + 1);

        if (!searchTerm) {
            await message.reply('Please provide a song to search for. Example: `/lyrics Bohemian Rhapsody`');
            return;
        }

        try {
            const messages = await message.channel.messages.fetch({ limit: 10 });
            const context = messages.map(msg => msg.content).join('\n');

            const response = await lyricsService.getLyrics(searchTerm, context);

            // Split long responses into chunks if needed (Discord has a 2000 char limit)
            const chunks = response.match(/.{1,1900}/g) || [];
            for (const chunk of chunks) {
                await message.reply(chunk);
            }
        } catch (error) {
            console.error('Error fetching lyrics:', error);
            await message.reply('An error occurred while fetching lyrics.');
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### package.json

```json
{
  "name": "songlyrics-pplx-70b",
  "version": "1.0.0",
  "description": "A Discord bot for fetching song lyrics",
  "main": "dist/index.js",
  "engines": {
    "node": "22.x"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist
