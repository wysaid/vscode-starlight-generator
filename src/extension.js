// @ts-nocheck
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';

const vscode = require('vscode');
const fs = require('fs-extra');
const path = require('path');

const StarLight = require('./StarLight');

class StarLightRunner {

	type = null;
	slInstance = null;

	progressInstance = null;
	progressToken = null;
	progressIncrement = 0;

	progressResolve = null;
	progressReject = null;

	timeoutHandle = null;

	constructor() {

	}

	/// will simply write back to the input directory.
	performStarLight(type, inputDir) {

		const inputDirStat = fs.statSync(inputDir);
		if (inputDirStat.isFile()) {
			inputDir = path.dirname(inputDir);
		} else if (!inputDirStat.isDirectory()) {
			vscode.window.showErrorMessage("Invalid file/directory: " + inputDir.path);
			return;
		}

		if (this.slInstance) {
			vscode.window.showInformationMessage("The StarLight-Generator is already running, please wait...");
			return;
		}

		this.slInstance = new StarLight();

		const slInstance = this.slInstance;

		slInstance.onProgressCallback = this.onProgress.bind(this);
		slInstance.onFileDownloadedCallback = this.onFileDownload.bind(this)
		slInstance.onFinishCallback = this.onFinish.bind(this);
		slInstance.onErrorCallback = this.onError.bind(this);
		slInstance.type = type;

		/// input and output directories are the same directory.
		slInstance.inputFolder = inputDir;
		slInstance.outputDir = inputDir;
		slInstance.cleanupOutputFolder = false;
		slInstance.forceOverrideOutputFiles = true;
		this.progressIncrement = 0;
		const localThis = this;

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "StarLight-Generator is running!",
			cancellable: true,
		}, async function (progress, token) {
			localThis.progressInstance = progress;
			localThis.progressToken = token;
			token.onCancellationRequested(localThis.onCancellationRequested);

			progress.report({ increment: 0, message: "StarLight-Generator start running!" });
			localThis.slInstance.startRequest();

			const p = new Promise((resolve, reject) => {
				progressResolve = resolve;
				progressReject = reject;
				/// End in ten minutes
				localThis.timeoutHandle = setTimeout(() => {
					localThis.timeoutHandle = null;
					localThis.onError("request time out");
				}, 10000);
			});
			return p;
		});
	}

	onCancellationRequested() {
		console.log("Killing StarLight-Generator process");
		this.doReject();
	}

	onProgress(progressMessage) {
		if (this.progressInstance) {

			if (this.progressIncrement < 95) {
				if (this.progressIncrement > 70) {
					this.progressIncrement += 1;
				} else {
					this.progressIncrement += 10;
				}
			}

			this.progressInstance.report({
				increment: this.progressIncrement,
				message: progressMessage
			});
		}

		console.log(progressMessage);
	}

	endPerform() {
		if (this.timeoutHandle) {
			clearTimeout(this.timeoutHandle);
			this.timeoutHandle = null;
		}
		this.slInstance = null;
	}

	doResolve() {
		if (this.progressReject) {
			this.progressReject();
			this.progressReject = null;
		}
		this.endPerform();
	}

	doReject() {
		if (this.progressResolve) {
			this.progressResolve();
			this.progressResolve = null;
		}
		this.endPerform();
	}

	onError(err) {
		this.doReject();
	}

	onFileDownload(outputZipFile) {
		console.log("outputZipFile: " + outputZipFile);
	}

	onFinish(slInstance) {
		console.log("onFinish, files at " + slInstance.outputDir);

		fs.readdirSync(slInstance.outputDir).forEach(file => {
			console.log(file);
		});

		console.log("Task All Over.");

		this.doResolve();
	}
}

let slRunner = null;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "starlight-generator" is now active!');

	const commandFunc = (type, runPath) => {
		// run starlight command
		if (!runPath) {
			vscode.window.showErrorMessage("StarLight-Generator: No param specified!");
			return;
		}

		console.log("before performStarLight");
		try {
			if (slRunner == null) {
				slRunner = new StarLightRunner();
			}
			if (runPath.path) { /// maybe instance of file ?
				slRunner.performStarLight(type, runPath.path);
			} else {
				if (runPath instanceof Array) {
					runPath = runPath[0];
				}

				if (runPath === 'fromKey') {
					slRunner.performStarLight(type, vscode.window.activeTextEditor.document.fileName);
				} else if (runPath instanceof String) {
					slRunner.performStarLight(type, runPath);
				} else {
					slRunner.performStarLight(type, runPath.toString());
				}
			}

		} catch (err) {
			console.log(err);
		}
		console.log("end performStarLight");
	};


	context.subscriptions.push(vscode.commands.registerCommand('starlight-generator.lua', (runPath) => {
		// run starlight command
		commandFunc.call(this, "lua", runPath);
	}));

	/////////////////////////////

	context.subscriptions.push(vscode.commands.registerCommand('starlight-generator.cpp', (runPath) => {
		// run starlight command
		commandFunc.call(this, "cpp", runPath);
	}));

}

// this method is called when your extension is deactivated
function deactivate() {
	/// cleanup
	slRunner = null;
}

module.exports = {
	activate,
	deactivate
}
