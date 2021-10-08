// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "starlight-generator" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('starlight-generator.run', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		let tipsMsg = 'StarLight-Generator is running! ';
		if (arguments && arguments.length > 0) {
			for (let i = 0; i < arguments.length; i++)
				tipsMsg += ' ' + arguments[i];
		}

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "StarLight-Generator is running!",
			cancellable: true,
		}, async function (progress, token) {
			token.onCancellationRequested(function () {
				console.log("StarLight Progress Cancelled!");
			});

			progress.report({ increment: 0 });

			setTimeout(function () {
				progress.report({ increment: 20, message: "running 20% ..." });
			}, 1000);

			setTimeout(function () {
				progress.report({ increment: 50, message: "running 50% ..." });
			}, 2000);

			setTimeout(function () {
				progress.report({ increment: 100, message: "done ..." });
				vscode.window.showInformationMessage(tipsMsg);
			}, 3000);

			const p = new Promise((resolve, reject) => {
				setTimeout(() => {
					reject();
				}, 5000);
			});
			return p;
		});
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
