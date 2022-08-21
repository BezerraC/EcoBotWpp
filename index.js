const mime = require('mime-types');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');
const { Client, Location, MessageMedia, List, Buttons, LocalAuth} = require('whatsapp-web.js');
const PORT = process.env.PORT || 8080;
const express = require('express');
const app = express();

app.get('/',function(req, res) {
    res.sendFile(path.join(__dirname, '/index.html'));

(async () => {
	const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox','--disable-setuid-sandbox']
    });
	await browser.close();
})();

//this make the chromium dont open in heroku
const client = new Client({
	ffmpeg:'./ffmpeg',
    authStrategy: new LocalAuth(),
    puppeteer: { args: ["--no-sandbox"] }
    // puppeteer: { headless: true }
});



client.on('qr', qr => {
    // NOTE: This event will not be fired if a session is specified.
	qrcode.generate(qr, {small: true});
    console.log('QR RECEIVED', qr);
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    console.log('READY');
});

client.on('message', async msg => {
	let chat = await msg.getChat();
	//console.log(chat);
	chat.sendSeen();
    console.log('MESSAGE RECEIVED', msg);

    if (msg.body === '!help') {
        // testing msg
        const contact = await msg.getContact();
        const chat = await msg.getChat();
        chat.sendMessage(`Olá @${contact.number} tudo bom, confira um pouco das minhas funcionalidades:\n
*Comandos | Privado*
1. !info - veja minhas informações\n
2. sticker - basta enviar uma imagem, vídeo ou gif no meu pv que eu converto em figurinha para você\n
        
*Comandos | Grupo*
1. !groupinfo - veja informações do grupo\n
2. !subject - mude o titulo do grupo\n
3. !desc - mude a descrição do grupo\n\n
Caso encontre algum bug entre em contato com meu criador @Carlos Bezerra (+5596991750492)`, {
            mentions: [contact]});
        // Send a new message as a reply to the current one
        // msg.reply(`
        // Olá 
        // *Comandos | Privado*
		// 1. !info - veja minhas informações\n
		// 2. sticker - basta enviar uma imagem, vídeo ou gif no meu pv que eu converto em figurinha para você\n\n
        
        // *Comandos | Grupo*
        // 1. !groupinfo - veja informações do grupo\n
		// 2. !subject - mude o titulo do grupo\n
		// 3. !desc - mude a descrição do grupo\n`);

    } else if (msg.body === '!ping') {
        // Send a new message to the same chat
        client.sendMessage(msg.from, 'pong');

    } else if (msg.body.startsWith('!sendto ')) {
        // Direct send a new message to specific id
        let number = msg.body.split(' ')[1];
        let messageIndex = msg.body.indexOf(number) + number.length;
        let message = msg.body.slice(messageIndex, msg.body.length);
        number = number.includes('@c.us') ? number : `${number}@c.us`;
        let chat = await msg.getChat();
        chat.sendSeen();
        client.sendMessage(number, message);

    } else if (msg.body.startsWith('!subject ')) {
        // Change the group subject
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newSubject = msg.body.slice(9);
            chat.setSubject(newSubject);
        } else {
            msg.reply('Este comando só pode ser usado em um grupo!');
        }
    } else if (msg.body.startsWith('!echo ')) {
        // Replies with the same message
        msg.reply(msg.body.slice(6));
    } else if (msg.body.startsWith('!desc ')) {
        // Change the group description
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newDescription = msg.body.slice(6);
            chat.setDescription(newDescription);
        } else {
            msg.reply('Este comando só pode ser usado em um grupo!');
        }
    } else if (msg.body === '!leave') {
        // Leave the group
        let chat = await msg.getChat();
        if (chat.isGroup) {
            chat.leave();
        } else {
            msg.reply('Este comando só pode ser usado em um grupo!');
        }
    } else if (msg.body.startsWith('!join ')) {
        const inviteCode = msg.body.split(' ')[1];
        try {
            await client.acceptInvite(inviteCode);
            msg.reply('Entrou no grupo!');
        } catch (e) {
            msg.reply('O codigo de convite é invalído.');
        }
    } else if (msg.body === '!groupinfo') {
        let chat = await msg.getChat();
        if (chat.isGroup) {
            msg.reply(`
*Detalhes do Grupo*
Nome: ${chat.name}
Descrição: ${chat.description}
Criado em: ${chat.createdAt.toString()}
Criado por: ${chat.owner.user}
Total de participantes: ${chat.participants.length}
            `);
        } else {
            msg.reply('Este comando só pode ser usado em um grupo!');
        }
    } else if (msg.body === '!chats') {
        const chats = await client.getChats();
        client.sendMessage(msg.from, `O Bot tem ${chats.length} chats abertos.`);
    } else if (msg.body === '!info') {
        let info = client.info;
        client.sendMessage(msg.from, `
*Minhas informações*
Nome: ${info.pushname}
Meu número: ${info.wid.user}
Plataforma: ${info.platform}
        `);
    } else if (msg.body.startsWith('!status ')) {
        const newStatus = msg.body.split(' ')[1];
        await client.setStatus(newStatus);
        msg.reply(`Os Status foram atualizados para *${newStatus}*`);
    } else if (msg.body === 'Eae eco') {
        const contact = await msg.getContact();
        const chat = await msg.getChat();
        chat.sendMessage(`Salve @${contact.number} como vai`, {
            mentions: [contact]
        });
    } else if (msg.body === '!delete') {
        if (msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.fromMe) {
                quotedMsg.delete(true);
            } else {
                msg.reply('I can only delete my own messages');
            }
        }
    } else if (msg.body === '!pin') {
        const chat = await msg.getChat();
        await chat.pin();
    } else if (msg.body === '!archive') {
        const chat = await msg.getChat();
        await chat.archive();
    } else if (msg.body === '!mute') {
        const chat = await msg.getChat();
        // mute the chat for 20 seconds
        const unmuteDate = new Date();
        unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);
        await chat.mute(unmuteDate);
    } else if (msg.body === '!typing') {
        const chat = await msg.getChat();
        // simulates typing in the chat
        chat.sendStateTyping();
    } else if (msg.body === '!recording') {
        const chat = await msg.getChat();
        // simulates recording audio in the chat
        chat.sendStateRecording();
    } else if (msg.body === '!clearstate') {
        const chat = await msg.getChat();
        // stops typing or recording in the chat
        chat.clearState();
    } else if (msg.body === '!jumpto') {
        if (msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            client.interface.openChatWindowAt(quotedMsg.id._serialized);
        }
    } else if (msg.body === '!buttons') {
        let button = new Buttons('Button body',[{body:'bt1'},{body:'bt2'},{body:'bt3'}],'title','footer');
        client.sendMessage(msg.from, button);
    } else if (msg.body === '!list') {
        let sections = [{title:'sectionTitle',rows:[{title:'ListItem1', description: 'desc'},{title:'ListItem2'}]}];
        let list = new List('List body','btnText',sections,'Title','footer');
        client.sendMessage(msg.from, list);
    } else if (msg.body === '!reaction') {
        msg.react('👍');
    } else if(!chat.isGroup){
		if(msg.hasMedia){
			msg.downloadMedia().then(media => {

				if (media) {
	
					const mediaPath = './downloaded-media/';
	
					if (!fs.existsSync(mediaPath)) {
						fs.mkdirSync(mediaPath);
					}
					const extension = mime.extension(media.mimetype);
	
					const filename = new Date().getTime();
	
					const fullFilename = mediaPath + filename + '.' + extension;
	
					// Salvando o arquivos na pastar downloaded media
					try {
						fs.writeFileSync(fullFilename, media.data, { encoding: 'base64' });
						console.log('Arquivo baixado com sucesso', fullFilename);
						console.log(fullFilename);
						MessageMedia.fromFilePath(filePath = fullFilename)
						client.sendMessage(msg.from, new MessageMedia(media.mimetype, media.data, filename), { sendMediaAsSticker: true,stickerAuthor:"Criado Por Eco Bot",stickerName:"Sticker"} )
						fs.unlinkSync(fullFilename)
						console.log(`Arquivo deletado com sucesso`,);
						msg.react('👍');
					} catch (err) {
						console.log('Falha ao salvar o arquivo:', err);
						console.log(`Arquivo deletado com sucesso`,);
					}
				}
			})
		}
	} else{
        client.sendMessage('Desculpe ainda não consigo entender o que você escreveu.');
    }
		
});

