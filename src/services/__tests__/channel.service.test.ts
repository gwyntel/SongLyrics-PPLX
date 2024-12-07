import { ChannelService } from '../channel.service';

describe('ChannelService', () => {
    let channelService: ChannelService;

    beforeEach(() => {
        channelService = new ChannelService();
    });

    describe('optIn', () => {
        it('should opt in a new channel successfully', () => {
            const result = channelService.optIn('channel1');
            expect(result).toBe(true);
            expect(channelService.isOptedIn('channel1')).toBe(true);
        });

        it('should return false when trying to opt in an already opted-in channel', () => {
            channelService.optIn('channel1');
            const result = channelService.optIn('channel1');
            expect(result).toBe(false);
        });
    });

    describe('optOut', () => {
        it('should opt out an opted-in channel successfully', () => {
            channelService.optIn('channel1');
            const result = channelService.optOut('channel1');
            expect(result).toBe(true);
            expect(channelService.isOptedIn('channel1')).toBe(false);
        });

        it('should return false when trying to opt out a non-opted-in channel', () => {
            const result = channelService.optOut('channel1');
            expect(result).toBe(false);
        });
    });

    describe('isOptedIn', () => {
        it('should return true for an opted-in channel', () => {
            channelService.optIn('channel1');
            expect(channelService.isOptedIn('channel1')).toBe(true);
        });

        it('should return false for a non-opted-in channel', () => {
            expect(channelService.isOptedIn('channel1')).toBe(false);
        });
    });

    describe('getOptedInChannels', () => {
        it('should return an empty array when no channels are opted in', () => {
            expect(channelService.getOptedInChannels()).toEqual([]);
        });

        it('should return array of all opted-in channels', () => {
            channelService.optIn('channel1');
            channelService.optIn('channel2');
            channelService.optIn('channel3');
            
            const optedInChannels = channelService.getOptedInChannels();
            expect(optedInChannels).toHaveLength(3);
            expect(optedInChannels).toContain('channel1');
            expect(optedInChannels).toContain('channel2');
            expect(optedInChannels).toContain('channel3');
        });

        it('should return correct channels after opt-out operations', () => {
            channelService.optIn('channel1');
            channelService.optIn('channel2');
            channelService.optOut('channel1');
            
            const optedInChannels = channelService.getOptedInChannels();
            expect(optedInChannels).toHaveLength(1);
            expect(optedInChannels).toContain('channel2');
            expect(optedInChannels).not.toContain('channel1');
        });
    });
});
