require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, REST, Routes, ChannelType, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent // Required to read DM content - enable in Discord Developer Portal
    ],
    partials: [
        Partials.Channel,  // Required for DMs
        Partials.Message   // Required to receive DM messages
    ]
});

// Initialize commands collection
client.commands = new Collection();

// Initialize tickets Map (in-memory storage)
const tickets = new Map();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`Loaded command: ${command.data.name}`);
        } else {
            console.warn(`Command at ${filePath} is missing required "data" or "execute" property.`);
        }
    }
}

// Register slash commands
async function registerCommands() {
    const commands = [];
    
    for (const [name, command] of client.commands) {
        commands.push(command.data.toJSON());
    }
    
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        
        // Get application ID from the client (bot's user ID is the application ID)
        const clientId = process.env.CLIENT_ID || client.user.id;
        
        // Register commands globally
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );
        
        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Event: Bot ready
client.once(Events.ClientReady, async () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    console.log(`[DEBUG] Bot ID: ${client.user.id}`);
    console.log(`[DEBUG] Intents: ${client.options.intents.bitfield}`);
    console.log(`[DEBUG] Partials: ${client.options.partials}`);
    console.log(`[DEBUG] Message event handler is registered`);
    await registerCommands();
});

// Event: Message create (for DMs AND debugging)
client.on(Events.MessageCreate, async message => {
    // DEBUG: Log EVERY message received (before any filtering)
    console.log(`[DEBUG] MessageCreate fired! Author: ${message.author?.tag || 'unknown'}, Bot: ${message.author?.bot}, Channel Type: ${message.channel?.type}, Guild: ${message.guild?.name || 'none'}`);
    
    // Ignore messages from bots (including self)
    if (message.author.bot) {
        console.log(`[DEBUG] Ignoring bot message`);
        return;
    }
    
    // Only handle DMs (not server messages)
    // Check both ways: no guild AND channel type is DM
    if (message.guild || message.channel.type !== ChannelType.DM) {
        console.log(`[DEBUG] Not a DM, ignoring. Guild: ${!!message.guild}, ChannelType: ${message.channel.type}`);
        return; // Not a DM, ignore
    }
    
    console.log(`[DM] Received DM from ${message.author.tag} (${message.author.id}): ${message.content || '(no content)'}`);
    
    try {
        // Simple DM response - you can customize this
        await message.reply('Hello! I\'m a support bot. Please use slash commands (/) in a server to interact with me, or contact support staff for assistance.');
        console.log(`[DM] Successfully replied to ${message.author.tag}`);
    } catch (error) {
        console.error('[DM] Error responding to DM:', error.message);
        // Try sending a regular message instead of reply
        try {
            await message.channel.send('Hello! I\'m a support bot. Please use slash commands (/) in a server to interact with me.');
            console.log(`[DM] Sent message via channel.send instead`);
        } catch (error2) {
            console.error('[DM] Both reply and send failed:', error2.message);
        }
    }
});

// Event: Interaction create
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }
    
    try {
        // Execute command with tickets Map
        await command.execute(interaction, tickets);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        
        const errorMessage = { content: 'There was an error while executing this command!', ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    process.exit(0);
});

// Login to Discord
if (!process.env.DISCORD_TOKEN) {
    console.error('DISCORD_TOKEN is not set in .env file!');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
