const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('view')
        .setDescription('View details and messages of a support ticket (Support Agents only)')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('The ticket ID to view')
                .setRequired(true)),
    
    async execute(interaction, tickets) {
        // Helper to respond (handles deferred)
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
        
        // Commands must be used in a server, not DMs
        if (!interaction.member) {
            return respond('❌ This command must be used in a server, not in DMs.');
        }
        
        // Check if user has support agent role
        const member = interaction.member;
        const hasSupportRole = member.roles.cache.some(role => 
            role.name.toLowerCase().includes('support') || 
            role.name.toLowerCase().includes('agent') ||
            role.name.toLowerCase().includes('staff') ||
            member.permissions.has(PermissionFlagsBits.Administrator)
        );
        
        if (!hasSupportRole) {
            return respond('❌ You do not have permission to view tickets. You need a support agent role.');
        }
        
        const ticketId = interaction.options.getInteger('ticket_id');
        const ticket = tickets.get(ticketId);
        
        if (!ticket) {
            return respond(`❌ Ticket #${ticketId} not found.`);
        }
        
        const statusEmoji = ticket.status === 'open' ? '🟢' : '🔴';
        const claimedInfo = ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Unclaimed';
        const userInfo = ticket.username || `<@${ticket.userId}>`;
        
        const embed = new EmbedBuilder()
            .setColor(ticket.status === 'open' ? 0x00FF00 : 0xFF0000)
            .setTitle(`${statusEmoji} Ticket #${ticketId}`)
            .addFields(
                { name: 'User', value: `${userInfo} (${ticket.userId})`, inline: true },
                { name: 'Status', value: ticket.status.toUpperCase(), inline: true },
                { name: 'Priority', value: ticket.priority ? `${ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}` : 'Medium', inline: true },
                { name: 'Claimed By', value: claimedInfo, inline: true },
                { name: 'Created', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`, inline: true },
                { name: 'Messages', value: `${ticket.messages ? ticket.messages.length : 0}`, inline: true }
            )
            .setTimestamp();
        
        if (ticket.status === 'closed') {
            embed.addFields(
                { name: 'Closed By', value: `<@${ticket.closedBy}>`, inline: true },
                { name: 'Closed At', value: `<t:${Math.floor(ticket.closedAt.getTime() / 1000)}:R>`, inline: true },
                { name: 'Reason', value: ticket.closeReason || 'No reason provided', inline: false }
            );
        }
        
        // Show recent messages (last 5)
        if (ticket.messages && ticket.messages.length > 0) {
            const recentMessages = ticket.messages.slice(-5);
            let messagesText = '';
            recentMessages.forEach(msg => {
                const author = msg.author === 'user' ? '👤 User' : `🤖 ${msg.agentTag || 'Agent'}`;
                const content = msg.content || '*No content*';
                const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
                messagesText += `${author}: ${preview}\n`;
            });
            
            if (ticket.messages.length > 5) {
                messagesText += `\n*...and ${ticket.messages.length - 5} more messages*`;
            }
            
            embed.addFields({ name: 'Recent Messages', value: messagesText || 'No messages', inline: false });
        }
        
        await respond(null, embed);
    }
};

