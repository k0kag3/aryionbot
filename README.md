<img width="200" src="https://raw.githubusercontent.com/k0kag3/aryionbot/master/.github/Icon.png" alt="Icon" />

# AryionBot

a Discord bot that regularly checks for updates on Eka's portal and notifies them to the channel.

[🚀Add AryionBot to your Discord server](https://discord.com/oauth2/authorize?client_id=711186798599995432&scope=bot&permissions=18432)

## Bot Usage

Users authorized to manage the channel can use the following commands (usually Admin and Moderators).

### `!aryion watch <aryionUsername>`

Monitor the latest updates for a given user and notify the channel when there is a new post on Eka's Portal.

### `!aryion unwatch <aryionUsername>`

Unsubscribe notifications from a given user.

### Remove bot from your server

Just kick them.

## Deploy your own bot

Copy `.env.placeholder` to `.env` and put your Discord bot token in it before starting to use the bot.

### Start

```shell
yarn dc:start
```

### Stop

```shell
yarn dc:stop
```

### Update

```shell
yarn dc:update
```

### Show logs

```shell
docker-compose logs -f
```

## Dev

### Launch dev server

```shell
yarn dc:dev
```

### Cleanup

```shell
docker-compose down --rmi local
```
