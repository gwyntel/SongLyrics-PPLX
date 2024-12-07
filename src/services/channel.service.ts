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
