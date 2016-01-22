//
// RandomNumberCommand
//

import BaseCommand                  from './BaseCommand.es6';
import { db }                       from '../db.es6';
import { _ }                        from 'lodash';
import { Promise }                  from 'bluebird';
import { removeCommandFromMessage, randomIntFromInterval } from '../utils.es6';


const CMDS_RANDOM_NUMBER = ["^random num", "^rnd", "^random dice", "^random die"];
const INT_MIN = 0;
const INT_MAX = 100;

class RandomNumberCommand extends BaseCommand {

    constructor(controller, slackInfo, listenToTypes) {
        console.log("RandomNumberCommand");

        super("Random Number", controller, slackInfo);

        this.onGetRandomNumber = this.onGetRandomNumber.bind(this);

        this.listenTo(CMDS_RANDOM_NUMBER, listenToTypes, this.onGetRandomNumber);
    }

    onGetRandomNumber(bot, message) {
        console.log("onGetRandomNumber");

        let randomNumberRange = removeCommandFromMessage(message, CMDS_RANDOM_NUMBER);
        if (randomNumberRange.length > 0) {
            // TODO(dkg): add specific range
            console.log("randomNumberRange", randomNumberRange);
        }

        let num = randomIntFromInterval(INT_MIN, INT_MAX);
        let msg = `Random ${num} for you!`;

        bot.reply(message, msg);
    }

    helpText() {
        let msg = [];

        msg.push(`*${this.name}* will display a random number between ${INT_MIN} and ${INT_MAX}.`);
        msg.push("```");

        let fnAddHelp = (orgCmds, shortDescription, parameters="", example="") => {
            let cmds = orgCmds.map(c => c.replace(/[^\w\s]/gi, ''));
            let exampleCmd =  example.length > 0 ? `${cmds[0]} ${example}` : "";
            let msg = `${cmds.join("|")} ${parameters}\n\tBrief: ${shortDescription}`;

            return exampleCmd.length > 0 ? `${msg}\n\tExample: ${exampleCmd}` : msg;
        };

        msg.push(fnAddHelp(CMDS_RANDOM_NUMBER, `Display a random number between ${INT_MIN} and ${INT_MAX}.`));

        msg.push("```");
        
        return msg.join("\n");
    }

}

export { RandomNumberCommand as default };
