import Discord from 'discord.js';

import {watchUser, unwatchUser} from './database';

export interface HandlerOptions {
  message: Discord.Message;
  command: string;
  args: string[];
}

export interface Handler {
  (options: HandlerOptions): Promise<any>;
}

export interface Command {
  command: string;
  handler: Handler;
}

export const handleWatch: Handler = async function ({message, args}) {
  if (args.length < 1) {
    throw new Error('Not enough arguments.');
  }

  for (const aryionUsername of args) {
    const watch = await watchUser(
      aryionUsername,
      message.channel.id,
      message.author.id,
    );
    await message.reply(`${watch.aryionUsername} added to the watch.`);
  }
};

export const handleUnwatch: Handler = async function ({message, args}) {
  if (args.length < 1) {
    throw new Error('Not enough arguments.');
  }

  for (const aryionUsername of args) {
    await unwatchUser(aryionUsername, message.channel.id);
    await message.reply(`${aryionUsername} has been removed`);
  }
};

export const commands: Command[] = [
  {command: 'watch', handler: handleWatch},
  {command: 'unwatch', handler: handleUnwatch},
];
