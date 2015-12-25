//
// Our core logic for our bot is here.
// 

// import { formatUptime } from './utils.es6';
import { db, dbGetFacts, dbAddFact, dbUpdateFact } from './db.es6';
import { _ } from 'lodash';

if (!Array.prototype.findIndex) {
    // console.warn("Array does not support findIndex method.");
    throw new Error("Array does not support findIndex method.");
}

const LISTEN_TO_DIRECT_MESSAGE = "direct_message";
const LISTEN_TO_DIRECT_MENTION = "direct_mention";
const LISTEN_TO_MENTION = "mention";
const LISTEN_TO_AMBIENT = "ambient";

const LISTEN_TO_ALL_BUT_AMBIENT = [LISTEN_TO_DIRECT_MESSAGE, LISTEN_TO_DIRECT_MENTION, LISTEN_TO_MENTION].join(',');
const LISTEN_TO_ALL = [LISTEN_TO_AMBIENT, LISTEN_TO_DIRECT_MESSAGE, LISTEN_TO_DIRECT_MENTION, LISTEN_TO_MENTION].join(',');

const CMDS_ADD_FACT = ["add fact", "insert fact"];
const CMDS_UPDATE_FACT = ["revise fact", "udpate fact"];
const CMDS_LIST_FACTS = ["tell facts", "list facts"];
const CMDS_TELL_FACT = ["tell fact", "random fact", "list fact"];

class Bot {

    constructor(controller, slackInfo) {
        this.controller = controller;
        this.slackInfo = slackInfo;

        // this is annoying boilerplate
        this.onUserChange = this.onUserChange.bind(this);
        this.onTeamJoin = this.onTeamJoin.bind(this);
        this.updateCacheUserInfo  = this.updateCacheUserInfo.bind(this);

        this.onGetFacts = this.onGetFacts.bind(this);
        this.onGetRandomFact = this.onGetRandomFact.bind(this);
        this.onUpdateFact = this.onUpdateFact.bind(this);
        this.onAddFact = this.onAddFact.bind(this);

        this.listenTo = this.listenTo.bind(this);

        // listen to team_join and user_change events to make sure you update your cached user list

        this.controller.on('team_join', this.onTeamJoin);
        this.controller.on('user_change', this.onUserChange);

        this.listenTo(CMDS_LIST_FACTS, LISTEN_TO_ALL_BUT_AMBIENT, this.onGetFacts);
        this.listenTo(CMDS_TELL_FACT, LISTEN_TO_ALL_BUT_AMBIENT, this.onGetRandomFact);
        this.listenTo(CMDS_ADD_FACT, LISTEN_TO_ALL_BUT_AMBIENT, this.onAddFact);
        this.listenTo(CMDS_UPDATE_FACT, LISTEN_TO_ALL_BUT_AMBIENT, this.onUpdateFact);
    }

    listenTo(messages, whatToListenTo, callback) {
        console.log(`listenTo(${messages}, ${whatToListenTo}, cb)`);
        let ms = Array.isArray(messages) ? messages : [messages];
        this.controller.hears(ms, whatToListenTo, callback);
    }

    onTeamJoin(bot, message) {
        this.updateCacheUserInfo(message.user);
    }
    onUserChange(bot, message) {
        this.updateCacheUserInfo(message.user);
    }
    updateCacheUserInfo(user) {
        console.log("Need to add or update cached info for user ", user.id);

        let users = this.getListOfSlackUsers();
        let idx = users.findIndex((u) => u.id === user.id);

        if (idx !== -1) {
            this.slackInfo.users[idx] = user;
        } else {

            if (users.length === 0) {
                this.slackInfo.users = [];
            }
            this.slackInfo.users.push(user);

            controller.storage.users.save(user, (err, id) => {
                if (err) {
                    console.error("Could not add user to internal cache.", err, user);
                }
            });
        }
    }

    getListOfSlackUsers() {
        let info = this.slackInfo || null;
        if (info === null || !Array.isArray(info.users)) {
            console.warn("No slack info set. You need to conect to Slack first before constructing the bot and using this call.");
            return [];
        }
        return info.users;
    }

    loadUserFromMessage(message, cb) {

        let [ controller, info ] = [ this.controller, this.slackInfo ];
        let self = this;

        controller.storage.users.get(message.user, (err, user) => {
        
            if (!user) {

                // console.log(message, message.text, message.user);

                let uid = message.user || "-1doesnotexists";
                let users = self.getListOfSlackUsers();
                let foundUser = users.find((u) => u.id === uid);

                // console.log(uid, users.length, foundUser);

                if (foundUser) {
                    user = foundUser;
                }
            }

            if (user) {
                controller.storage.users.save(user, (err, id) => {
                    if (cb) {
                        cb(user);
                    }
                });
            } else {
                console.warn("Could not find user in message.");
            }

        });

    }

    onGetFacts(bot, message) {
        console.log("onGetFacts");

        dbGetFacts()
            .then((facts) => {
                console.log("facts?", facts);
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
    onAddFact(bot, message) {
        console.log("onAddFact");

        // TODO(dkg): add security/auth stuff here.
        let fact = removeCommandFromMessage(message, CMDS_ADD_FACT);
        
        dbAddFact(fact)
            .then((stmt) => {
                bot.reply(message, "Added the fact to my knowledge base. ID#" + stmt.lastID);
            })
            .catch((err) => {
                console.log("error?", err);
                bot.reply(message, `Sorry. An error happend.\nError: ${err}`);
            });
    }
    onUpdateFact(bot, message) {
        console.log("onUpdateFact");
    }

}

let removeCommandFromMessage = (msg, commands) => {
    let text = (msg.text || "").trim();

    if (!Array.isArray(commands)) {
        commands = [commands];
    }

    for (let cmd of commands) {
        let pos = text.toLowerCase().indexOf(cmd.toLowerCase());
        // TODO(dkg): maybe make sure to only remove the command if it is at
        //            the beginning of the text and not part of it?        
        if (pos > -1 && pos < 3) {
            text = text.substr(pos + cmd.length).trim();
        }
    }

    if (text[0] == '"') {
        text = text.substr(1).trim();
    }
    if (text.substr(-1) == '"') {
        text = text.substr(0, text.length - 1).trim();
    }

    return text;
};

export { Bot };
