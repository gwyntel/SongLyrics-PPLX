import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import * as dotenv from 'dotenv';
import { LyricsService } from './services/lyrics.service';
import { ChannelService } from './services/channel.service';

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

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ]
});

const lyricsService = new LyricsService(
    process.env.OPENROUTER_API_KEY!,
    process.env.YOUR_SITE_URL!,
    process.env.YOUR_APP_NAME || 'SongLyrics-PPLX',
    process.env.APIFY_API_KEY!
);

const channelService = new ChannelService();

// Register slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    new SlashCommandBuilder()
        .setName('optin')
        .setDescription('Opt-in the current channel for lyrics bot functionality.'),
    new SlashCommandBuilder()
        .setName('optout')
        .setDescription('Opt-out the current channel from lyrics bot functionality.'),
    new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Search for song lyrics.')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('The song to search for')
                .setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

// Register commands with proper error handling
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        if (!process.env.DISCORD_CLIENT_ID) {
            throw new Error('DISCORD_CLIENT_ID is not set');
        }

        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering slash commands:', error);
        process.exit(1);
    }
})();

client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (commandName === 'optin') {
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
            await interaction.reply(
                result 
                    ? 'Channel opted in for lyrics bot functionality!'
                    : 'Channel is already opted in.'
            );
        } else {
            await interaction.reply('You need the "Manage Channels" permission to opt in this channel.');
        }
    } else if (commandName === 'optout') {
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
            await interaction.reply(
                result 
                    ? 'Channel opted out from lyrics bot functionality.'
                    : 'Channel was not opted in.'
            );
        } else {
            await interaction.reply('You need the "Manage Channels" permission to opt out this channel.');
        }
    } else if (commandName === 'lyrics') {
        const chatInteraction = interaction as ChatInputCommandInteraction;
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
        } catch (error) {
            console.error('Error fetching lyrics:', error);
            await interaction.editReply('⚠️ An error occurred while fetching lyrics. Please try again.');
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN!);
