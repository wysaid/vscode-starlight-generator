// @ts-nocheck
'use strict';

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
var extPath = vscode.extensions.getExtension("wysaid.starlight-generator")?.extensionPath;

class ShaderTemplateCreator {
    inputDir = "";
    shaderDir = "";
    shaderName = "";

    spvVertSuffix = '.spv.vert';
    spvFragSuffix = '.spv.frag';

    constructor(inputDir) {
        this.inputDir = inputDir;

        const inputDirStat = fs.statSync(this.inputDir);
        if (inputDirStat.isFile()) {
            this.inputDir = path.dirname(this.inputDir);
        } else if (!inputDirStat.isDirectory()) {
            vscode.window.showErrorMessage("StarLight-Generator: Invalid file/directory: " + this.inputDir);
        }
    }

    async create() {
        const shaderName = await vscode.window.showInputBox({
            placeHolder: "Shader Name",
            prompt: "输入 shader 名字"
        });

        if (shaderName === undefined || shaderName === '') {
            console.log(shaderName);
            vscode.window.showErrorMessage('请输入 shader 名字');
            return
        }

        this.shaderName = shaderName;
        this.shaderDir = path.join(this.inputDir, this.shaderName);
        this.createTemplate();
    }

    createTemplate() {
        // create shader dir
        if (!fs.existsSync(this.shaderDir)) {
            fs.mkdirSync(this.shaderDir, { recursive: true });
        }

        // create json
        this.createJson();
        this.copyDefaultShader();
    }

    createJson() {
        var data = { "namespace": "StarLight", "outputFormat": "ts" };
        let className = this.toBigCamelIfNeeded(this.shaderName);
        let vshFilename = this.shaderName + this.spvVertSuffix;
        let fshFilename = this.shaderName + this.spvFragSuffix;
        let jsonDict = {
            "fileName": this.shaderName,
            "className": className,
            "vsh": vshFilename,
            "fsh": fshFilename,
            "stage": "both"
        };
        let shaderArr = [jsonDict];
        data["data"] = shaderArr;
        let dataStr = JSON.stringify(data, null, 4);
        console.log(dataStr);

        let shaderJsonFilePath = path.join(this.shaderDir, this.shaderName + '.sl.json');
        let f = fs.openSync(shaderJsonFilePath, 'w');
        fs.writeFile(shaderJsonFilePath, dataStr, function (err) {
            if (err) {
                console.log(err);
            }
        });
        fs.closeSync(f);
    }

    createShaderFileWithSuffix(suffix) {
        let filePath = path.join(this.shaderDir, this.shaderName + suffix);
        fs.closeSync(fs.openSync(filePath, 'w'));
    }

    copyDefaultShader() {
        let vertFilePath = path.join(this.shaderDir, this.shaderName + this.spvVertSuffix);
        let defaultVertFilePath = extPath + '/res/defaultVertexShader.spv.vert';
        fs.copyFile(defaultVertFilePath, vertFilePath, (err) => {
            if (err) throw err;
            console.log('File was copied to destination');
        });

        let fragFilePath = path.join(this.shaderDir, this.shaderName + this.spvFragSuffix);
        let defaultFragFilePath = extPath + '/res/defaultFragmentShader.spv.frag';
        fs.copyFile(defaultFragFilePath, fragFilePath, (err) => {
            if (err) throw err;
            console.log('File was copied to destination');
        });
    }

    toBigCamelIfNeeded(s) {
        if (s.includes('_')) {
            return this.toBigCamel(s);
        } else {
            return this.toBigCamelWord(s);
        }
        return s;
    }

    toBigCamelWord(x) {
        return x.charAt(0).toUpperCase() + x.slice(1)
    }

    toBigCamel(s) {
        return s.split('_').map((x) => {
            return this.toBigCamelWord(x);
        }).join('');
    }
};

module.exports = { ShaderTemplateCreator }
