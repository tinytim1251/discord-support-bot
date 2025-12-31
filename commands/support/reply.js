const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reply')
        .setDescription('Reply to a user in DM (Support Agents only)')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('The ticket ID to reply to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Your reply message')
                .setRequired(true)),
    
    async execute(interaction, context) {
        // Extract context properties with fallbacks
        const activeTickets = context?.activeTickets || new Map();
        const ticketHistory = context?.ticketHistory || new Map();
        const tickets = context?.tickets || new Map();
        
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
        
        try {
            console.log('[REPLY] Command started', {
                ticketIdInput: interaction.options?.getString('ticket_id'),
                ticketsMapSize: tickets.size,
                ticketsKeys: Array.from(tickets.keys()),
                contextKeys: Object.keys(context || {})
            });
            
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
                return respond('❌ You do not have permission to reply to users. You need a support agent role.');
            }
            
            const ticketIdInput = interaction.options.getInteger('ticket_id');
            const message = interaction.options.getString('message');
            
            // Normalize ticket ID (convert to string for map lookup)
            const ticketId = ticketIdInput.toString();
            
            // Look up ticket by ticket ID (try both string and number)
            let ticketData = tickets.get(ticketId);
            if (!ticketData) {
                // Try as number if it's a numeric string
                const numericId = parseInt(ticketId);
                if (!isNaN(numericId)) {
                    ticketData = tickets.get(numericId.toString());
                }
            }
            
            if (!ticketData) {
                return respond(`❌ Ticket \`${ticketId}\` not found. Make sure you're using the correct ticket ID.\n\nAvailable tickets: ${Array.from(tickets.keys()).join(', ') || 'none'}`);
            }
            
            const userId = ticketData.userId;
            const user = await interaction.client.users.fetch(userId);
            
            // Get or update active ticket
            const activeTicket = activeTickets.get(userId);
            
            if (activeTicket && activeTicket.agentId && activeTicket.agentId !== interaction.user.id) {
                return respond(`❌ This ticket is already being handled by another agent.`);
            }
            
            // Update active ticket if needed
            if (!activeTicket || activeTicket.ticketId !== ticketId) {
                activeTickets.set(userId, {
                    agentId: interaction.user.id,
                    ticketId: ticketId,
                    createdAt: ticketData.createdAt || new Date()
                });
            } else if (!activeTicket.agentId) {
                // Claim the ticket if not already claimed
                activeTickets.set(userId, {
                    agentId: interaction.user.id,
                    ticketId: ticketId,
                    createdAt: activeTicket.createdAt || ticketData.createdAt || new Date()
                });
            }
            
            // Update tickets map with agent ID
            if (tickets.has(ticketId)) {
                tickets.get(ticketId).agentId = interaction.user.id;
            }
            
            // Send message to user
            const userEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setAuthor({ 
                    name: `${interaction.user.tag} (Support Agent)`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setDescription(message)
                .addFields(
                    { name: '📋 Ticket ID', value: `\`${ticketId}\``, inline: false }
                )
                .setFooter({ text: 'Support Team' })
                .setTimestamp();
            
            await user.send({ embeds: [userEmbed] });
            
            // Store in history
            if (!ticketHistory.has(userId)) {
                ticketHistory.set(userId, []);
            }
            ticketHistory.get(userId).push({
                from: 'agent',
                agentId: interaction.user.id,
                agentName: interaction.user.tag,
                content: message,
                timestamp: new Date()
            });
            
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Message Sent')
                .setDescription(`Your reply has been sent to ${user.tag}`)
                .addFields(
                    { name: 'User', value: `${user.tag} (${userId})`, inline: true },
                    { name: '📋 Ticket ID', value: `\`${ticketId}\``, inline: true },
                    { name: 'Message', value: message, inline: false }
                )
                .setTimestamp();
            
            await respond(null, successEmbed);
            
        } catch (error) {
            console.error('[REPLY] Error:', error);
            console.error('[REPLY] Stack:', error.stack);
            console.error('[REPLY] Ticket ID:', interaction.options?.getString('ticket_id'));
            console.error('[REPLY] Tickets map size:', tickets.size);
            console.error('[REPLY] Tickets map keys:', Array.from(tickets.keys()));
            
            if (error.code === 50007) {
                return respond('❌ Cannot send DM to this user. They may have DMs disabled.');
            }
            if (error.code === 10013) {
                return respond(`❌ User not found. The ticket may be invalid.`);
            }
            return respond(`❌ Error: ${error.message}\n\nDebug: Available tickets: ${Array.from(tickets.keys()).join(', ') || 'none'}`);
        }
    }
};
