const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reply')
        .setDescription('Reply to a user in DM (Support Agents only)')
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('The user ID to reply to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Your reply message')
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
            return respond('❌ You do not have permission to reply to users. You need a support agent role.');
        }
        
        const userId = interaction.options.getString('user_id');
        const message = interaction.options.getString('message');
        
        try {
            const user = await interaction.client.users.fetch(userId);
            
            // Check if conversation exists
            const conversation = activeConversations.get(userId);
            let conversationId;
            
            if (!conversation) {
                // Create new conversation
                conversationId = `CONV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                activeConversations.set(userId, {
                    agentId: interaction.user.id,
                    conversationId: conversationId,
                    createdAt: new Date()
                });
            } else if (conversation.agentId && conversation.agentId !== interaction.user.id) {
                return respond(`❌ This user is already being helped by another agent.`);
            } else {
                // Claim the conversation if not already claimed
                conversationId = conversation.conversationId || `CONV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                activeConversations.set(userId, {
                    agentId: interaction.user.id,
                    conversationId: conversationId,
                    createdAt: conversation.createdAt || new Date()
                });
            }
            
            // Send message to user
            const userEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setAuthor({ 
                    name: `${interaction.user.tag} (Support Agent)`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setDescription(message)
                .addFields(
                    { name: '📋 Conversation ID', value: `\`${conversationId}\``, inline: false }
                )
                .setFooter({ text: 'Support Team' })
                .setTimestamp();
            
            await user.send({ embeds: [userEmbed] });
            
            // Store in history
            if (!conversationHistory.has(userId)) {
                conversationHistory.set(userId, []);
            }
            conversationHistory.get(userId).push({
                from: 'agent',
                agentId: interaction.user.id,
                agentName: interaction.user.tag,
                content: message,
                timestamp: new Date()
            });
            
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Message Sent')
                .setDescription(`Your reply has been sent to ${user.tag}`)
                .addFields(
                    { name: 'User', value: `${user.tag} (${userId})`, inline: true },
                    { name: '📋 Conversation ID', value: `\`${conversationId}\``, inline: true },
                    { name: 'Message', value: message, inline: false }
                )
                .setTimestamp();
            
            await respond(null, successEmbed);
            
        } catch (error) {
            console.error('Error replying to user:', error);
            if (error.code === 50007) {
                return respond('❌ Cannot send DM to this user. They may have DMs disabled.');
            }
            return respond(`❌ Error: ${error.message}`);
        }
    }
};
