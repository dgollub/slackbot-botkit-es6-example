//
// MemeCommand
// TODO(dkg): make this work cross platform (right now only Unix systems will work, but not Windows)
//

import config                       from '../configuration.es6';
import BaseCommand                  from './BaseCommand.es6';
import Option                       from './Option.es6';

import { Promise }                  from 'bluebird';
import { getAdminList }             from './AdminCommand.es6';

import { formatUptime, privateMsgToUser } from '../utils.es6';

import os from 'os';
import fs from 'fs';
import path from 'path';
import download from 'file-download';

const _ = require('lodash');

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
        this.onMemeUpload = this.onMemeUpload.bind(this);
        this.onMemeList = this.onMemeList.bind(this);
        this.onMemeShowKeyword = this.onMemeShowKeyword.bind(this);

        const options = [
            new Option(this.name, ["list", "all"], ["list", "all"], ["[<keyword>]"], this.onMemeList, "list all available meme files"),
            new Option(this.name, ["add", "upload"], ["add", "upload"], ["<url>", "[<save as filename>]"], this.onMemeUpload, "upload a new meme file", true),
            new Option(this.name, ["rnd", "random"], ["rnd", "random"], "", this.onMemeShowRandom, BRIEF_DESCRIPTION),
            new Option(this.name, ["", "keyword"], ["", "keyword"], ["<keyword>"], this.onMemeShowKeyword, BRIEF_DESCRIPTION),
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

    sendMemeFile(bot, message, filename) {
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

    getBestMatches(bot, message, files, fn) {
        let passedArgs = (this.getCommandArguments(message, fn) || "").replace("<", "").replace(">", "");
        let args = passedArgs.includes(" ") ? passedArgs.trim().split(" ") : [passedArgs.trim()];

        if (passedArgs === "") return null;

        // TODO(dkg): let the user also do "list <keyword>" and have the same algorithm run
        let matches = [];
        // TODO(dkg): quite the hackish way of doing this, but whatever ... it kinda works
        for (let arg of args) {
            let larg = arg.toLowerCase();
            for (let file of files) {
                if (file.toLowerCase().includes(larg)) {
                    let m = _.find(matches, (m) => m.file === file);
                    if (!!m) {                        
                        m.count++;
                        m.keywords.push(arg);
                    } else {
                        m = {
                            file: file,
                            count: 1,
                            keywords: [arg]
                        };
                        matches.push(m);
                    }
                }
            }
        }

        let sorted = _.orderBy(matches, "count", "desc");
        let bestMatches = null;

        if (sorted.length > 1) {
            bestMatches = _.filter(sorted, (m) => m.count === sorted[0].count);
        } else {
            bestMatches = sorted.length > 0 ? [sorted[0]] : false;
        }

        return bestMatches;
    }

    async onMemeShowRandom(bot, message) {
        console.log("onMemeShowRandom");

        // TODO(dkg): get a list of all fiels in the meme folder and select one either
        //            randomly or via supplied keyword
        let files = this.getMemeFiles();

        if (files.length === 0) {
            console.warn(`No meme image files found in folder ${MEME_PATH}. Please add some image fiels first.`);
            bot.reply(message, "There are no meme images available on the server. Maybe you should add some first?");
            return;
        }

        let filename = _.sample(files);
        
        this.sendMemeFile(bot, message, filename);
    }

    async onMemeList(bot, message) {
        console.log("onMemeShowRandom");

        // TODO(dkg): get a list of all fiels in the meme folder and select one either
        //            randomly or via supplied keyword
        let files = this.getMemeFiles();

        if (files.length === 0) {
            console.warn(`No meme image files found in folder ${MEME_PATH}. Please add some image fiels first.`);
            bot.reply(message, "There are no meme images available on the server. Maybe you should add some first?");
            return;
        }

        let bestMatches = this.getBestMatches(bot, message, files, this.onMemeShowKeyword);

        if (!!bestMatches) {
            files = _.map(bestMatches, (m) => m.file);
        }

        let reply = ["```"];
        for (let file of files) {
            reply.push(file);
        }
        reply.push("```");

        let msg = reply.join("\n");

        bot.reply(message, msg);
    }

    async onMemeUpload(bot, message) {
        console.log("onMemeUpload");

        let isAdmin = await this.isAdmin(bot, message);

        if (!isAdmin) return;

        this.startTyping(bot, message);

        // download
        let passedArgs = (this.getCommandArguments(message, this.onMemeUpload) || "").replace("<", "").replace(">", "");
        let args = passedArgs.trim().split(" ");
        let url = args.length > 0 ? args[0].trim() : null;

        console.log("passedArgs", passedArgs);

        if (url) {
            url = url.substr(0, 4) === "http" ? url : null;
        }

        if (args.length < 1 || null === url) {
            bot.reply(message, "You need to pass at least the URL to the meme image you want to add.");
            return;
        }

        let filename = args.length > 1 ? args[1] : _.last(url.split("/"));
        let ext = _.last(filename.split("."));

        if (ext === filename) {
            // no file ext found ... hmmm. reject?
            ext = _.last(url.split("."));
            if (ext === null || ext === "") {
                bot.reply(message, "Your file does not seem to have a valid file extension. :-(");
                return;
            }
            if (filename.indexOf("." + ext) < 0) {
                filename = filename + "." + ext;
            }
            console.log("filename", filename);
        }

        let localFileName = path.join(MEME_PATH, filename);
        let localFileExists = false;

        console.log("localFileName", localFileName);

        try {
            let stats = fs.statSync(localFileName);
            localFileExists = stats.isFile();
        } catch(err) {
            console.warn(`onMemeUpload: fs.Stat on file ${localFileName} failed. File does not exists.`);
        }

        if (localFileExists) {
            let parts = filename.split(".");
            let lext = parts.pop() || ext;
            let lfn = parts.join("");
            // append a counter to the filename OR increase an existing counter
            parts = lfn.split("_");
            lfn = parts.pop();
            let counterTmp = parts.length > 0 ? parseInt(parts[0], 10) : 0;
            let counter = isNaN(counterTmp) ? 1 : counterTmp + 1;

            lfn = lfn + "_" + counter + "." + lext;
            filename = lfn;

            console.log("new localFileName", localFileName);
        }

        localFileName = path.join(MEME_PATH, filename);

        console.log("localFileName", localFileName);

        // download file now and save as local file
        let downloadOptions = {
            directory: MEME_PATH,
            filename: filename,
        }

        let p = new Promise((resolve, reject) => {
            download(url, downloadOptions, (err) => {
                console.log("done downloading and saving", err);
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            })
        });
        
        p.then(() => {
            bot.reply(message, "Meme added!");
        }).catch((error) => {
            let msg = `Sorry, your meme could not be added. Reason: ${error}`;
            console.error(msg, error);
            bot.reply(message, msg);
        });
        
    }

    onMemeShowKeyword(bot, message) {
        console.log("onMemeShowKeyword");

        this.startTyping(bot, message);

        let files = this.getMemeFiles();

        if (files.length === 0) {
            console.warn(`No meme image files found in folder ${MEME_PATH}. Please add some image fiels first.`);
            bot.reply(message, "There are no meme images available on the server. Maybe you should add some first?");
            return;
        }

        let bestMatches = this.getBestMatches(bot, message, files, this.onMemeShowKeyword) || [];
        let filename = false;

        if (bestMatches.length > 0) {
            let bestMatch = _.sample(bestMatches);
            filename = !!bestMatch ? bestMatch.file : null;
        }

        if (!!filename) {
            this.sendMemeFile(bot, message, filename);
        } else {
            bot.reply(message, "Sorry, your keyword(s) didn't match any meme files in my system.");
        }

    }

}

export { MemeCommand as default };
