//
// MemeCommand
//

import BaseCommand                  from './BaseCommand.es6';
import Option                       from './Option.es6';

import { formatUptime }             from '../utils.es6';

import os from 'os';
import fs from 'fs';
import path from 'path';

const exec = require('child_process').exec;

const ROOT_PATH = path.join(path.dirname(fs.realpathSync(__filename)), "../../");

const COMMAND = "meme";
const BRIEF_DESCRIPTION = `displays a meme gif/jpg`;


class MemeCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("MemeCommand");

        super(COMMAND, BRIEF_DESCRIPTION, manager, listenToTypes);

        this.onMemeShowRandom = this.onMemeShowRandom.bind(this);

        const options = [
            new Option(this.name, ["", "rnd", "random"], ["", "rnd", "random"], "", this.onMemeShowRandom, BRIEF_DESCRIPTION)
        ];

        this.setupOptions(options);
    }

    onMemeShowRandom(bot, message) {
        console.log("onMemeShowRandom");

        // let hostname = os.hostname();
        // let uptime = formatUptime(process.uptime());
        // let msg = `:robot_face: I am a bot named <@${bot.identity.name}>. I have been running for ${uptime} on ${hostname}.`;

        // console.log(bot);
        // console.log(message);

        // bot.reply(message, msg);
        let filename = "napoleon dynamite - gosh.jpg";
        let fullfilename = path.join(ROOT_PATH, "meme/", filename);

        console.log("fullfilename", fullfilename);
        // DOES NOT WORK!
        // // var data = base64Img.base64Sync(fullfilename);
        // let fileData = fs.readFileSync(fullfilename);
        // let length = fileData.length;
        // let tmp = [];
        // let boundary = "---------------------------9051914041544843365972754266";
        // // tmp.push(`Content-Type: multipart/form-data; boundary=${boundary}`);
        // // tmp.push(`Content-Length: ${length}`);
        // // tmp.push("");
        // tmp.push(`${boundary}`);
        // tmp.push(`Content-Disposition: form-data; name="file"; filename="${filename}"`);
        // tmp.push("Content-Transfer-Encoding: base64");
        // tmp.push("Content-Type: text/plain");
        // tmp.push("");
        // tmp.push("");
        // tmp.push(fileData.toString("base64"));
        // tmp.push(`${boundary}`);
        // tmp.push("");

        // let data = tmp.join("\n");
        // console.log("data", data);

        // let fileUpload = bot.api.files.upload;
        // let options = {
        //     headers: {
        //         'Content-Type': `multipart/form-data; boundary=${boundary}`,
        //         "Content-Length": `${length}`,
        //     },
        //     token: bot.config.token,
        //     file: data,
        //     filetype: "auto",
        //     filename: filename,
        //     title: "Gosh!",
        //     initial_comment: null,
        //     channels: message.channel
        // };

        // fileUpload(options, (a, b, c) => {
        //     console.log("done with upload");
        //     console.log("aaaa", a);
        //     console.log("bbbb", b);
        //     console.log("cccc", c);
        // });

        let token = bot.config.token;
        let channels = [message.channel];
        let cmd = `curl -F file=@"${fullfilename}" -F channels="${channels.join(",")}" -F token=${token} https://slack.com/api/files.upload`;

        console.log("cmd", cmd);

        const child = exec(cmd, {
            cwd: ROOT_PATH
        }, (error, stdout, stderr) => {
            console.log("stdout", stdout);
            console.warn("stderr", stderr);
            if (error) {
                console.error("error", error);
            }
        });

    }

}

export { MemeCommand as default };
