const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search tickets by keyword, user, or date (Support Agents only)')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Search term (username, keyword, or ticket ID)')
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
            return respond('❌ You do not have permission to search tickets.');
        }
        
        const query = interaction.options.getString('query').toLowerCase();
        const allTickets = Array.from(tickets.values());
        
        // Search by ticket ID, username, or message content
        const results = allTickets.filter(ticket => {
            // Search by ID
            if (ticket.id.toString().includes(query)) return true;
            
            // Search by username
            if (ticket.username && ticket.username.toLowerCase().includes(query)) return true;
            
            // Search in messages
            if (ticket.messages) {
                const foundInMessages = ticket.messages.some(msg => 
                    msg.content && msg.content.toLowerCase().includes(query)
                );
                if (foundInMessages) return true;
            }
            
            // Search in notes
            if (ticket.notes) {
                const foundInNotes = ticket.notes.some(note => 
                    note.text && note.text.toLowerCase().includes(query)
                );
                if (foundInNotes) return true;
            }
            
            return false;
        });
        
        if (results.length === 0) {
            return respond(`❌ No tickets found matching "${query}".`);
        }
        
        // Sort by creation date (newest first)
        results.sort((a, b) => b.createdAt - a.createdAt);
        
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`🔍 Search Results: "${query}"`)
            .setDescription(`Found ${results.length} ticket(s)`)
            .setTimestamp();
        
        // Add results (limit to 10)
        const resultsToShow = results.slice(0, 10);
        resultsToShow.forEach(ticket => {
            const statusEmoji = ticket.status === 'open' ? '🟢' : '🔴';
            const priorityEmoji = ticket.priority === 'urgent' ? '🔴' : ticket.priority === 'high' ? '🟠' : ticket.priority === 'low' ? '🟢' : '🟡';
            const claimedInfo = ticket.claimedBy ? `\nClaimed by: <@${ticket.claimedBy}>` : '\nUnclaimed';
            
            embed.addFields({
                name: `${statusEmoji} ${priorityEmoji} Ticket #${ticket.id}`,
                value: `User: ${ticket.username || `<@${ticket.userId}>`}${claimedInfo}\nStatus: ${ticket.status}`,
                inline: true
            });
        });
        
        if (results.length > 10) {
            embed.setFooter({ text: `Showing 10 of ${results.length} results` });
        }
        
        await respond(null, embed);
    }
};

