const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Claim a support ticket (Support Agents only)')
        .addIntegerOption(option =>
            option.setName('ticket_id')
                .setDescription('The ticket ID to claim')
                .setRequired(true)),
    
    async execute(interaction, tickets) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/claim.js:13',message:'Claim command entry',data:{deferred:interaction.deferred,replied:interaction.replied,ticketsSize:tickets?.size,hasTickets:!!tickets},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        // Helper function to reply (handles both deferred and normal replies)
        const respond = async (content, embed = null) => {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/claim.js:16',message:'Respond helper called',data:{deferred:interaction.deferred,replied:interaction.replied},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
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
        
        // Commands must be used in a server, not DMs
        if (!interaction.member) {
            return respond('❌ This command must be used in a server, not in DMs.');
        }
        
        // Check if user has support agent role (you can customize this)
        const member = interaction.member;
        const hasSupportRole = member.roles.cache.some(role => 
            role.name.toLowerCase().includes('support') || 
            role.name.toLowerCase().includes('agent') ||
            role.name.toLowerCase().includes('staff') ||
            member.permissions.has(PermissionFlagsBits.Administrator)
        );
        
        if (!hasSupportRole) {
            return respond('❌ You do not have permission to claim tickets. You need a support agent role.');
        }
        
        const ticketId = interaction.options.getInteger('ticket_id');
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/claim.js:48',message:'Before ticket lookup',data:{ticketId,ticketsSize:tickets?.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        const ticket = tickets.get(ticketId);
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/claim.js:51',message:'After ticket lookup',data:{ticketId,found:!!ticket,ticketStatus:ticket?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        if (!ticket) {
            return respond(`❌ Ticket #${ticketId} not found.`);
        }
        
        if (ticket.status !== 'open') {
            return respond(`❌ Ticket #${ticketId} is already ${ticket.status}.`);
        }
        
        if (ticket.claimedBy) {
            return respond(`❌ Ticket #${ticketId} is already claimed by <@${ticket.claimedBy}>.`);
        }
        
        // Claim the ticket
        ticket.claimedBy = interaction.user.id;
        ticket.claimedAt = new Date();
        if (!ticket.firstClaimedAt) {
            ticket.firstClaimedAt = new Date();
        }
        tickets.set(ticketId, ticket);
        
        // Notify the user via DM
        try {
            const user = await interaction.client.users.fetch(ticket.userId);
            const userEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Support Agent Assigned')
                .setDescription(`Your ticket #${ticketId} has been claimed by a support agent. They will assist you shortly!`)
                .setTimestamp();
            
            await user.send({ embeds: [userEmbed] });
        } catch (error) {
            console.error('Could not send DM to user:', error);
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Ticket Claimed Successfully')
            .setDescription(`You have claimed ticket #${ticketId}`)
            .addFields(
                { name: 'User', value: `${ticket.username || `<@${ticket.userId}>`}`, inline: true },
                { name: 'User ID', value: ticket.userId, inline: true }
            )
            .setTimestamp();
        
        if (ticket.threadId) {
            embed.addFields({ name: 'Thread', value: `<#${ticket.threadId}>`, inline: true });
        } else {
            embed.setFooter({ text: 'Use /reply to create a thread and respond' });
        }
        
        await respond(null, embed);
    }
};

