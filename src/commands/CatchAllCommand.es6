//
// CatchAllCommand
//

import BaseCommand                  from './BaseCommand.es6';
import Option                       from './Option.es6';



const COMMAND = "catchall";
const BRIEF_DESCRIPTION = `shows a short "unknown command" message`;


class CatchAllCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("CatchAllCommand");

        let hideCommand = true;
        super(COMMAND, BRIEF_DESCRIPTION, manager, listenToTypes, hideCommand);

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
