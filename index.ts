const FONT_SIZE = 48;
const BACKGROUND = "#181818";
const FOREGROUND = "white";

function getElementByIdOrError<T>(id: string): T {
    const element = document.getElementById(id) as T;
    if (element === null) {
        throw new Error(`Could not find element with id ${id}`);
    }
    return element;
}

function containsSpecialChar(x: string): boolean {
    return x.match(/[!"§$%&/()={};:\-,._^<°>`´']/) !== null;
}

function removeNonAlphabetic(x: string): string {
    return x.split("").filter(c => !containsSpecialChar(c)).join("");
}

function stringDiffMap(a: string, b: string): Map<number, string> {
    let diff = new Map;
    for (let i = 0; i < a.length; ++i) {
        if (a[i] != b[i]) {
            diff.set(i, a[i]);
        }
    }
    return diff;
}

async function getRandomWords(config: Config): Promise<string[]> {
    console.assert(config.wordCount >= 0);
    const baseUrl = "https://random-word-api.herokuapp.com/word?";
    const lengthParam = config.maxWordsLength <= 0 ? "" : `length=${config.maxWordsLength}`;
    const wordsParam = `number=${config.wordCount}`;
    const languageParam = `lang=${config.language}`;
    const response = await fetch([baseUrl, lengthParam, wordsParam, languageParam].join("&"));
    return await response.json() as string[];
}

function filterWords(words: string[], config: Config): string[] {
    if (config.noSpecialChars) words = words.map(word => removeNonAlphabetic(word));
    if (config.noCapitalization) words = words.map(word => word.toLowerCase());
    return words;
}

interface Config {
    language: string,
    wordCount: number,
    maxWordsLength: number,
    noSpecialChars: boolean,
    noCapitalization: boolean,
}

class Gorilla {
    userInput: string;
    wordsArr: string[];
    wordsStr: string;
    keysPressed: number;
    time: number;
    config: Config;

    constructor() {
        this.userInput = "";
        this.wordsArr = [];
        this.wordsStr = "";
        this.config = {
            language: "de",
            wordCount: 5,
            maxWordsLength: 5,
            noSpecialChars: true,
            noCapitalization: true,
        };
        this.time = 0;
        this.keysPressed = 0;
    }

    public popBackInput() {
        this.userInput = this.userInput.slice(0, this.userInput.length-1);
    }

    public popBackWord() {
        const lastSpace = this.userInput.lastIndexOf(" ");
        if (lastSpace >= 0) {
            this.userInput = this.userInput.slice(0, lastSpace);
        } else {
            this.userInput = "";
        }
    }

    public input(input: string) {
        if (input.length != 1) return;
        this.userInput += input;
        if (++this.keysPressed == 1) {
            console.log("time started");
            this.time = new Date().getTime();
        }
    }

    public async reset() {
        this.userInput = "";
        this.wordsArr = await getRandomWords(this.config);
        this.wordsArr = filterWords(this.wordsArr, this.config);
        this.wordsStr = this.wordsArr.join(" ");
        this.keysPressed = 0;
    }

    private render(ctx: CanvasRenderingContext2D) {
        const spaceWidth = ctx.measureText(" ").width;

        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;

        ctx.fillStyle = BACKGROUND;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        ctx.fillStyle = FOREGROUND;

        let wordX = 0;
        let wordY = FONT_SIZE;
        let currentIdx = 0;
        let currentCharColor = "yellow";
        for (let i = 0; i < this.wordsArr.length; ++i) {
            const word = this.wordsArr[i];
            const wordWidth = ctx.measureText(word).width;

            if (wordX+wordWidth+spaceWidth >= canvasWidth) {
                wordX = 0;
                wordY += FONT_SIZE;
            }

            let charX = 0;
            for (let j = 0; j < word.length; ++j) {
                const c = word[j];
                const charWidth = ctx.measureText(c).width;
                const expected = this.wordsStr.slice(0, this.userInput.length);
                const diffMap = stringDiffMap(expected, this.userInput);

                // TODO: Clean this up
                if (this.userInput.length == currentIdx) {
                    ctx.fillStyle = currentCharColor;
                } else if (currentIdx <= this.userInput.length) {
                    ctx.fillStyle = "green";
                } else {
                    ctx.fillStyle = FOREGROUND;
                }

                if (diffMap.has(currentIdx)) {
                    ctx.fillStyle = "red";
                }
                ctx.fillText(c, wordX+charX, wordY);
                charX += charWidth;
                currentIdx += 1;
            }
            // ctx.fillRect(wordX-spaceWidth, wordY, spaceWidth, -2);
            ctx.fillText(" ", wordX, wordY);
            wordX += wordWidth+spaceWidth;
            currentIdx += 1; // new word = new whitespace character
        }
    }

    public async update(ctx: CanvasRenderingContext2D) {
        console.log(this.userInput, this.wordsStr);
        if (this.userInput == this.wordsStr) {
            const tookMin = ((new Date().getTime() - this.time)/60000);
            console.log(this.wordsArr.length / tookMin);
            await this.reset();
        }
        this.render(ctx);
    }
}

window.onload = async () => {
    const app = getElementByIdOrError<HTMLCanvasElement>("app");
    app.width = 800
    app.height = 600

    const appCtx = app.getContext("2d");
    if (appCtx === null) {
        throw new Error(`Could not initialize context 2d`);
    }
    appCtx.font = `${FONT_SIZE}px serif`;

    const gorilla = new Gorilla();
    await gorilla.reset();
    gorilla.update(appCtx);
    document.addEventListener("keydown", async (e) => {
        switch (e.key) {
            case "Tab":
                e.preventDefault();
                await gorilla.reset();
                break;
            case "Backspace":
                if (e.ctrlKey) {
                    gorilla.popBackWord();
                } else {
                    gorilla.popBackInput();
                }
                break;
        }

        gorilla.input(e.key);
        gorilla.update(appCtx);
    });
}

/*
  TODO:
  create a function that filters the words according to the users configuration
  if the user does not want any special characters in their words let them disable it.
  if the user does not want any capitalization let them disable that too.
*/
