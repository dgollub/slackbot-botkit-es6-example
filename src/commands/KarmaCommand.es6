//
// KarmaCommand
// 
//

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
        this.onSwearWords = this.onSwearWords.bind(this);
        this.onCleanWords = this.onCleanWords.bind(this);
        // this.onGetRandomFact = this.onGetRandomFact.bind(this);
        // this.onUpdateFact = this.onUpdateFact.bind(this);
        // this.onAddFact = this.onAddFact.bind(this);

        // this.isAdmin = this.isAdmin.bind(this);

        // TODO(dkg): maybe we want different listenToTypes per subcommand/options????
        // TODO(dkg): we also want to probably not insist that a command must "start" with
        //            a certain pattern. Maybe allow to match more general terms in message/texts
        //            not just at the start of the string. See Option.es6::getListenToPattern for
        //            the implementation details.
        const options = [
            new Option(this.name, ["", "show", "tell"], ["$", "show$", "tell$"], "", this.onGetCurrentKarma, "Shows you your current karma."),
        ];

        this.setupOptions(options);

        // Some extra listeners that should not show up in the help text.
        // TODO(dkg): make those words configurable - maybe in the db as well?
        // TODO(dkg): what about "love your shit, you damn genius"??? lol
        this.listenTo(/(shit|fuck|damn|asshole|cum bucket|whore|gangbang)/gi, LISTEN_TO_ALL, this.onSwearWords);
        this.listenTo(/(love you|love is all around|love fool|snoop lion|snoop dog)/gi, LISTEN_TO_ALL, this.onCleanWords);
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

    async onCertainWord(bot, message, cleanWords=false) {
        try {
            let userId = message.user;
            let users = this.manager.getListOfSlackUsers();
            let user = getUserFromList(users, userId);
            
            let factor = (!!!cleanWords ? -1 : 1);
            let reason = (!!!cleanWords ? "using bad word" : "using good word");
            let feedback = (!!!cleanWords ? "took a drop" : "raised");

            let rnd = factor * randomIntFromInterval(1, 10);
            let [ karma, hasKarma ] = await setInitialKarmaForUserIfNoKarma(user.id);
            let statement = await increaseKarmaForUser(user.id, rnd, reason);

            karma += rnd;
            
            bot.reply(message, `Looks like ${user.name}'s karma just ${feedback} to ${karma}.`);
            
        } catch(err) {
            console.error(`Could not read or set karma. Reason: ${err.message}`);
            bot.reply(message, `Error: ${err.message}`);
        }
    }

    async onSwearWords(bot, message) {
        return this.onCertainWord(bot, message, false);
    }

    async onCleanWords(bot, message) {
        return this.onCertainWord(bot, message, true);
    }

    // async onGetRandomFact(bot, message) {
    //     console.log("onGetRandomFact");

    //     let facts = await sqlSelect(`SELECT * FROM ${DB_TABLE} ORDER BY id`);

    //     if (!facts || facts.length === 0) {

    //         bot.reply(message, "I don't know anything right now.");

    //     } else {

    //         let factIdx = _.random(0, facts.length - 1);
    //         let fact = facts[factIdx];
    //         let factNum = `Random fact *#${fact.id}*: `;

    //         bot.reply(message, factNum + "```" + fact.fact + "```");

    //     }        
    // }

    // async onAddFact(bot, message) {
    //     console.log("onAddFact");

    //     let isAdmin = await this.isAdmin(bot, message);
    //     if (!isAdmin) return;

    //     let fact = this.getCommandArguments(message, this.onAddFact);
    //     let statement = await sqlInsert(DB_TABLE, "fact", fact);

    //     bot.reply(message, "Added the fact to my knowledge base. ID#" + statement.lastID);
    // }

    // async onUpdateFact(bot, message) {
    //     console.log("onUpdateFact");

    //     let isAdmin = await this.isAdmin(bot, message);
    //     if (!isAdmin) return;

    //     let msg = this.getCommandArguments(message, this.onUpdateFact);
    //     let tmp = msg.split(" ");
    //     let factId = tmp.length > 1 ? parseInt(tmp[0].trim(), 10) : parseInt(false);

    //     if (!isNaN(factId) && factId > 0) {
    //         let fact = msg.substr(tmp[0].length).trim();
    //         let statement = await sqlUpdate(DB_TABLE, factId, "fact", fact);

    //         if (statement.changes === 0) {
    //             bot.reply(message, "The specified fact wasn't found.");
    //         } else {
    //             bot.reply(message, "Updated the fact.");
    //         }

    //     } else {
    //         bot.reply(message, 'You will need to provide a Fact#ID as first argument.');
    //     }
    // }

}

export { KarmaCommand as default };
