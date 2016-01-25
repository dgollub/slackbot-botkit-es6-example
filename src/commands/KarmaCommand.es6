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
    
    // console.log("sql", sql);
    // console.log("karmaRow", karmaRow);
    // console.log("karma", karma);

    return [ karma, karmaRow ];
};

class KarmaCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("KarmaCommand");

        super(COMMAND, BRIEF_DESCRIPTION, manager, listenToTypes);

        this.onGetCurrentKarma = this.onGetCurrentKarma.bind(this);
        // this.onGetRandomFact = this.onGetRandomFact.bind(this);
        // this.onUpdateFact = this.onUpdateFact.bind(this);
        // this.onAddFact = this.onAddFact.bind(this);

        // this.isAdmin = this.isAdmin.bind(this);

        // TODO(dkg): maybe we want different listenToTypes per subcommand/options????
        const options = [
            new Option(this.name, ["", "show", "tell"], ["$", "show$", "tell$"], "", this.onGetCurrentKarma, "Shows you your current karma."),
        ];

        this.setupOptions(options);
    }

    async onGetCurrentKarma(bot, message) {
        console.log("onGetCurrentKarma");

        try {
            let userId = message.user;
            let users = this.manager.getListOfSlackUsers();
            let user = getUserFromList(users, userId);
            
            let [ karma, karmaRow ] = await currentKarmaForUser(user.id);

            if (karmaRow.length === 0) {

                let rnd = randomIntFromInterval(-200, 200);
                let statement = await increaseKarmaForUser(user.id, rnd, "starting karma");

                let msg = `Ahh, Fresh Meat!
                Looks like we have a new player for the karma game.
                Welcome ${user.name}! Your starting karma is ${rnd}.
                And may the odds be ever in your favor.`

                bot.reply(message, msg);
                
                console.log(`KARMA: ${user.name}'s was updated to ${rnd}. Row: ${statement.lastID}.`);
            } else {
                const feedback = karma < 0 ? "catastrophic" : "solid";
                bot.reply(message, `Looks like ${user.name}'s karma is a ${feedback} ${karma} right now.`);
            }
        } catch(err) {
            console.error(`Could not read or set karma. Reason: ${err.message}`);
            bot.reply(message, `Error: ${err.message}`);
        }

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
