const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sla')
        .setDescription('Check SLA status for tickets (Support Agents only)'),
    
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
            return respond('❌ You do not have permission to view SLA status.');
        }
        
        const openTickets = Array.from(tickets.values()).filter(t => t.status === 'open');
        const now = Date.now();
        const slaWarningHours = 24; // Warn if ticket open for 24+ hours
        const slaCriticalHours = 48; // Critical if ticket open for 48+ hours
        
        const warningTickets = [];
        const criticalTickets = [];
        
        openTickets.forEach(ticket => {
            const hoursOpen = (now - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
            
            if (hoursOpen >= slaCriticalHours) {
                criticalTickets.push({ ticket, hoursOpen });
            } else if (hoursOpen >= slaWarningHours) {
                warningTickets.push({ ticket, hoursOpen });
            }
        });
        
        const embed = new EmbedBuilder()
            .setColor(criticalTickets.length > 0 ? 0xFF0000 : warningTickets.length > 0 ? 0xFFAA00 : 0x00FF00)
            .setTitle('⏱️ SLA Status')
            .setDescription(`SLA monitoring for open tickets`)
            .addFields(
                { name: '🔴 Critical (48+ hours)', value: criticalTickets.length > 0 ? criticalTickets.map(t => `#${t.ticket.id} (${Math.floor(t.hoursOpen)}h)`).join('\n').substring(0, 1024) : 'None', inline: false },
                { name: '🟠 Warning (24+ hours)', value: warningTickets.length > 0 ? warningTickets.map(t => `#${t.ticket.id} (${Math.floor(t.hoursOpen)}h)`).join('\n').substring(0, 1024) : 'None', inline: false },
                { name: '📊 Total Open', value: `${openTickets.length}`, inline: true },
                { name: '✅ Within SLA', value: `${openTickets.length - warningTickets.length - criticalTickets.length}`, inline: true }
            )
            .setTimestamp();
        
        await respond(null, embed);
    }
};

