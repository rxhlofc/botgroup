const {
   default: makeWASocket,
   useMultiFileAuthState,
   DisconnectReason,
   makeCacheableSignalKeyStore
} = require('@shennmine/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk');
const { handleMessage } = require('./handler/messageHandler');

function createReadline() {
   return readline.createInterface({
      input: process.stdin,
      output: process.stdout
   });
}

async function connectToWhatsApp() {
   const { state, saveCreds } = await useMultiFileAuthState('./session');

   const sock = makeWASocket({
      logger: pino({ level: 'fatal' }),
      printQRInTerminal: false,
      auth: {
         creds: state.creds,
         keys: makeCacheableSignalKeyStore(
            state.keys,
            pino().child({ level: 'silent', stream: 'store' })
         ),
      },
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 60000
   });

   sock.ev.on('creds.update', saveCreds);

   sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'close') {
         const shouldReconnect =
            (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

         console.log(
            chalk.yellow.bold('[SYSTEM] ') +
            chalk.yellow('Connection closed. ') +
            (shouldReconnect
               ? chalk.cyan('Reconnecting...')
               : chalk.red('Logged out, exiting.'))
         );

         if (shouldReconnect) {
            await connectToWhatsApp();
         }
      } 
      else if (connection === 'open') {
         console.log(
            chalk.green.bold('✅ [CONNECTED] ') +
            chalk.white('Successfully connected to WhatsApp!')
         );
      }
   });

   sock.ev.on('messages.upsert', async ({ messages }) => {
      const m = messages[0];
      if (!m.message) return;
      if (m.key.remoteJid === 'status@broadcast') return;
      await handleMessage(sock, m);
   });

   if (!state.creds.registered) {
      console.log(
         chalk.blue.bold('\n🔐 [PAIRING REQUIRED] ') +
         chalk.white('No existing session found.')
      );
      console.log(
         chalk.yellow('Enter your WhatsApp number (e.g. 6281234567890):\n')
      );

      const rl = createReadline();
      rl.question(chalk.cyan('📱 Number: '), async (phoneNumber) => {
         rl.close();

         if (!phoneNumber || !/^\d+$/.test(phoneNumber)) {
            console.log(chalk.red.bold('❌ Invalid number. Exiting...'));
            process.exit(1);
         }

         try {
            console.log(chalk.yellow('\n🔄 Generating pairing code, please wait...\n'));
            const code = await sock.requestPairingCode(phoneNumber);

            console.log(
               chalk.green.bold('✅ Pairing Code Generated!\n') +
               chalk.white('Open WhatsApp → Settings → Linked Devices → Connect Device\n') +
               chalk.cyan.bold(`🔗 Your pairing code: ${code}\n`)
            );

            sock.ev.on('creds.update', saveCreds);
         } catch (error) {
            console.error(
               chalk.red.bold('❌ Failed to generate pairing code:\n') +
               chalk.gray(error)
            );
            process.exit(1);
         }
      });
   }

   return sock;
}

console.clear()
console.log(
   chalk.magenta.bold('🚀 [SYSTEM] ') + chalk.white('Starting WhatsApp bot...')
);

connectToWhatsApp().catch(err => {
   console.error(
      chalk.red.bold('\n❌ [ERROR] Connection failed:\n') +
      chalk.gray(err)
   );
   process.exit(1);
});