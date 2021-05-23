import Discord, { TextChannel } from "discord.js";
import mongoose from "mongoose";
import assert from "assert";
import parseISO from "date-fns/parseISO";
import formatISO from "date-fns/formatISO";
import isBefore from "date-fns/isBefore";

import { getLatestUpdates, getItemDetail, Item, Update } from "./aryion";
import { commands } from "./commands";
import { log, debugNameForSub } from "./util";
import { SilentError } from "./errors";
import {
  getSubscriptionsForUser,
  removeSubscriptionForGuild,
  removeSubscriptionForChannel,
  getAllAryionUsers,
  unsubscribe,
} from "./database";
import { AryionUser } from "./models/aryionUser";

const PREFIX = process.env.ARYION_BOT_PREFIX || "!aryion";
const INTERVAL = process.env.ARYION_BOT_INTERVAL
  ? parseInt(process.env.ARYION_BOT_INTERVAL)
  : 1000 * 60 * 60;

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
assert(DISCORD_TOKEN, "DISCORD_TOKEN is missing");
const MONGODB_URL = process.env.MONGODB_URL;
assert(MONGODB_URL, "MONGODB_URL is missing");

mongoose.connect(MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkPermission(message: Discord.Message) {
  if (message.channel.type !== "text") {
    throw new SilentError();
  }

  const hasPermission = message.channel
    .permissionsFor(message.author)
    ?.has("MANAGE_CHANNELS");

  if (!hasPermission) {
    throw new Error("You don't have enough permission.");
  }
}

function createEmbedMessage(update: Update, item: Item): Discord.MessageEmbed {
  const embed = new Discord.MessageEmbed()
    .setTitle(update.title)
    .setURL(update.detailURL)
    .setAuthor(update.author, item.authorAvatarURL, update.authorURL)
    .setDescription(update.shortDescription)
    .addField("Tags", update.tags.slice(0, 10).join(" ") + " [omitted]")
    .setTimestamp(parseISO(update.created));

  if (update.previewUrl) {
    embed.setThumbnail(update.previewUrl);
  }

  if (update.previewText) {
    embed.addField("Preview", update.previewText);
  }

  if (item.type === "image") {
    embed.setImage(item.imageURL);
  }

  return embed;
}

async function findNewItems(aryionUser: AryionUser) {
  const updates = await getLatestUpdates(aryionUser.username);

  const embedMessages = (
    await Promise.all(
      updates.map(async (update) => {
        if (
          aryionUser.lastUpdate &&
          isBefore(parseISO(update.created), parseISO(aryionUser.lastUpdate))
        ) {
          return;
        }

        const item = await getItemDetail(update.itemId);
        const embed = createEmbedMessage(update, item);
        return embed;
      })
    )
  ).filter((s): s is Discord.MessageEmbed => s !== undefined);

  await aryionUser.updateOne({ lastUpdate: formatISO(new Date()) });

  return embedMessages;
}

async function periodicChecks() {
  log("start checking updates", new Date());

  const allAryionUsers = await getAllAryionUsers();
  console.log("users", allAryionUsers.length);

  for (const aryionUser of allAryionUsers) {
    console.log(aryionUser.id, aryionUser.username);

    const newItems = await findNewItems(aryionUser);
    if (newItems.length === 0) continue;

    console.log("newItems", newItems.length);

    const subs = await getSubscriptionsForUser(aryionUser);
    await Promise.all(
      subs.map(async (sub) => {
        const channel = await client.channels.fetch(sub.channelId);
        if (!channel) {
          console.log(
            `invalid subscription found. delete ${debugNameForSub(sub)}`
          );
          return await unsubscribe(aryionUser.id, sub.channelId);
        }

        if (!(channel instanceof TextChannel)) {
          console.log("not TextChannel", channel.type, channel.id);
          return;
        }

        console.log("#", channel.name);

        for (const item of newItems) {
          await channel.send(item);
        }
      })
    );
  }
}

process.on("unhandledRejection", (error) => {
  console.log("Uncaught Promise Rejection", error);
});

const client = new Discord.Client();

client.once("ready", () => {
  console.log("ready", INTERVAL);

  setInterval(periodicChecks, INTERVAL);
  periodicChecks();
});

client.on("guildDelete", async (guild) => {
  log("guildDelete");
  const invalidSubs = await removeSubscriptionForGuild(guild.id);
  log(
    `cleanup subscriptions for guild/${guild.id}, count: ${invalidSubs.deletedCount}`
  );
});

client.on("channelDelete", async (channel) => {
  log("channelDelete");
  const invalidSubs = await removeSubscriptionForChannel(channel.id);
  log(
    `cleanup subscriptions for channel/${channel.id}, count: ${invalidSubs.deletedCount}`
  );
});

client.on("message", async (message) => {
  try {
    if (message.content.startsWith(PREFIX)) {
      await checkPermission(message);

      const input = message.content.slice(PREFIX.length + 1).split(" ");
      const commandName = input.shift()!;
      const args = input;
      log(`command: ${commandName} [${input}]`);

      const command = commands.find(
        (command) => command.command === commandName
      );
      if (!command) {
        throw new Error(`Unrecognized command: ${commandName}`);
      }

      await command.handler({ message, command: commandName, args });
    }
  } catch (err) {
    console.log(err);

    if (err instanceof SilentError) return;
    await message.reply(err.message);
  }
});

client.login(DISCORD_TOKEN);
