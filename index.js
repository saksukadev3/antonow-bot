const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const admin = require('firebase-admin');
const express = require('express');

// --- UPTIME SİSTEMİ (Render Kapanmasın Diye) ---
const app = express();
app.get('/', (req, res) => res.send('antonow.me Aktif!'));
app.listen(process.env.PORT || 3000);

// --- FIREBASE BAĞLANTISI ---
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CONFIG)),
        databaseURL: process.env.FIREBASE_URL
    });
}
const db = admin.database();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// --- BOT HAZIR ---
client.on('ready', () => {
    console.log(`${client.user.tag} girişi yapıldı!`);
    
    // BURAYI KENDİ SUNUCU ID'N İLE DEĞİŞTİR KANKA
    const guildId = "1479495059387715715"; 
    
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
        guild.commands.set([
            { name: 'katil', description: 'Aktif etkinliklere katılır.' },
            { name: 'info', description: 'Yazılım ve sunucu hakkında bilgi verir.' },
            { name: 'katilimci', description: 'Etkinliğe katılanları listeler (Yetkili).' }
        ]);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'katil') {
        const etknlikRef = db.ref('etkinlik');
        const snapshot = await etknlikRef.once('value');
        const etkinlik = snapshot.val();
        
        if (!etkinlik || !etkinlik.durum) {
            return interaction.reply({ content: "❌ Şu an aktif bir etkinlik yok kanka!", ephemeral: true });
        }

        await db.ref(`katilimcilar/${interaction.user.id}`).set({
            username: interaction.user.username,
            date: new Date().toISOString()
        });
        return interaction.reply({ content: `✅ **${etkinlik.ad}** etkinliğine başarıyla katıldın!`, ephemeral: true });
    }

    if (commandName === 'info') {
        const infoEmbed = new EmbedBuilder()
            .setTitle("🚀 antonow.me | Yazılım Dünyası")
            .setDescription("Yazılım öğrenmek bir süper güçtür! Bu bot ekibimiz tarafından geliştiriliyor.")
            .setColor(0x0099FF)
            .setFooter({ text: 'antonow.me gelişim topluluğu' });
        return interaction.reply({ embeds: [infoEmbed] });
    }

    if (commandName === 'katilimci') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: "Bu komutu kullanmak için yetkin yok kanka!", ephemeral: true });
        }
        
        const snapshot = await db.ref('katilimcilar').once('value');
        const liste = snapshot.val();
        
        if (!liste) return interaction.reply("Henüz kimse katılmamış.");
        
        let metin = "📝 **Güncel Katılımcı Listesi:**\n" + Object.values(liste).map((u, i) => `${i+1}. ${u.username}`).join('\n');
        return interaction.reply(metin);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // a!ban komutu
    if (message.content.startsWith('a!ban')) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return;
        const user = message.mentions.members.first();
        const sebep = message.content.split(' ').slice(2).join(' ') || "Belirtilmedi";
        if (user) {
            await user.ban({ reason: sebep });
            message.channel.send(`🚫 **${user.user.tag}** sunucudan uçuruldu. Sebep: ${sebep}`);
        }
    }

    // !başlat komutu (Yönetici)
    if (message.content.startsWith('!başlat')) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const ad = message.content.replace('!başlat ', '');
        await db.ref('etkinlik').set({ ad: ad, durum: true });
        await db.ref('katilimcilar').remove();
        message.channel.send(`📢 **YENİ ETKİNLİK:** "${ad}" başladı! Katılmak için \`/katil\` yazın!`);
    }
});

client.login(process.env.TOKEN);
                                                                                    
