const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transcript')
        .setDescription('Export ticket conversation to a file (Support Agents only)')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('The ticket ID to export')
                .setRequired(true)),
    
    async execute(interaction, tickets) {
        const respond = async (content, embed = null) => {
            try {
                if (interaction.deferred || interaction.replied) {
                    return await interaction.editReply({ content: content || null, embeds: embed ? [embed] : [] });
                } else {
                    return await interaction.reply({ content, embeds: embed ? [embed] : [], ephemeral: true });
                }
            } catch (error) {
                console.error('Error in respond helper:', error.message);
                if (interaction.deferred) {
                    return await interaction.editReply({ content: content || '✅ Done', embeds: embed ? [embed] : [] });
                }
                throw error;
            }
        };
        
        if (!interaction.member) {
            return respond('❌ This command must be used in a server, not in DMs.');
        }
        
        const member = interaction.member;
        const hasSupportRole = member.roles.cache.some(role => 
            role.name.toLowerCase().includes('support') || 
            role.name.toLowerCase().includes('agent') ||
            role.name.toLowerCase().includes('staff') ||
            member.permissions.has(PermissionFlagsBits.Administrator)
        );
        
        if (!hasSupportRole) {
            return respond('❌ You do not have permission to export transcripts.');
        }
        
        const ticketId = interaction.options.getInteger('ticket_id');
        const ticket = tickets.get(ticketId);
        
        if (!ticket) {
            return respond(`❌ Ticket #${ticketId} not found.`);
        }
        
        // Generate transcript
        let transcript = `=== TICKET #${ticketId} TRANSCRIPT ===\n\n`;
        transcript += `User: ${ticket.username || `ID: ${ticket.userId}`}\n`;
        transcript += `Status: ${ticket.status}\n`;
        transcript += `Created: ${new Date(ticket.createdAt).toLocaleString()}\n`;
        if (ticket.claimedBy) transcript += `Claimed by: ${ticket.claimedBy}\n`;
        if (ticket.closedAt) transcript += `Closed: ${new Date(ticket.closedAt).toLocaleString()}\n`;
        if (ticket.priority) transcript += `Priority: ${ticket.priority}\n`;
        transcript += `\n=== MESSAGES ===\n\n`;
        
        if (ticket.messages && ticket.messages.length > 0) {
            ticket.messages.forEach((msg, index) => {
                const timestamp = new Date(msg.timestamp).toLocaleString();
                const author = msg.author === 'user' ? ticket.username : msg.agentTag || 'Support Agent';
                transcript += `[${timestamp}] ${author}:\n${msg.content || '(no content)'}\n\n`;
            });
        } else {
            transcript += 'No messages found.\n\n';
        }
        
        if (ticket.notes && ticket.notes.length > 0) {
            transcript += `=== INTERNAL NOTES ===\n\n`;
            ticket.notes.forEach(note => {
                const timestamp = new Date(note.timestamp).toLocaleString();
                transcript += `[${timestamp}] ${note.author}:\n${note.text}\n\n`;
            });
        }
        
        // Save to file
        const transcriptsDir = path.join(__dirname, '..', 'transcripts');
        if (!fs.existsSync(transcriptsDir)) {
            fs.mkdirSync(transcriptsDir, { recursive: true });
        }
        
        const filename = `ticket-${ticketId}-${Date.now()}.txt`;
        const filepath = path.join(transcriptsDir, filename);
        fs.writeFileSync(filepath, transcript);
        
        // Send file
        try {
            await interaction.followUp({
                content: `📄 Transcript exported for ticket #${ticketId}`,
                files: [{
                    attachment: filepath,
                    name: filename
                }],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error sending transcript:', error);
            return respond(`❌ Failed to send transcript: ${error.message}`);
        }
    }
};

