# slackbot-botkit-es6-example

SlackBot example using [botkit](http://howdy.ai/botkit/) but with ES6 syntax (compiled to ES5 ondemand by using [Babel](https://babeljs.io)).


# Usage

You need [Node](https://nodejs.org/) installed with npm.

You will also need to have a bot setup in your Slack integrations (use https://my.slack.com/services/new/bot) and export the API TOKEN in your shell environment before you start the bot.


```bash
npm install

export slackbotapitoken=<YOUR-BOTS-API-TOKEN-HERE>

# either
npm run start
# or
node server.js
```

Enjoy.


# Available commands
## Admins

There are no admins in the database by default. However, there is a super admin password that can be used to add users to the admin list.

You can set superadmin password via the `superadminpassword` environment variable. If you do not set it, it will take the default from the `configuration.es6` file, which sets it to `friend`.

You add users to the admin list via (direct) messages to your bot, like so
```bash
@botname admin add @username
```

You can remove users from the admin list in the same way
```bash
@botname admin rm @username
```

You can also see the complete list of admins with this command
```bash
@botname admin list
```

## Facts

Admin users can add, edit and remove Facts from the fact database. The fact database can be queried via the `fact` command.

```bash
@botname facts list  # list all facts
@botname fact random  # list a random fact from the list
@botname fact add <new fact text>  # add a fact to the list, needs admin user
@botname fact delete <factid>  # remove a fact from the list, needs admin user
@botname fact update <factid> <updated fact text>  # edit a fact in the list, needs admin user
```

## Random Number

You can get a random number (range 0 to 100) via this command
```bash
@botname random number
# or
@botname rnd
```

## Help

The `help` command will display a help text for all available commands (if they provide a help text that is).


# Copyright

Copyright (c) 2015-2016 by Daniel Kurashige-Gollub, daniel@kurashige-gollub.de


# License

MIT

See LICENSE file.
