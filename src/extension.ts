'use strict';

import vscode = require('vscode');

import { StarLight } from './StarLight';
import { ShaderTemplateCreator } from './ShaderTemplateCreator';
import * as FMCoder from './coder';

function activate(context: vscode.ExtensionContext) {
    console.log('starlight-generator is now active');

    context.subscriptions.push(vscode.commands.registerCommand('starlight-generator.lua', routeCall.bind(null, "lua")));
    context.subscriptions.push(vscode.commands.registerCommand('starlight-generator.cpp', routeCall.bind(null, "cpp")));
    context.subscriptions.push(vscode.commands.registerCommand('starlight-generator.createShaderTemplate', routeCall.bind(null, "createShaderTemplate")));
    context.subscriptions.push(vscode.commands.registerCommand('starlight-generator.encode', routeCall.bind(null, "encode")));
    context.subscriptions.push(vscode.commands.registerCommand('starlight-generator.decode', routeCall.bind(null, "decode")));
}

type SlShaderConvertType = "lua" | "cpp";
type SlCommandType = SlShaderConvertType | "createShaderTemplate" | "encode" | "decode"

function routeCall(type: SlCommandType, runPath = vscode.window.activeTextEditor?.document?.uri) {
    console.log(`run routeCall("${type}", "${runPath}")`);
    if (!runPath) {
        vscode.window.showErrorMessage("StarLight-Generator: No file/directory specified!");
        return;
    }

    // 防御式编程
    if (!(runPath instanceof vscode.Uri))
        throw Error(`runPath (${runPath}) is a ${typeof runPath}`)

    if (type == "lua" || type == "cpp") {
        performStarLight(type, runPath);
    } else if (type == "createShaderTemplate") {
        (new ShaderTemplateCreator(runPath.fsPath)).create();
    } else if (type == "encode") {
        encodeFile(runPath)
    } else if (type == "decode") {
        decodeFile(runPath)
    }
}

function encodeFile(runPath: vscode.Uri) {
    (new FMCoder.Coder(runPath.fsPath)).encode();
}

function decodeFile(runPath: vscode.Uri) {
    (new FMCoder.Coder(runPath.fsPath)).decode()
}

function performStarLight(type: SlShaderConvertType, runPath: vscode.Uri) {
    // TODO: perform on single file
    let runDir = runPath.fsPath;

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "StarLight-Generator is running",
        cancellable: true,
    }, async (progress, token) => {
        const sl = new StarLight({
            runDir,
            updateProgressCallback: (inc, msg) => progress.report({ message: msg, increment: inc }),
        });
        token.onCancellationRequested(() => sl.cancel());
        try {
            await sl.performStarLight(type);
        }
        catch (err: any) {
            let errmsg: string;
            if (typeof err.stderr == "string")
                errmsg = err.stderr;
            else
                errmsg = err.toString();
            vscode.window.showErrorMessage(errmsg);
        }
    });
}

// this method is called when your extension is deactivated
function deactivate() {
    /// cleanup
}

module.exports = {
    activate,
    deactivate
}
