//
// AdminCommand
// Very simple admin strucutre: users in the admin group / db table can do everything they want
// and manipulate the bot with the commands available. They don't have their own passwords though.
// Very simple. So if you need more fine grained control or even different permissions for 
// different actions or users, you'll have to change this.
//

import config                       from '../configuration.es6';
import BaseCommand                  from './BaseCommand.es6';
import Option                       from './Option.es6';

import { _ }                        from 'lodash';
import { Promise }                  from 'bluebird';

import { db, sqlSelect, sqlInsert, sqlDelete }            from '../db.es6';
import { getUserFromList, getUserName, privateMsgToUser } from '../utils.es6';

const COMMAND = "admin";
const BRIEF_DESCRIPTION = "allows you to display and promote (or demote) users to (or from) admin status";
const DB_TABLE = "admin";
const SUPERUSER_PWD = config.superadminpassword;


let dbGetAdmins = async () => {
    return sqlSelect(`SELECT * FROM ${DB_TABLE} ORDER BY userid`);
}

let dbAddAdmin = async (userId) => {
    return sqlInsert(DB_TABLE, "userid", userId);
};

let dbDeleteAdmin = async (userId) => {
    return sqlDelete(DB_TABLE, "userid", userId);
};


class AdminCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("AdminCommand");

        super(COMMAND, BRIEF_DESCRIPTION, manager, listenToTypes);

        this.onAddAdmin = this.onAddAdmin.bind(this);
        this.onDeleteAdmin = this.onDeleteAdmin.bind(this);
        this.onGetAdminList = this.onGetAdminList.bind(this);
        
        const options = [
            new Option(this.name, "add", "add", "<@user>", this.onAddAdmin, "Add a user as admin to the list.", true),
            new Option(this.name, ["list", "all"], ["list$", "all$"], "", this.onGetAdminList, "List all admins."),
            new Option(this.name, ["delete", "remove", "rm"], ["delete", "remove", "rm"], "<@username>", this.onDeleteAdmin, "Delete a user from the admin list.")
        ];

        this.setupOptions(options);
    }

    helpText() {
        return this.helpShortDescription();
    }

    async onGetAdminList(bot, message) {
        console.log("onGetAdminList");
        
        const slackInfo = this.slackInfo;

        let fnGetAdminListAndReply = async (conversation) => {

            try {
                let admins = await dbGetAdmins();
                let reply = [];

                if (!admins || admins.length === 0) {
                    reply.push("No admins assigned yet.");
                } else {
                    let users = slackInfo.users || [];

                    let msg = "```" + _.reduce(admins, (result, admin) => {
                        let user = users.find(u => u.id === admin.userid);
                        return `${result}\n${user.name}`;
                    }, "") + "```";

                    reply.push(`Known admins:\n${msg}`);
                }

                let msg = reply.join("");

                // reply publicly only
                bot.reply(message, msg);
                
                // conversation.say(msg);
                conversation.next();

            } catch(err) {
                console.log("error?", err);
                conversation.say(`Sorry. An error happend.\nError: ${err.message}`);
                conversation.next();
            }
        };

        const self = this;

        bot.startPrivateConversation(message, (err, conversation) => {
            conversation.ask("Password, please.", (message, conversation) => {
                let pwd = self.getCommandArguments(message, self.onGetAdminList);
                if (pwd === SUPERUSER_PWD) {
                    fnGetAdminListAndReply(conversation);
                } else {
                    conversation.say("You are off the project!");
                    conversation.next();
                }
            }); // conversation.ask(pwd pls)
        }); // startPrivateConversation

    }

    onDeleteAdmin(bot, message) {
        console.log("onDeleteAdmin");

        let possibleUserName = getUserName(this.getCommandArguments(message, this.onDeleteAdmin));
        let user = getUserFromList(this.slackInfo.users || [], possibleUserName)

        if (!user) {
            bot.reply(message, `Sorry, could not find a user with the name ${possibleUserName}.`);
            return;
        }

        let fnDeleteAdminUserAndReply = async (user, conversation) => {

            try {
                let admins = await dbGetAdmins();
                let found = admins.find(a => a.userid === user.id);

                if (!found) {
                    conversation.say(`The user ${user.name} is not an admin.`);
                    conversation.next();
                    return;
                }
            } catch(err) {
                console.error(`Could not get the list of admins. :-( Reason: ${err.message}`);
                conversation.say(`The admin list could not be accessed. :-( Reason: ${err.message}`);
                conversation.next();
                return;
            }

            try {
                let statement = await dbDeleteAdmin(user.id);

                privateMsgToUser(bot, user.id, "Your admin powers have been taken away from you.\nYou are not worthy.");
             
                conversation.say(`Deleted the user ${user.name} from my admin database.`);
                conversation.next();

            } catch(err) {
                console.log("error?", err);
                conversation.say(`Sorry. An error happend.\nError: ${err}`);
                conversation.next();
            }
        };

        const self = this;

        bot.startPrivateConversation(message, (err, conversation) => {
            conversation.ask("Password, please.", (message, conversation) => {
                let pwd = self.getCommandArguments(message, self.onDeleteAdmin);
                if (pwd === SUPERUSER_PWD) {
                    fnDeleteAdminUserAndReply(user, conversation);
                } else {
                    conversation.say("Access denied!");
                    conversation.next();
                }
            }); // conversation.ask(pwd pls)
        }); // startPrivateConversation
    }

    onAddAdmin(bot, message) {
        console.log("onAddAdmin");

        let possibleUserName = getUserName(this.getCommandArguments(message, this.onAddAdmin));
        let user = getUserFromList(this.slackInfo.users || [], possibleUserName)

        if (!user) {
            bot.reply(message, `Sorry, could not find a user with the name ${possibleUserName}.`);
            return;
        }

        let fnAddAdminUserAndReply = async (user, conversation) => {

            try {
                let admins = await dbGetAdmins();
                let found = admins.find(a => a.userid === user.id);

                if (found) {
                    conversation.say(`The user ${user.name} is already an admin.`);
                    conversation.next();
                    return;
                }
            } catch(err) {
                console.error(`Could not get the list of admins. :-( Reason: ${err.message}`);
                conversation.say(`The admin list could not be accessed. :-( Reason: ${err.message}`);
                conversation.next();
                return;
            }

            try {
                let statement = await dbAddAdmin(user.id);

                privateMsgToUser(bot, user.id, "You were added to my admin database as admin.");

                conversation.say(`Added the user ${user.name} as admin to my database. ID#${statement.lastID}`);
                conversation.next();

            } catch(err) {
                console.log("error?", err);
                conversation.say(`Sorry. An error happend.\nError: ${err}`);
                conversation.next();
            }
        };

        const self = this;

        bot.startPrivateConversation(message, (err, conversation) => {
            conversation.ask("Password, please.", (message, conversation) => {
                let pwd = self.getCommandArguments(message, self.onAddAdmin);
                if (pwd === SUPERUSER_PWD) {
                    fnAddAdminUserAndReply(user, conversation);
                } else {
                    conversation.say("Access denied!");
                    conversation.next();
                }
            }); // conversation.ask(pwd pls)
        }); // startPrivateConversation
        
    }

}



export { 
    AdminCommand as default, 
    dbGetAdmins as getAdminList
};
