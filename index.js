require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, REST, Routes, ChannelType, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
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

// Store active tickets: Map<userId, {agentId, ticketId, createdAt}>
const activeTickets = new Map();
// Store ticket history: Map<userId, [{from, content, timestamp}]>
const ticketHistory = new Map();
// Store ticket IDs: Map<ticketId, {userId, agentId, createdAt}>
const tickets = new Map();

// Ticket ID counter (starts from 1)
let ticketIdCounter = 1;

// Generate ticket ID (simple numeric)
function generateTicketId() {
    const ticketId = ticketIdCounter.toString();
    ticketIdCounter++;
    return ticketId;
}

// Function to notify agents in server channel
async function notifyAgents(client, user, ticketId) {
    // Try to find support channel - check client property first, then try to find channel named "support" or "support-requests"
    let channel = null;
    
    if (client.supportChannelId) {
        try {
            channel = await client.channels.fetch(client.supportChannelId);
        } catch (error) {
            console.error('[NOTIFY] Error fetching support channel:', error);
        }
    }
    
    // If no channel set, try to find one named "support" or "support-requests"
    if (!channel) {
        for (const guild of client.guilds.cache.values()) {
            const supportChannel = guild.channels.cache.find(
                ch => ch.type === ChannelType.GuildText && 
                (ch.name.toLowerCase().includes('support') || ch.name.toLowerCase().includes('ticket'))
            );
            if (supportChannel) {
                channel = supportChannel;
                client.supportChannelId = channel.id; // Cache it
                break;
            }
        }
    }
    
    if (!channel) {
        console.log('[NOTIFY] No support channel found. Use /setchannel to set one.');
        return;
    }
    
    try {
        const notificationEmbed = new EmbedBuilder()
            .setColor(0xFF6B6B)
            .setTitle('🔔 New Support Request')
            .setDescription(`A user is requesting to speak with a support agent!`)
            .addFields(
                { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
                { name: '📋 Ticket ID', value: `\`${ticketId}\``, inline: true },
                { name: '⏰ Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                { name: '📝 Action', value: `Click the button below or use \`/claim ${user.id}\` to claim this ticket`, inline: false }
            )
            .setThumbnail(user.displayAvatarURL())
            .setFooter({ text: 'Support Bot' })
            .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`claim_${user.id}`)
                    .setLabel('Claim Ticket')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👤')
            );
        
        await channel.send({ 
            content: '@here New support request!', 
            embeds: [notificationEmbed], 
            components: [row] 
        });
        
        console.log(`[NOTIFY] Sent notification to ${channel.name} in ${channel.guild.name}`);
    } catch (error) {
        console.error('[NOTIFY] Error sending notification:', error);
    }
}

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
        
        // Log reply command details for debugging
        const replyCmd = commands.find(cmd => cmd.name === 'reply');
        if (replyCmd) {
            const ticketIdOption = replyCmd.options?.find(opt => opt.name === 'ticket_id');
            console.log(`[DEBUG] Reply command ticket_id option type: ${ticketIdOption?.type} (3=INTEGER, 4=STRING)`);
        }
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
    const ticket = activeTickets.get(userId);
    
    // If user has an active ticket with an agent
    if (ticket && ticket.agentId) {
        // Forward message to agent
        try {
            const agent = await client.users.fetch(ticket.agentId);
            const ticketId = ticket.ticketId || generateTicketId();
            
            // Ensure ticketId exists
            if (!ticket.ticketId) {
                activeTickets.set(userId, {
                    ...ticket,
                    ticketId: ticketId
                });
            }
            
            const agentEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setAuthor({ 
                    name: `${message.author.tag} (${message.author.id})`, 
                    iconURL: message.author.displayAvatarURL() 
                })
                .setDescription(message.content || '(No text content)')
                .addFields(
                    { name: '📋 Ticket ID', value: `\`${ticketId}\``, inline: true }
                )
                .setFooter({ text: 'Reply using: /reply <ticket_id> <message>' })
                .setTimestamp();
            
            // Add attachments if any
            if (message.attachments.size > 0) {
                const attachmentUrls = message.attachments.map(att => att.url).join('\n');
                agentEmbed.addFields({ name: 'Attachments', value: attachmentUrls });
            }
            
            const agentMessage = await agent.send({ embeds: [agentEmbed] });
            
            // Send read receipt to user (green checkmark)
            try {
                const readReceipt = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setDescription('✅ Message delivered and read by support agent')
                    .setTimestamp();
                
                await message.reply({ embeds: [readReceipt] });
            } catch (receiptError) {
                // If we can't send receipt, that's okay
                console.log('[DM] Could not send read receipt:', receiptError.message);
            }
            
            // Store in history
            if (!ticketHistory.has(userId)) {
                ticketHistory.set(userId, []);
            }
            ticketHistory.get(userId).push({
                from: 'user',
                content: message.content,
                timestamp: new Date()
            });
            
            console.log(`[DM] Forwarded message from ${message.author.tag} to agent ${agent.tag} (${ticketId})`);
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
            .setDescription('Click the button below to open a support ticket. A support agent will be with you shortly.')
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
    // Handle button interactions (from DMs and server)
    if (interaction.isButton()) {
        // Handle claim button from server notifications
        if (interaction.customId.startsWith('claim_')) {
            try {
                // Defer reply immediately to prevent timeout
                await interaction.deferReply({ ephemeral: true });
                
                const userId = interaction.customId.replace('claim_', '');
                
                // Check if user has support agent role
                if (!interaction.member) {
                    return await interaction.editReply({ content: '❌ This button must be used in a server.' });
                }
                
                const member = interaction.member;
                const hasSupportRole = member.roles.cache.some(role => 
                    role.name.toLowerCase().includes('support') || 
                    role.name.toLowerCase().includes('agent') ||
                    role.name.toLowerCase().includes('staff') ||
                    member.permissions.has(PermissionFlagsBits.Administrator)
                );
                
                if (!hasSupportRole) {
                    return await interaction.editReply({ content: '❌ You do not have permission to claim conversations. You need a support agent role.' });
                }
                
                // Claim the ticket (same logic as /claim command)
                const user = await interaction.client.users.fetch(userId);
                const ticket = activeTickets.get(userId);
                
                if (!ticket) {
                    return await interaction.editReply({ content: `❌ This ticket no longer exists.` });
                }
                
                if (ticket.agentId && ticket.agentId !== interaction.user.id) {
                    const agent = await interaction.client.users.fetch(ticket.agentId);
                    return await interaction.editReply({ content: `❌ This ticket is already claimed by ${agent.tag}.` });
                }
                
                // Update ticket with agent ID
                const ticketId = ticket.ticketId || generateTicketId();
                activeTickets.set(userId, {
                    agentId: interaction.user.id,
                    ticketId: ticketId,
                    createdAt: ticket.createdAt || new Date()
                });
                
                if (tickets.has(ticketId)) {
                    tickets.get(ticketId).agentId = interaction.user.id;
                }
                
                // Notify the user
                const userEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Support Agent Connected')
                    .setDescription(`A support agent (${interaction.user.tag}) is now here to help you! You can start chatting.`)
                    .addFields(
                        { name: '📋 Ticket ID', value: `\`${ticketId}\``, inline: false }
                    )
                    .setFooter({ text: 'Support Team' })
                    .setTimestamp();
                
                await user.send({ embeds: [userEmbed] });
                
                await interaction.editReply({ 
                    content: `✅ You have claimed the ticket with ${user.tag}!\n\n📋 **Ticket ID:** \`${ticketId}\`\n\nUse \`/reply ${ticketId} <message>\` to respond.`
                });
                
            } catch (error) {
                console.error('[BUTTON] Error claiming via button:', error);
                try {
                    if (interaction.deferred) {
                        await interaction.editReply({ content: `❌ Error: ${error.message}` });
                    } else {
                        await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
                    }
                } catch (replyError) {
                    console.error('[BUTTON] Error replying to interaction:', replyError);
                }
            }
            return;
        }
        
        if (interaction.customId === 'dm_speak_agent') {
            const userId = interaction.user.id;
            
            // Check if already has a ticket
            const existingTicket = activeTickets.get(userId);
            if (existingTicket && existingTicket.agentId) {
                const ticketId = existingTicket.ticketId || 'N/A';
                await interaction.reply({
                    content: `✅ You are already connected to a support agent! Your ticket ID is: \`${ticketId}\`\n\nJust send your message here.`,
                    ephemeral: true
                });
                return;
            }
            
            // Generate ticket ID
            const ticketId = generateTicketId();
            
            // Store as waiting (no agent assigned yet)
            activeTickets.set(userId, {
                agentId: null,
                ticketId: ticketId,
                createdAt: new Date()
            });
            
            tickets.set(ticketId, {
                userId: userId,
                agentId: null,
                createdAt: new Date()
            });
            
            await interaction.reply({
                content: `👤 A support agent will be with you shortly.\n\n📋 **Your Ticket ID:** \`${ticketId}\`\n\n**Note:** Agents will be notified and can respond to you here in DMs.`,
                ephemeral: true
            });
            
            console.log(`[DM] User ${interaction.user.tag} opened ticket (${ticketId})`);
            
            // Notify agents in the support channel
            await notifyAgents(interaction.client, interaction.user, ticketId);
            
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
        // New commands (reply, claim) expect: { activeTickets, ticketHistory, tickets }
        // Old commands expect: tickets Map, but we'll pass object and they can access .tickets if needed
        const oldTicketsMap = new Map(); // Empty Map for old commands that still reference it
        const context = { activeTickets, ticketHistory, tickets, oldTickets: oldTicketsMap };
        
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
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            name: error.name
        });
        
        // Show detailed error message to help debug
        const errorMessage = { 
            content: `❌ There was an error while executing this command!\n\n**Error:** ${error.message}\n\nCheck server logs for more details.`, 
            ephemeral: true 
        };
        
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        } catch (replyError) {
            console.error('Failed to send error message:', replyError);
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
