//
// KarmaCommand
// 
//

import config                       from '../configuration.es6';
import BaseCommand                  from './BaseCommand.es6';
import Option                       from './Option.es6';

import { _ }                        from 'lodash';
import { Promise }                  from 'bluebird';
import { getAdminList }             from './AdminCommand.es6';

import { db, sqlSelect, sqlInsert, sqlUpdate } from '../db.es6';
import { getUserFromList, privateMsgToUser, randomIntFromInterval } from '../utils.es6';

import {
    LISTEN_TO_OTHERS,
    LISTEN_TO_ALL_BUT_AMBIENT,
    LISTEN_TO_BOTNAME,
    LISTEN_TO_ALL
} from '../constants.es6';

const karmaConfig = config.karma || {};

const COMMAND = "karma";
const BRIEF_DESCRIPTION = "shows karma stats for each user";
const DB_TABLE = "karma";


let increaseKarmaForUser = async (userId, amount, reason) => {
    let result = sqlInsert(DB_TABLE, ["userid", "karma", "reason"], [userId, amount, reason]);
    return result;
};

let currentKarmaForUser = async (userId) => {
    let sql = `SELECT SUM(karma) AS totalKarma FROM ${DB_TABLE} WHERE userid = "${userId}" GROUP BY userid`;

    let karmaRow = await sqlSelect(sql);
    let karma = karmaRow.length === 1 ? karmaRow[0]["totalKarma"] || 0 : 0;
    
    return [ karma, karmaRow.length === 1 ];
};

let currentKarmaListForUser = async (userId) => {
    let sql = `SELECT * FROM ${DB_TABLE} WHERE userid = "${userId}"`;

    let karmaRows = await sqlSelect(sql);
    
    return karmaRows;
};

let setInitialKarmaForUserIfNoKarma = async (userId) => {
    let [ karma, hasKarma ] = await currentKarmaForUser(userId);

    if (!hasKarma) {

        let rnd = randomIntFromInterval(-200, 200);
        let statement = await increaseKarmaForUser(userId, rnd, "starting karma");

        karma = rnd;
        
        console.log(`KARMA: ${userId}'s was updated to ${rnd}. Row: ${statement.lastID}.`);
    }

    return [ karma, hasKarma ];
};

class KarmaCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("KarmaCommand");

        super(COMMAND, BRIEF_DESCRIPTION, manager, listenToTypes);

        this.onGetCurrentKarma = this.onGetCurrentKarma.bind(this);
        this.onCertainWord = this.onCertainWord.bind(this);
        this.onGetKarmaDetail = this.onGetKarmaDetail.bind(this);

        // TODO(dkg): maybe we want different listenToTypes per subcommand/options????
        // TODO(dkg): we also want to probably not insist that a command must "start" with
        //            a certain pattern. Maybe allow to match more general terms in message/texts
        //            not just at the start of the string. See Option.es6::getListenToPattern for
        //            the implementation details.
        const options = [
            new Option(this.name, ["", "show", "tell"], ["$", "show$", "tell$"], "", this.onGetCurrentKarma, "Shows you your current karma."),
            new Option(this.name, ["detail", "details"], ["detail$", "details$"], "", this.onGetKarmaDetail, "Shows you your karma details."),
        ];

        this.setupOptions(options);

        // Some extra listeners that should not show up in the help text.
        // TODO(dkg): make those words configurable - maybe in the db as well?
        // TODO(dkg): what about "love your shit, you damn genius"??? lol
        // TODO(dkg): maybe we don't want a bot.reply feedback, only a private message?
        //            as the user should not really know what words trigger this?! Hmmm.
        //            not sure - need to figure that out later

        const self = this;

        const karmaListenToList = karmaConfig.listenList || [];
        for (let listenOption of karmaListenToList) {
            const name = listenOption.name || "name is missing";
            const factor = listenOption.factor || 0;
            const points = listenOption.points || 0;
            const reason = listenOption.reason || "reason is missing";
            const feedback = listenOption.feedback || false;
            const listenTo = listenOption.listenTo || [];            

            if (listenTo.length > 0) {
                let fn = (bot, message) => {
                    self.onCertainWord(bot, message, name, factor, points, reason, feedback);
                };

                this.listenTo(listenTo, LISTEN_TO_ALL, fn);
            } else {
                console.warn(`Your karma configuration for ${name} has no listenTo patterns assigned. Please add at least one pattern.`);
            }
        }
    }

    async onGetCurrentKarma(bot, message) {
        console.log("onGetCurrentKarma");

        try {
            let userId = message.user;
            let users = this.manager.getListOfSlackUsers();
            let user = getUserFromList(users, userId);
            
            let [ karma, hasKarma ] = await setInitialKarmaForUserIfNoKarma(user.id);
            
            if (!hasKarma) {

                let msg = `Ahh, Fresh Meat!
                    Looks like we have a new player for the karma game.
                    Welcome ${user.name}! Your starting karma is ${karma}.
                    And may the odds be ever in your favor.`

                bot.reply(message, msg);

            } else {
                const feedback = karma < 0 ? "catastrophic" : "solid";
                bot.reply(message, `Looks like ${user.name}'s karma is a ${feedback} ${karma} right now.`);
            }
        } catch(err) {
            console.error(`Could not read or set karma. Reason: ${err.message}`);
            bot.reply(message, `Error: ${err.message}`);
        }

    }

    async onGetKarmaDetail(bot, message) {
        console.log("onGetCurrentKarma");

        try {
            let userId = message.user;
            let users = this.manager.getListOfSlackUsers();
            let user = getUserFromList(users, userId);
            
            let [ karma, hasKarma ] = await setInitialKarmaForUserIfNoKarma(user.id);
            
            if (!hasKarma) {

                let msg = `Ahh, Fresh Meat!
                    Looks like we have a new player for the karma game.
                    Welcome ${user.name}! Your starting karma is ${karma}.
                    And may the odds be ever in your favor.`

                bot.reply(message, msg);

            } else {
                const karmaList = await currentKarmaListForUser(user.id);

                let reply = ["This is your karma list right now: ", "```"];
                let totalKarma = 0;

                for (let row of karmaList) {
                    let msg = `${row.karma} for "${row.reason}"`;
                    reply.push(msg);
                    totalKarma += row.karma;
                }

                reply.push("```");
                reply.push(`\nYour total karma is ${totalKarma}.`);
                let msg = reply.join("\n");

                privateMsgToUser(bot, user.id, msg);

            }
        } catch(err) {
            console.error(`Could not read or set karma. Reason: ${err.message}`);
            bot.reply(message, `Error: ${err.message}`);
        }

    }

    async onCertainWord(bot, message, name, factor, points, reason, feedback) {
        try {
            console.log("name, factor, points, reason, feedback", name, factor, points, reason, feedback);

            let userId = message.user;
            let users = this.manager.getListOfSlackUsers();
            let user = getUserFromList(users, userId);
            
            let karmaPointsForThis = null;
            if (points === "random") {
                let rnd = factor * randomIntFromInterval(1, 10);
                karmaPointsForThis = factor * rnd;
            } else if (points === "factor") {
                karmaPointsForThis = factor;
            } else if (!isNaN(parseFloat(points))) {
                if (factor != 0) {
                    karmaPointsForThis = factor * points;
                } 
            }
            if (karmaPointsForThis === null) {
                // ??? why?!
                console.warn(`Your configuration for karma ${name} seems odd. Please either add a factor != 0 or change the points.`);
                return;
            }

            let [ karma, hasKarma ] = await setInitialKarmaForUserIfNoKarma(user.id);
            let statement = await increaseKarmaForUser(user.id, parseInt(karmaPointsForThis, 10), reason);

            karma += karmaPointsForThis;

            if (!!feedback) {
                bot.reply(message, `Looks like ${user.name}'s karma just ${feedback} to ${karma}.`);
            }
            
        } catch(err) {
            console.error(`Could not read or set karma. Reason: ${err.message}`);
            if (!!feedback) {
                bot.reply(message, `Error: ${err.message}`);
            }
        }
    }

}

export { KarmaCommand as default };
