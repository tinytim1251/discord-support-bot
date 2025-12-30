const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete multiple messages (Moderators only)')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Only delete messages from this user')
                .setRequired(false)),
    
    async execute(interaction) {
        if (!interaction.member) {
            return interaction.reply({ content: '❌ This command must be used in a server.', ephemeral: true });
        }
        
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: '❌ You do not have permission to delete messages.', ephemeral: true });
        }
        
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');
        
        await interaction.deferReply({ ephemeral: true });
        
        const messages = await interaction.channel.messages.fetch({ limit: amount + 1 });
        let messagesToDelete = messages.filter(msg => !msg.pinned);
        
        if (targetUser) {
            messagesToDelete = messagesToDelete.filter(msg => msg.author.id === targetUser.id);
        }
        
        // Remove the command message itself
        messagesToDelete = messagesToDelete.filter(msg => msg.id !== interaction.id);
        
        if (messagesToDelete.size === 0) {
            return interaction.editReply({ content: '❌ No messages found to delete.' });
        }
        
        await interaction.channel.bulkDelete(messagesToDelete, true);
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🗑️ Messages Purged')
            .setDescription(`Deleted ${messagesToDelete.size} message(s)`)
            .addFields(
                { name: 'Channel', value: interaction.channel.toString(), inline: true },
                { name: 'Filter', value: targetUser ? `From ${targetUser.tag}` : 'All messages', inline: true }
            )
            .setFooter({ text: `Purged by ${interaction.user.tag}` })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    }
};

