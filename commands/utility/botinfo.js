const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('View bot information'),
    
    async execute(interaction) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const uptimeString = `${days}d ${hours}h ${minutes}m`;
        
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🤖 Bot Information')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                { name: 'Bot Name', value: interaction.client.user.tag, inline: true },
                { name: 'Bot ID', value: interaction.client.user.id, inline: true },
                { name: 'Servers', value: `${interaction.client.guilds.cache.size}`, inline: true },
                { name: 'Users', value: `${interaction.client.users.cache.size}`, inline: true },
                { name: 'Uptime', value: uptimeString, inline: true },
                { name: 'Ping', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
                { name: 'Node.js Version', value: process.version, inline: true },
                { name: 'Discord.js Version', value: require('discord.js').version, inline: true }
            )
            .setFooter({ text: 'Support Bot' })
            .setTimestamp();
        
        if (interaction.deferred || interaction.replied) {
            return await interaction.editReply({ embeds: [embed] });
        }
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

