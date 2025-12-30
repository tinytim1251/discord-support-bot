const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user (Moderators only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(false)),
    
    async execute(interaction) {
        const respond = async (content, embed = null) => {
            if (interaction.deferred || interaction.replied) {
                return await interaction.editReply({ content: content || null, embeds: embed ? [embed] : [] });
            }
            return await interaction.reply({ content, embeds: embed ? [embed] : [], ephemeral: true });
        };
        
        if (!interaction.member) {
            return await respond('❌ This command must be used in a server.');
        }
        
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return await respond('❌ You do not have permission to warn users.');
        }
        
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        try {
            await targetUser.send({
                embeds: [new EmbedBuilder()
                    .setColor(0xFFAA00)
                    .setTitle('⚠️ Warning')
                    .setDescription(`You have been warned in ${interaction.guild.name}`)
                    .addFields({ name: 'Reason', value: reason, inline: false })
                    .setFooter({ text: `Warned by ${interaction.user.tag}` })
                    .setTimestamp()]
            });
        } catch (error) {
            // User has DMs disabled, continue anyway
        }
        
        const embed = new EmbedBuilder()
            .setColor(0xFFAA00)
            .setTitle('⚠️ User Warned')
            .setDescription(`${targetUser.tag} has been warned`)
            .addFields({ name: 'Reason', value: reason, inline: false })
            .setFooter({ text: `Warned by ${interaction.user.tag}` })
            .setTimestamp();
        
        await respond(null, embed);
    }
};

