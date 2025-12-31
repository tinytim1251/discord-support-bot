const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Claim a conversation with a user (Support Agents only)')
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('The user ID to claim')
                .setRequired(true)),
    
    async execute(interaction, { activeConversations, conversationHistory, conversations }) {
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
            const conversation = activeConversations.get(userId);
            if (!conversation) {
                return respond(`❌ No active conversation found for this user.`);
            }
            
            if (conversation.agentId && conversation.agentId !== interaction.user.id) {
                const agent = await interaction.client.users.fetch(conversation.agentId);
                return respond(`❌ This conversation is already claimed by ${agent.tag}.`);
            }
            
            // Get or generate conversation ID
            const conversationId = conversation.conversationId || `CONV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            
            // Claim the conversation
            activeConversations.set(userId, {
                agentId: interaction.user.id,
                conversationId: conversationId,
                createdAt: conversation.createdAt || new Date()
            });
            
            // Update conversations map
            if (conversations.has(conversationId)) {
                conversations.get(conversationId).agentId = interaction.user.id;
            }
            
            // Notify the user
            const userEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Support Agent Connected')
                .setDescription(`A support agent (${interaction.user.tag}) is now here to help you! You can start chatting.`)
                .addFields(
                    { name: '📋 Conversation ID', value: `\`${conversationId}\``, inline: false }
                )
                .setFooter({ text: 'Support Team' })
                .setTimestamp();
            
            await user.send({ embeds: [userEmbed] });
            
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Conversation Claimed')
                .setDescription(`You have claimed the conversation with ${user.tag}`)
                .addFields(
                    { name: 'User', value: `${user.tag} (${userId})`, inline: true },
                    { name: '📋 Conversation ID', value: `\`${conversationId}\``, inline: true },
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
