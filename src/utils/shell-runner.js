// @ts-nocheck
/**
 * Author: wysaid
 * Date: 2022-1-27
 */
'use strict';

/// Run shell!

const cp = require('child_process');

const slWindow = require('./starlight-window').instance();

class ShellRunner {

    constructor() {
    }

    /// Any count of arguments.
    run() {
        const args = arguments.join(' ');
        slWindow.printLog(args);

        try {
            const logResult = cp.execSync(args, { encoding: 'utf8' });
            slWindow.printLog(logResult);
        } catch (e) {
            return e;
        }

        return 0;
    }
}

module.exports = ShellRunner;