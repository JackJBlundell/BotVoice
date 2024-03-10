const {
  createCommand,
  fixVoiceReceive,
  createVoiceConnectionData,
} = require("../../util.js");
const pcmConvert = require("pcm-convert");

const { createConverter } = require("../../converter");
const { hotword, WARNING_MESSAGE } = require("../../../config/config.json");
const fs = require("fs");
const prism = require("prism-media");

const { VoiceRecognitionService } = require("../../VoiceRecognitionService");
const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  createAudioPlayer,
  NoSubscriberBehavior,
  generateDependencyReport,
  createAudioResource,
  entersState,
  AudioPlayerStatus,
  EndBehaviorType,
} = require("@discordjs/voice");
const { join } = require("path");
const { createReadStream } = require("fs");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
const { pipeline } = require("stream");
ffmpeg.setFfmpegPath(ffmpegPath);
function chunkArray(array, size) {
  return Array.from({ length: Math.ceil(array.length / size) }, (v, index) =>
    array.slice(index * size, index * size + size)
  );
}

// function initPorcupine() {
//   let keywordIDs = {};
//   let sensitivities = [];
//   let keywordIndex = [];
//   for (let id in this.hotwords) {
//     let h = this.hotwords[id];
//     keywordIDs[id] = h.data;
//     this.keywordIndex[sensitivities.length] = id;
//     sensitivities.push(h.sensitivity);
//   }
//   let keywordIDArray = Object.values(keywordIDs);
//   if (sensitivities.length) {
//     return Porcupine.create(keywordIDArray, sensitivities);
//   }
// }
// function processAudio(inputFrame, inputSampleRate,porcupine) {
//   let inputBuffer = [];
//   let hotword = undefined;
//   for (let i = 0; i < inputFrame.length; i++) {
//     inputBuffer.push(inputFrame[i] * 32767);
//   }

//   const PV_SAMPLE_RATE = 16000;
//   const PV_FRAME_LENGTH = 512;
//   let hotwordDetected = null;

//   while (
//     (inputBuffer.length * PV_SAMPLE_RATE) / inputSampleRate >
//     PV_FRAME_LENGTH
//   ) {
//     let outputFrame = new Int16Array(PV_FRAME_LENGTH);
//     let sum = 0;
//     let num = 0;
//     let outputIndex = 0;
//     let inputIndex = 0;

//     while (outputIndex < PV_FRAME_LENGTH) {
//       sum = 0;
//       num = 0;
//       while (
//         inputIndex <
//         Math.min(
//           inputBuffer.length,
//           ((outputIndex + 1) * inputSampleRate) / PV_SAMPLE_RATE
//         )
//       ) {
//         sum += inputBuffer[inputIndex];
//         num++;
//         inputIndex++;
//       }
//       outputFrame[outputIndex] = sum / num;
//       outputIndex++;
//     }

//     let r = processPorcupine(outputFrame);
//     if (r) {
//       hotwordDetected = r;
//     }

//     inputBuffer = inputBuffer.slice(inputIndex);
//   }

//   if (hotwordDetected && (!hotword || hotword === hotwordDetected)) {
//     console.log("HOTWORD!");
//   }

//   return hotwordDetected;
// }

// processPorcupine(data, porcupine, keywordIndex) {
//   if (porcupine) {
//     let id = porcupine.process(data);
//     if (id > -1) {
//       return keywordIndex[id];
//     }
//   }
// }

module.exports = {
  data: new SlashCommandBuilder()
    .setName("connect")
    .setDescription("Connect to server and set up streams."),
  async execute(message) {
    function chunkArray(array, size) {
      return Array.from(
        { length: Math.ceil(array.length / size) },
        (v, index) => array.slice(index * size, index * size + size)
      );
    }
    await message.reply("*begins to tune Lute*");

    try {
      const member = message.member;
      const botPermissions = message.channel.permissionsFor(
        message.client.user
      );

      // Check if bot has permission to message in channel.
      if (!botPermissions.has(PermissionsBitField.Flags.SendMessages)) {
        // Message user for sending message access in respective text channel
        return message.send(
          `I do not have permissions to message in the text channel ${message.channel}. Give me permission or use the command in a different text channel.`
        );
      }

      // Check if there is already a user being listened to (to avoid multiple streams that may break things)
      if (message.client.voiceConnections.get(message.guild.id)) {
        return message.channel.send(
          `Already listening to <@${
            message.client.voiceConnections.get(message.guild.id).listeningTo.id
          }>`
        );
      }

      // User who made the command is not in a voice channel
      if (!member.voice.channel) {
        return await message.channel.send(
          `@${message.user.username} is not connected to a voice channel.`
        );
      }

      const voiceChannelPermissions = member.voice.channel.permissionsFor(
        message.client.user
      );

      // Check if bot has permissions to speak and connection in the user's voice channel
      if (
        !voiceChannelPermissions.has(PermissionsBitField.Flags.Speak) ||
        !voiceChannelPermissions.has(PermissionsBitField.Flags.Connect)
      ) {
        return message.channel
          .send(`Can not connect to<@${message.author.id}>'s voice channel.
              I need speak and connect permissions to the voice channel.`);
      }

      const connection = joinVoiceChannel({
        channelId: member.voice.channel.id,
        guildId: member.voice.channel.guild.id,
        adapterCreator: member.voice.channel.guild.voiceAdapterCreator,
        selfDeaf: false,
      });
      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Pause,
        },
      });

      connection.on(VoiceConnectionStatus.Ready, async () => {
        let resource = createAudioResource(
          createReadStream(join(__dirname, "..", "..", "ping.mp3"))
        );

        // try {
        //   await entersState(connection, VoiceConnectionStatus.Ready, 5000);

        //   console.log("Connected: " + message.channel.guild.name);
        // } catch (error) {
        //   console.log("Voice Connection not ready within 5s.", error);

        //   return null;
        // }

        message.channel.send("*strums a hearty note*");
        player.play(resource);
        connection.subscribe(player);
      });
      connection.on(
        VoiceConnectionStatus.Disconnected,
        async (oldState, newState) => {
          try {
            await Promise.race([
              entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
              entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
            // Seems to be reconnecting to a new channel - ignore disconnect
          } catch (error) {
            // Seems to be a real disconnect which SHOULDN'T be recovered from
            connection.destroy();
          }
        }
      );

      message.channel.send(WARNING_MESSAGE);
      // play static noise to get voice receive functioning. Some undocumented discord requirement to receive audio
      fixVoiceReceive(connection, player);
      // const writeStream = fs.createWriteStream("out.pcm");

      const listenStream = await connection.receiver
        .subscribe(member.user.id, {
          end: {
            behavior: EndBehaviorType.Manual,
          },
        })
        .on("error", (error) => {
          console.log("audioReceiveStream error: ", error);
        });

      // // // // Make voice streams for voice commands
      const voiceRecorderStream = createConverter(listenStream);

      voiceRecorderStream.on("data", (data) => {
        console.log(data);
      });
      const vr = new VoiceRecognitionService(
        hotword,
        connection,
        voiceRecorderStream
      );

      // Store the connection to the server, the voice recognition to the server, the user to listen to, and the text channel
      await message.client.voiceConnections.set(
        message.guild.id,
        createVoiceConnectionData(connection, vr, member.user, message.channel)
      );

      console.log(
        `Guild ${message.guild.id}: created audio stream for ${member.user.username}`
      );
    } catch (error) {
      console.log(error);
    }
  },
};
