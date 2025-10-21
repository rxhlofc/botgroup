const chalk = require('chalk');
const moment = require('moment');

async function getSellgrupHandler(sock, m, args) {
  try {
    const from = m.key.remoteJid;
    const sender = m.key.participant;
    const textMsg = m.message.extendedTextMessage?.text || '';
    const tagged = m.message.extendedTextMessage?.contextInfo?.mentionedJid || [];

    console.log(
      chalk.cyan.bold('[TASK] ') +
      chalk.white('Starting ') +
      chalk.magenta('.sellgrup ') +
      chalk.white(`process for group: `) +
      chalk.green(from)
    );

    const groupMetadata = await sock.groupMetadata(from);
    const botNumber = sock.user.id;
    const botIsAdmin = groupMetadata.participants.some(
      (p) => p.id === botNumber && (p.admin === 'admin' || p.admin === 'superadmin')
    );
    const senderIsAdmin = groupMetadata.participants.some(
      (p) => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin')
    );

    // Uncomment if you want admin validation
    /*
    if (!botIsAdmin) {
      await sock.sendMessage(from, { text: '⚠️ *Bot must be an admin* to execute this command.' });
      console.log(chalk.red.bold('[ERROR] ') + chalk.white('Bot is not admin.'));
      return;
    }

    if (!senderIsAdmin) {
      await sock.sendMessage(from, { text: '⚠️ *Only group admins can use this command!*' });
      console.log(chalk.red.bold('[ERROR] ') + chalk.white('Sender is not admin.'));
      return;
    }
    */

    if (tagged.length === 0) {
      await sock.sendMessage(from, {
        text: 'ℹ️ No members were tagged. All members (except admins, bot, and sender) will be removed.',
      });
      console.log(
        chalk.yellow.bold('[INFO] ') +
        chalk.white('No members tagged; defaulting to full member removal.')
      );
    }

    const excluded = new Set(tagged);
    excluded.add(botNumber);
    excluded.add(sender);
    for (const p of groupMetadata.participants) {
      if (p.admin) excluded.add(p.id);
    }

    const initialCount = groupMetadata.participants.length;
    const startTime = new Date();
    const creationDate = new Date(groupMetadata.creation * 1000);
    const formattedCreation = creationDate.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    console.log(
      chalk.blue.bold('[ACTION] ') +
      chalk.white('Starting member removal... ') +
      chalk.gray(`(${initialCount} total, ${excluded.size} protected)`)
    );

    await sock.sendMessage(from, {
      text: `🚀 *Starting .sellgrup process...*\n\n📊 *Initial Members:* ${initialCount}\n🛡️ *Protected:* ${excluded.size} (bot, sender, admins, and tagged)\n🕒 *Started At:* ${startTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`,
    });

    const participantsToKick = groupMetadata.participants.filter((p) => !excluded.has(p.id));
    let kickedCount = 0;

    for (let i = 0; i < participantsToKick.length; i++) {
      const participant = participantsToKick[i];
      try {
        await sock.groupParticipantsUpdate(from, [participant.id], 'remove');
        kickedCount++;

        if (kickedCount % 10 === 0 || i === participantsToKick.length - 1) {
          console.log(
            chalk.cyan.bold('[PROGRESS] ') +
            chalk.white(`Removed ${kickedCount}/${participantsToKick.length} members...`)
          );

          await sock.sendMessage(from, {
            text: `📤 *Progress:* ${kickedCount}/${participantsToKick.length} members removed...`,
          });
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        await new Promise((resolve) => setTimeout(resolve, 600));
      } catch (error) {
        console.error(
          chalk.red.bold('[ERROR] ') +
          chalk.white(`Failed to remove ${participant.id}`) +
          '\n' + chalk.gray(error)
        );
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    const endTime = new Date();
    const executionTime = ((endTime - startTime) / 1000).toFixed(1);

    const summary = `
📊 *GROUP SUMMARY*

🏷️ *Group Name:* ${groupMetadata.subject}
🆔 *Group ID:* ${from}
📅 *Created On:* ${formattedCreation}
👥 *Initial Members:* ${initialCount}
🗑️ *Removed:* ${kickedCount}
⏱️ *Execution Time:* ${executionTime} seconds
📆 *Finished At:* ${endTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}

✅ *Process completed successfully.*
`;

    await sock.sendMessage(from, { text: summary.trim() });

    console.log(
      chalk.green.bold('[RESULT] ') +
      chalk.white(`.sellgrup completed for group `) +
      chalk.green(groupMetadata.subject) +
      chalk.white(` | Members removed: `) +
      chalk.yellow(kickedCount) +
      chalk.white(` | Duration: `) +
      chalk.cyan(`${executionTime}s`)
    );
  } catch (err) {
    console.error(
      chalk.red.bold('[ERROR] ') +
      chalk.white('Unhandled exception in ') +
      chalk.magenta('.sellgrup') +
      '\n' + chalk.gray(err)
    );
    await sock.sendMessage(m.key.remoteJid, {
      text: '❌ Failed to execute sell group process.',
    });
  }
}

async function searchGroupByYearHandler(sock, m, args) {
  const from = m.key.remoteJid;
  if (!args) {
    await sock.sendMessage(from, { text: '❗ Enter the year of the group you want to search for.\n\nExample: *.searchgc 2017*' });
    return;
  }

  const year = parseInt(args);
  if (isNaN(year) || year < 2009 || year > new Date().getFullYear()) {
    await sock.sendMessage(from, { text: '❗ Invalid year. Enter the correct year, for example: *.searchgc 2019*' });
    return;
  }

  await sock.sendMessage(from, { text: `🔍 Searching for groups created in *${year}*... Please wait.` });
  console.log(`[SEARCHGC] Searching for groups created in ${year}`);

  try {
    const groups = await sock.groupFetchAllParticipating();
    const groupList = Object.values(groups);

    const targetGroups = groupList.filter(g => {
      const createdYear = new Date(g.creation * 1000).getFullYear();
      return createdYear === year;
    });

    if (targetGroups.length === 0) {
      await sock.sendMessage(from, { text: `❌ No groups created in the year were found *${year}*.` });
      return;
    }

    await sock.sendMessage(from, { text: `✅ Found *${targetGroups.length}* group created in the year *${year}*.\nThe bot will send messages to each of these groups.` });

    for (const gc of targetGroups) {
      const date = new Date(gc.creation * 1000).toLocaleDateString('id-ID');
      await sock.sendMessage(gc.id, {
        text: `📅 This group was created in the year *${year}* (📆 ${date})`
      });
      console.log(`[SENT] Message sent to group: ${gc.subject} (${gc.id})`);
      await new Promise(r => setTimeout(r, 1500)); 
    }

    await sock.sendMessage(from, { text: `📬 Message has been sent to all year groups *${year}*.` });

  } catch (err) {
    console.error(`[ERROR] searchgc failed: ${err}`);
    await sock.sendMessage(from, { text: '❌ An error occurred while searching for groups.' });
  }
}

module.exports = { getSellgrupHandler, searchGroupByYearHandler };