//
// FactCommand
// List a random fact, add facts to a list, etc.
//

import BaseCommand                  from './BaseCommand.es6';
import Option                       from './Option.es6';

import { _ }                        from 'lodash';
import { Promise }                  from 'bluebird';
import { getAdminList }             from './AdminCommand.es6';

import { db, sqlSelect, sqlInsert, sqlUpdate }        from '../db.es6';
import { removeCommandFromMessage, privateMsgToUser } from '../utils.es6';


const COMMAND = "fact";
const BRIEF_DESCRIPTION = "allows you to display and add/edit/remove random facts";
const DB_TABLE = "fact";


class FactCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("FactCommand");

        super(COMMAND, BRIEF_DESCRIPTION, manager, listenToTypes);

        this.onGetFacts = this.onGetFacts.bind(this);
        this.onGetRandomFact = this.onGetRandomFact.bind(this);
        this.onUpdateFact = this.onUpdateFact.bind(this);
        this.onAddFact = this.onAddFact.bind(this);

        this.isAdmin = this.isAdmin.bind(this);

        const options = [
            new Option(this.name, "add", "add", "<fact text>", this.onAddFact, "Add a new fact to the list.", true),
            new Option(this.name, "update", "update", ["<fact id>", "<fact text>"], this.onUpdateFact, "Update an existing fact.", true),
            new Option(this.name, ["list", "all"], ["list$", "all$"], "", this.onGetFacts, "List all facts."),
            new Option(this.name, ["", "random", "show", "tell"], ["$", "random$", "show$", "tell$"], "", this.onGetRandomFact, "Show a random fact.")
        ];

        this.setupOptions(options);
    }

    async onGetFacts(bot, message) {
        console.log("onGetFacts");

        let facts = await sqlSelect(`SELECT * FROM ${DB_TABLE} ORDER BY id`);

        if (!facts || facts.length === 0) {

            bot.reply(message, "I don't know anything right now.");

        } else {

            let msg = "```" + _.reduce(facts, (result, fact) => {
                return `${result}\n#${fact.id}: ${fact.fact}`;
            }, "") + "```";
            bot.reply(message, `Known facts:\n${msg}`);

        }
    }

    async onGetRandomFact(bot, message) {
        console.log("onGetRandomFact");

        let facts = await sqlSelect(`SELECT * FROM ${DB_TABLE} ORDER BY id`);

        if (!facts || facts.length === 0) {

            bot.reply(message, "I don't know anything right now.");

        } else {

            let factIdx = _.random(0, facts.length - 1);
            let fact = facts[factIdx];
            let factNum = `Random fact *#${fact.id}*: `;

            bot.reply(message, factNum + "```" + fact.fact + "```");

        }        
    }

    async onAddFact(bot, message) {
        console.log("onAddFact");

        let isAdmin = await this.isAdmin(bot, message);
        if (!isAdmin) return;

        let fact = this.getCommandArguments(message, this.onAddFact);
        let statement = await sqlInsert(DB_TABLE, "fact", fact);

        bot.reply(message, "Added the fact to my knowledge base. ID#" + statement.lastID);
    }

    async onUpdateFact(bot, message) {
        console.log("onUpdateFact");

        let isAdmin = await this.isAdmin(bot, message);
        if (!isAdmin) return;

        let msg = this.getCommandArguments(message, this.onUpdateFact);
        let tmp = msg.split(" ");
        let factId = tmp.length > 1 ? parseInt(tmp[0].trim(), 10) : parseInt(false);

        if (!isNaN(factId) && factId > 0) {
            let fact = msg.substr(tmp[0].length).trim();
            let statement = await sqlUpdate(DB_TABLE, factId, "fact", fact);

            if (statement.changes === 0) {
                bot.reply(message, "The specified fact wasn't found.");
            } else {
                bot.reply(message, "Updated the fact.");
            }

        } else {
            bot.reply(message, 'You will need to provide a Fact#ID as first argument.');
        }
    }

}

export { FactCommand as default };
