//
// RandomNumberCommand
//

import BaseCommand                  from './BaseCommand.es6';
import Option                       from './Option.es6';

import { _ }                        from 'lodash';
import { Promise }                  from 'bluebird';
import { randomIntFromInterval }    from '../utils.es6';


const INT_MIN = 0;
const INT_MAX = 100;

const COMMAND = "rndnum";
const BRIEF_DESCRIPTION = `will display a random number between ${INT_MIN} and ${INT_MAX}`;


class RandomNumberCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("RandomNumberCommand");

        super(COMMAND, BRIEF_DESCRIPTION, manager, listenToTypes);

        this.onGetRandomNumber = this.onGetRandomNumber.bind(this);

        const options = [
            new Option(this.name, "", "$", "", this.onGetRandomNumber, BRIEF_DESCRIPTION)            
        ];

        this.setupOptions(options);
    }

    onGetRandomNumber(bot, message) {
        console.log("onGetRandomNumber");

        let randomNumberRange = this.getCommandArguments(message, this.onGetRandomNumber);
        if (randomNumberRange.length > 0) {
            // TODO(dkg): add specific range
            console.log("randomNumberRange", randomNumberRange);
        }

        let num = randomIntFromInterval(INT_MIN, INT_MAX);
        let msg = `${num}`;

        bot.reply(message, msg);
    }

}

export { RandomNumberCommand as default };
