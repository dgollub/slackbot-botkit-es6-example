//
// FactCommand
//

import BaseCommand                  from './BaseCommand.es6';
import { db }                       from '../db.es6';
import { _ }                        from 'lodash';
import { Promise }                  from 'bluebird';
import { getAdminList }             from './AdminCommand.es6';
import Option                       from './Option.es6';

import { removeCommandFromMessage, privateMsgToUser } from '../utils.es6';

// TODO(dkg): DO THIS NEXT!
// TODO(dkg): maybe these should not be simple constants in arrays, but rather
//            be their own classes/instances - one for each type of command,
//            and then the helpText implemenation could be a lot cleanrer,
//            also a bunch of other things could be cleaner and more straight forward

const COMMAND = "fact";

// const CMDS_ADD    = [`^${COMMAND} add`];
// const CMDS_UPDATE = [`^${COMMAND} update`];
// const CMDS_LIST   = [`^${COMMAND} list$`];
// const CMDS_TELL   = [`^${COMMAND}$`, `^${COMMAND} random`, `^${COMMAND} show`, `^${COMMAND} tell`];

let dbGetFacts = () => {
    let p = new Promise((resolve, reject) => {
        console.log("dbGetFacts");
        db.all("SELECT * FROM fact ORDER BY id", [], (err, rows) => {
            if (err) {
                console.error("DB SELECT error!", err);
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
    return p;
};

let dbAddFact = (fact) => {
    console.log("dbAddFact");
    let p = new Promise((resolve, reject) => {
        // NOTE(dkg): have to use ES5 syntax for callback, because ES6 fat arrow functions
        //            have their own way with 'this', which doesn't work with the sqlite
        //            nicely in this case.
        // see details here https://github.com/mapbox/node-sqlite3/issues/560
        db.run("INSERT INTO fact (fact) VALUES (?) ", fact.trim(), function(err) {
            if (err) {
                console.error("DB INSERT error!", err);
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
    return p;
};

let dbUpdateFact = (id, fact) => {
    console.log("dbUpdateFact");
    let p = new Promise((resolve, reject) => {
        db.run("UPDATE fact SET fact = $fact WHERE id = $id", {
            $id: id,
            $fact: fact
        }, function(err) {
            if (err) {
                console.error("DB UPDATE error!", err);
                reject(err);
            } else {
                resolve(this);    
            }
        });
    });
    return p;
};


class FactCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("FactCommand");

        super(COMMAND, manager, listenToTypes);

        this.onGetFacts = this.onGetFacts.bind(this);
        this.onGetRandomFact = this.onGetRandomFact.bind(this);
        this.onUpdateFact = this.onUpdateFact.bind(this);
        this.onAddFact = this.onAddFact.bind(this);

        this.isAdmin = this.isAdmin.bind(this);

        const options = [
            new Option(this.name, "add", "add", "<fact text>", this.onAddFact, "Add a new fact to the list.", true),
            new Option(this.name, "update", "update", ["<fact id>", "<fact text>"], this.onUpdateFact, "Update an existing fact.", true),
            new Option(this.name, "list", "list$", "", this.onGetFacts, "List all facts."),
            new Option(this.name, ["", "random", "show", "tell"], ["$", "random$", "show$", "tell$"], "", this.onGetRandomFact, "Show a random fact.")
        ];

        this.setupOptions(options);
    }

    // TODO(dkg): fix this
    helpText() {
        let msg = [];

        msg.push(this.helpShortDescription());
        msg.push("`* requires admin powers`");
        msg.push("```");

        for (let option of this.options) {
            msg.push(option.helpText());
        }

        msg.push("```");
        
        return msg.join("\n");
    }

    helpShortDescription() {
        return `*${this.name}* allows you to display and add/edit/remove random facts.`;
    }

    onGetFacts(bot, message) {
        console.log("onGetFacts");

        dbGetFacts()
            .then((facts) => {
                if (!facts || facts.length === 0) {
                    bot.reply(message, "I don't know anything right now.");
                } else {
                    // let factIdx = _.random(0, facts.length - 1);
                    // let fact = facts[factIdx];
                    // bot.reply(message, `Random fact #${fact.id}: *${fact.fact}*`);
                    let msg = "```" + _.reduce(facts, (result, fact) => {
                        return `${result}\n#${fact.id}: ${fact.fact}`;
                    }, "") + "```";
                    bot.reply(message, `Known facts:\n${msg}`);
                }
            })
            .catch((err) => {
                console.log("error?", err);
                bot.reply(message, `Sorry. An error happend.\nError: ${err}`);
            });
    }

    onGetRandomFact(bot, message) {
        console.log("onGetRandomFact");

        dbGetFacts()
            .then((facts) => {
                console.log("facts?", facts);
                if (!facts || facts.length === 0) {
                    bot.reply(message, "I don't know anything right now.");
                } else {
                    let factIdx = _.random(0, facts.length - 1);
                    let fact = facts[factIdx];
                    let factNum = `Random fact *#${fact.id}*: `;
                    bot.reply(message, factNum + "```" + fact.fact + "```");
                }
            })
            .catch((err) => {
                console.log("error?", err);
                bot.reply(message, `Sorry. An error happend.\nError: ${err}`);
            });
    }

    async onAddFact(bot, message) {
        console.log("onAddFact");

        let isAdmin = await this.isAdmin(bot, message);
        if (!isAdmin) return;

        // TODO(dkg): add security/auth stuff here.
        let fact = removeCommandFromMessage(message, CMDS_ADD);
        
        dbAddFact(fact)
            .then((stmt) => {
                bot.reply(message, "Added the fact to my knowledge base. ID#" + stmt.lastID);
            })
            .catch((err) => {
                console.log("error?", err);
                bot.reply(message, `Sorry. An error happend.\nError: ${err}`);
            });
    }

    async onUpdateFact(bot, message) {
        console.log("onUpdateFact");

        let isAdmin = await this.isAdmin(bot, message);
        if (!isAdmin) return;

        let msg = removeCommandFromMessage(message, CMDS_UPDATE);
        let tmp = msg.split(" ");
        let factId = tmp.length > 1 ? parseInt(tmp[0].trim(), 10) : parseInt(false);

        if (!isNaN(factId) && factId > 0) {
            let fact = msg.substr(tmp[0].length).trim();
            dbUpdateFact(factId, fact)
                .then((stmt) => {
                    console.log("statement", stmt);
                    if (stmt.changes === 0) {
                        bot.reply(message, "The specified fact wasn't found.");
                    } else {
                        bot.reply(message, "Updated the fact.");
                    }
                })
                .catch((err) => {
                    console.log("error?", err);
                    bot.reply(message, `Sorry. An error happend.\nError: ${err}`);
                });
        } else {
            bot.reply(message, 'You will need to provide a Fact#ID as first argument.');
        }
    }

}

export { FactCommand as default };
