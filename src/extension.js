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

	progressPercent = 0;
	progressPercentTo = 0;
	progressResolve = null;
	progressReject = null;
	progressDurationTime = 0;

	intervalHandle = null;
	currentProgressMessage = null;

	constructor() {

	}

	/// will simply write back to the input directory.
	performStarLight(type, inputDir) {

		const inputDirStat = fs.statSync(inputDir);
		if (inputDirStat.isFile()) {
			inputDir = path.dirname(inputDir);
		} else if (!inputDirStat.isDirectory()) {
			vscode.window.showErrorMessage("StarLight-Generator: Invalid file/directory: " + inputDir.path);
			return false;
		}

		if (this.slInstance) {
			vscode.window.showInformationMessage("The last StarLight-Generator process is not finished, please try again...");
			return false;
		}

		this.slInstance = new StarLight();

		const slInstance = this.slInstance;

		slInstance.stopRequested = false;
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

		if (slInstance.startRequest()) {

			const localThis = this;
			this.progressPercent = 0;
			this.progressPercentTo = 0;
			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "StarLight-Generator is running",
				cancellable: true,
			}, async function (progress, token) {
				localThis.progressInstance = progress;
				localThis.progressToken = token;
				token.onCancellationRequested(localThis.onCancellationRequested.bind(localThis));
				progress.report({ increment: 10, message: "StarLight-Generator start running!" });

				if (localThis.intervalHandle) {
					console.error("intervalHandle = " + intervalHandle);
					vscode.window.showErrorMessage("StarLight-Generator: Unexpected error!!\n");
					clearInterval(localThis.intervalHandle);
					localThis.intervalHandle = null;
				}

				const p = new Promise((resolve, reject) => {
					localThis.progressResolve = resolve;
					localThis.progressReject = reject;
					localThis.progressDurationTime = 0;
					localThis.intervalHandle = setInterval(() => {
						localThis.progressDurationTime += 1000;
						/// End in 1 minute
						if (localThis.progressDurationTime > 60000) {
							localThis.onError("request time out");
							return;
						}

						if (localThis.progressPercentTo < 99) {
							let increment = localThis.progressPercentTo - localThis.progressPercent;
							if (increment === 0 && localThis.progressPercentTo < 50) {
								increment = 1;
							}
							localThis.progressPercentTo += increment;
							localThis.progressPercent = localThis.progressPercentTo;
							progress.report({
								increment: increment,
								message: localThis.progressMessage
							});

							console.log("Progress update - " + localThis.progressMessage + " " + localThis.progressPercent);
							console.log("Taking time: " + localThis.progressDurationTime);
						}

					}, 1000);
					console.error("intervalHandle = " + localThis.intervalHandle);
				});
				return p;
			});
		}
	}

	onCancellationRequested() {
		console.log("Killing StarLight-Generator process");
		vscode.window.showErrorMessage("StarLight-Generator: process cancelled!");
		this.doReject();
		if (this.slInstance) {
			/// Mark as stopped, and let it go.
			this.slInstance.stopRequested = true;
			this.slInstance = null;
		}
		if (this.intervalHandle) {
			clearInterval(this.intervalHandle);
			this.intervalHandle = null;
		}
	}

	onProgress(progressMessage) {
		if (this.progressPercentTo < 95) {
			if (this.progressPercentTo > 70) {
				this.progressPercentTo += 5;
			} else {
				this.progressPercentTo += 15;
			}
		}
		this.progressMessage = progressMessage;
	}

	endPerform() {
		if (this.intervalHandle) {
			clearInterval(this.intervalHandle);
			this.intervalHandle = null;
		}
		this.slInstance.stopRequested = true;
		this.slInstance = null;
	}

	doResolve() {
		if (this.progressResolve) {
			this.progressResolve();
			this.progressResolve = null;
		}
		this.endPerform();
	}

	doReject() {
		if (this.progressReject) {
			this.progressReject();
			this.progressReject = null;
		}
		this.endPerform();
	}

	onError(err) {
		this.doReject();
		vscode.window.showErrorMessage("StarLight-Generator: " + (err ? err : "process filed!"));
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
			throw err;
			slRunner = null;
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
