//
// CatchAllCommand
//

import BaseCommand                  from './BaseCommand.es6';
import Option                       from './Option.es6';



const COMMAND = "catchall";
const BRIEF_DESCRIPTION = `displays the current uptime of the bot`;


class CatchAllCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("CatchAllCommand");

        super(COMMAND, BRIEF_DESCRIPTION, manager, listenToTypes);

        this.onCatchAll = this.onCatchAll.bind(this);

        this.listenTo(/(\S+){1}/, this.listenToTypes, this.onCatchAll);
    }

    onCatchAll(bot, message) {
        console.log("onCatchAll", message);

        let msg = `Sorry, I don't understand that command.`;

        bot.reply(message, msg);
    }

}

export { CatchAllCommand as default };
