//
// RandomNumberCommand
//

import { BaseCommand }              from './BaseCommand.es6';
import { db }                       from '../db.es6';
import { _ }                        from 'lodash';
import { Promise }                  from 'bluebird';
import { removeCommandFromMessage, randomIntFromInterval } from '../utils.es6';


const CMDS_RANDOM_NUMBER = ["random num", "\s*rnd", "random dice", "random die"];


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

        let num = randomIntFromInterval(0, 100);
        let msg = `Random ${num} for you!`;

        bot.reply(message, msg);
    }

}

export { RandomNumberCommand as default };
