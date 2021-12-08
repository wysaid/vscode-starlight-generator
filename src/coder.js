// @ts-nocheck
'use strict';

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const urllib = require('urllib')
const formstream = require('formstream');

class Coder {
    inputPath = ''
    constructor(inputPath) {
        this.inputPath = inputPath;
    }

    findFilesWithSuffix(dir, suffix) {
        let dirCont = fs.readdirSync(dir);
        let regex = new RegExp('.*\.' + suffix, 'ig')
        var files = dirCont.filter(function (elm) {
            return elm.match(regex);
        });
        files = files.map(elm => {
            return path.join(dir, elm)
        });
        return files
    }

    // curl -F "file=@$fileName" -F "op=decode"
    // http://mac.yyyyy.tech/faceDetect/encode.php
    encode() {
        const inputPathStat = fs.statSync(this.inputPath);
        var files = []
        if (inputPathStat.isFile()) {
            files.push(this.inputPath)
        }
        else {
            const filesNeedEncode = this.findFilesWithSuffix(this.inputPath, 'lua')
            files = [].concat(filesNeedEncode)
        }

        if (files.length == 0) {
            vscode.window.showErrorMessage("Encode failed: no files");
            return;
        }

        files.forEach(elm => { this.sendEncodeRequest(elm) })
    }

    decode() {
        const inputPathStat = fs.statSync(this.inputPath);
        var files = []
        if (inputPathStat.isFile()) {
            files.push(this.inputPath)
        }
        else {
            const filesNeedDecode = this.findFilesWithSuffix(this.inputPath, 'ex')
            files = [].concat(filesNeedDecode)
        }

        if (files.length == 0) {
            vscode.window.showErrorMessage("Decode failed: no files");
            return;
        }

        files.forEach(elm => { this.sendDecodeRequest(elm) })
    }

    sendEncodeRequest(filePath) {
        const dirname = path.dirname(filePath)
        const fileBasename = path.basename(filePath, '.lua')
        const filename = path.basename(filePath)
        const outputFilePath = path.join(dirname, fileBasename + ".ex")
        var form = formstream()
        form.buffer('file', fs.readFileSync(filePath), filename, 'application/octet-stream')
        form.field('op', 'encode')

        urllib.request(
            'http://mac.yyyyy.tech/faceDetect/encode.php',
            { method: 'POST', headers: form.headers(), stream: form },
            function (err, data, res) {
                fs.writeFileSync(outputFilePath, data)
            });
    }

    sendDecodeRequest(filePath) {
        const config = vscode.workspace.getConfiguration('starlight-generator')
        const dstSuffix = config.get("decodedFileSuffix")

        const dirname = path.dirname(filePath)
        const fileBasename = path.basename(filePath, '.ex')
        const filename = path.basename(filePath)
        const outputFilePath = path.join(dirname, fileBasename + '.' + dstSuffix)
        var form = formstream()
        form.buffer('file', fs.readFileSync(filePath), filename, 'application/octet-stream')
        form.field('op', 'decode')

        urllib.request(
            'http://mac.yyyyy.tech/faceDetect/encode.php',
            { method: 'POST', headers: form.headers(), stream: form },
            function (err, data, res) {
                fs.writeFileSync(outputFilePath, data)
            });
    }
}

module.exports = { Coder }