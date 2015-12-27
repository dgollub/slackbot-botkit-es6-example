//
// BaseCommand
//


const LISTEN_TO_DIRECT_MESSAGE = "direct_message";
const LISTEN_TO_DIRECT_MENTION = "direct_mention";
const LISTEN_TO_MENTION = "mention";
const LISTEN_TO_AMBIENT = "ambient";

const LISTEN_TO_ALL_BUT_AMBIENT = [LISTEN_TO_DIRECT_MESSAGE, LISTEN_TO_DIRECT_MENTION, LISTEN_TO_MENTION].join(',');
const LISTEN_TO_ALL = [LISTEN_TO_AMBIENT, LISTEN_TO_DIRECT_MESSAGE, LISTEN_TO_DIRECT_MENTION, LISTEN_TO_MENTION].join(',');

console.log("base cmd");


class BaseCommand {

    constructor(/*name, controller, slackInfo*/) {
        console.log("BaseCommand");
        this.name = name;
        this.controller = controller;
        this.slackInfo = slackInfo;
    }

    listenTo(messages, whatToListenTo, callback) {
        console.log(`listenTo(${messages}, ${whatToListenTo}, cb)`);
        let ms = Array.isArray(messages) ? messages : [messages];
        this.controller.hears(ms, whatToListenTo, callback);
    }
}

console.log("base cmd");

export { BaseCommand };
