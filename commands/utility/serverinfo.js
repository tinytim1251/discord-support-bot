const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('View server information'),
    
    async execute(interaction) {
        if (!interaction.guild) {
            if (interaction.deferred || interaction.replied) {
                return await interaction.editReply({ content: '❌ This command must be used in a server.' });
            }
            return await interaction.reply({ content: '❌ This command must be used in a server.', ephemeral: true });
        }
        
        const guild = interaction.guild;
        const owner = await guild.fetchOwner();
        
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📊 Server Information')
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'Server Name', value: guild.name, inline: true },
                { name: 'Server ID', value: guild.id, inline: true },
                { name: 'Owner', value: owner.user.tag, inline: true },
                { name: 'Members', value: `${guild.memberCount}`, inline: true },
                { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
                { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
                { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Boost Level', value: `${guild.premiumTier}`, inline: true },
                { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0}`, inline: true }
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();
        
        if (interaction.deferred || interaction.replied) {
            return await interaction.editReply({ embeds: [embed] });
        }
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

