export class Coder {
    constructor(inputPath: string);
    encode(): Promise<void>;
    decode(): Promise<void>;
}
