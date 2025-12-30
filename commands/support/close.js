const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Close a support ticket (Support Agents only)')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('The ticket ID to close')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for closing the ticket')
                .setRequired(false)),
    
    async execute(interaction, tickets) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/close.js:16',message:'Close command entry',data:{deferred:interaction.deferred,replied:interaction.replied,hasTickets:!!tickets,ticketsSize:tickets?.size,userId:interaction.user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        console.log(`[CLOSE] Command started by ${interaction.user.tag}`);
        
        // Helper to respond (handles deferred)
        const respond = async (content, embed = null) => {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/close.js:25',message:'Respond helper called',data:{deferred:interaction.deferred,replied:interaction.replied,hasContent:!!content,hasEmbed:!!embed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
            try {
                if (interaction.deferred || interaction.replied) {
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/close.js:30',message:'Using editReply',data:{deferred:interaction.deferred,replied:interaction.replied},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    return await interaction.editReply({ content: content || null, embeds: embed ? [embed] : [] });
                } else {
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/close.js:35',message:'Using reply',data:{deferred:interaction.deferred,replied:interaction.replied},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    return await interaction.reply({ content, embeds: embed ? [embed] : [], ephemeral: true });
                }
            } catch (error) {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/close.js:40',message:'Respond helper error',data:{error:error.message,errorCode:error.code,deferred:interaction.deferred,replied:interaction.replied},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                console.error('[CLOSE] Error in respond helper:', error.message);
                if (interaction.deferred) {
                    return await interaction.editReply({ content: content || '✅ Done', embeds: embed ? [embed] : [] });
                }
                throw error;
            }
        };
        
        try {
            // Commands must be used in a server, not DMs
            if (!interaction.member) {
                console.log('[CLOSE] Command used in DM');
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
            
            console.log(`[CLOSE] Has support role: ${hasSupportRole}`);
            
            if (!hasSupportRole) {
                return respond('❌ You do not have permission to close tickets. You need a support agent role.');
            }
            
            const ticketId = interaction.options.getInteger('ticket_id');
            console.log(`[CLOSE] Closing ticket #${ticketId}`);
            
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/close.js:58',message:'Before ticket lookup',data:{ticketId,ticketsSize:tickets?.size,allTicketIds:Array.from(tickets.keys())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            if (!ticketId) {
                return respond('❌ Please provide a valid ticket ID.');
            }
            
            const ticket = tickets.get(ticketId);
            
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/close.js:66',message:'After ticket lookup',data:{ticketId,found:!!ticket,ticketStatus:ticket?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            if (!ticket) {
                console.log(`[CLOSE] Ticket #${ticketId} not found`);
                return respond(`❌ Ticket #${ticketId} not found. Use /list to see all tickets.`);
            }
            
            if (ticket.status === 'closed') {
                return respond(`❌ Ticket #${ticketId} is already closed.`);
            }
            
            const reason = interaction.options.getString('reason') || 'No reason provided';
            console.log(`[CLOSE] Reason: ${reason}`);
            
            // Close the ticket
            ticket.status = 'closed';
            ticket.closedBy = interaction.user.id;
            ticket.closedAt = new Date();
            ticket.closeReason = reason;
            tickets.set(ticketId, ticket);
            console.log(`[CLOSE] Ticket #${ticketId} marked as closed`);
            
            // Post closure message in thread if it exists
            if (ticket.threadId) {
                try {
                    console.log(`[CLOSE] Posting closure message to thread ${ticket.threadId}`);
                    const guild = interaction.guild;
                    const thread = await guild.channels.fetch(ticket.threadId).catch((err) => {
                        console.error(`[CLOSE] Could not fetch thread: ${err.message}`);
                        return null;
                    });
                    
                    if (thread) {
                        const closeEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle('🔒 Ticket Closed')
                            .setDescription(`This ticket has been closed by ${interaction.user.tag}`)
                            .addFields(
                                { name: 'Reason', value: reason, inline: false }
                            )
                            .setFooter({ text: `Ticket #${ticketId}` })
                            .setTimestamp();
                        
                        await thread.send({ embeds: [closeEmbed] });
                        console.log(`[CLOSE] Closure message posted to thread`);
                        
                        // Archive the thread
                        try {
                            await thread.setArchived(true);
                            console.log(`[CLOSE] Thread archived`);
                        } catch (archiveError) {
                            console.error(`[CLOSE] Could not archive thread: ${archiveError.message}`);
                        }
                    } else {
                        console.log(`[CLOSE] Thread not found or inaccessible`);
                    }
                } catch (error) {
                    console.error('[CLOSE] Error closing thread:', error.message);
                    console.error('[CLOSE] Stack:', error.stack);
                }
            } else {
                console.log(`[CLOSE] No thread ID for ticket #${ticketId}`);
            }
            
        // Notify the user via DM with satisfaction survey
        try {
            console.log(`[CLOSE] Sending DM to user ${ticket.userId}`);
            const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
            const user = await interaction.client.users.fetch(ticket.userId);
            
            const userEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🔒 Ticket Closed')
                .setDescription(`Your ticket #${ticketId} has been closed.`)
                .addFields(
                    { name: 'Reason', value: reason, inline: false }
                )
                .setFooter({ text: 'If you need further assistance, please create a new ticket.' })
                .setTimestamp();
            
            // Add satisfaction survey
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`feedback_${ticketId}`)
                .setPlaceholder('Rate your support experience (optional)')
                .addOptions(
                    {
                        label: '⭐ Excellent',
                        description: '5 stars - Outstanding service',
                        value: '5',
                        emoji: '⭐'
                    },
                    {
                        label: '⭐ Very Good',
                        description: '4 stars - Great service',
                        value: '4',
                        emoji: '⭐'
                    },
                    {
                        label: '⭐ Good',
                        description: '3 stars - Satisfactory',
                        value: '3',
                        emoji: '⭐'
                    },
                    {
                        label: '⭐ Fair',
                        description: '2 stars - Could be better',
                        value: '2',
                        emoji: '⭐'
                    },
                    {
                        label: '⭐ Poor',
                        description: '1 star - Needs improvement',
                        value: '1',
                        emoji: '⭐'
                    }
                );
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            await user.send({ 
                embeds: [userEmbed],
                components: [row]
            });
            console.log(`[CLOSE] DM sent to user with satisfaction survey`);
        } catch (error) {
            console.error('[CLOSE] Could not send DM to user:', error.message);
        }
            
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🔒 Ticket Closed Successfully')
                .setDescription(`Ticket #${ticketId} has been closed`)
                .addFields(
                    { name: 'User', value: `${ticket.username || `<@${ticket.userId}>`}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();
            
            await respond(null, embed);
            console.log(`[CLOSE] Command completed successfully`);
        } catch (error) {
            console.error(`[CLOSE] ERROR: ${error.message}`);
            console.error(`[CLOSE] Stack: ${error.stack}`);
            await respond(`❌ An error occurred while closing the ticket: ${error.message}`);
        }
    }
};

