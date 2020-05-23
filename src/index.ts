import Discord, {TextChannel} from 'discord.js';
import mongoose from 'mongoose';
import assert from 'assert';
import parseISO from 'date-fns/parseISO';
import formatISO from 'date-fns/formatISO';
import isBefore from 'date-fns/isBefore';

import {getLatestUpdates, getItemDetail, Item, Update} from './aryion';
import {Watch} from './models/watch';
import {commands} from './commands';
import {log, canonicalName} from './util';
import {SilentError} from './errors';
import {getWatches, removeWatches} from './database';

const PREFIX = '!aryion ';
const CHECK_INTERVAL = 1000 * 60 * 10;

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
assert(DISCORD_TOKEN, 'DISCORD_TOKEN is missing');
const MONGODB_URL = process.env.MONGODB_URL;
assert(MONGODB_URL, 'MONGODB_URL is missing');

mongoose.connect(MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkPermission(message: Discord.Message) {
  if (message.channel.type !== 'text') {
    throw new SilentError();
  }

  const hasPermisson = message.channel
    .permissionsFor(message.author)
    ?.has('MANAGE_CHANNELS');

  if (!hasPermisson) {
    throw new Error("You don't have enough permission.");
  }
}

function createEmbedMessage(update: Update, item: Item) {
  return new Discord.MessageEmbed()
    .setTitle(update.title)
    .setURL(update.detailURL)
    .setAuthor(update.author, item.authorAvatarURL, update.authorURL)
    .setThumbnail(update.thumbnailURL)
    .setDescription(update.shortDescription)
    .addField('Tags', update.tags.slice(0, 10).join(' ') + ' [omitted]')
    .setImage(item.imageURL)
    .setTimestamp(parseISO(update.created));
}

async function getUpdatesEmbeds(watch: Watch) {
  log('getUpdatesEmbeds', canonicalName(watch));

  const updates = await getLatestUpdates(watch.aryionUsername);

  const embedMessages = (
    await Promise.all(
      updates.map(async (update) => {
        if (
          watch.lastUpdate &&
          isBefore(parseISO(update.created), parseISO(watch.lastUpdate))
        ) {
          return;
        }

        const item = await getItemDetail(update.itemID);
        const embed = createEmbedMessage(update, item);
        return embed;
      }),
    )
  ).filter((s): s is Discord.MessageEmbed => s !== undefined);

  watch.lastUpdate = formatISO(new Date());
  await watch.save();

  return embedMessages;
}

async function checkUpdates() {
  log('start checking updates', new Date());

  const watches = await getWatches();
  log('num of watches', watches.length);

  for (const watch of watches) {
    const channel = client.channels.cache.get(watch.channelID) as
      | TextChannel
      | undefined;
    if (channel) {
      // guild migration
      if (!watch.guildID) {
        await watch.update({guildID: channel.guild.id});
      }

      const embeds = await getUpdatesEmbeds(watch);
      if (embeds.length > 0) {
        channel.send(embeds);
      }
    } else {
      log(`invalid watch found. delete ${canonicalName(watch)}`);
      // about to send invalid channel. should be discarded
      await watch.remove();
    }
  }
}

process.on('unhandledRejection', (error) =>
  log('Uncaught Promise Rejection', error),
);

const client = new Discord.Client();

client.once('ready', () => {
  log('ready', CHECK_INTERVAL);

  setInterval(checkUpdates, CHECK_INTERVAL);
  checkUpdates();
});

client.on('guildDelete', async (guild) => {
  log('guildDelete');
  const invalidWatches = await removeWatches({guildID: guild.id});
  log(
    `cleanup watches for guild/${guild.id}, count: ${invalidWatches.deletedCount}`,
  );
});

client.on('channelDelete', async (channel) => {
  log('channelDelete');
  const invalidWatches = await removeWatches({channelID: channel.id});
  log(
    `cleanup watches for channel/${channel.id}, count: ${invalidWatches.deletedCount}`,
  );
});

client.on('message', async (message) => {
  try {
    if (message.content.startsWith(PREFIX)) {
      await checkPermission(message);

      const input = message.content.slice(PREFIX.length).split(' ');
      const commandName = input.shift()!;
      const args = input;
      log(`command: ${commandName} [${input}]`);

      const command = commands.find(
        (command) => command.command === commandName,
      );
      if (!command) {
        throw new Error(`Unrecognized command: ${commandName}`);
      }

      await command.handler({message, command: commandName, args});
    }
  } catch (err) {
    log(err);

    if (err instanceof SilentError) return;
    await message.reply(err.message);
  }
});

client.login(DISCORD_TOKEN);
