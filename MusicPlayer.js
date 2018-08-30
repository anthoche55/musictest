'use strict';
const tool = require('../tool.js');
const config = require('../config.json')

/*
Le lecteur de musique pour une guilde.
Gère la file d'attente et le streaming des morceaux.
*/
class MusicPlayer {
    constructor(guild) {
        this.queue = [];
        this.musicChannel = null;
        this.voiceConnection = null;
        this.dispatch = null;
        this.volume = 1;
        this.status = 'offline'; //States: offline, playing, stopped
        this.inactivityTimer = 60;
    }

    /*
     Ajoute la chanson à la file d'attente.
     Si un argument d'index est inclus, insérez la chanson à cet index au lieu de la pousser dans la file d'attente.
     @param {Object} chanson La chanson à faire la queue.
     @param {Number} [index] L'index pour insérer la chanson à.
     */
    queueSong(song) {
        let index;
        if (arguments.length == 2)
            index = arguments[1];
        if (index != undefined) {
            this.queue[index] = song;
        } else {
            this.queue.push(song);
        }
    }

    /*
         Une fonction récursive qui joue la file d'attente.
         */
    playSong(msg) {
        if (this.queue.length === 0) {
            this.musicChannel.send('File d\'attente vide.');
            this.changeStatus('stopped');
        } else {
            resolveVoiceChannel.call(this).then(() => {
                let song = this.queue[0];
                let stream = song.getStream();
                console.log(song.thumbnail);
                this.musicChannel.send({embed: {
                    color: 3447003,
                    fields: [{
                        name: `:notes: Lecture en cours `,
                        value: `[${song.title}]`+`(${song.url}) (\`${song.time}\`) demandé par  **${song.author}**`
                      }],
                    timestamp: new Date(),
                    footer: {
                      icon_url: msg.author.avatarURL,
                      text: "Tamaki Yagami"
                    }
                  }
                });
                this.changeStatus('playing');
                this.dispatch = this.voiceConnection.playStream(stream, {
                    passes: 2,
                    volume: this.volume
                });

                this.dispatch.on('error', error => {
                    this.dispatch = null;
                    this.queue.shift();
                    this.playSong(msg);
                });

                this.dispatch.on('end', reason => {
                    this.dispatch = null;
                    this.queue.shift();
                    if (reason != 'leave') {
                        this.playSong(msg);
                    }
                });

                this.dispatch.on('debug', info => {
                    console.log(info);
                });
            }).catch(err => {
                if (err != 'novoice') console.log(err);
            });
        }

        /*
         Résout le canal vocal.
         @return Promise - résolu si le bot est connecté à un canal vocal et rejeté si ce n'est pas le cas.
         */
        function resolveVoiceChannel() {
            return new Promise((resolve, reject) => {
                if (this.voiceConnection)
                    resolve();
                else {
                    msg.channel.send(
                        `S'il vous plaît appelez-moi en utilisant ${tool.wrap (`${config.prefix}Music join`)} pour commencer à jouer la file d'attente.`
                    );
                    reject('novoice');
                }
            });
        }
    }

    /*
    Skips the current song.
    */
    skipSong() {
        if (this.dispatch && this.status == 'playing') {
            this.musicChannel.send(`:fast_forward: Sauté ${tool.wrap(this.queue[0].title)}`);
            this.dispatch.end();
        } else {
            this.musicChannel.send(`Il n'y a rien à ignorer!`);
        }
    }

    /*
    Pauses the dispatcher.
    */
    pauseSong() {
        if (this.dispatch)
            this.dispatch.pause();
        else
            this.musicChannel.send(`Rien ne joue en ce moment.`);
    }

    /*
    Resumes the dispatcher.
    */
    resumeSong() {
        if (this.dispatch)
            this.dispatch.resume();
        else
            this.musicChannel.send(`Rien ne joue en ce moment.`);

    }

    /*
    Prints the queue.
    */
    printQueue(msg) {
        if (this.queue.length > 0) {
            try {
                let queueString = '';
                for (let i = 0; i < this.queue.length && i < 15; i++)
                    queueString += `${i + 1}. ${this.queue[i].title} (\`${this.queue[i].time}\`) demandé par ${this.queue[i].author}\n`;
                if (this.queue.length > 15)
                    queueString += `\net ${this.queue.length - 15} plus.`;
                msg.channel.send(queueString, {
                    'code': true
                });
            } catch (err) {
                console.log('ERROR CAUGHT:\n' + err);
                msg.channel.send(
                    `${tool.inaError} Je ne peux pas afficher la file d'attente maintenant. Réessayez dans quelques instants.`
                );
            }
        } else {
            msg.channel.send(`Il n'y a pas de chansons dans la file d'attente!`);
        }
    }

    /*
    Clears the queue.
    */
    purgeQueue(msg) {
        this.queue = [];
        msg.channel.send('La file d\'attente a été effacée.');
    }

    /*
    Displays the currently playing song.
    */
    nowPlaying(msg) {
        if (this.queue.length > 0){
            msg.channel.send({embed: {
                    color: 3447003,
                    fields: [{
                        name: `:notes: Lecture en cours`,
                        value: `[${this.queue[0].title}]`+`(${this.queue[0].url}) (\`${this.queue[0].time}\`) demandé par **${this.queue[0].author}**`
                      }],
                    timestamp: new Date(),
                    footer: {
                      text: "Tamaki Yagami",
                      icon_url: msg.author.avatarURL
                      
                    }
                  }
                });
        }else{
            msg.channel.send('Rien ne joue en ce moment.');
        }
    }

    /*
    Sets the volume of the dispatcher.
    */
    setVolume(msg) {
        let vol = parseInt(msg.content.split(/\s+/)[2]) / 200;
        if (vol && (vol >= 0 && vol <= 1)) {
            if (this.dispatch) {
                this.dispatch.setVolume(vol);
                this.volume = vol;
                msg.channel.send(`:speaker: Volume défini sur ${tool.wrap(vol * 100)}%`);
            } else {
                msg.channel.send(`Rien ne joue en ce moment.`);
            }
        } else {
            msg.channel.send(`Utilisez un nombre entre 0 et 100!`);
        }
    }

    /*
    Summons the bot to the user's voice channel.
    */
    joinVc(msg) {
        if (msg.member.voiceChannel) {
            this.musicChannel = msg.channel;
            msg.member.voiceChannel.join().then(connection => {
                this.voiceConnection = connection;
                this.musicChannel.send(
                    `Rejoint et lié à :speaker: **${msg.member.voiceChannel.name}** et #**${this.musicChannel.name}**.`
                );
                this.changeStatus('stopped');
                if (this.queue.length > 0)
                    this.playSong(msg);
            })
        } else {
            msg.channel.send(`Vous n'êtes pas dans un canal vocal!`);
        }
    }

    /*
    Disconnects from the voice channel.
    */
    leaveVc(msg) {
        if (this.voiceConnection) {
            this.musicChannel.send(`En quittant **${this.voiceConnection.channel.name}**.`);
            this.musicChannel = null;
            if (this.dispatch)
                this.dispatch.end('leave');
            this.voiceConnection.disconnect();

            this.changeStatus('offline');

            this.voiceConnection = null;
            this.dispatch = null;
        } else {
            msg.channel.send(`Je ne suis pas dans un canal vocal!`);
        }
    }

    /*
    Changes the status of the bot.
    @param {String} status The status to set the bot to.
    */
    changeStatus(status) {
        this.status = status;
        this.inactivityTimer = status == 'paused' ?
            600 :
            120;
    }
}

module.exports = MusicPlayer;