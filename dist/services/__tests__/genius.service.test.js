"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const genius_service_1 = require("../genius.service");
const apify_client_1 = require("apify-client");
const openai_1 = __importDefault(require("openai"));
jest.mock('apify-client');
jest.mock('openai');
describe('GeniusService', () => {
    let geniusService;
    let mockListItems;
    let mockCall;
    let mockCreateCompletion;
    beforeEach(() => {
        mockListItems = jest.fn();
        mockCall = jest.fn();
        mockCreateCompletion = jest.fn();
        const mockDataset = jest.fn().mockReturnValue({
            listItems: mockListItems
        });
        const mockActor = jest.fn().mockReturnValue({
            call: mockCall
        });
        apify_client_1.ApifyClient.mockImplementation(() => ({
            actor: mockActor,
            dataset: mockDataset
        }));
        openai_1.default.mockImplementation(() => ({
            chat: {
                completions: {
                    create: mockCreateCompletion
                }
            }
        }));
        geniusService = new genius_service_1.GeniusService('fake-token', 'fake-openai-key');
    });
    describe('searchLyrics', () => {
        it('should return lyrics when found', async () => {
            const mockItems = [{
                    id: 1063,
                    title: "Test Song by Test Artist",
                    url: "https://genius.com/test-song-lyrics",
                    artist: "Test Artist",
                    album: "Test Album",
                    albumCover: "https://example.com/cover.jpg",
                    release: "2023-01-01T00:00:00.000Z",
                    spotify: "https://spotify.com/track/123",
                    youtube: "https://youtube.com/watch?v=123",
                    soundcloud: "https://soundcloud.com/test/song",
                    appleMusicPlayer: "https://genius.com/songs/123/apple_music_player",
                    lyrics: [
                        {
                            type: "header",
                            url: "https://genius.com/123",
                            text: "[Verse 1]"
                        },
                        {
                            type: "lyric",
                            url: "https://genius.com/124",
                            text: "First line of the song\nSecond line of the song"
                        },
                        {
                            type: "header",
                            url: "https://genius.com/125",
                            text: "[Chorus]"
                        },
                        {
                            type: "lyric",
                            url: "https://genius.com/126",
                            text: "This is the chorus\nAnother chorus line"
                        }
                    ]
                }];
            mockCall.mockResolvedValue({ defaultDatasetId: 'test-id' });
            mockListItems.mockResolvedValue({ items: mockItems });
            mockCreateCompletion.mockResolvedValue({
                choices: [{
                        message: {
                            content: 'Test song background information'
                        }
                    }]
            });
            const result = await geniusService.searchLyrics('Test Song');
            expect(result).toEqual({
                title: "Test Song",
                artist: "Test Artist",
                lyrics: "[Verse 1]\nFirst line of the song\nSecond line of the song\n[Chorus]\nThis is the chorus\nAnother chorus line",
                url: "https://genius.com/test-song-lyrics",
                album: "Test Album",
                releaseDate: "1/1/2023",
                background: "Test song background information"
            });
            expect(mockCall).toHaveBeenCalledWith({
                input: {
                    query: 'Test Song'
                }
            });
        });
        it('should return cached result when available', async () => {
            const mockItems = [{
                    id: 1063,
                    title: "Test Song by Test Artist",
                    url: "https://genius.com/test-song-lyrics",
                    artist: "Test Artist",
                    album: "Test Album",
                    lyrics: [
                        {
                            type: "lyric",
                            url: "https://genius.com/124",
                            text: "Cached lyrics"
                        }
                    ]
                }];
            mockCall.mockResolvedValue({ defaultDatasetId: 'test-id' });
            mockListItems.mockResolvedValue({ items: mockItems });
            mockCreateCompletion.mockResolvedValue({
                choices: [{
                        message: {
                            content: 'Test song background information'
                        }
                    }]
            });
            // First call to populate cache
            await geniusService.searchLyrics('Test Song');
            // Reset mocks
            mockCall.mockClear();
            mockListItems.mockClear();
            mockCreateCompletion.mockClear();
            // Second call should use cache
            const result = await geniusService.searchLyrics('Test Song');
            expect(result).toBeTruthy();
            expect(mockCall).not.toHaveBeenCalled();
            expect(mockListItems).not.toHaveBeenCalled();
            expect(mockCreateCompletion).not.toHaveBeenCalled();
        });
        it('should return null when no results found', async () => {
            mockCall.mockResolvedValue({ defaultDatasetId: 'test-id' });
            mockListItems.mockResolvedValue({ items: [] });
            const result = await geniusService.searchLyrics('Nonexistent Song');
            expect(result).toBeNull();
        });
        it('should handle invalid response format', async () => {
            const mockInvalidItems = [{
                    title: 'Incomplete Data'
                    // Missing required fields
                }];
            mockCall.mockResolvedValue({ defaultDatasetId: 'test-id' });
            mockListItems.mockResolvedValue({ items: mockInvalidItems });
            const result = await geniusService.searchLyrics('Invalid Data');
            expect(result).toBeNull();
        });
        it('should handle API errors gracefully', async () => {
            mockCall.mockRejectedValue(new Error('API error'));
            const result = await geniusService.searchLyrics('Error Test');
            expect(result).toBeNull();
        });
        it('should handle empty query', async () => {
            const result = await geniusService.searchLyrics('');
            expect(result).toBeNull();
        });
    });
});
