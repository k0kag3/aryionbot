import { getItemDetail, getLatestUpdates, Item, Update } from "aryjs";
import assert from "assert";
import formatISO from "date-fns/formatISO";
import isBefore from "date-fns/isBefore";
import parseISO from "date-fns/parseISO";
import Discord, { TextChannel } from "discord.js";
import mongoose from "mongoose";
import { commands } from "./commands";
import {
  getAllAryionUsers,
  getSubscriptionsForUser,
  removeSubscriptionForChannel,
  removeSubscriptionForGuild,
  unsubscribe,
} from "./database";
import { SilentError } from "./errors";
import { AryionUser } from "./models/aryionUser";
import { debugNameForSub, log } from "./util";

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
  useCreateIndex: true,
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
    .setURL(update.detailUrl)
    .setAuthor(update.author, item.authorAvatarUrl, update.authorUrl)
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
    embed.setImage(item.images.original);
  }

  return embed;
}

async function findNewItems(aryionUser: AryionUser) {
  const res = await getLatestUpdates(aryionUser.username);

  const embedMessages = (
    await Promise.all(
      res.updates.map(async (update) => {
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
  log("start checking updates");

  try {
    const allAryionUsers = await getAllAryionUsers();
    console.log("users", allAryionUsers.length);

    for (const aryionUser of allAryionUsers) {
      const newItems = await findNewItems(aryionUser);
      if (newItems.length === 0) continue;

      console.log(
        "newItems",
        aryionUser.id,
        aryionUser.username,
        newItems.length
      );

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
          console.log(channel);

          console.log("#", channel.name);
          for (const item of newItems) {
            try {
              await channel.send(item);
            } catch (err) {
              console.log(err);
            }
          }
        })
      );
    }
  } catch (err) {
    console.log(err);
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
  const invalidSubs = await removeSubscriptionForGuild(guild.id);
  console.log(
    `cleanup subscriptions for guild/${guild.id}, count: ${invalidSubs.deletedCount}`
  );
});

client.on("channelDelete", async (channel) => {
  const invalidSubs = await removeSubscriptionForChannel(channel.id);
  console.log(
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
      console.log(`command: ${commandName} [${input}]`);

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
