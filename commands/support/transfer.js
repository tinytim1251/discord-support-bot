const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Transfer a ticket to another agent (Support Agents only)')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('The ticket ID to transfer')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('agent')
                .setDescription('The agent to transfer the ticket to')
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
            return respond('❌ You do not have permission to transfer tickets.');
        }
        
        const ticketId = interaction.options.getInteger('ticket_id');
        const newAgent = interaction.options.getUser('agent');
        const ticket = tickets.get(ticketId);
        
        if (!ticket) {
            return respond(`❌ Ticket #${ticketId} not found.`);
        }
        
        if (ticket.status === 'closed') {
            return respond(`❌ Cannot transfer closed ticket #${ticketId}.`);
        }
        
        if (!ticket.claimedBy) {
            return respond(`❌ Ticket #${ticketId} is not claimed. Use /claim first.`);
        }
        
        if (ticket.claimedBy !== interaction.user.id && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            return respond(`❌ You can only transfer tickets you claimed. This ticket is claimed by <@${ticket.claimedBy}>.`);
        }
        
        const oldAgent = ticket.claimedBy;
        ticket.claimedBy = newAgent.id;
        tickets.set(ticketId, ticket);
        
        // Notify new agent
        try {
            const agentDM = await newAgent.createDM();
            await agentDM.send({
                embeds: [new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('🔄 Ticket Transferred to You')
                    .setDescription(`Ticket #${ticketId} has been transferred to you`)
                    .addFields(
                        { name: 'User', value: `${ticket.username || `<@${ticket.userId}>`}`, inline: true },
                        { name: 'Transferred by', value: `${interaction.user.tag}`, inline: true },
                        { name: 'Previous Agent', value: `<@${oldAgent}>`, inline: false }
                    )
                    .setFooter({ text: `Use /view ${ticketId} to see details` })
                    .setTimestamp()]
            });
        } catch (error) {
            console.error('Could not DM new agent:', error);
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🔄 Ticket Transferred')
            .setDescription(`Ticket #${ticketId} has been transferred`)
            .addFields(
                { name: 'From', value: `<@${oldAgent}>`, inline: true },
                { name: 'To', value: `<@${newAgent.id}>`, inline: true }
            )
            .setTimestamp();
        
        await respond(null, embed);
    }
};

