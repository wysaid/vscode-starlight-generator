import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as FormData from 'form-data';
import * as extractZip from 'extract-zip';
import * as archiver from 'archiver';
import * as globCallback from 'glob';
import * as vscode from 'vscode';
import { promisify } from "util";
import * as events from "events";
import { execFile as execFileCallback } from 'child_process';

const glob = promisify(globCallback);
const execFile = promisify(execFileCallback);

const TIMEOUT = 10000;

const globPattern = "**/*.+(sl.json|vert|frag|glsl)";

export class StarLight extends events.EventEmitter {
    inputShaderFile?: string; ///< Single file mode enabled if not undefined.
    refShaderFile?: string; ///< referenced shader file by inputShaderFile.
    inputJsonFile?: string; ///< Only referenced file will be handled if not undefined.
    inputDir: string;
    tmpDir: string;
    updateProgress: (inc: number, msg?: string) => void;
    cancelEvent: Promise<void>;
    isCanceled = false;
    type: "lua" | "cpp";

    constructor(options: { runDir: string, updateProgressCallback: (inc: number, msg?: string) => void }) {
        super();
        const inputDir = options.runDir;
        const inputDirStat = fs.statSync(inputDir);
        this.inputDir = inputDir;
        this.type = "cpp";
        if (inputDirStat.isFile()) {

            /// only `*.spv.vert`、 `*.spv.frag` and `*.spv.glsl`.
            if (inputDir.endsWith("spv.vert") || inputDir.endsWith("spv.frag") || inputDir.endsWith("spv.glsl")) {
                this.inputShaderFile = inputDir;
            }

            /// only `*.sl.json`
            if (inputDir.endsWith("sl.json")) {
                this.inputJsonFile = inputDir;
            }

            this.inputDir = path.dirname(inputDir);
        } else if (!inputDirStat.isDirectory()) {
            throw Error(`StarLight-Generator: Invalid file/directory: ${inputDir}`);
        }

        this.tmpDir = fs.mkdtempSync(os.tmpdir());
        this.updateProgress = options.updateProgressCallback;

        this.cancelEvent = (async () => {
            await events.once(this, 'cancel');
            this.isCanceled = true;
        })();

        console.info("new StarLight instance:")
        console.info(`  inputDir: ${this.inputDir}`)
        console.info(`  tmpDir: ${this.tmpDir}`)
    }

    // 用此函数加工 Promise, 使其可取消
    async awaitOrCancel<T>(p: Thenable<T>, onCancel?: () => void) {
        let t = await Promise.race([this.cancelEvent, p]);
        if (this.isCanceled) {
            onCancel?.();
            throw Error("Early canceled");
        }
        return <T>t;
    }

    cancel() {
        if (!this.isCanceled)
            this.emit('cancel');
    }

    async performStarLight(type: "lua" | "cpp") {
        await this.awaitOrCancel(this.checkInputDir());

        const localBin = vscode.workspace.getConfiguration("starlight-generator").get<string>("binary_path");
        this.type = type;
        if (localBin) {
            await this.performLocal(localBin);
        } else {
            await this.performRemote();
        }
    }

    // 使用本地二进制程序执行
    async performLocal(localBin: string) {
        const files = await this.awaitOrCancel(glob("**/*.sl.json", {
            cwd: this.inputDir,
            nocase: true,
        }));
        const indexFiles = files.filter(fName => fName.endsWith(".sl.json"));
        const subdirs = await this.awaitOrCancel(glob("**/", { cwd: this.inputDir }));
        const subdirArgs = subdirs.flatMap(dir => ["--search-path", dir]);

        // 故意同步执行
        for (const indexFile of indexFiles) {
            const commandArgs = [
                '--batch-template', indexFile,
                '--output-to-json-file-path',
                '--template-language', this.type,
            ].concat(subdirArgs);
            const ac = new AbortController();
            const { stdout, stderr } = await this.awaitOrCancel(execFile(localBin, commandArgs, {
                cwd: this.inputDir,
                timeout: TIMEOUT,
                windowsHide: true,
                signal: ac.signal,
            }), () => ac.abort("time out"));
            console.info(stdout);
            console.error(stderr);
        }
    }

    // 打包, 请求服务, 解压返回压缩包
    async performRemote() {
        // Create the zipfile
        const zipFile = await this.awaitOrCancel(this.createZipFile());
        const resZipFile = await this.awaitOrCancel(this.submitAndDownload(zipFile));

        await this.awaitOrCancel(this.extractResult(resZipFile));
    }

    // Validate the input folder.
    async checkInputDir() {
        const filesToArchive = await this.awaitOrCancel(glob(globPattern, {
            cwd: this.inputDir,
            nocase: true,
        }));

        const hasJson = filesToArchive.some(fileName => fileName.endsWith(".sl.json"));
        const hasShader = filesToArchive.some(fileName => (fileName.endsWith(".glsl") || fileName.endsWith(".vert") || fileName.endsWith(".frag")));

        if (!(hasJson && hasShader)) {
            throw Error("Invalid input folder/file!");
        }
    }

