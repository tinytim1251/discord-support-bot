const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

// Export templates for use in interaction handler
const templates = {
    'greeting': 'Hello! Thank you for contacting support. How can I assist you today?',
    'investigating': 'I understand your concern. Let me investigate this issue for you and I\'ll get back to you shortly.',
    'resolved': 'Great news! Your issue has been resolved. Is there anything else I can help you with?',
    'escalate': 'I\'m escalating your ticket to a senior support agent who will be able to assist you further.',
    'followup': 'I wanted to follow up on your ticket. Have you had a chance to try the solution I provided?',
    'closing': 'Thank you for contacting support. If you need any further assistance, please don\'t hesitate to reach out!'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('templates')
        .setDescription('Use pre-written response templates (Support Agents only)')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('The ticket ID to reply to')
                .setRequired(true)),
    
    async execute(interaction, tickets) {
        const respond = async (content, embed = null, components = null) => {
            try {
                if (interaction.deferred || interaction.replied) {
                    return await interaction.editReply({ content: content || null, embeds: embed ? [embed] : [], components: components || [] });
                } else {
                    return await interaction.reply({ content, embeds: embed ? [embed] : [], components: components || [], ephemeral: true });
                }
            } catch (error) {
                console.error('Error in respond helper:', error.message);
                if (interaction.deferred) {
                    return await interaction.editReply({ content: content || '✅ Done', embeds: embed ? [embed] : [], components: components || [] });
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
            return respond('❌ You do not have permission to use templates.');
        }
        
        const ticketId = interaction.options.getInteger('ticket_id');
        const ticket = tickets.get(ticketId);
        
        if (!ticket) {
            return respond(`❌ Ticket #${ticketId} not found.`);
        }
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`template_menu_${ticketId}`)
            .setPlaceholder('Select a response template')
            .addOptions(
                {
                    label: 'Greeting',
                    description: 'Welcome message',
                    value: 'greeting'
                },
                {
                    label: 'Investigating',
                    description: 'Let me investigate',
                    value: 'investigating'
                },
                {
                    label: 'Resolved',
                    description: 'Issue resolved',
                    value: 'resolved'
                },
                {
                    label: 'Escalate',
                    description: 'Escalating ticket',
                    value: 'escalate'
                },
                {
                    label: 'Follow Up',
                    description: 'Following up',
                    value: 'followup'
                },
                {
                    label: 'Closing',
                    description: 'Closing message',
                    value: 'closing'
                }
            );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📝 Response Templates')
            .setDescription(`Select a template to use for ticket #${ticketId}`)
            .setFooter({ text: 'You can edit the template before sending' });
        
        await respond(null, embed, [row]);
    }
};

