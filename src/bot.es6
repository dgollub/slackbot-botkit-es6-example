//
// Our core logic for our bot is here.
// 

// import { formatUptime } from './utils.es6';
import { db, dbGetFacts, dbAddFact, dbUpdateFact } from './db.es6';
import { _ } from 'lodash';

if (!Array.prototype.findIndex) {
    // console.warn("Array does not support findIndex method.");
    throw new Error("Array does not support findIndex method.");
};

const LISTEN_TO_DIRECT_MESSAGE = "direct_message";
const LISTEN_TO_DIRECT_MENTION = "direct_mention";
const LISTEN_TO_MENTION = "mention";
const LISTEN_TO_ALL = [LISTEN_TO_DIRECT_MESSAGE, LISTEN_TO_DIRECT_MENTION, LISTEN_TO_MENTION].join(',');


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

        this.controller.on('team_join', this.onTeamJoin)
        this.controller.on('user_change', this.onUserChange);

        this.listenTo(["tell facts", "list facts"], LISTEN_TO_ALL, this.onGetFacts);
        this.listenTo(["tell fact", "random fact", "list fact"], LISTEN_TO_ALL, this.onGetRandomFact);
        this.listenTo(["add fact", "insert fact"], LISTEN_TO_ALL, this.onAddFact);
        this.listenTo(["revise fact", "udpate fact"], LISTEN_TO_ALL, this.onUpdateFact);
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

        let users = this.getListOfUsers();
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

    getListOfUsers() {
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
                let users = self.getListOfUsers();
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
                        return `${result}\n#${fact.id}: ${fact.fact}\n`;
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

    }
    onUpdateFact(bot, message) {
        console.log("onUpdateFact");
    }

}

export { Bot };
