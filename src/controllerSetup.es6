//
// Based on : https://github.com/howdyai/botkit/blob/master/examples/demo_bot.js
// 

"use strict";

import config                           from './configuration.es6';
import CommandManager                   from './CommandManager.es6';
import { db, initializeDatabaseTables } from './db.es6';
import { formatUptime }                 from './utils.es6';


let Botkit = require('Botkit');
let os = require('os');

// let's get the party started

let controller = Botkit.slackbot({
    debug: false
    // we could use the "storage: my_storage_provider" syntax and implement our own storage provider
    // using sqlite, following the API in this exapmle:
    // https://github.com/howdyai/botkit/blob/master/lib/simple_storage.js
    // However, I do feel a bit limited by that API at this point, so I'll
    // just implement something else using sqlite on its own.
});

let commandManager = null;

let startupCallback = (err, bot, payload) => {
    if (err) {
        console.error("startup callback", err);
        throw new Error("Could not connect to Slack!");
    }

    initializeDatabaseTables();

    commandManager = new CommandManager(controller, payload);
    
    console.info("Startup was successful it seems.");
};

// This is the important part. Here we start the initial login to Slack and 
// then the spawned controller will take over this thread and keep on 
// serving and replying to messages while this process is running.

controller.spawn({
    token: config.slackbotapitoken
}).startRTM(startupCallback);


// TODO(dkg): put these .hears() into their own Commands
const LISTEN_TO = 'direct_message,direct_mention,mention';

// botkit controller callbacks ---- these are from the example bot from botkit
// feel free to remove those and just add your .hears() calls and custom logic in bot.es6

controller.hears(['^hello','^hi'], LISTEN_TO, (bot, message) => {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, (err, res) =>{
        if (err) {
            bot.log("Failed to add emoji reaction :(", err);
        }
    });

    controller.storage.users.get(message.user, (err, user) => {
        if (user && user.name) {
            bot.reply(message, `Hello ${user.name}!!`);
        } else {
            bot.reply(message, "Hello.");
        }
    });

}); // hello, hi



controller.hears(['what is my name','who am i'], LISTEN_TO, (bot, message) => {

    commandManager.loadUserFromMessage(message, (user) => {
        if (user && user.name) {
          bot.reply(message, `Your name is @${user.name}! You should know that.`);
        } else {
          bot.reply(message, "I don't know yet!");
        }
    });

}); // what is my name, who am i



controller.hears(['^uptime','identify yourself','who are you','what is your name'], LISTEN_TO,(bot, message) => {

  let hostname = os.hostname();
  let uptime = formatUptime(process.uptime());
  let msg = `:robot_face: I am a bot named <@${bot.identity.name}>. I have been running for ${uptime} on ${hostname}.`;

  bot.reply(message, msg);

}); // uptime, who are you, ...


// Slack callbacks

controller.on('channel_joined', (bot, message) => {

    console.info("Somebody joined.", message);

    commandManager.loadUserFromMessage(message, (user) => {
        bot.reply(message, `Hello there, @${user.name}! Welcome to the club!`);
    });

}); 


// NOTE(dkg): this is technically not really needed. Maybe remove it?
export { controller as default };
