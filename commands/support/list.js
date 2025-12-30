const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('List all support tickets (Support Agents only)')
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Filter by status')
                .setRequired(false)
                .addChoices(
                    { name: 'Open', value: 'open' },
                    { name: 'Closed', value: 'closed' }
                )),
    
    async execute(interaction, tickets) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/list.js:17',message:'List command entry',data:{deferred:interaction.deferred,replied:interaction.replied,ticketsSize:tickets?.size,hasTickets:!!tickets},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        console.log(`[LIST] Command started | deferred=${interaction.deferred} | replied=${interaction.replied}`);
        
        // Helper to respond (handles deferred)
        const respond = async (content, embed = null) => {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/list.js:22',message:'Respond helper called',data:{deferred:interaction.deferred,replied:interaction.replied,hasContent:!!content,hasEmbed:!!embed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
            try {
                console.log(`[LIST] Responding | deferred=${interaction.deferred} | replied=${interaction.replied}`);
                if (interaction.deferred || interaction.replied) {
                    const result = await interaction.editReply({ content: content || null, embeds: embed ? [embed] : [] });
                    
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/list.js:26',message:'EditReply success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    
                    console.log(`[LIST] editReply successful`);
                    return result;
                } else {
                    const result = await interaction.reply({ content, embeds: embed ? [embed] : [], ephemeral: true });
                    
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/list.js:30',message:'Reply success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    
                    console.log(`[LIST] reply successful`);
                    return result;
                }
            } catch (error) {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/list.js:33',message:'Respond helper error',data:{error:error.message,code:error.code,deferred:interaction.deferred},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                
                console.error('[LIST] Error in respond helper:', error.message);
                console.error('[LIST] Error code:', error.code);
                if (interaction.deferred) {
                    try {
                        return await interaction.editReply({ content: content || '✅ Done', embeds: embed ? [embed] : [] });
                    } catch (e2) {
                        console.error('[LIST] editReply also failed:', e2.message);
                        throw e2;
                    }
                }
                throw error;
            }
        };
        
        // Commands must be used in a server, not DMs
        if (!interaction.member) {
            console.log('[LIST] No member - DM usage');
            return respond('❌ This command must be used in a server, not in DMs.');
        }
        
        // Check if user has support agent role
        const member = interaction.member;
        const roleNames = member.roles.cache.map(r => r.name.toLowerCase());
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/list.js:55',message:'Permission check',data:{roleNames,isAdmin:member.permissions.has(PermissionFlagsBits.Administrator)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
        const hasSupportRole = member.roles.cache.some(role => 
            role.name.toLowerCase().includes('support') || 
            role.name.toLowerCase().includes('agent') ||
            role.name.toLowerCase().includes('staff') ||
            member.permissions.has(PermissionFlagsBits.Administrator)
        );
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/list.js:62',message:'Permission check result',data:{hasSupportRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
        console.log(`[LIST] Has support role: ${hasSupportRole}`);
        
        if (!hasSupportRole) {
            return respond('❌ You do not have permission to view tickets. You need a support agent role.');
        }
        
        const statusFilter = interaction.options.getString('status');
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/list.js:100',message:'Before filtering tickets',data:{ticketsSize:tickets.size,statusFilter,allTicketIds:Array.from(tickets.keys()),ticketValues:tickets.size>0?Array.from(tickets.values()).map(t=>({id:t.id,status:t.status,userId:t.userId})):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        let filteredTickets = Array.from(tickets.values());
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/list.js:105',message:'After Array.from',data:{filteredTicketsCount:filteredTickets.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        if (statusFilter) {
            filteredTickets = filteredTickets.filter(t => t.status === statusFilter);
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/list.js:109',message:'After status filter',data:{statusFilter,filteredTicketsCount:filteredTickets.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
        }
        
        if (filteredTickets.length === 0) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/list.js:115',message:'No tickets found',data:{ticketsSize:tickets.size,statusFilter,allTicketIds:Array.from(tickets.keys())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            return respond(`❌ No tickets found${statusFilter ? ` with status "${statusFilter}"` : ''}.`);
        }
        
        // Sort by creation date (newest first)
        filteredTickets.sort((a, b) => b.createdAt - a.createdAt);
        
        // Create embed with ticket list
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📋 Support Tickets${statusFilter ? ` (${statusFilter})` : ''}`)
            .setDescription(`Total: ${filteredTickets.length} ticket(s)`)
            .setTimestamp();
        
        // Add tickets to embed (limit to 25 fields)
        const ticketsToShow = filteredTickets.slice(0, 25);
        ticketsToShow.forEach(ticket => {
            const statusEmoji = ticket.status === 'open' ? '🟢' : '🔴';
            const priorityEmoji = ticket.priority === 'urgent' ? '🔴' : ticket.priority === 'high' ? '🟠' : ticket.priority === 'low' ? '🟢' : '🟡';
            const claimedInfo = ticket.claimedBy ? `\nClaimed by: <@${ticket.claimedBy}>` : '\nUnclaimed';
            const userInfo = ticket.username || `<@${ticket.userId}>`;
            const messageCount = ticket.messages ? ticket.messages.length : 0;
            const threadInfo = ticket.threadId ? `\n🧵 Thread: <#${ticket.threadId}>` : '\n📝 No thread yet';
            
            embed.addFields({
                name: `${statusEmoji} ${priorityEmoji} Ticket #${ticket.id}`,
                value: `User: ${userInfo}${claimedInfo}${threadInfo}\nMessages: ${messageCount}`,
                inline: true
            });
        });
        
        if (filteredTickets.length > 25) {
            embed.setFooter({ text: `Showing 25 of ${filteredTickets.length} tickets` });
        }
        
        console.log('[LIST] Sending embed response');
        await respond(null, embed);
        console.log('[LIST] Response sent successfully');
    }
};

