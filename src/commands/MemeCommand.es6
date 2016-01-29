//
// MemeCommand
// TODO(dkg): make this work cross platform (right now only Unix systems will work, but not Windows)
//

import config                       from '../configuration.es6';
import BaseCommand                  from './BaseCommand.es6';
import Option                       from './Option.es6';

import { formatUptime }             from '../utils.es6';

import _ from 'lodash';
import os from 'os';
import fs from 'fs';
import path from 'path';

const exec = require('child_process').exec;

const ROOT_PATH = path.join(path.dirname(fs.realpathSync(__filename)), "../../");

let configuredMemePath = config.memefolder || "data/meme";
if (configuredMemePath.substr(0, 1) !== "/") {
    configuredMemePath = path.join(ROOT_PATH, configuredMemePath);
}

const MEME_PATH = configuredMemePath;

const COMMAND = "meme";
const BRIEF_DESCRIPTION = `displays a meme gif/jpg`;


class MemeCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("MemeCommand");

        super(COMMAND, BRIEF_DESCRIPTION, manager, listenToTypes);

        this.onMemeShowRandom = this.onMemeShowRandom.bind(this);
        this.onMemeList = this.onMemeList.bind(this);

        const options = [
            new Option(this.name, ["", "rnd", "random"], ["$", "rnd", "random"], "", this.onMemeShowRandom, BRIEF_DESCRIPTION),
            new Option(this.name, ["list", "all"], ["list$", "all$"], "", this.onMemeList, "list all available meme files")
        ];

        this.setupOptions(options);
    }

    getMemeFiles() {
        let filesAndFolders = fs.readdirSync(MEME_PATH);
        let files = filesAndFolders.filter((fd) => {
            if (fd.substr(0, 1) === ".") return false;
            let f = path.join(MEME_PATH, fd);
            let stats = fs.statSync(f);
            return stats.isFile();
        });
        return files || [];
    }

    onMemeShowRandom(bot, message) {
        console.log("onMemeShowRandom");

        // TODO(dkg): get a list of all fiels in the meme folder and select one either
        //            randomly or via supplied keyword
        let files = this.getMemeFiles();

        if (files.length === 0) {
            console.warn(`No meme image files found in folder ${MEME_PATH}. Please add some image fiels first.`);
            bot.reply(message, "There are no meme images available on the server. Maybe you should add some first?");
            return;
        }

        let filename = _.sample(files); //"napoleon dynamite - gosh.jpg";
        let fullfilename = path.join(MEME_PATH, filename);

        console.log("fullfilename", fullfilename);
        // console.log("message", message);

        let token = bot.config.token;
        let channels = [message.channel];
        let cmd = `curl -F file=@"${fullfilename}" -F channels="${channels.join(",")}" -F token=${token} https://slack.com/api/files.upload`;

        console.log("cmd", cmd);

        const child = exec(cmd, {
            cwd: MEME_PATH
        }, (error, stdout, stderr) => {
            console.log("stdout", stdout);
            console.warn("stderr", stderr);
            if (error) {
                console.error("error", error);
            }
        });

    }

    onMemeList(bot, message) {
        console.log("onMemeShowRandom");

        // TODO(dkg): get a list of all fiels in the meme folder and select one either
        //            randomly or via supplied keyword
        let files = this.getMemeFiles();

        if (files.length === 0) {
            console.warn(`No meme image files found in folder ${MEME_PATH}. Please add some image fiels first.`);
            bot.reply(message, "There are no meme images available on the server. Maybe you should add some first?");
            return;
        }

        let reply = ["```"];
        for (let file of files) {
            reply.push(file);
        }
        reply.push("```");

        let msg = reply.join("\n");

        bot.reply(message, msg);
    }

}

export { MemeCommand as default };
