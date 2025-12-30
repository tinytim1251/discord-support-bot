const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reply')
        .setDescription('Reply to a support ticket (Support Agents only)')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('The ticket ID to reply to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Your reply message')
                .setRequired(true)),
    
    async execute(interaction, tickets) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/reply.js:17',message:'Reply command entry',data:{deferred:interaction.deferred,replied:interaction.replied,ticketsSize:tickets?.size,hasTickets:!!tickets},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        // Helper to respond (handles both deferred and normal)
        const respond = async (content, embed = null) => {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/reply.js:20',message:'Respond helper called',data:{deferred:interaction.deferred,replied:interaction.replied},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
            try {
                if (interaction.deferred || interaction.replied) {
                    return await interaction.editReply({ content: content || null, embeds: embed ? [embed] : [] });
                } else {
                    return await interaction.reply({ content, embeds: embed ? [embed] : [], ephemeral: true });
                }
            } catch (error) {
                console.error('Error in respond helper:', error.message);
                // Try alternative method
                if (interaction.deferred) {
                    return await interaction.editReply({ content: content || '✅ Done', embeds: embed ? [embed] : [] });
                }
                throw error;
            }
        };
        
        // Commands must be used in a server, not DMs
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
            return respond('❌ You do not have permission to reply to tickets. You need a support agent role.');
        }
        
        const ticketId = interaction.options.getInteger('ticket_id');
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/reply.js:44',message:'Before ticket lookup',data:{ticketId,ticketsSize:tickets?.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        const ticket = tickets.get(ticketId);
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/reply.js:47',message:'After ticket lookup',data:{ticketId,found:!!ticket},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        if (!ticket) {
            return respond(`❌ Ticket #${ticketId} not found.`);
        }
        
        if (ticket.status === 'closed') {
            return respond(`❌ Ticket #${ticketId} is closed.`);
        }
        
        // Check if ticket is claimed and if the user claimed it
        if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id) {
            return respond(`❌ This ticket is claimed by <@${ticket.claimedBy}>. You must claim it first using /claim ${ticketId}`);
        }
        
        // Auto-claim if not claimed
        if (!ticket.claimedBy) {
            ticket.claimedBy = interaction.user.id;
            tickets.set(ticketId, ticket);
        }
        
        const message = interaction.options.getString('message');
        const guild = interaction.guild;
        
        // Get existing thread (should always exist since threads are created when user DMs)
        const thread = await guild.channels.fetch(ticket.threadId).catch(() => null);
        if (!thread) {
            return respond(`❌ Thread for ticket #${ticketId} not found. The thread may have been deleted.`);
        }
        
        // Post agent reply in thread
        const agentEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ 
                name: `${interaction.user.tag} (Support Agent)`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setDescription(message)
            .setFooter({ text: `Ticket #${ticketId}` })
            .setTimestamp();
        
        await thread.send({ embeds: [agentEmbed] });
        
        // Store agent reply in ticket
        ticket.messages.push({
            content: message,
            timestamp: new Date(),
            author: 'agent',
            agentId: interaction.user.id,
            agentTag: interaction.user.tag
        });
        tickets.set(ticketId, ticket);
        
        // Send reply to user via DM
        try {
            const user = await interaction.client.users.fetch(ticket.userId);
            const userEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('💬 Reply from Support')
                .setDescription(message)
                .setFooter({ text: `Ticket #${ticketId} | ${interaction.user.tag}` })
                .setTimestamp();
            
            await user.send({ embeds: [userEmbed] });
        } catch (error) {
            console.error('Could not send DM to user:', error);
            // Don't fail the command if DM fails - thread was created successfully
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Reply Sent')
            .setDescription(`Your reply has been posted in thread: ${thread}`)
            .addFields(
                { name: 'User', value: `${ticket.username || `<@${ticket.userId}>`}`, inline: true },
                { name: 'Thread', value: thread.toString(), inline: true }
            )
            .setTimestamp();
        
        await respond(null, embed);
    }
};

