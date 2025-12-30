const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency'),
    
    async execute(interaction) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/ping.js:8',message:'Ping command entry',data:{deferred:interaction.deferred,replied:interaction.replied},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        // Check if already deferred
        if (interaction.deferred || interaction.replied) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/ping.js:12',message:'Ping using editReply',data:{deferred:interaction.deferred,replied:interaction.replied},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🏓 Pong!')
                .addFields(
                    { name: 'Bot Latency', value: 'N/A', inline: true },
                    { name: 'API Latency', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true }
                )
                .setTimestamp();
            return await interaction.editReply({ content: null, embeds: [embed] });
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c6c1c17f-6572-420c-9186-0b6eb1791946',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'commands/ping.js:24',message:'Ping using reply',data:{deferred:interaction.deferred,replied:interaction.replied},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const timeDiff = sent.createdTimestamp - interaction.createdTimestamp;
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Bot Latency', value: `${timeDiff}ms`, inline: true },
                { name: 'API Latency', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true }
            )
            .setTimestamp();
        
        await interaction.editReply({ content: null, embeds: [embed] });
    }
};

