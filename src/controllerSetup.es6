//
// Based on : https://github.com/howdyai/botkit/blob/master/examples/demo_bot.js
// 

"use strict";

import config                           from './configuration.es6';
import CommandManager                   from './CommandManager.es6';
import { initializeDatabaseTables }     from './db.es6';


let Botkit = require('Botkit');

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



// NOTE(dkg): this is technically not really needed. Maybe remove it?
export { controller as default };
