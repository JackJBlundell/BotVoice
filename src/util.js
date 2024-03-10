// Currently just a dump of everything that doesn't belong to other files
// TODO need to move to appropriate sections or files.
const { createAudioResource } = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const { join } = require("node:path");
const { createReadStream } = require("node:fs");

function createCommand(name, description, func) {
  return { name: name, description: description, execute: func };
}

function fixVoiceReceive(connection, player) {
  let resource = createAudioResource(
    createReadStream(join(__dirname, "ping.mp3")),
    {
      inlineVolume: true,
    }
  );
  resource.volume.setVolume(1);
  player.play(resource);
  console.log("playing");
  connection.subscribe(player);
}

function createVoiceConnectionData(
  connection,
  VoiceRecognition,
  user,
  textChannel
) {
  return {
    connection: connection,
    textChannel: textChannel,
    voiceRecognition: VoiceRecognition,
    listeningTo: user,
    dispatcher: undefined,
    queue: [],
    playing: undefined,
  };
}

module.exports = { createCommand, fixVoiceReceive, createVoiceConnectionData };
