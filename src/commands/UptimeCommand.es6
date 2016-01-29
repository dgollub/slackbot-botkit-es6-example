//
// UptimeCommand
//

import BaseCommand                  from './BaseCommand.es6';
import Option                       from './Option.es6';

import { formatUptime }             from '../utils.es6';

import os from 'os';


const COMMAND = "uptime";
const BRIEF_DESCRIPTION = `displays the current uptime of the bot`;


class UptimeCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("UptimeCommand");

        super(COMMAND, BRIEF_DESCRIPTION, manager, listenToTypes);

        this.onGetUptime = this.onGetUptime.bind(this);

        const options = [
            new Option(this.name, "", "", "", this.onGetUptime, BRIEF_DESCRIPTION)
        ];

        this.setupOptions(options);
    }

    onGetUptime(bot, message) {
        console.log("onGetUptime");

        let hostname = os.hostname();
        let uptime = formatUptime(process.uptime());
        let msg = `:robot_face: I am a bot named <@${bot.identity.name}>. I have been running for ${uptime} on ${hostname}.`;

        bot.reply(message, msg);
    }

}

export { UptimeCommand as default };
