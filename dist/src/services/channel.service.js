"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelService = void 0;
class ChannelService {
    optedInChannels;
    constructor() {
        this.optedInChannels = new Set();
    }
    optIn(channelId) {
        if (this.optedInChannels.has(channelId)) {
            return false;
        }
        this.optedInChannels.add(channelId);
        return true;
    }
    optOut(channelId) {
        if (!this.optedInChannels.has(channelId)) {
            return false;
        }
        this.optedInChannels.delete(channelId);
        return true;
    }
    isOptedIn(channelId) {
        return this.optedInChannels.has(channelId);
    }
    getOptedInChannels() {
        return Array.from(this.optedInChannels);
    }
}
exports.ChannelService = ChannelService;
