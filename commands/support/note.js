const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('note')
        .setDescription('Add an internal note to a ticket (Support Agents only)')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('The ticket ID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('note')
                .setDescription('The internal note (not visible to user)')
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
            return respond('❌ You do not have permission to add notes.');
        }
        
        const ticketId = interaction.options.getInteger('ticket_id');
        const noteText = interaction.options.getString('note');
        const ticket = tickets.get(ticketId);
        
        if (!ticket) {
            return respond(`❌ Ticket #${ticketId} not found.`);
        }
        
        // Initialize notes array if not exists
        if (!ticket.notes) {
            ticket.notes = [];
        }
        
        ticket.notes.push({
            text: noteText,
            author: interaction.user.tag,
            authorId: interaction.user.id,
            timestamp: new Date()
        });
        
        tickets.set(ticketId, ticket);
        
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📝 Note Added')
            .setDescription(`Internal note added to ticket #${ticketId}`)
            .addFields(
                { name: 'Note', value: noteText, inline: false },
                { name: 'Added by', value: interaction.user.tag, inline: true }
            )
            .setFooter({ text: 'This note is only visible to support agents' })
            .setTimestamp();
        
        await respond(null, embed);
    }
};

