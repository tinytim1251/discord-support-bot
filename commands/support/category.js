const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('category')
        .setDescription('Set category/department for a ticket (Support Agents only)')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('The ticket ID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Ticket category')
                .setRequired(true)
                .addChoices(
                    { name: 'General Support', value: 'general' },
                    { name: 'Billing', value: 'billing' },
                    { name: 'Technical', value: 'technical' },
                    { name: 'Account Issues', value: 'account' },
                    { name: 'Security', value: 'security' },
                    { name: 'Other', value: 'other' }
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
            return respond('❌ You do not have permission to set ticket categories.');
        }
        
        const ticketId = interaction.options.getInteger('ticket_id');
        const category = interaction.options.getString('category');
        const ticket = tickets.get(ticketId);
        
        if (!ticket) {
            return respond(`❌ Ticket #${ticketId} not found.`);
        }
        
        const oldCategory = ticket.category || 'none';
        ticket.category = category;
        tickets.set(ticketId, ticket);
        
        const categoryEmojis = {
            general: '📋',
            billing: '💳',
            technical: '🛠️',
            account: '👤',
            security: '🔒',
            other: '📝'
        };
        
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📁 Category Updated')
            .setDescription(`Ticket #${ticketId} category changed`)
            .addFields(
                { name: 'Old Category', value: oldCategory !== 'none' ? `${categoryEmojis[oldCategory] || '📝'} ${oldCategory.charAt(0).toUpperCase() + oldCategory.slice(1)}` : 'None', inline: true },
                { name: 'New Category', value: `${categoryEmojis[category]} ${category.charAt(0).toUpperCase() + category.slice(1)}`, inline: true }
            )
            .setFooter({ text: `Updated by ${interaction.user.tag}` })
            .setTimestamp();
        
        await respond(null, embed);
    }
};

