import * as vscode from 'vscode';

import { StarLight } from './StarLight';
import { ShaderTemplateCreator } from './ShaderTemplateCreator';

let diagnosticCollection: vscode.DiagnosticCollection
const l10n = vscode.l10n;

export function activate(context: vscode.ExtensionContext) {
    console.log('starlight-generator is now active');

    context.subscriptions.push(vscode.commands.registerCommand('starlight-generator.generate', routeCall.bind(null, "generate")));
    context.subscriptions.push(vscode.commands.registerCommand('starlight-generator.createShaderTemplate', routeCall.bind(null, "createShaderTemplate")));

    diagnosticCollection = vscode.languages.createDiagnosticCollection('StarLight');
}

type SlCommandType = "generate" | "createShaderTemplate";

function routeCall(type: SlCommandType, runPath = vscode.window.activeTextEditor?.document?.uri) {
    console.log(`run routeCall("${type}", "${runPath}")`);
    if (!runPath) {
        vscode.window.showErrorMessage(l10n.t("StarLight-Generator: No file/directory specified!"));
        return;
    }

    // 防御式编程
    if (!(runPath instanceof vscode.Uri))
        throw Error(`runPath (${runPath}) is a ${typeof runPath}`)

    if (type == "generate") {
        performStarLight(runPath);
    } else if (type == "createShaderTemplate") {
        (new ShaderTemplateCreator(runPath.fsPath)).create();
    }
}

function performStarLight(runPath: vscode.Uri) {
    // TODO: perform on single file
    let runDir = runPath.fsPath;

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "StarLight",
        cancellable: true,
    }, async (progress, token) => {
        const sl = new StarLight({
            runDir,
            updateProgressCallback: (inc, msg) => progress.report({ message: msg, increment: inc }),
            diagnosticCollection,
        });
        token.onCancellationRequested(() => sl.cancel());
        try {
            await sl.performStarLight();
            // 等待一小会显示窗口信息
            await new Promise(resolve => setTimeout(resolve, 3000));
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
export function deactivate() {
    /// cleanup
}
