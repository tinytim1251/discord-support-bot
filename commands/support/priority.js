const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('priority')
        .setDescription('Set priority level for a ticket (Support Agents only)')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('The ticket ID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('level')
                .setDescription('Priority level')
                .setRequired(true)
                .addChoices(
                    { name: 'Low', value: 'low' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'High', value: 'high' },
                    { name: 'Urgent', value: 'urgent' }
                )),
    
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
            return respond('❌ You do not have permission to set ticket priority.');
        }
        
        const ticketId = interaction.options.getInteger('ticket_id');
        const priority = interaction.options.getString('level');
        const ticket = tickets.get(ticketId);
        
        if (!ticket) {
            return respond(`❌ Ticket #${ticketId} not found.`);
        }
        
        // Initialize priority if not exists
        if (!ticket.priority) {
            ticket.priority = 'medium';
        }
        
        const oldPriority = ticket.priority;
        ticket.priority = priority;
        tickets.set(ticketId, ticket);
        
        const priorityEmojis = {
            low: '🟢',
            medium: '🟡',
            high: '🟠',
            urgent: '🔴'
        };
        
        const embed = new EmbedBuilder()
            .setColor(priority === 'urgent' ? 0xFF0000 : priority === 'high' ? 0xFF8800 : priority === 'medium' ? 0xFFAA00 : 0x00FF00)
            .setTitle('📊 Priority Updated')
            .setDescription(`Ticket #${ticketId} priority changed`)
            .addFields(
                { name: 'Old Priority', value: `${priorityEmojis[oldPriority] || '⚪'} ${oldPriority.charAt(0).toUpperCase() + oldPriority.slice(1)}`, inline: true },
                { name: 'New Priority', value: `${priorityEmojis[priority]} ${priority.charAt(0).toUpperCase() + priority.slice(1)}`, inline: true }
            )
            .setFooter({ text: `Updated by ${interaction.user.tag}` })
            .setTimestamp();
        
        await respond(null, embed);
    }
};

