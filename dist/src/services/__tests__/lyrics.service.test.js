"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lyrics_service_1 = require("../lyrics.service");
const openai_1 = __importDefault(require("openai"));
jest.mock('openai');
describe('LyricsService', () => {
    let lyricsService;
    const mockOpenAI = {
        chat: {
            completions: {
                create: jest.fn()
            }
        }
    };
    beforeEach(() => {
        openai_1.default.mockImplementation(() => mockOpenAI);
        lyricsService = new lyrics_service_1.LyricsService('fake-api-key', 'http://example.com', 'test-app');
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('getLyrics', () => {
        it('should throw error when search term is empty', async () => {
            await expect(lyricsService.getLyrics('', 'context'))
                .rejects
                .toThrow('Search term is required');
        });
        it('should return lyrics when API call is successful', async () => {
            const expectedResponse = 'Here are the lyrics...';
            mockOpenAI.chat.completions.create.mockResolvedValueOnce({
                choices: [{ message: { content: expectedResponse } }]
            });
            const result = await lyricsService.getLyrics('song name', 'context');
            expect(result).toBe(expectedResponse);
            expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
                model: 'perplexity/llama-3.1-sonar-large-128k-online',
                messages: [{
                        role: 'user',
                        content: expect.stringContaining('song name')
                    }]
            });
        });
        it('should return default message when API response is empty', async () => {
            mockOpenAI.chat.completions.create.mockResolvedValueOnce({
                choices: [{ message: { content: null } }]
            });
            const result = await lyricsService.getLyrics('song name', 'context');
            expect(result).toBe('Could not find lyrics.');
        });
        it('should handle API errors', async () => {
            mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('API Error'));
            await expect(lyricsService.getLyrics('song name', 'context'))
                .rejects
                .toThrow('API Error');
        });
    });
});
