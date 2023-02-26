const express = require('express')
const { default: makeWASocket, DisconnectReason, downloadContentFromMessage, useMultiFileAuthState, makeInMemoryStore } = require('@adiwajshing/baileys')
const { Boom } = require('@hapi/boom')
const fetch = require("node-fetch")
const pino = require('pino')
const fs = require('fs-extra')

const { sticker } = require('./lib/sticker');
const Monitor = require('ping-monitor');
const monitor = new Monitor({
  website: 'https://1234Sinyo.piyoxz.repl.co',
  title: 'piyo',
  interval: 2
});

monitor.on('up', (res) => console.log(`${res.website} its on.`));
monitor.on('down', (res) => console.log(`${res.website} it has died - ${res.statusMessage}`));
monitor.on('stop', (website) => console.log(`${website} has stopped.`));
monitor.on('error', (error) => console.log(error));


const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!')
})



const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })

function keepAlive() {
  const url = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
  if (/(\/\/|\.)undefined\./.test(url)) return
  setInterval(() => {
    fetch(url).catch(console.error)
  }, 5 * 1000 * 60)
}
async function main() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const conn = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    getMessage: async key => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id)
        return msg?.message || undefined
      }

      // only if store is present
      return {
        conversation: 'hello'
      }
    }
  })



  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut ? main() : console.log('Koneksi Terputus...')
    }
    console.log('Koneksi Terhubung...')
  })

  const getGroupAdmins = (member) => {
    admins = []
    for (let i of member) {
      if (i.admin === "admin" || i.admin === "superadmin")
        admins.push(i.id)
    }
    return admins
  }

  conn.ev.on('messages.upsert', async chat => {
    try {
      m = chat.messages[0]
      console.log(m)
      if (!m.message) return
      m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message
      if (m.key.remoteJid == "6281414046576@s.whatsapp.net") {
        if (m.message.conversation === "halo") {
          conn.sendMessage(m.key.remoteJid, { text: 'halo juga' });
        }
      }
      if (!m.key.fromMe) return
      if (m.key && m.key.remoteJid == 'status@broadcast') return;
      let type = Object.keys(m.message)
      const from = m.key.remoteJid
      const isGroup = from.endsWith('@g.us')
      const content = JSON.stringify(m.message)
      type = (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(type[0]) && type[0]) || (type.length >= 3 && type[1] !== 'messageContextInfo' && type[1]) || type[type.length - 1]
      const body = (type === 'conversation') ? m.message.conversation : (type == 'imageMessage') ? m.message.imageMessage.caption : (type == 'videoMessage') ? m.message.videoMessage.caption : (type == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (type == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (type == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (type == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : (type === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.title || m.text) : ''
      const budo = (type === 'conversation' && m.message.conversation.startsWith('.')) ? m.message.conversation : (type == 'imageMessage') ? m.message.imageMessage.caption : (type == 'videoMessage') ? m.message.videoMessage.caption : (type == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (type == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (type == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (type == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : (type === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.title || m.text) : ''
      const command = budo.slice(1).trim().split(/ +/).shift().toLowerCase()
      const args = body.trim().split(/ +/).slice(1)
      const q = args.join(' ')
      const groupMetadata = isGroup ? await conn.groupMetadata(from) : ''
      const groupMembers = isGroup ? await groupMetadata.participants : ''
      const groupName = isGroup ? groupMetadata.subject : ''
      const botNumber = conn.user.id ? conn.user.id.split(":")[0] + "@s.whatsapp.net" : conn.user.id
      const groupAdmins = isGroup ? await getGroupAdmins(groupMembers) : ''
      const participants = isGroup ? await groupMetadata.participants : ''
      const sender = isGroup ? m.key.participant : m.key.remoteJid
      const isGroupAdmins = isGroup ? groupAdmins.includes(sender) : false
      const isQuotedImage = type === 'extendedTextMessage' && content.includes('imageMessage')
      const isQuotedVideo = type === 'extendedTextMessage' && content.includes('videoMessage')
      if (body === "off") {
        conn.sendPresenceUpdate('unavailable')
        conn.sendMessage(from, { text: "Success Offline" })
      } else if (body === "on") {
        conn.sendPresenceUpdate('available')
        conn.sendMessage(from, { text: "Success Online" })
      }
      if (body === 'tagall' || body === '.') {
        if (isGroup) {
          teks = (args.length > 1) ? body.slice(8).trim() : ''
          teks += `  Total : ${groupMembers.length}\n`
          for (let mem of groupMembers) {
            teks += `╠➥ @${mem.id.split('@')[0]}\n`
          }
          conn.sendMessage(from, { text: '╔══✪〘 Mention All 〙✪══\n╠➥' + teks + `╚═〘 ${groupName} 〙`, mentions: participants.map(a => a.id) }, { quoted: m })
        }
      }

      if (body === "hidetag" || body === "`") {
        if (isGroup) {
          var options = {
            text: "",
            mentions: participants.map(a => a.id)
          }
          conn.sendMessage(from, options)
        }
      }

      if (body === "ping") {
        conn.sendMessage(from, { text: "Bot Online" });
      }

      switch (command) {
        case 'sticker':
        case 's':
        case 'stiker':
          if (type === 'videoMessage' || isQuotedVideo) return conn.sendMessage(from, { text: 'Image Only' })
          const testt = isQuotedImage ? JSON.parse(JSON.stringify(m).replace('quotedM', 'm')).message.extendedTextMessage.contextInfo.message.imageMessage : m.message.imageMessage
          const stream = await downloadContentFromMessage(testt, 'image')
          let buffer = Buffer.from([])
          for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
          }
          const getRandom = (ext) => {
            return `${Math.floor(Math.random() * 10000)}${ext}`
          }
          ran = getRandom('.jpeg')
          await fs.writeFileSync(`./media/${ran}`, buffer)
          const result = await sticker(`./media/${ran}`)
          await conn.sendMessage(from, { sticker: result }, { quoted: m })
          fs.unlinkSync(`./media/${ran}`)
          break
        case 'tag':
          if (!isGroup) return
          var options = {
            text: q,
            mentions: participants.map(a => a.id)
          }
          conn.sendMessage(from, options)
          break;
      }

    } catch (err) {
      console.log(err)
    }
  })

  store?.bind(conn.ev)

  conn.ev.on('creds.update', saveCreds)


}


app.listen(5000, '0.0.0.0', function() {
  keepAlive()
  console.log(`Example app listening at http://localhost:${port}`)
})

main().catch((err) => {
  if (err) return main()
})
