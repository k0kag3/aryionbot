import Discord, {TextChannel} from 'discord.js';
import assert from 'assert';
import parseISO from 'date-fns/parseISO';
import formatISO from 'date-fns/formatISO';
import isBefore from 'date-fns/isBefore';
import subDays from 'date-fns/subDays';
import mongoose from 'mongoose';

import {getLatestUpdates, getItemDetail, userExists} from './aryion';
import WatchModel from './models/watch';

export interface Item {
  ogpImageURL: string;
  imageURL: string;
  authorAvatarURL: string;
}

class DuplicatedWatchError extends Error {}
class AryionUserNotFoundError extends Error {}

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
assert(DISCORD_TOKEN, 'DISCORD_TOKEN is missing');
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/test';
const PREFIX = '!aryion ';
const CHECK_INTERVAL = 1000 * 60 * 10;

const client = new Discord.Client();

mongoose.connect(MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function watchUser(
  aryionUsername: string,
  channelID: string,
  authorID: string,
) {
  if (await WatchModel.exists({aryionUsername, channelID})) {
    throw new DuplicatedWatchError();
  }

  if (!(await userExists(aryionUsername))) {
    throw new AryionUserNotFoundError();
  }

  const watch = new WatchModel({
    aryionUsername,
    channelID,
    lastUpdate: formatISO(subDays(new Date(), 3)),
    createdBy: authorID,
  });
  console.log(watch);
  return await watch.save();
}

async function unwatchUser(aryionUsername: string, channelID: string) {
  const watch = await WatchModel.findOne({aryionUsername, channelID});
  if (watch) {
    await watch.remove();
  }
}

async function checkUpdates() {
  const watches = await WatchModel.find();
  console.log('Start checking updates', new Date());
  console.log('num of watches', watches.length);

  for (const watch of watches) {
    console.log('Check for', watch.aryionUsername);
    const latestUpdates = await getLatestUpdates(watch.aryionUsername);
    for (const update of latestUpdates) {
      if (
        watch.lastUpdate &&
        isBefore(parseISO(update.created), parseISO(watch.lastUpdate))
      ) {
        continue;
      }

      console.log('New update found', update.detailURL);

      const item = await getItemDetail(update.itemID);
      const embed = new Discord.MessageEmbed()
        .setTitle(update.title)
        .setURL(update.detailURL)
        .setAuthor(update.author, item.authorAvatarURL, update.authorURL)
        .setThumbnail(update.thumbnailURL)
        .setDescription(update.shortDescription)
        .addField('Tags', update.tags.slice(0, 8).join(' ') + ' [omitted]')
        .setImage(item.imageURL)
        .setTimestamp(parseISO(update.created));
      const channel = client.channels.cache.get(watch.channelID) as TextChannel;
      channel.send(embed);
    }

    watch.lastUpdate = formatISO(new Date());
    await watch.save();
  }
}

process.on('unhandledRejection', (error) =>
  console.error('Uncaught Promise Rejection', error),
);

client.once('ready', () => {
  console.log('ready', CHECK_INTERVAL);
  setInterval(checkUpdates, CHECK_INTERVAL);
  checkUpdates();
});

client.on('message', async (message) => {
  if (message.channel.type !== 'text') {
    return;
  }

  const hasPermisson = message.channel
    .permissionsFor(message.author)
    ?.has('MANAGE_CHANNELS');
  if (!hasPermisson) {
    return;
  }

  if (message.content.startsWith(PREFIX)) {
    const input = message.content.slice(PREFIX.length).split(' ');
    const authorID = message.author.id;
    const channelID = message.channel.id;
    const command = input.shift();
    const commandArgs = input;

    console.log(`command: ${command} [${input}]`);

    switch (command) {
      // !aryion watch kokage
      case 'watch': {
        if (commandArgs.length < 1) {
          return;
        }
        for (const aryionUsername of commandArgs) {
          try {
            const watch = await watchUser(aryionUsername, channelID, authorID);
            await message.reply(`${watch.aryionUsername} added to the watch.`);
          } catch (err) {
            if (err instanceof DuplicatedWatchError) {
              return await message.reply(
                `${aryionUsername} has already been watched`,
              );
            } else if (err instanceof AryionUserNotFoundError) {
              return await message.reply(
                `${aryionUsername} cannot be found on Eka's Portal`,
              );
            }
            console.log(err);
            await message.reply(`Unhandled error occured! Tell the admin.`);
          }
        }
        break;
      }
      // !aryion unwatch kokage
      case 'unwatch': {
        if (commandArgs.length < 1) {
          return;
        }
        for (const aryionUsername of commandArgs) {
          try {
            await unwatchUser(aryionUsername, channelID);
            await message.reply(`${aryionUsername} has been removed`);
          } catch (err) {
            console.log(err);
            await message.reply(`Unhandled error occured! Tell the admin.`);
          }
        }
        break;
      }
      default: {
        await message.reply(`Unrecognized command: ${command}`);
      }
    }
  }
});

client.login(DISCORD_TOKEN);
