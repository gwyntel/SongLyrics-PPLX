"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const channel_service_1 = require("../channel.service");
describe('ChannelService', () => {
    let channelService;
    beforeEach(() => {
        channelService = new channel_service_1.ChannelService();
    });
    describe('optIn', () => {
        it('should opt in a new channel successfully', () => {
            const result = channelService.optIn('123');
            expect(result).toBe(true);
            expect(channelService.isOptedIn('123')).toBe(true);
        });
        it('should return false when trying to opt in an already opted-in channel', () => {
            channelService.optIn('123');
            const result = channelService.optIn('123');
            expect(result).toBe(false);
        });
    });
    describe('optOut', () => {
        it('should opt out a channel successfully', () => {
            channelService.optIn('123');
            const result = channelService.optOut('123');
            expect(result).toBe(true);
            expect(channelService.isOptedIn('123')).toBe(false);
        });
        it('should return false when trying to opt out a non-opted-in channel', () => {
            const result = channelService.optOut('123');
            expect(result).toBe(false);
        });
    });
    describe('isOptedIn', () => {
        it('should return true for opted-in channels', () => {
            channelService.optIn('123');
            expect(channelService.isOptedIn('123')).toBe(true);
        });
        it('should return false for non-opted-in channels', () => {
            expect(channelService.isOptedIn('123')).toBe(false);
        });
    });
    describe('getOptedInChannels', () => {
        it('should return an empty array when no channels are opted in', () => {
            expect(channelService.getOptedInChannels()).toEqual([]);
        });
        it('should return all opted-in channels', () => {
            channelService.optIn('123');
            channelService.optIn('456');
            expect(channelService.getOptedInChannels()).toEqual(['123', '456']);
        });
    });
});
