const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Rate your support experience'),
    
    async execute(interaction, tickets) {
        // Find user's most recent closed ticket
        const userTickets = Array.from(tickets.values())
            .filter(t => t.userId === interaction.user.id && t.status === 'closed')
            .sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));
        
        const respond = async (content, embed = null, components = null) => {
            if (interaction.deferred || interaction.replied) {
                return await interaction.editReply({ content: content || null, embeds: embed ? [embed] : [], components: components || [] });
            }
            return await interaction.reply({ content, embeds: embed ? [embed] : [], components: components || [], ephemeral: true });
        };
        
        if (userTickets.length === 0) {
            return await respond('❌ You don\'t have any closed tickets to provide feedback on.');
        }
        
        const recentTicket = userTickets[0];
        
        // Check if already provided feedback
        if (recentTicket.feedback) {
            return await respond(`✅ You've already provided feedback for ticket #${recentTicket.id}. Thank you!`);
        }
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`feedback_${recentTicket.id}`)
            .setPlaceholder('Rate your support experience')
            .addOptions(
                {
                    label: '⭐ Excellent',
                    description: '5 stars - Outstanding service',
                    value: '5',
                    emoji: '⭐'
                },
                {
                    label: '⭐ Very Good',
                    description: '4 stars - Great service',
                    value: '4',
                    emoji: '⭐'
                },
                {
                    label: '⭐ Good',
                    description: '3 stars - Satisfactory',
                    value: '3',
                    emoji: '⭐'
                },
                {
                    label: '⭐ Fair',
                    description: '2 stars - Could be better',
                    value: '2',
                    emoji: '⭐'
                },
                {
                    label: '⭐ Poor',
                    description: '1 star - Needs improvement',
                    value: '1',
                    emoji: '⭐'
                }
            );
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📝 Feedback Survey')
            .setDescription(`Please rate your experience with ticket #${recentTicket.id}`)
            .setFooter({ text: 'Your feedback helps us improve our service' });
        
        await respond(null, embed, [row]);
    }
};

