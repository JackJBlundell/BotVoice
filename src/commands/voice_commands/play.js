const { createCommand } = require("../../util");
const ytdl = require("ytdl-core-discord");
const get_yt_url = require("yt-search");
const { SlashCommandBuilder } = require("discord.js");
const { createAudioResource, getVoiceConnection } = require("@discordjs/voice");
const { createReadStream } = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("play an audio"),
  async execute(client, guild, args) {
    const serverInfo = client.voiceConnections.get(guild.id);
    if (args.length === 0)
      return serverInfo.textChannel.send(
        "Did not receive any song argument when attempting 'play'"
      );
    const song = args.join(" ");

    const videos = await get_yt_url(song);
    const songInfo = {
      title: videos.videos[0].title,
      url: videos.videos[0].url,
      stream: await ytdl(videos.videos[0].url, { highWaterMark: 1 << 25 }),
    };
    if (!serverInfo.dispatcher) realPlay(serverInfo, guild, songInfo);
    else {
      serverInfo.textChannel.send(
        `A song is already playing. Queuing the query: ${songInfo.url}`
      );
      console.log(`Guild ${guild.id}: Adding ${songInfo.url} to queue`);
      serverInfo.queue.push(songInfo);
    }
  },
};

function realPlay(serverInfo, guild, songInfo) {
  serverInfo.playing = songInfo;

  serverInfo.textChannel.send(`Playing ${serverInfo.playing.url}`);
  console.log(`Guild ${guild.id}: Playing ${serverInfo.playing.url}`);

  let resource = createAudioResource(
    createReadStream(join(__dirname, "..", "..", serverInfo.playing.url))
  );

  const connection = getVoiceConnection(guild.id);

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });

  player.play(resource);
  connection.subscribe(player);
}
