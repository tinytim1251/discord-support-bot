const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reopen')
        .setDescription('Reopen a closed ticket (Support Agents only)')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('The ticket ID to reopen')
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
            return respond('❌ You do not have permission to reopen tickets.');
        }
        
        const ticketId = interaction.options.getInteger('ticket_id');
        const ticket = tickets.get(ticketId);
        
        if (!ticket) {
            return respond(`❌ Ticket #${ticketId} not found.`);
        }
        
        if (ticket.status !== 'closed') {
            return respond(`❌ Ticket #${ticketId} is already open.`);
        }
        
        ticket.status = 'open';
        ticket.reopenedBy = interaction.user.id;
        ticket.reopenedAt = new Date();
        tickets.set(ticketId, ticket);
        
        // Unarchive thread if it exists
        if (ticket.threadId) {
            try {
                const guild = interaction.guild;
                const thread = await guild.channels.fetch(ticket.threadId).catch(() => null);
                if (thread) {
                    await thread.setArchived(false);
                    await thread.send({
                        embeds: [new EmbedBuilder()
                            .setColor(0x00FF00)
                            .setTitle('🔄 Ticket Reopened')
                            .setDescription(`This ticket has been reopened by ${interaction.user.tag}`)
                            .setTimestamp()]
                    });
                }
            } catch (error) {
                console.error('Could not reopen thread:', error);
            }
        }
        
        // Notify user
        try {
            const user = await interaction.client.users.fetch(ticket.userId);
            await user.send({
                embeds: [new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🔄 Ticket Reopened')
                    .setDescription(`Your ticket #${ticketId} has been reopened`)
                    .setFooter({ text: 'A support agent will continue assisting you' })
                    .setTimestamp()]
            });
        } catch (error) {
            console.error('Could not DM user:', error);
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🔄 Ticket Reopened')
            .setDescription(`Ticket #${ticketId} has been reopened`)
            .addFields(
                { name: 'User', value: `${ticket.username || `<@${ticket.userId}>`}`, inline: true },
                { name: 'Reopened by', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();
        
        await respond(null, embed);
    }
};

