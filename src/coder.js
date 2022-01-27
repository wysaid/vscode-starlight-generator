// @ts-nocheck
'use strict';

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const urllib = require('urllib')
const formstream = require('formstream');

class Coder {
    inputPath = ''
    encodingURL = ''
    constructor(inputPath) {
        this.inputPath = inputPath;
        const config = vscode.workspace.getConfiguration('starlight-generator')
        this.encodingURL = config.get('encodingURL')
        this.encodeFile = this.encodeFile.bind(this)
        this.decodeFile = this.decodeFile.bind(this)
    }

    readDirRecursive = async (filePath, selector) => {
        const dir = await fs.promises.readdir(filePath);
        const files = await Promise.all(dir.map(async relativePath => {
            const absolutePath = path.join(filePath, relativePath);
            const stat = await fs.promises.lstat(absolutePath);
            if (stat.isDirectory()) {
                return this.readDirRecursive(absolutePath, selector);
            } else {
                if (selector(absolutePath)) {
                    return absolutePath;
                }
            }
        }));

        return files.flat().filter(e => e != null);
    }

    async findFilesWithSuffix(filePath, suffix) {
        const inputPathStat = fs.statSync(filePath);
        var files = []
        if (inputPathStat.isFile()) {
            files.push(filePath)
        } else {
            let regex = new RegExp('.*\.' + suffix + "$", 'i')
            files = await this.readDirRecursive(filePath, (each) => {
                return each.match(regex) != null;
            })
        }
        return files
    }

    // curl -F "file=@$fileName" -F "op=encode"
    // http://mac.yyyyy.tech/faceDetect/encode.php
    async encode() {
        const files = await this.findFilesWithSuffix(this.inputPath, "lua")
        if (files.length == 0) {
            vscode.window.showErrorMessage("Encode failed: no files");
            return;
        }

        const encodingDisposable = vscode.window.setStatusBarMessage("Encoding Files ...", 5000)
        Promise
            .all(files.map(this.encodeFile))
            .then(ret => {
                vscode.window.setStatusBarMessage("Encoding Files Done.", 1000)
                encodingDisposable.dispose()
                console.log("Encoding Files Done => \r\n" + ret.join('\r\n'))
            })
    }

    // curl -F "file=@$fileName" -F "op=decode"
    // http://mac.yyyyy.tech/faceDetect/encode.php
    async decode() {
        const files = await this.findFilesWithSuffix(this.inputPath, "ex")
        if (files.length == 0) {
            vscode.window.showErrorMessage("Decode failed: no files");
            return;
        }

        const decodingDisposable = vscode.window.setStatusBarMessage("Decoding Files ...", 5000)
        Promise
            .all(files.map(this.decodeFile))
            .then(ret => {
                vscode.window.setStatusBarMessage("Decoding Files Done.", 1000)
                decodingDisposable.dispose()
                console.log("Decoding Files Done => \r\n" + ret.join('\r\n'))
            })
    }

    async encodeFile(filePath) {
        const dirname = path.dirname(filePath)
        const fileBasename = path.basename(filePath, '.lua')
        const filename = path.basename(filePath)
        const outputFilePath = path.join(dirname, fileBasename + ".ex")
        var form = formstream()
        form.buffer('file', fs.readFileSync(filePath), filename, 'application/octet-stream')
        form.field('op', 'encode')

        return urllib
            .request(
                this.encodingURL,
                {
                    method: 'POST',
                    headers: form.headers(),
                    stream: form
                }
            )
            .then(function (result) {
                fs.writeFileSync(outputFilePath, result.data)
                return outputFilePath
            })
    }

    async decodeFile(filePath) {
        const config = vscode.workspace.getConfiguration('starlight-generator')
        const dstSuffix = config.get("decodedFileSuffix")

        const dirname = path.dirname(filePath)
        const fileBasename = path.basename(filePath, '.ex')
        const filename = path.basename(filePath)
        const outputFilePath = path.join(dirname, fileBasename + '.' + dstSuffix)
        var form = formstream()
        form.buffer('file', fs.readFileSync(filePath), filename, 'application/octet-stream')
        form.field('op', 'decode')

        return urllib.
            request(
                this.encodingURL,
                {
                    method: 'POST',
                    headers: form.headers(),
                    stream: form
                })
            .then(function (result) {
                fs.writeFileSync(outputFilePath, result.data)
                return outputFilePath
            })
    }
}

module.exports = { Coder }