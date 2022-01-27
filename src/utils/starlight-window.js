// @ts-nocheck
/**
 * Author: wysaid
 * Date: 2022-1-27
 */
'use strict';

/// Single Instace for log printing

const vscode = require('vscode');
const windowLabel = 'StarLight';

class StarLightWindowClass {

    outputChannel = null;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel(windowLabel);
    }

    printLog(message) {
        if (this.outputChannel) {
            this.outputChannel.appendLine(message);
        }
    }
}

/**
 * 
 * @returns {StarLightWindowClass}
 */
StarLightWindowClass.instance = function () {
    if (!global.StarLightWindow) {
        global.StarLightWindow = new StarLightWindowClass();
    }
    return global.StarLightWindow;
}

module.exports = StarLightWindowClass;