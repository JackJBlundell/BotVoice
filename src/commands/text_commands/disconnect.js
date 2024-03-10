const { SlashCommandBuilder } = require("discord.js");
const { createCommand } = require("../../util.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("disconnect from author's voice channel"),
  async execute(message) {
    {
      const serverInfo = message.client.voiceConnections.get(message.guild.id);

      console.log(serverInfo);
      console.log(message.client.voiceConnections);
      // leave the server
      await serverInfo.connection.disconnect();

      // destroy the voice recognition service
      await serverInfo.voiceRecognition.shutdown();

      // Remove from storage
      message.client.voiceConnections.delete(message.guild.id);

      console.log(
        `Deleted entry: Guild ${message.guild.id} from voice connections list.`
      );
    }
  },
};
