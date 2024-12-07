"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv = __importStar(require("dotenv"));
const lyrics_service_1 = require("./services/lyrics.service");
const channel_service_1 = require("./services/channel.service");
dotenv.config();
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.IntentsBitField.Flags.Guilds,
        discord_js_1.IntentsBitField.Flags.GuildMessages,
        discord_js_1.IntentsBitField.Flags.MessageContent,
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent
    ]
});
const lyricsService = new lyrics_service_1.LyricsService(process.env.OPENROUTER_API_KEY || '', process.env.YOUR_SITE_URL || '', process.env.YOUR_APP_NAME || 'SongLyrics-PPLX-70b');
const channelService = new channel_service_1.ChannelService();
client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
});
client.on('messageCreate', async (message) => {
    if (message.author.bot)
        return;
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
            await message.reply(result
                ? 'Channel opted in for lyrics bot functionality!'
                : 'Channel is already opted in.');
        }
        else {
            await message.reply('You need the "Manage Channels" permission to opt in this channel.');
        }
        return;
    }
    // Handle opt-out command
    if (content === '/optout') {
        if (message.member?.permissions.has('ManageChannels')) {
            const result = channelService.optOut(message.channelId);
            await message.reply(result
                ? 'Channel opted out from lyrics bot functionality.'
                : 'Channel was not opted in.');
        }
        else {
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
        }
        catch (error) {
            console.error('Error fetching lyrics:', error);
            await message.reply('An error occurred while fetching lyrics.');
        }
    }
});
client.login(process.env.DISCORD_BOT_TOKEN);
