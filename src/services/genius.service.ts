import { ApifyClient } from 'apify-client';
import OpenAI from 'openai';
import crypto from 'crypto';
import NodeCache from 'node-cache';

interface LyricSection {
    type: string;
    url: string;
    text: string;
}

interface GeniusApiResponse {
    id: number;
    title: string;
    url: string;
    artist: string;
    album: string;
    albumCover: string;
    release: string;
    spotify: string;
    youtube: string;
    soundcloud: string;
    appleMusicPlayer: string;
    lyrics: LyricSection[];
}

/**
 * Represents the result of a Genius API search, conforming to the OpenAPI schema.
 */
interface GeniusOpenApiResult {
    /** The title of the song. */
    title: string;
    /** The artist of the song. */
    artist: string;
    /** The lyrics of the song, formatted as a string. */
    lyrics: string;
    /** The URL of the song on Genius. */
    url: string;
    /** The album the song belongs to, if available. */
    album?: string;
    /** The release date of the song, if available. */
    releaseDate?: string;
    /** Background information about the song, if available. */
    background?: string;
}

export class GeniusService {
    private client: ApifyClient;
    private openai: OpenAI;
    private cache: NodeCache;

    constructor(apiToken: string, openaiApiKey: string) {
        this.client = new ApifyClient({
            token: apiToken,
        });
        this.openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: openaiApiKey,
        });
        // Cache with 24 hour TTL
        this.cache = new NodeCache({ stdTTL: 86400 });
    }

    private getCacheKey(query: string): string {
        return crypto.createHash('md5').update(query.toLowerCase()).digest('hex');
    }

    private formatLyrics(lyricSections: LyricSection[]): string {
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

    private async getSongBackground(title: string, artist: string, lyrics: string): Promise<string> {
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
        } catch (error) {
            console.error('Error getting song background:', error);
            return '';
        }
    }

    private validateApiResponse(item: unknown): item is GeniusApiResponse {
        const response = item as GeniusApiResponse;
        return (
            typeof response === 'object' &&
            response !== null &&
            typeof response.title === 'string' &&
            typeof response.url === 'string' &&
            typeof response.artist === 'string' &&
            Array.isArray(response.lyrics) &&
            response.lyrics.every(section => 
                typeof section === 'object' &&
                section !== null &&
                typeof section.type === 'string' &&
                typeof section.url === 'string' &&
                typeof section.text === 'string'
            )
        );
    }

    /**
     * Searches for lyrics on Genius based on the provided query.
     * @param query The search query.
     * @returns A GeniusOpenApiResult object containing the lyrics and metadata, or null if no results are found or an error occurs.
     */
    async searchLyrics(query: string): Promise<GeniusOpenApiResult | null> {
        try {
            if (!query) {
                console.warn('Empty query provided');
                return null;
            }

            // Check cache first
            const cacheKey = this.getCacheKey(query);
            const cachedResult = this.cache.get<GeniusOpenApiResult>(cacheKey);
            if (cachedResult) {
                console.log('Returning cached result for:', query);
                return cachedResult;
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
                return null;
            }

            const items = await response.json();
            console.log('API Response:', JSON.stringify(items, null, 2));

            if (!items || !Array.isArray(items) || items.length === 0) {
                console.warn(`No results found for query: "${query}"`);
                return null;
            }

            const validItem = items[0];
            if (!this.validateApiResponse(validItem)) {
                console.warn('Invalid response format');
                return null;
            }

            console.log('First item:', JSON.stringify(validItem, null, 2));

            // Format lyrics from sections
            const formattedLyrics = this.formatLyrics(validItem.lyrics);
            console.log('Formatted lyrics:', formattedLyrics);

            // Extract title without "by Artist" suffix
            const titleParts = validItem.title.split(' by ');
            const cleanTitle = titleParts[0];

            const result: GeniusOpenApiResult = {
                title: cleanTitle,
                artist: validItem.artist,
                lyrics: formattedLyrics,
                url: validItem.url,
                album: validItem.album,
                releaseDate: validItem.release ? new Date(validItem.release).toLocaleDateString() : undefined
            };

            if (!result.title || !result.artist || !result.lyrics || !result.url) {
                console.warn('Missing required fields in response');
                return null;
            }

            // Get song background
            result.background = await this.getSongBackground(result.title, result.artist, result.lyrics);

            // Cache the result
            this.cache.set(cacheKey, result);

            // Log the final result
            console.log('Processed result:', JSON.stringify(result, null, 2));

            return result;

        } catch (error) {
            console.error('Error searching lyrics:', error);
            return null;
        }
    }
}
