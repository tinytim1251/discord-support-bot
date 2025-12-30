const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unclaim')
        .setDescription('Unclaim a support ticket (Support Agents only)')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('The ticket ID to unclaim')
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
            return respond('❌ You do not have permission to unclaim tickets. You need a support agent role.');
        }
        
        const ticketId = interaction.options.getInteger('ticket_id');
        const ticket = tickets.get(ticketId);
        
        if (!ticket) {
            return respond(`❌ Ticket #${ticketId} not found.`);
        }
        
        if (!ticket.claimedBy) {
            return respond(`❌ Ticket #${ticketId} is not claimed.`);
        }
        
        if (ticket.claimedBy !== interaction.user.id && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            return respond(`❌ You can only unclaim tickets that you claimed. This ticket is claimed by <@${ticket.claimedBy}>.`);
        }
        
        const previousClaimer = ticket.claimedBy;
        
        // Unclaim the ticket
        ticket.claimedBy = null;
        tickets.set(ticketId, ticket);
        
        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🔄 Ticket Unclaimed Successfully')
            .setDescription(`Ticket #${ticketId} has been unclaimed`)
            .addFields(
                { name: 'User', value: `${ticket.username || `<@${ticket.userId}>`}`, inline: true }
            )
            .setTimestamp();
        
        await respond(null, embed);
    }
};

