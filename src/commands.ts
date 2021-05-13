import Discord from "discord.js";
import { subscribe, unsubscribe, getSubscriptionsForChannel } from "./database";

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

const handleSubscribe: Handler = async function ({ message, args }) {
  if (args.length < 1) {
    throw new Error("Not enough arguments.");
  }

  for (const aryionUsername of args) {
    const sub = await subscribe(
      aryionUsername,
      message.channel.id,
      message.guild!.id
    );
    await message.reply(`subscribed ${sub.aryionUser.username}.`);
  }
};

const handleUnsubscribe: Handler = async function ({ message, args }) {
  if (args.length < 1) {
    throw new Error("Not enough arguments.");
  }

  for (const aryionUsername of args) {
    await unsubscribe(aryionUsername, message.channel.id);
    await message.reply(`${aryionUsername} has been removed`);
  }
};

const handleList: Handler = async function ({ message }) {
  const channelId = message.channel.id;
  const subs = await getSubscriptionsForChannel(channelId);
  let body = `${subs.length} subscriptions\n`;
  subs.map((sub) => {
    console.log(sub);
    body += `- ${sub.aryionUser.username}\n`;
  });
  await message.reply(body);
};

export const commands: Command[] = [
  { command: "sub", handler: handleSubscribe },
  { command: "unsub", handler: handleUnsubscribe },
  { command: "list", handler: handleList },
];
