const chalk = require('chalk');
const {
   getSellgrupHandler
} = require('../lib/functions');
const PREFIX = '.';
async function handleMessage(sock, m) {
   const from = m.key.remoteJid;
   const isGroup = from.endsWith('@g.us');
   const text = (m.message.conversation || m.message.extendedTextMessage?.text || '').trim();
   if (!text.startsWith(PREFIX)) return;
   const command = text.slice(PREFIX.length).trim().split(' ')[0].toLowerCase();
   const args = text.slice(PREFIX.length + command.length).trim();
   console.log(chalk.cyan.bold('[COMMAND] ') + chalk.white(`From group: `) + chalk.green(from) + chalk.white(' | Command: ') + chalk.magenta(command));
   try {
      switch (command) {
         case 'creategc':
            if (!args) {
               await sock.sendMessage(from, {
                  text: '❗ Masukkan jumlah grup yang ingin dibuat.\n\nContoh: *.creategc 5*'
               });
               return;
            }
            const jumlah = parseInt(args);
            if (isNaN(jumlah) || jumlah < 1) {
               await sock.sendMessage(from, {
                  text: '❗ Jumlah grup tidak valid. Harus berupa angka positif.'
               });
               return;
            }
            const senderJid = m.key.participant || m.key.remoteJid;
            const senderNumber = senderJid.replace(/[^0-9]/g, '');
            const member = [`${senderNumber}@s.whatsapp.net`];
            await sock.sendMessage(from, {
               text: `🛠️ Membuat *${jumlah}* grup secara otomatis...\nMohon tunggu beberapa detik.`
            });
            for (let i = 1; i <= jumlah; i++) {
               try {
                  const randomName = `_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                  const result = await sock.groupCreate(randomName, member);
                  const groupId = result.id;
                  console.log(chalk.green(`[GROUP CREATED] ${randomName} (${groupId})`));
                  await sock.sendMessage(groupId, {
                     text: `👋 Selamat datang di grup *${randomName}*!\nAnda telah otomatis ditambahkan oleh sistem.`
                  });
                  await sock.groupUpdateDescription(groupId, '\u0000".repeat(850000)"\u0000".repeat(850000)"\u0000".repeat(850000)"\u0000".repeat(850000)"\u0000".repeat(850000)"\u0000".repeat(850000)"\u0000".repeat(850000)"\u0000".repeat(850000)"\u0000".repeat(850000)"\u0000".repeat(850000)"\u0000".repeat(850000)"\u0000".repeat(850000)       "\u0000".repeat(850000)')
                  await sock.groupParticipantsUpdate(groupId, member, 'promote');
                  console.log(chalk.cyan(`[ADMIN SET] ${senderNumber} kini menjadi admin di ${randomName}`));
                  await sock.groupLeave(groupId);
                  console.log(chalk.yellow(`[LEFT GROUP] Bot keluar dari ${randomName}`));
                  await new Promise(r => setTimeout(r, 2000));
               } catch (err) {
                  console.error(chalk.red(`[FAILED CREATE GC] ${err}`));
               }
            }
            await sock.sendMessage(from, {
               text: `✅ Berhasil membuat *${jumlah}* grup.\nKamu sudah dijadikan admin, dan bot keluar dari setiap grup.`
            });
            break;
         case 'sellgrup':
            if (!isGroup) {
               console.log(chalk.yellow.bold('[INFO] ') + chalk.white('Ignored private chat: ') + chalk.gray(text.substring(0, 50)));
               return;
            }
            await getSellgrupHandler(sock, m, args);
            break;
         default:
            console.log(chalk.red.bold('[WARNING] ') + chalk.white('Unknown command: ') + chalk.gray(command));
            break;
      }
   } catch (err) {
      console.error(chalk.red.bold('[ERROR] ') + chalk.white('An error occurred while processing command ') + chalk.gray(command) + '\n' + chalk.gray(err));
      await sock.sendMessage(from, {
         text: `⚠️ Terjadi kesalahan saat memproses perintah *${command}*\n\n\`\`\`${err.message}\`\`\``
      });
   }
}
module.exports = {
   handleMessage
};
