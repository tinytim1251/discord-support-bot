const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription('Set the support notification channel (Admin only)')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where support requests will be posted')
                .setRequired(true)),
    
    async execute(interaction, context) {
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
            return respond('❌ This command must be used in a server.');
        }
        
        // Check if user is admin
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return respond('❌ You need Administrator permissions to use this command.');
        }
        
        const channel = interaction.options.getChannel('channel');
        
        if (channel.type !== ChannelType.GuildText) {
            return respond('❌ The channel must be a text channel.');
        }
        
        // Store channel ID (in a real app, you'd save this to a database)
        // For now, we'll store it in a global variable or use environment variable
        // Let's use a simple file or just store it in memory and use a command to set it
        
        // Store in client for easy access
        interaction.client.supportChannelId = channel.id;
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Notification Channel Set')
            .setDescription(`Support requests will now be posted in ${channel}`)
            .addFields(
                { name: 'Channel', value: `${channel} (${channel.id})`, inline: true }
            )
            .setTimestamp();
        
        await respond(null, embed);
    }
};
