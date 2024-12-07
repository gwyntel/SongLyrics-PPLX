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
