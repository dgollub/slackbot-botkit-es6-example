//
// Various utility functions
//

"use strict";

// TODO(dkg): improve this function
let formatUptime = (uptime) => {
    let unit = 'second';

    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
};


let removeCommandFromMessage = (msg, commands) => {
    let text = (msg.text || "").trim();
    commands = [].concat(commands);

    for (let cmd of commands) {
        // TODO(dkg): cmd can be a regular expression, which needs to be removed
        
        // cheating here: if the regex has a "stop condition" ignore it
        if (cmd.substr(-1) === "$") {
            cmd = cmd.substr(0, cmd.length - 1);
        }

        let matches = text.match(cmd);
        if (matches) {
            for (let m of matches) {
                let idx = text.indexOf(m);
                text = text.substr(idx + m.length).trim();
            }
            continue;
        }

        // NOTE(dkg): this is the simple text comparsion fallback case
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

    return text.trim();
};


let randomIntFromInterval = (min,max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};


let getUserName = (possibleUserName) => {
    // other users can be referenced either by their name or by their @name
    // examples
    // a) admin add chris ==> userNmae == chris
    // b) admin add @chris ==> userName == <@U03NQBCBA>
    return possibleUserName.replace("<@", "").replace(">", "");
};


// list: array of https://api.slack.com/types/user
let getUserFromList = (list, possibleUserNameOrId) => {
    let userName = getUserName(possibleUserNameOrId);
    let user = list.find(u => u.name === userName || u.id == userName);

    return user;
};


let privateMsgToUser = (bot, userId, message) => {
    // console.log("privateMsgToUser", userId, message);
    
    let privateMsg = {
        text: message,
        channel: "",
        user: userId
    };

    bot.startPrivateConversation(privateMsg, (err, conversation) => { 
        conversation.say(message);
        conversation.next();
    });
};


export { 
    formatUptime,
    removeCommandFromMessage,
    randomIntFromInterval,
    getUserName,
    getUserFromList,
    privateMsgToUser
};

