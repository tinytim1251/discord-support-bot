const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View ticket statistics (Support Agents only)'),
    
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
            return respond('❌ You do not have permission to view statistics.');
        }
        
        const allTickets = Array.from(tickets.values());
        const openTickets = allTickets.filter(t => t.status === 'open');
        const closedTickets = allTickets.filter(t => t.status === 'closed');
        const claimedTickets = openTickets.filter(t => t.claimedBy);
        const unclaimedTickets = openTickets.filter(t => !t.claimedBy);
        
        // Priority breakdown
        const priorityCounts = {
            urgent: allTickets.filter(t => t.priority === 'urgent').length,
            high: allTickets.filter(t => t.priority === 'high').length,
            medium: allTickets.filter(t => t.priority === 'medium' || !t.priority).length,
            low: allTickets.filter(t => t.priority === 'low').length
        };
        
        // Calculate average response time (if tickets have timestamps)
        let avgResponseTime = 'N/A';
        const closedWithTimes = closedTickets.filter(t => t.closedAt && t.createdAt);
        if (closedWithTimes.length > 0) {
            const totalTime = closedWithTimes.reduce((sum, t) => {
                return sum + (new Date(t.closedAt) - new Date(t.createdAt));
            }, 0);
            const avgMs = totalTime / closedWithTimes.length;
            const hours = Math.floor(avgMs / (1000 * 60 * 60));
            const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
            avgResponseTime = `${hours}h ${minutes}m`;
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📊 Ticket Statistics')
            .setDescription(`Statistics for all tickets`)
            .addFields(
                { name: '📋 Total Tickets', value: `${allTickets.length}`, inline: true },
                { name: '🟢 Open Tickets', value: `${openTickets.length}`, inline: true },
                { name: '🔴 Closed Tickets', value: `${closedTickets.length}`, inline: true },
                { name: '👤 Claimed', value: `${claimedTickets.length}`, inline: true },
                { name: '⏳ Unclaimed', value: `${unclaimedTickets.length}`, inline: true },
                { name: '⏱️ Avg Response Time', value: avgResponseTime, inline: true },
                { name: '🔴 Urgent', value: `${priorityCounts.urgent}`, inline: true },
                { name: '🟠 High', value: `${priorityCounts.high}`, inline: true },
                { name: '🟡 Medium', value: `${priorityCounts.medium}`, inline: true },
                { name: '🟢 Low', value: `${priorityCounts.low}`, inline: true }
            )
            .setTimestamp();
        
        await respond(null, embed);
    }
};

