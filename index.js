require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, REST, Routes, ChannelType, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

// Store active conversations: Map<userId, agentId>
const activeConversations = new Map();
// Store conversation history: Map<userId, [{from, content, timestamp}]>
const conversationHistory = new Map();

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
    await registerCommands();
});

// Event: Message create (for DMs)
client.on(Events.MessageCreate, async message => {
    // Ignore messages from bots (including self)
    if (message.author.bot) return;
    
    // Only handle DMs (not server messages)
    if (message.guild || message.channel.type !== ChannelType.DM) {
        return; // Not a DM, ignore
    }
    
    const userId = message.author.id;
    const agentId = activeConversations.get(userId);
    
    // If user has an active conversation with an agent
    if (agentId) {
        // Forward message to agent
        try {
            const agent = await client.users.fetch(agentId);
            const agentEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setAuthor({ 
                    name: `${message.author.tag} (${message.author.id})`, 
                    iconURL: message.author.displayAvatarURL() 
                })
                .setDescription(message.content || '(No text content)')
                .setFooter({ text: 'Reply using: /reply <user_id> <message>' })
                .setTimestamp();
            
            // Add attachments if any
            if (message.attachments.size > 0) {
                const attachmentUrls = message.attachments.map(att => att.url).join('\n');
                agentEmbed.addFields({ name: 'Attachments', value: attachmentUrls });
            }
            
            await agent.send({ embeds: [agentEmbed] });
            
            // Store in history
            if (!conversationHistory.has(userId)) {
                conversationHistory.set(userId, []);
            }
            conversationHistory.get(userId).push({
                from: 'user',
                content: message.content,
                timestamp: new Date()
            });
            
            console.log(`[DM] Forwarded message from ${message.author.tag} to agent ${agent.tag}`);
        } catch (error) {
            console.error('[DM] Error forwarding to agent:', error);
            await message.reply('❌ Error forwarding your message to the support agent. Please try again.');
        }
        return;
    }
    
    // First message from user - show "Speak to Agent" option
    console.log(`[DM] Received DM from ${message.author.tag} (${message.author.id}): ${message.content || '(no content)'}`);
    
    try {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('👋 Hello! Welcome to Support')
            .setDescription('Click the button below to connect with a support agent. All conversations happen here in DMs.')
            .setFooter({ text: 'Support Bot' })
            .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dm_speak_agent')
                    .setLabel('Speak to Agent')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👤')
            );
        
        await message.reply({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error('[DM] Error responding to DM:', error.message);
    }
});

// Event: Interaction create
client.on(Events.InteractionCreate, async interaction => {
    // Handle button interactions (from DMs)
    if (interaction.isButton()) {
        if (interaction.customId === 'dm_speak_agent') {
            const userId = interaction.user.id;
            
            // Check if already in conversation
            if (activeConversations.has(userId)) {
                await interaction.reply({
                    content: '✅ You are already connected to a support agent! Just send your message here.',
                    ephemeral: true
                });
                return;
            }
            
            // For now, we'll need to assign an agent manually
            // You can modify this to auto-assign from available agents
            await interaction.reply({
                content: '👤 Your request has been sent! An agent will be with you shortly. Please wait for an agent to connect...\n\n**Note:** Agents will be notified and can respond to you here in DMs.',
                ephemeral: true
            });
            
            // Store as waiting (no agent assigned yet)
            // In a real system, you'd have a queue and assign agents
            activeConversations.set(userId, null); // null means waiting for agent
            
            console.log(`[DM] User ${interaction.user.tag} requested agent`);
            
            // TODO: Notify available agents in a server channel or via DM
            // For now, agents can use /claim <user_id> to claim the conversation
            
            return;
        }
    }
    
    // Handle slash commands
    if (!interaction.isChatInputCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }
    
    try {
        // Execute command - pass context object
        // New commands (reply, claim) expect: { activeConversations, conversationHistory, tickets }
        // Old commands expect: tickets Map, but we'll pass object and they can access .tickets if needed
        const tickets = new Map(); // Empty Map for old commands that still reference it
        const context = { activeConversations, conversationHistory, tickets };
        
        // Try new format first, fallback to old format
        try {
            await command.execute(interaction, context);
        } catch (formatError) {
            // If new format fails, try old format (tickets Map)
            if (formatError.message && formatError.message.includes('Cannot read')) {
                await command.execute(interaction, tickets);
            } else {
                throw formatError;
            }
        }
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