    /**
     * @param subDir ext info for recursive call.
     * @returns the index file or null
     */
    getJsonContentOfInputShader(subDir?: string): string | null {
        if (!subDir && this.inputShaderFile) {
            subDir = path.dirname(this.inputShaderFile as string);
        }

        if (!subDir || subDir.length === 0 || subDir === '.' || subDir === '/') {
            return null;
        }

        let indexContent: string | null = null;
        const subDirFiles = fs.readdirSync(subDir);
        const inputShaderFile = path.basename(this.inputShaderFile as string);

        for (let fileName of subDirFiles) {
            if (fileName.endsWith('.sl.json')) {
                let jsonInfo = JSON.parse(fs.readFileSync(path.join(subDir, fileName)).toString());
                let dataArr = jsonInfo.data as Array<any>;

                if (dataArr && dataArr instanceof Array) {
                    for (let item of dataArr) {
                        if (item.vsh === inputShaderFile || item.fsh === inputShaderFile) {
                            this.refShaderFile = item.vsh === inputShaderFile ? item.fsh : item.vsh;
                            jsonInfo.data = [item];
                            indexContent = JSON.stringify(jsonInfo);
                            this.inputJsonFile = path.join(subDir, fileName);
                            break;
                        }
                    }

                    if (indexContent) {
                        break;
                    }
                }
            }
        }

        return indexContent ? indexContent : this.getJsonContentOfInputShader(path.dirname(subDir));
    }

    async createZipFile() {
        const zipfile = path.join(this.tmpDir, "starlight_input.zip");
        console.info(`Starlight collected zipfile : ${zipfile}`);
        this.updateProgress(0, "creating zip archive...");

        const output = fs.createWriteStream(zipfile);
        const archiveFile = archiver('zip');

        archiveFile.on('progress', (progress) => {
            this.updateProgress(0, `creating zip archive... ${progress.fs.processedBytes}B/${progress.fs.totalBytes}B`)
        });

        const closeEvent = events.once(output, 'close');

        archiveFile.pipe(output);

        if (this.inputShaderFile || this.inputJsonFile) {
            if (this.inputShaderFile) {
                const jsonContent = this.getJsonContentOfInputShader();
                console.log(`Generated json content: ${jsonContent}`);
                archiveFile.append(jsonContent as string, { name: 'index.sl.json' });
            }

            if (this.inputJsonFile) {
                if (!this.inputShaderFile) {
                    archiveFile.file(this.inputJsonFile as string, { name: 'index.sl.json' });
                }
            }

            this.inputDir = path.dirname(this.inputJsonFile as string);
            if (this.inputShaderFile) {
                archiveFile.file(this.inputShaderFile, { name: path.basename(this.inputShaderFile) });
                archiveFile.glob(`**/${this.refShaderFile}`, { cwd: this.inputDir, nocase: true });
            } else {
                archiveFile.glob("**/*.+(vert|frag|glsl)", { cwd: this.inputDir, nocase: true });
            }
        } else {
            archiveFile.glob(globPattern, { cwd: this.inputDir, nocase: true });
        }

        await this.awaitOrCancel(archiveFile.finalize());
        await this.awaitOrCancel(closeEvent);

        this.updateProgress(35)

        return zipfile;
    }

    async submitAndDownload(updateZipFile: string) {
        const outputZipFile = path.join(this.tmpDir, "slOutput.zip");

        this.updateProgress(0, 'sending request to server...');

        const output = fs.createWriteStream(outputZipFile);
        const form = new FormData();

        form.append('type', this.type);
        form.append('zipfile', fs.createReadStream(updateZipFile));
        // form.append('debug', 1);
        const api_url = <string>vscode.workspace.getConfiguration("starlight-generator").get<string>("api_url");

        console.info(`send request to ${api_url}`);

        const resHttps = await this.awaitOrCancel(promisify(form.submit.bind(form, api_url))());

        console.log(`status code: ${resHttps.statusCode}`);
        console.log("headers: ");
        console.log(resHttps.headers);

        resHttps.once('data', () => {
            this.updateProgress(20, 'receiving result from server...');
        })

        resHttps.on('data', (data) => {
            output.write(data);
        });

        await this.awaitOrCancel(events.once(resHttps, 'close'));
        output.close();

        this.updateProgress(20);

        console.info(`Starlight received: ${outputZipFile}`);

        return outputZipFile;
    }

    async extractResult(zipFile: string) {
        this.updateProgress(0, "extracting received zip archive...");

        await this.awaitOrCancel(extractZip(zipFile, { dir: this.inputDir }));

        // 删除无错误信息的 .starlight.log 文件
        const logFile = path.join(this.inputDir, '.starlight.log');
        if ((await this.awaitOrCancel(fs.stat(logFile))).isFile()) {
            const logContent = await this.awaitOrCancel(fs.readFile(logFile, { encoding: "utf-8" }));
            if (logContent.search(/\[ERROR\]/i) != -1) {
                throw Error(`Error occured during generation, please check ${logFile}`)
            } else if (logContent.search(/\[WARNING\]|\[INFO\]/i) == -1) {
                await this.awaitOrCancel(fs.rm(logFile));
            }
        }

        this.updateProgress(25, "starligt generate done");
    }
}

