const { SlashCommandBuilder } = require("discord.js");
const { createCommand } = require("../../util");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("pause the audio playing"),
  async execute(client, guild, args) {
    const serverInfo = client.voiceConnections.get(guild.id);
    console.log(`Guild ${guild.id}: Pausing ${serverInfo.playing.url}`);
    if (serverInfo.dispatcher === undefined) {
      console.log("no dispatcher on this server");
      return;
    }
    serverInfo.dispatcher.pause();
  },
};
