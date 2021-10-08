// @ts-nocheck
/**
 * Author: wysaid
 * Date: 2021-10-08
 */
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = class {

    constructor(type, inputFolder, onprogresCallback, onfinishCallback) {
        this.type = type;
        this.inputFolder = inputFolder;
        this.onprogresCallback = onprogresCallback;
        if (onfinishCallback) {
            this.onfinishCallback = onfinishCallback;
        } else {
            this.onfinishCallback = (error) => {
                // things should be valid if error is null or undefined
                if (error) {
                    console.log("request failed!")
                } else {
                    console.log("request succeeded!");
                }
            }
        }
    }

    startRequest() {
        if (!this.zipfile) {
            return false;
        }

        if (!this.type) {
            this.type = "both";
        }

        let tmpDir;
        const starlightPrefix = "starlight";

        try {
            console.log("Creating starlight temp directory...");
            tmpDir = fs.mkdtempSync(path.join(os.tempDir(), starlightPrefix));
            console.log("Starlight temp directory created at: " + tmpDir.toString());
        } catch (err) {
            console.log("Error creating StarLight temp directory")
            return false;
        } finally {
            try {
                if (tmpDir) {
                    fs.rmSync(tmpDir, { recursive: true });
                }
            } catch (err) {
                console.log("Error cleaning up temp directory");
            }
        }

        const onFinishCallback = this.onfinishCallback.bind(this);

        this.outputFilePath = tmpDir.toString() + "/slOutput.zip";
        const outputFile = fs.createWriteStream(this.outputFilePath);
        let localThis = this;
        this.req = https.request({
            hostname: 'starlight.yyyyy.tech',
            port: 443,
            path: '/',
            method: 'POST',
            headers: { 'Content-Type': 'Content-Type: multipart/form-data' },
        }, (resHttps) => {
            localThis.resHttps = resHttps;
            console.log("status code: " + resHttps.statusCode);
            console.log("headers: " + resHttps.headers);
            resHttps.on('data', (data) => {
                outputFile.write(data);
            });

            resHttps.on('close', onFinishCallback);
        });

        req.on('error', (e) => {
            console.log(e);
            onFinishCallback(e);
        });

        req.on('finish', onFinishCallback);

        req.write({
            'zipfile': fs.createReadStream(this.zipfile),
            "type": this.type
        });
        req.end();
    }

};