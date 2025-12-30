const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('assign')
        .setDescription('Assign a ticket to a specific support agent (Support Agents only)')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('The ticket ID to assign')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('agent')
                .setDescription('The agent to assign the ticket to')
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
            return respond('❌ You do not have permission to assign tickets.');
        }
        
        const ticketId = interaction.options.getInteger('ticket_id');
        const assignedAgent = interaction.options.getUser('agent');
        const ticket = tickets.get(ticketId);
        
        if (!ticket) {
            return respond(`❌ Ticket #${ticketId} not found.`);
        }
        
        if (ticket.status === 'closed') {
            return respond(`❌ Cannot assign closed ticket #${ticketId}.`);
        }
        
        const oldAssignee = ticket.claimedBy;
        ticket.claimedBy = assignedAgent.id;
        tickets.set(ticketId, ticket);
        
        // Notify assigned agent
        try {
            const agentDM = await assignedAgent.createDM();
            await agentDM.send({
                embeds: [new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('🎫 Ticket Assigned to You')
                    .setDescription(`Ticket #${ticketId} has been assigned to you`)
                    .addFields(
                        { name: 'User', value: `${ticket.username || `<@${ticket.userId}>`}`, inline: true },
                        { name: 'Assigned by', value: `${interaction.user.tag}`, inline: true }
                    )
                    .setFooter({ text: `Use /view ${ticketId} to see details` })
                    .setTimestamp()]
            });
        } catch (error) {
            console.error('Could not DM assigned agent:', error);
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Ticket Assigned')
            .setDescription(`Ticket #${ticketId} has been assigned to ${assignedAgent.tag}`)
            .addFields(
                { name: 'Previous Assignee', value: oldAssignee ? `<@${oldAssignee}>` : 'Unassigned', inline: true },
                { name: 'New Assignee', value: `<@${assignedAgent.id}>`, inline: true }
            )
            .setTimestamp();
        
        await respond(null, embed);
    }
};

