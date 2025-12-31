const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Claim a conversation with a user (Support Agents only)')
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('The user ID to claim')
                .setRequired(true)),
    
    async execute(interaction, { activeConversations, conversationHistory }) {
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
            return respond('❌ This command must be used in a server, not in DMs.');
        }
        
        // Check if user has support agent role
        const member = interaction.member;
        const hasSupportRole = member.roles.cache.some(role => 
            role.name.toLowerCase().includes('support') || 
            role.name.toLowerCase().includes('agent') ||
            role.name.toLowerCase().includes('staff') ||
            member.permissions.has(PermissionFlagsBits.Administrator)
        );
        
        if (!hasSupportRole) {
            return respond('❌ You do not have permission to claim conversations. You need a support agent role.');
        }
        
        const userId = interaction.options.getString('user_id');
        
        try {
            const user = await interaction.client.users.fetch(userId);
            
            // Check if already claimed by someone else
            const currentAgent = activeConversations.get(userId);
            if (currentAgent && currentAgent !== null && currentAgent !== interaction.user.id) {
                const agent = await interaction.client.users.fetch(currentAgent);
                return respond(`❌ This conversation is already claimed by ${agent.tag}.`);
            }
            
            // Claim the conversation
            activeConversations.set(userId, interaction.user.id);
            
            // Notify the user
            const userEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Support Agent Connected')
                .setDescription(`A support agent (${interaction.user.tag}) is now here to help you! You can start chatting.`)
                .setFooter({ text: 'Support Team' })
                .setTimestamp();
            
            await user.send({ embeds: [userEmbed] });
            
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Conversation Claimed')
                .setDescription(`You have claimed the conversation with ${user.tag}`)
                .addFields(
                    { name: 'User', value: `${user.tag} (${userId})`, inline: true },
                    { name: 'Status', value: 'Active', inline: true }
                )
                .setFooter({ text: 'Use /reply to send messages' })
                .setTimestamp();
            
            await respond(null, successEmbed);
            
        } catch (error) {
            console.error('Error claiming conversation:', error);
            if (error.code === 50007) {
                return respond('❌ Cannot send DM to this user. They may have DMs disabled.');
            }
            return respond(`❌ Error: ${error.message}`);
        }
    }
};
