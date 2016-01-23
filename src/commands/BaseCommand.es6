//
// BaseCommand
//

// NOTE(dkg): circular reference to AdminCommand, which references this file....
//            is there a better way to do this? Surely.
import { getAdminList } from './AdminCommand.es6';


const LISTEN_TO_DIRECT_MESSAGE = "direct_message";
const LISTEN_TO_DIRECT_MENTION = "direct_mention";
const LISTEN_TO_MENTION = "mention";
const LISTEN_TO_AMBIENT = "ambient";

const LISTEN_TO_ALL_BUT_AMBIENT = [LISTEN_TO_DIRECT_MESSAGE, LISTEN_TO_DIRECT_MENTION, LISTEN_TO_MENTION].join(',');
const LISTEN_TO_ALL = [LISTEN_TO_AMBIENT, LISTEN_TO_DIRECT_MESSAGE, LISTEN_TO_DIRECT_MENTION, LISTEN_TO_MENTION].join(',');


class BaseCommand {

    constructor(name, manager) {
        this.name = name;
        this.manager = manager;
        this.controller = manager.controller;
        this.slackInfo = manager.slackInfo;
    }

    listenTo(messages, whatToListenTo, callback) {
        console.log(`listenTo(${messages}, ${whatToListenTo}, cb)`);
        let ms = Array.isArray(messages) ? messages : [messages];
        this.controller.hears(ms, whatToListenTo, callback);
    }

    // returns a promise that can be "await"ed
    async isAdmin(bot, message) {
        let userId = message.user || null;

        try {
            let admins = await getAdminList();

            let isAdmin = !!(admins.find(a => a.userid === userId));
            console.log("isAdmin", isAdmin);

            if (!isAdmin) {
                // privateMsgToUser(bot, userId, "Sorry, you are not qualified for this command.");
                bot.reply(message, "Sorry, you are not qualified for this command.");
            }

            return isAdmin;

        } catch(err) {
            let errMsg = `Could not get the admin list. Reason: ${err.message}`;
            console.error(errMsg);
            bot.reply(message, errMsg);
            return false;
        }
    }

    // returns the usage/help text for this command/these commands
    helpText() {
        throw "Please implement this function in your subclass!";
    }

    helpShortDescription() {
        throw "Please implement this function in your subclass!";
    }

}


export { BaseCommand as default };
