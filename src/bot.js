/**
 * Create the function bot here and all the bot controls.
 * Use index.js to start the bot.
 */

// Require the necessary discord.js classes
const {
  Client,
  Events,
  GatewayIntentBits,
  Collection,
  Partials,
} = require("discord.js");
const { token } = require("../config.json");
const fs = require("fs");
const { createAudioPlayer } = require("@discordjs/voice");
const env = require("dotenv").config({ path: "../.env" });

// Create a new client instance

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.textCommands = new Collection();
client.voiceCommands = new Collection();
client.voiceConnections = new Collection();

const textCommandFiles = fs
  .readdirSync("./commands/text_commands")
  .filter((file) => file.endsWith(".js"));
const voiceCommandFiles = fs
  .readdirSync("./commands/voice_commands")
  .filter((file) => file.endsWith(".js"));

// add text commands
for (const file of textCommandFiles) {
  let filePath = `./commands/text_commands/${file}`;
  const command = require(filePath);
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ("data" in command && "execute" in command) {
    client.textCommands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

// add voice commands
for (const file of voiceCommandFiles) {
  const command = require(`./commands/voice_commands/${file}`);
  client.voiceCommands.set(command.name, command);
}

client.on("error", (error) => console.error("error", error));

// // Checks for text commands
client.on("message", (message) => {
  if (!message.content.startsWith(config.prefix) || message.author.bot) return;

  const args = message.content.slice(config.prefix.length).trim().split(" ");
  const command = client.textCommands.get(args.shift().toLowerCase());
  if (command !== undefined) command.execute(message, args);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.textCommands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

// // Disconnects if user has changed channels or disconnects from the voice channel
client.on("voiceStateUpdate", (oldState, newState) => {
  if (
    oldState.channelId !== newState.channelId &&
    client.voiceConnections.find((info) => info.listeningTo.id === newState.id)
  ) {
    client.textCommands.get("disconnect").execute(newState);
  }
});

// // client.on('debug', console.log);

// Log in to Discord with your client's token
client.login(token);
