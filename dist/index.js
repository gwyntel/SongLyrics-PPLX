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
// Validate required environment variables
const requiredEnvVars = [
    'DISCORD_BOT_TOKEN',
    'DISCORD_CLIENT_ID',
    'OPENROUTER_API_KEY',
    'YOUR_SITE_URL',
    'APIFY_API_KEY'
];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.DirectMessages,
    ]
});
const lyricsService = new lyrics_service_1.LyricsService(process.env.OPENROUTER_API_KEY, process.env.YOUR_SITE_URL, process.env.YOUR_APP_NAME || 'SongLyrics-PPLX', process.env.APIFY_API_KEY);
const channelService = new channel_service_1.ChannelService();
// Register slash commands
const commands = [
    new discord_js_1.SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    new discord_js_1.SlashCommandBuilder()
        .setName('optin')
        .setDescription('Opt-in the current channel for lyrics bot functionality.'),
    new discord_js_1.SlashCommandBuilder()
        .setName('optout')
        .setDescription('Opt-out the current channel from lyrics bot functionality.'),
    new discord_js_1.SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Search for song lyrics.')
        .addStringOption(option => option.setName('query')
        .setDescription('The song to search for')
        .setRequired(true)),
].map(command => command.toJSON());
const rest = new discord_js_1.REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
// Register commands with proper error handling
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        if (!process.env.DISCORD_CLIENT_ID) {
            throw new Error('DISCORD_CLIENT_ID is not set');
        }
        await rest.put(discord_js_1.Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    }
    catch (error) {
        console.error('Error registering slash commands:', error);
        process.exit(1);
    }
})();
client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
});
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand())
        return;
    const { commandName } = interaction;
    if (commandName === 'ping') {
        await interaction.reply('Pong!');
    }
    else if (commandName === 'optin') {
        if (!interaction.guildId) {
            await interaction.reply('The `/optin` command can only be used in server channels.');
            return;
        }
        const channelId = interaction.channel?.id;
        if (!channelId) {
            await interaction.reply('Unable to retrieve channel information.');
            return;
        }
        if (interaction.memberPermissions?.has('ManageChannels')) {
            const result = channelService.optIn(channelId);
            await interaction.reply(result
                ? 'Channel opted in for lyrics bot functionality!'
                : 'Channel is already opted in.');
        }
        else {
            await interaction.reply('You need the "Manage Channels" permission to opt in this channel.');
        }
    }
    else if (commandName === 'optout') {
        if (!interaction.guildId) {
            await interaction.reply('The `/optout` command can only be used in server channels.');
            return;
        }
        const channelId = interaction.channel?.id;
        if (!channelId) {
            await interaction.reply('Unable to retrieve channel information.');
            return;
        }
        if (interaction.memberPermissions?.has('ManageChannels')) {
            const result = channelService.optOut(channelId);
            await interaction.reply(result
                ? 'Channel opted out from lyrics bot functionality.'
                : 'Channel was not opted in.');
        }
        else {
            await interaction.reply('You need the "Manage Channels" permission to opt out this channel.');
        }
    }
    else if (commandName === 'lyrics') {
        const chatInteraction = interaction;
        const query = chatInteraction.options.getString('query', true);
        try {
            await interaction.reply('🎵 Searching for lyrics... Please hold. <3');
            const context = interaction.channel?.isTextBased()
                ? (await interaction.channel.messages.fetch({ limit: 10 }))
                    .map(msg => msg.content)
                    .join('\n')
                : '';
            const responseParts = await lyricsService.getLyrics(query, context);
            let currentIndex = 0;
            const updateInterval = 8000; // 8 seconds
            const updateMessage = async () => {
                if (currentIndex < responseParts.length) {
                    await interaction.editReply(responseParts[currentIndex]);
                    currentIndex++;
                    setTimeout(updateMessage, updateInterval);
                }
            };
            updateMessage();
        }
        catch (error) {
            console.error('Error fetching lyrics:', error);
            await interaction.editReply('⚠️ An error occurred while fetching lyrics. Please try again.');
        }
    }
});
client.login(process.env.DISCORD_BOT_TOKEN);
