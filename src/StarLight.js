// @ts-nocheck
/**
 * Author: wysaid
 * Date: 2021-10-08
 */
'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const FormData = require('form-data');
const Unzipper = require('decompress-zip');
const archiver = require('archiver');

module.exports = class {

    type = 'both';
    inputFolder = null;
    onProgressCallback = null;
    onFileDownloadedCallback = null;
    onErrorCallback = null;
    onFinishCallback = null;
    tempDirPrefix = "starlight";
    tempDir = null;

    /// if set to true and the output & input folder is not the same
    /// the output folder's content will be removed.
    cleanupOutputFolder = false;

    /// indicates whether the output
    forceOverrideOutputFiles = true;

    // the zip file will be unzipped to the output folder if it exists.
    outputDir = null;

    // not implemented yet.
    starlightBinaryPath = null;

    constructor(type, inputFolder, onProgressCallback, onFileDownloadedCallback, onFinishCallback, onErrorCallback) {
        this.type = type;
        this.inputFolder = inputFolder;
        this.onProgressCallback = onProgressCallback;
        this.onFileDownloadedCallback = onFileDownloadedCallback;
        this.onFinishCallback = onFinishCallback;
        this.onErrorCallback = onErrorCallback;

        console.log("Create Starlight instance: ");
        console.log(arguments);

        if (!this.tempDir) {
            console.log("Creating starlight temp directory...");
            this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), this.tempDirPrefix));
            console.log("Starlight temp directory created at: " + this.tempDir);
        }
    }

    startRequest() {

        if (!this.type) {
            this.type = "lua";
        }

        console.log("startRequest called with type: " + this.type);

        if (!this.zipfile) {
            if (this.inputFolder) { /// Create the zipfile if input is a directory.
                if (this.onProgressCallback) {
                    this.onProgressCallback("Create the zipfile as the input is a directory");
                }
                this.zipfile = this.tempDir + "/starlight_input.zip";
                const output = fs.createWriteStream(this.zipfile);
                const archiveFile = archiver('zip');
                const localThis = this;
                output.on('close', () => {
                    if (localThis.onProgressCallback) {
                        localThis.onProgressCallback(this.zipfile + " - archive total bytes: " + archiveFile.pointer());
                    }
                    localThis.performStarLightPostRequest();
                });

                archiveFile.on('error', (err) => { throw err; });
                archiveFile.pipe(output);
                // archiveFile.directory(this.inputFolder, false);
                archiveFile.glob("**/*.+(json|vert|frag|glsl)", { cwd: this.inputFolder });
                archiveFile.finalize();
            } else {
                return false;
            }
        }
    }

    performStarLightPostRequest() {
        const localThis = this;
        this.responseZipFilePath = this.tempDir + "/slOutput.zip";
        const outputFile = fs.createWriteStream(this.responseZipFilePath);
        const form = new FormData();

        form.append('type', this.type);
        form.append('zipfile', fs.createReadStream(this.zipfile));
        form.submit('https://starlight.yyyyy.tech', (err, resHttps) => {
            if (err) {
                throw err;
            } else {
                console.log("status code: " + resHttps.statusCode);
                console.log("headers: ");
                console.log(resHttps.headers);
                if (localThis.onErrorCallback) {
                    resHttps.on('error', localThis.onErrorCallback);
                }

                resHttps.once('data', () => {
                    if (localThis.onProgressCallback) {
                        localThis.onProgressCallback("StarLight online service requested!");
                    }
                })

                resHttps.on('data', (data) => {
                    outputFile.write(data);
                });

                resHttps.on('close', () => {
                    if (localThis.onProgressCallback) {
                        localThis.onProgressCallback("StarLight online service call over. unzipping files...");
                    }

                    if (localThis.onFileDownloadedCallback) {
                        localThis.onFileDownloadedCallback(this.responseZipFilePath);
                    }

                    localThis.performCopyFiles(localThis.outputDir);
                });

            }
        })
    }

    performCopyFiles(outputDir) {
        if (!outputDir) {
            return;
        }

        if (fs.pathExistsSync(outputDir)) {
            if (this.cleanupOutputFolder) {
                fs.emptyDirSync(outputDir);
            }
        } else {
            fs.mkdirSync(outputDir);
        }

        const unzip = new Unzipper(this.responseZipFilePath);
        const localThis = this;
        unzip.on("extract", () => {

            if (localThis.onProgressCallback) {
                localThis.onProgressCallback("Finished extracting file.");
            }

            if (localThis.onFinishCallback) {
                localThis.onFinishCallback(localThis);
            }
        });

        if (!this.forceOverrideOutputFiles && outputDir === this.inputFolder) {
            throw new Error(`The files at ${$outputDir} will be overwritten!`);
        }

        unzip.extract({
            path: outputDir
        });
    }
};