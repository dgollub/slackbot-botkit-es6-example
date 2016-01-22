//
// Unit tests with Mocha (http://mochajs.org/)
// 

"use strict";

import assert                       from 'assert';
import { suite, test, setup }       from 'mocha';
import { removeCommandFromMessage } from './utils.es6';

suite("utils", () => {

    test("should remove the command from the message", () => {
        const CMDS = [
            { matcher: "^admin add", cmd: "admin add" },
            { matcher: "^admin list$", cmd: "admin list" },
            { matcher: "tell facts", cmd: "tell facts" }
        ];

        const MSG = "only this should show up";

        for (let cmd of CMDS) {
            let msg = {
                text: `${cmd.cmd} ${MSG}`
            };
            let cleaned = removeCommandFromMessage(msg, cmd.matcher);

            assert.equal(MSG, cleaned);
        }
    }); // remove cmd from msg

}); // suite: utils
