const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Claim a ticket with a user (Support Agents only)')
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('The user ID to claim')
                .setRequired(true)),
    
    async execute(interaction, { activeTickets, ticketHistory, tickets }) {
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
        
        // Check if user has support agent role
        const member = interaction.member;
        const hasSupportRole = member.roles.cache.some(role => 
            role.name.toLowerCase().includes('support') || 
            role.name.toLowerCase().includes('agent') ||
            role.name.toLowerCase().includes('staff') ||
            member.permissions.has(PermissionFlagsBits.Administrator)
        );
        
        if (!hasSupportRole) {
            return respond('❌ You do not have permission to claim tickets. You need a support agent role.');
        }
        
        const userId = interaction.options.getString('user_id');
        
        try {
            const user = await interaction.client.users.fetch(userId);
            
            // Check if already claimed by someone else
            const ticket = activeTickets.get(userId);
            if (!ticket) {
                return respond(`❌ No active ticket found for this user.`);
            }
            
            if (ticket.agentId && ticket.agentId !== interaction.user.id) {
                const agent = await interaction.client.users.fetch(ticket.agentId);
                return respond(`❌ This ticket is already claimed by ${agent.tag}.`);
            }
            
            // Get or generate ticket ID (simple numeric)
            const ticketId = ticket.ticketId || Date.now().toString();
            
            // Claim the ticket
            activeTickets.set(userId, {
                agentId: interaction.user.id,
                ticketId: ticketId,
                createdAt: ticket.createdAt || new Date()
            });
            
            // Update tickets map
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
            
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Ticket Claimed')
                .setDescription(`You have claimed the ticket with ${user.tag}`)
                .addFields(
                    { name: 'User', value: `${user.tag} (${userId})`, inline: true },
                    { name: '📋 Ticket ID', value: `\`${ticketId}\``, inline: true },
                    { name: 'Status', value: 'Active', inline: true }
                )
                .setFooter({ text: 'Use /reply to send messages' })
                .setTimestamp();
            
            await respond(null, successEmbed);
            
        } catch (error) {
            console.error('Error claiming ticket:', error);
            if (error.code === 50007) {
                return respond('❌ Cannot send DM to this user. They may have DMs disabled.');
            }
            return respond(`❌ Error: ${error.message}`);
        }
    }
};
