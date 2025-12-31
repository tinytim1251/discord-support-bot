require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent // Required to read DM content - enable in Discord Developer Portal
        // Note: MessageContent requires privileged intent - enable in Discord Developer Portal
    ]
});

// Initialize commands collection
client.commands = new Collection();

// Initialize tickets Map (in-memory storage)
const tickets = new Map();

// Database setup
const dbPath = path.join(__dirname, 'data', 'tickets.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        // Initialize tickets table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT NOT NULL,
            username TEXT,
            status TEXT DEFAULT 'open',
            priority TEXT DEFAULT 'medium',
            claimedBy TEXT,
            claimedAt TEXT,
            firstClaimedAt TEXT,
            closedBy TEXT,
            closedAt TEXT,
            closeReason TEXT,
            threadId TEXT,
            category TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error creating tickets table:', err.message);
            } else {
                console.log('Tickets table ready.');
                // Load tickets from database
                loadTicketsFromDB();
            }
        });
    }
});

// Load tickets from database into memory
function loadTicketsFromDB() {
    db.all('SELECT * FROM tickets', [], (err, rows) => {
        if (err) {
            console.error('Error loading tickets:', err.message);
            return;
        }
        tickets.clear();
        rows.forEach(row => {
            const ticket = {
                id: row.id,
                userId: row.userId,
                username: row.username,
                status: row.status,
                priority: row.priority,
                claimedBy: row.claimedBy,
                claimedAt: row.claimedAt ? new Date(row.claimedAt) : null,
                firstClaimedAt: row.firstClaimedAt ? new Date(row.firstClaimedAt) : null,
                closedBy: row.closedBy,
                closedAt: row.closedAt ? new Date(row.closedAt) : null,
                closeReason: row.closeReason,
                threadId: row.threadId,
                category: row.category,
                createdAt: new Date(row.createdAt),
                updatedAt: new Date(row.updatedAt),
                messages: [] // Messages are stored separately if needed
            };
            tickets.set(row.id, ticket);
        });
        console.log(`Loaded ${tickets.size} tickets from database.`);
    });
}

// Save ticket to database
function saveTicketToDB(ticket) {
    const stmt = db.prepare(`INSERT OR REPLACE INTO tickets (
        id, userId, username, status, priority, claimedBy, claimedAt, firstClaimedAt,
        closedBy, closedAt, closeReason, threadId, category, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run(
        ticket.id,
        ticket.userId,
        ticket.username,
        ticket.status,
        ticket.priority || 'medium',
        ticket.claimedBy || null,
        ticket.claimedAt ? ticket.claimedAt.toISOString() : null,
        ticket.firstClaimedAt ? ticket.firstClaimedAt.toISOString() : null,
        ticket.closedBy || null,
        ticket.closedAt ? ticket.closedAt.toISOString() : null,
        ticket.closeReason || null,
        ticket.threadId || null,
        ticket.category || null,
        ticket.createdAt ? ticket.createdAt.toISOString() : new Date().toISOString(),
        new Date().toISOString()
    );
    stmt.finalize();
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
    // Ignore messages from bots
    if (message.author.bot) return;
    
    // Only handle DMs (not server messages)
    if (message.guild) return;
    
    try {
        // Simple DM response - you can customize this
        await message.reply('Hello! I\'m a support bot. Please use slash commands (/) in a server to interact with me, or contact support staff for assistance.');
    } catch (error) {
        console.error('Error responding to DM:', error);
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
        
        // Auto-save ticket changes to database
        // This is a simple approach - in production, you might want more sophisticated change tracking
        const ticketId = interaction.options?.getInteger('ticket_id') || 
                        interaction.options?.getInteger('id');
        if (ticketId && tickets.has(ticketId)) {
            saveTicketToDB(tickets.get(ticketId));
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
    // Save all tickets to database before closing
    tickets.forEach(ticket => {
        saveTicketToDB(ticket);
    });
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});

// Login to Discord
if (!process.env.DISCORD_TOKEN) {
    console.error('DISCORD_TOKEN is not set in .env file!');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);

