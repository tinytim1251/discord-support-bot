const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server (Moderators only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
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
        
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return await respond('❌ You do not have permission to kick users.');
        }
        
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        const targetMember = await interaction.guild.members.fetch(targetUser.id);
        
        if (!targetMember.kickable) {
            return await respond('❌ I cannot kick this user. They may have a higher role.');
        }
        
        await targetMember.kick(reason);
        
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('👢 User Kicked')
            .setDescription(`${targetUser.tag} has been kicked from the server`)
            .addFields({ name: 'Reason', value: reason, inline: false })
            .setFooter({ text: `Kicked by ${interaction.user.tag}` })
            .setTimestamp();
        
        await respond(null, embed);
    }
};