client.on('message_create', (msg) => {
    // Fired on all message creations, including your own
    if (msg.fromMe) {
        // do stuff here
    }
});

client.on('message_revoke_everyone', async (after, before) => {
    // Fired whenever a message is deleted by anyone (including you)
    console.log(after); // message after it was deleted.
    if (before) {
        console.log(before); // message before it was deleted.
    }
});

client.on('message_revoke_me', async (msg) => {
    // Fired whenever a message is only deleted in your own view.
    console.log(msg.body); // message before it was deleted.
});

client.on('message_ack', (msg, ack) => {
    /*
        == ACK VALUES ==
        ACK_ERROR: -1
        ACK_PENDING: 0
        ACK_SERVER: 1
        ACK_DEVICE: 2
        ACK_READ: 3
        ACK_PLAYED: 4
    */

    if(ack == 3) {
        // The message was read
    }
});

client.on('group_join', (notification) => {
    // User has joined or been added to the group.
    console.log('join', notification);
    notification.reply('Novo usuário adicionado.');
});

client.on('group_leave', (notification) => {
    // User has left or been kicked from the group.
    console.log('leave', notification);
    notification.reply('Usuário saiu.');
});

client.on('group_update', (notification) => {
    // Group picture, subject or description has been updated.
    console.log('update', notification);
});

client.on('change_state', state => {
    console.log('CHANGE STATE', state );
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});


client.on('ready', () => {
    console.log('Client is ready!');
});

// Initialize
client.initialize();


res.send()

});

app.listen(PORT,()=>{
    console.log(`PORT LISTENING ON ${PORT}`);
});