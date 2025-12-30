const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Timeout a user (Moderators only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to mute')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in minutes')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the mute')
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
            return await respond('❌ You do not have permission to mute users.');
        }
        
        const targetUser = interaction.options.getUser('user');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        const targetMember = await interaction.guild.members.fetch(targetUser.id);
        const timeoutUntil = new Date(Date.now() + duration * 60 * 1000);
        
        await targetMember.timeout(timeoutUntil, reason);
        
        const embed = new EmbedBuilder()
            .setColor(0xFF8800)
            .setTitle('🔇 User Muted')
            .setDescription(`${targetUser.tag} has been muted`)
            .addFields(
                { name: 'Duration', value: `${duration} minutes`, inline: true },
                { name: 'Reason', value: reason, inline: false }
            )
            .setFooter({ text: `Muted by ${interaction.user.tag}` })
            .setTimestamp();
        
        await respond(null, embed);
    }
};

