"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lyrics_service_1 = require("../lyrics.service");
const genius_service_1 = require("../genius.service");
const openai_1 = __importDefault(require("openai"));
jest.mock('../genius.service');
jest.mock('openai');
describe('LyricsService', () => {
    let lyricsService;
    let mockCreateCompletion;
    let mockGeniusService;
    beforeEach(() => {
        process.env.HELICONE_ENABLED = 'false';
        // Set up OpenAI mock
        mockCreateCompletion = jest.fn();
        openai_1.default.mockImplementation(() => ({
            chat: {
                completions: {
                    create: mockCreateCompletion
                }
            }
        }));
        // Set up GeniusService mock
        mockGeniusService = {
            searchLyrics: jest.fn()
        };
        genius_service_1.GeniusService.mockImplementation(() => mockGeniusService);
        // Create the service
        lyricsService = new lyrics_service_1.LyricsService('fake-openai-key', 'http://test.com', 'TestApp', 'fake-genius-key');
    });
    describe('getLyrics', () => {
        it('should return error message for empty search term', async () => {
            const result = await lyricsService.getLyrics('');
            expect(result).toEqual(['Please provide a song to search for.']);
        });
        it('should return lyrics from Genius when available', async () => {
            const mockLyrics = {
                title: 'Test Song',
                artist: 'Test Artist',
                lyrics: 'Test lyrics\nSecond line',
                url: 'http://test.com/song',
                album: 'Test Album',
                releaseDate: '2023'
            };
            mockGeniusService.searchLyrics.mockResolvedValue(mockLyrics);
            const result = await lyricsService.getLyrics('Test Song');
            expect(result).toEqual([
                '🎵 Test Song\nTest Artist\nTrack from Test Album\nReleased: 2023',
                'Test lyrics\nSecond line',
                '\n🔗 Source: http://test.com/song'
            ]);
        });
        it('should handle lyrics without album and release date', async () => {
            const mockLyrics = {
                title: 'Test Song',
                artist: 'Test Artist',
                lyrics: 'Test lyrics\nSecond line',
                url: 'http://test.com/song'
            };
            mockGeniusService.searchLyrics.mockResolvedValue(mockLyrics);
            const result = await lyricsService.getLyrics('Test Song');
            expect(result).toEqual([
                '🎵 Test Song\nTest Artist',
                'Test lyrics\nSecond line',
                '\n🔗 Source: http://test.com/song'
            ]);
        });
        it('should fall back to memory recall when Genius fails', async () => {
            mockGeniusService.searchLyrics.mockResolvedValue(null);
            mockCreateCompletion.mockResolvedValue({
                choices: [{
                        message: {
                            content: 'Recalled lyrics from memory'
                        }
                    }]
            });
            const result = await lyricsService.getLyrics('Test Song');
            expect(result).toEqual([
                '🎵 Lyrics Recalled from AI Memory:',
                'Recalled lyrics from memory'
            ]);
        });
        it('should fall back to AI response when both Genius and memory recall fail', async () => {
            mockGeniusService.searchLyrics.mockResolvedValue(null);
            // First completion for memory recall returns short/invalid response
            mockCreateCompletion.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: 'Short'
                        }
                    }]
            });
            // Second completion for AI fallback
            mockCreateCompletion.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: 'AI fallback response'
                        }
                    }]
            });
            const result = await lyricsService.getLyrics('Test Song');
            expect(result).toEqual(['AI fallback response']);
        });
        it('should handle errors gracefully', async () => {
            mockGeniusService.searchLyrics.mockRejectedValue(new Error('Test error'));
            mockCreateCompletion.mockRejectedValue(new Error('OpenAI error'));
            const result = await lyricsService.getLyrics('Test Song');
            expect(result).toEqual(['⚠️ An error occurred while fetching lyrics. Please try again.']);
        });
        it('should enhance search query when context is provided', async () => {
            mockCreateCompletion.mockResolvedValueOnce({
                choices: [{
                        message: {
                            content: 'Enhanced Query'
                        }
                    }]
            });
            const mockLyrics = {
                title: 'Test Song',
                artist: 'Test Artist',
                lyrics: 'Test lyrics',
                url: 'http://test.com/song'
            };
            mockGeniusService.searchLyrics.mockResolvedValue(mockLyrics);
            await lyricsService.getLyrics('Test Song', 'Some context');
            expect(mockGeniusService.searchLyrics).toHaveBeenCalledWith('Enhanced Query');
        });
    });
});
