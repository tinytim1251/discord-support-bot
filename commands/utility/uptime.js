const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Check bot uptime'),
    
    async execute(interaction) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('⏱️ Bot Uptime')
            .setDescription(`The bot has been online for **${uptimeString}**`)
            .setTimestamp();
        
        if (interaction.deferred || interaction.replied) {
            return await interaction.editReply({ embeds: [embed] });
        }
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

