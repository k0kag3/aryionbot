# Discord AryionBot

[Add to Your Discord Server](https://discord.com/oauth2/authorize?client_id=711186798599995432&scope=bot&permissions=18432)

## Start

```shell
docker-compose up -d --build
docker-compose down
```

### Logging

```shell
docker-compose logs -f
```

## Dev

```shell
docker-compose -f docker-compose.development.yml up --build
```

## Cleanup

```shell
docker-compose down --rmi local
```
