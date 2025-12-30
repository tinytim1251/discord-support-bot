const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server (Moderators only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('delete_days')
                .setDescription('Days of messages to delete (0-7)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7)),
    
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
        
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return await respond('❌ You do not have permission to ban users.');
        }
        
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteDays = interaction.options.getInteger('delete_days') || 0;
        
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (targetMember && !targetMember.bannable) {
            return await respond('❌ I cannot ban this user. They may have a higher role.');
        }
        
        await interaction.guild.members.ban(targetUser, { reason, deleteMessageDays: deleteDays });
        
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🔨 User Banned')
            .setDescription(`${targetUser.tag} has been banned from the server`)
            .addFields(
                { name: 'Reason', value: reason, inline: false },
                { name: 'Messages Deleted', value: `${deleteDays} days`, inline: true }
            )
            .setFooter({ text: `Banned by ${interaction.user.tag}` })
            .setTimestamp();
        
        await respond(null, embed);
    }
};

