//
// AdminCommand
// Very simple admin strucutre: users in the admin group / db table can do everything they want
// and manipulate the bot with the commands available. They don't have their own passwords though.
// Very simple. So if you need more fine grained control or even different permissions for 
// different actions or users, you'll have to change this.
//

import config                       from '../configuration.es6';
import BaseCommand                  from './BaseCommand.es6';

import { removeCommandFromMessage } from '../utils.es6';
import { db }                       from '../db.es6';
import { _ }                        from 'lodash';
import { Promise }                  from 'bluebird';


const CMDS_ADMIN_ADD        = ["^admin add"];
const CMDS_ADMIN_DELETE     = ["^admin delete"];
const CMDS_ADMIN_LIST       = ["^admin list", "^admin help", "^admin$"];

console.log("config", config);

const DB_TABLE = "admin";
const SUPERUSER_PWD = config.superadminpassword;


let dbGetAdmins = () => {
    let p = new Promise((resolve, reject) => {
        console.log("dbGetAdmins");
        db.all(`SELECT * FROM ${DB_TABLE} ORDER BY id`, [], (err, rows) => {
            if (err) {
                console.error("DB SELECT error!", err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
    return p;
};

let dbAddAdmin = (userId) => {
    console.log("dbAddAdmin", userId);
    let p = new Promise((resolve, reject) => {
        // NOTE(dkg): have to use ES5 syntax for callback, because ES6 fat arrow functions
        //            have their own way with 'this', which doesn't work with the sqlite
        //            nicely in this case.
        // see details here https://github.com/mapbox/node-sqlite3/issues/560
        db.run("INSERT INTO ${DB_TABLE} (user_id) VALUES (?)", userId.trim(), function(err) {
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

let dbDeleteAdmin = (userId) => {
    console.log("dbDeleteAdmin", userId);
    let p = new Promise((resolve, reject) => {
        db.run(`DELETE FROM ${DB_TABLE} WHERE user_id = $userid`, {
            $userid: userId
        }, function(err) {
            if (err) {
                console.error("DB DELETE error!", err);
                reject(err);
            } else {
                resolve(this);    
            }
        });
    });
    return p;
};


class AdminCommand extends BaseCommand {

    constructor(controller, slackInfo, listenToTypes) {
        console.log("AdminCommand");

        super("Facts", controller, slackInfo);

        this.onAddAdmin = this.onAddAdmin.bind(this);
        this.dbDeleteAdmin = this.dbDeleteAdmin.bind(this);
        this.onGetAdminList = this.onGetAdminList.bind(this);
        
        this.listenTo(CMDS_ADMIN_ADD, listenToTypes, this.onAddAdmin);
        this.listenTo(CMDS_ADMIN_DELETE, listenToTypes, this.dbDeleteAdmin);
        this.listenTo(CMDS_ADMIN_LIST, listenToTypes, this.onGetAdminList);
    }

    onGetAdminList(bot, message) {
        console.log("onGetAdminList");
        
        const slackInfo = this.slackInfo;

        let fnGetAdminListAndReply = (conversation) => {

            dbGetAdmins()
                .then((admins) => {
                    let reply = [];
                    if (!admins || admins.length === 0) {
                        reply.push("No admins assigned yet.");
                    } else {
                        let users = slackInfo.users || [];
                        console.log("users", users);

                        let msg = "```" + _.reduce(admins, (result, admin) => {
                            let user = users.find((u) => u.id === admin.user_id);
                            return `${result}\n${admin.name}`;
                        }, "") + "```";

                        reply.push(`Known admins:\n${msg}`);
                    }
                    conversation.say(reply.join(""));
                    conversation.next();
                })
                .catch((err) => {
                    console.log("error?", err);
                    bot.reply(message, `Sorry. An error happend.\nError: ${err}`);
                });
        }; 

        bot.startPrivateConversation(message, (err, conversation) => {
            conversation.ask("Password, please.", (message, conversation) => {
                let pwd = removeCommandFromMessage(message, CMDS_ADMIN_LIST);
                if (pwd === SUPERUSER_PWD) {
                    fnGetAdminListAndReply(conversation);
                } else {
                    conversation.say("You are off the project!");
                    conversation.next();
                }
            }); // conversation.ask(pwd pls)
        }); // startPrivateConversation

        
    }

    dbDeleteAdmin(bot, message) {
        console.log("dbDeleteAdmin");

        dbGetAdmins()
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

    onAddAdmin(bot, message) {
        console.log("onAddAdmin");

        // TODO(dkg): add security/auth stuff here.
        let fact = removeCommandFromMessage(message, CMDS_ADMIN_ADD);
        
        dbAddAdmin(fact)
            .then((stmt) => {
                bot.reply(message, "Added the fact to my knowledge base. ID#" + stmt.lastID);
            })
            .catch((err) => {
                console.log("error?", err);
                bot.reply(message, `Sorry. An error happend.\nError: ${err}`);
            });
    }

    onChangePassword(bot, message) {
        console.log("onChangePassword");
        // 
        let msg = removeCommandFromMessage(message, CMDS_ADMIN_CHANGE_PWD);
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

export { AdminCommand as default };
