# Discord AryionBot

[🚀Add AryionBot to Your Discord Server](https://discord.com/oauth2/authorize?client_id=711186798599995432&scope=bot&permissions=18432)

## Bot Usage

### `!aryion watch <aryionUsername>`

Monitor the latest updates for a given user and notify the channel when there is a new post on Eka's Portal.

### `!aryion unwatch <aryionUsername>`

Unsubscribe notifications from Eka's Portal for a given user.

### Remove bot from your server

Just kick them.

## Usage (for Admin)

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
