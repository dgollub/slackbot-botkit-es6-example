//
// This file must be in ES5 and is the start up file for our bot.
//
// http://stackoverflow.com/a/33644849/193165
//

"use strict";

if (!process.env.slackbotapitoken) {
    console.log("Error: Specify slack api token in the environment variable 'slackbotapitoken' first please.");
    process.exit(1);
}

console.log("Compiling ES6 code before startup ...");


require("babel-polyfill");
require("babel-core/register"); // will translate all other includes via babel so we can use es6 syntax
require("./src/controllerSetup.es6"); // this will spawn a process that keeps on running which will handle the bot/slack communication and reponses etc.

console.log("Done - Your bot is running now. Press CTRL-C to stop it.");
