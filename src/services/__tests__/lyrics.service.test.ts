import { LyricsService } from '../lyrics.service';
import { OpenAI } from 'openai';

jest.mock('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: 'Mocked lyrics' } }],
                }),
            },
        },
    })),
}));

describe('LyricsService', () => {
    let service: LyricsService;

    beforeEach(() => {
        service = new LyricsService('openai-api-key', 'site-url', 'app-name', 'genius-api-key');
    });

    it('should handle empty search term', async () => {
        const result = await service.getLyrics('');
        expect(result).toEqual(['Please provide a song to search for.']);
    });

    it('should handle successful lyrics retrieval', async () => {
        const mockGetLyrics = jest.fn().mockResolvedValue(['Mocked lyrics']);
        jest.spyOn(service, 'getLyrics').mockImplementation(mockGetLyrics);
        const result = await service.getLyrics('Song Title');
        expect(mockGetLyrics).toHaveBeenCalledWith('Song Title', undefined);
        expect(result).toEqual(['Mocked lyrics']);
    });

    it('should handle unsuccessful lyrics retrieval', async () => {
        const mockOpenAICreate = jest.fn().mockRejectedValueOnce(new Error('Failed to fetch lyrics'));
        jest.mocked(OpenAI.prototype.chat.completions.create).mockImplementation(mockOpenAICreate);
        const result = await service.getLyrics('NonExistentSong');
        expect(result).toEqual(['⚠️ An error occurred while fetching lyrics. Please try again.']);
    });

    it('should handle memory recall', async () => {
        const mockOpenAICreate = jest.fn().mockImplementationOnce((params: any) => {
            if (params.messages[0].role === 'system' && params.messages[0].content.includes('Lyrical Memory Recall System')) {
                return Promise.resolve({ choices: [{ message: { content: 'Mocked memory lyrics' } }] });
            } else {
                return Promise.resolve({ choices: [{ message: { content: 'Mocked lyrics' } }] });
            }
        });
        jest.mocked(OpenAI.prototype.chat.completions.create).mockImplementation(mockOpenAICreate);
        const mockGetLyrics = jest.fn().mockResolvedValue(['Mocked memory lyrics']);
        jest.spyOn(service, 'getLyrics').mockImplementation(mockGetLyrics);
        const result = await service.getLyrics('Song Title');
        expect(mockGetLyrics).toHaveBeenCalledWith('Song Title', undefined);
        expect(result).toEqual(['Mocked memory lyrics']);
    });

    it('should handle AI fallback', async () => {
        const mockOpenAICreate = jest.fn().mockImplementationOnce((params: any) => {
            if (params.messages[0].role === 'system' && params.messages[0].content.includes('Lyrics Search Intelligence System')) {
                return Promise.resolve({ choices: [{ message: { content: 'Mocked AI fallback response' } }] });
            } else {
                return Promise.resolve({ choices: [{ message: { content: 'Mocked lyrics' } }] });
            }
        });
        jest.mocked(OpenAI.prototype.chat.completions.create).mockImplementation(mockOpenAICreate);
        const mockGetLyrics = jest.fn().mockResolvedValue(['Mocked AI fallback response']);
        jest.spyOn(service, 'getLyrics').mockImplementation(mockGetLyrics);
        const result = await service.getLyrics('NonExistentSong');
        expect(mockGetLyrics).toHaveBeenCalledWith('NonExistentSong', undefined);
        expect(result).toEqual(['Mocked AI fallback response']);
    });

});
