const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Store blacklisted users in memory (in production, use a database)
const blacklist = new Set();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Blacklist or unblacklist a user (Moderators only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to blacklist/unblacklist')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to perform')
                .setRequired(true)
                .addChoices(
                    { name: 'Add to Blacklist', value: 'add' },
                    { name: 'Remove from Blacklist', value: 'remove' }
                )),
    
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
        
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await respond('❌ You do not have permission to manage blacklist.');
        }
        
        const targetUser = interaction.options.getUser('user');
        const action = interaction.options.getString('action');
        
        if (action === 'add') {
            blacklist.add(targetUser.id);
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🚫 User Blacklisted also owen was here')
                .setDescription(`${targetUser.tag} has been added to the blacklist`)
                .setFooter({ text: 'They will not be able to create tickets' })
                .setTimestamp();
            
            await respond(null, embed);
        } else {
            blacklist.delete(targetUser.id);
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ User Unblacklisted')
                .setDescription(`${targetUser.tag} has been removed from the blacklist`)
                .setTimestamp();
            
            await respond(null, embed);
        }
    },
    
    // Export blacklist for use in index.js
    isBlacklisted: (userId) => blacklist.has(userId)
};

