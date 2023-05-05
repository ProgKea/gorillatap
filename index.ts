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

function stringDiffIdx(a: string, b: string): number[] {
    let diff = [];
    for (let i = 0; i < a.length; ++i) {
        if (a[i] != b[i]) {
            diff.push(i);
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

const DEFAULT_WORD_COUNT = 10;
const DEFAULT_WORD_LEN = 5;

const DEFAULT_FOREGROUND = "#ffffff";
const DEFAULT_BACKGROUND = "#101010";
const DEFAULT_CURRENT    = "#ffff00";
const DEFAULT_WRONG      = "#ff2222";
const DEFAULT_RIGHT      = "#22ff22";
const DEFAULT_FONT       = "iosevka";
const DEFAULT_FONT_SIZE  = 48;

interface Theme {
    currentColor: string,
    foregroundColor: string,
    backgroundColor: string,
    wrongColor: string,
    rightColor: string,
    font: string,
    fontSize: number,
}

class Gorilla {
    userInput: string;
    words: string;
    keysPressed: number;
    startTime: number;
    config: Config;
    theme: Theme;
    wpm: number;
    ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.userInput = "";
        this.words = "";
        this.config = {
            language: "en",
            wordCount: DEFAULT_WORD_COUNT,
            maxWordsLength: DEFAULT_WORD_LEN,
            noSpecialChars: true,
            noCapitalization: true,
        };
        this.theme = {
            backgroundColor: DEFAULT_BACKGROUND,
            foregroundColor: DEFAULT_FOREGROUND,
            currentColor: DEFAULT_CURRENT,
            wrongColor: DEFAULT_WRONG,
            rightColor: DEFAULT_RIGHT,
            font: DEFAULT_FONT,
            fontSize: DEFAULT_FONT_SIZE,
        };
        this.startTime = 0;
        this.keysPressed = 0;
        this.wpm = 0;
        this.ctx = ctx;
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
        if (++this.keysPressed === 1) {
            this.startTime = new Date().getTime();
        }
    }

    public async reset() {
        this.userInput = "";
        let wordsArr = await getRandomWords(this.config);
        this.words = filterWords(wordsArr, this.config).join(" ");
        this.keysPressed = 0;
        this.ctx.font = `${this.theme.fontSize}px ${this.theme.font}`;
    }

    private render() {
        const spaceWidth = this.ctx.measureText(" ").width;

        const canvasWidth = this.ctx.canvas.width;
        const canvasHeight = this.ctx.canvas.height;

        this.ctx.fillStyle = this.theme.backgroundColor;
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const chars = this.words.split("");
        let charX = 0;
        let charY = this.theme.fontSize;
        for (let i = 0; i < chars.length; ++i) {
            const wordFromI = this.words.slice(i);
            const word = wordFromI.slice(0, wordFromI.search(" "));
            const wordWidth = this.ctx.measureText(word).width;
            if (charX+wordWidth >= canvasWidth) {
                charX = 0;
                charY += this.theme.fontSize;
            }

            const char = chars[i];
            if (i === this.userInput.length) {
                this.ctx.fillStyle = this.theme.currentColor;
            } else if (i > this.userInput.length) {
                this.ctx.fillStyle = this.theme.foregroundColor;
            } else {
                const expected = this.words.slice(0, i+1);
                const actual = this.userInput.slice(0, i+1);
                const diffIdxs = stringDiffIdx(expected, actual);

                if (diffIdxs.includes(i)) {
                    this.ctx.fillStyle = this.theme.wrongColor;
                    if (this.words[i] === " ") {
                        this.ctx.fillRect(charX, charY, spaceWidth, -this.theme.fontSize);
                    }
                } else {
                    this.ctx.fillStyle = this.theme.rightColor;
                }
            }

            this.ctx.fillText(char, charX, charY);
            charX += this.ctx.measureText(char).width;
        }
    }

    public async update() {
        if (this.userInput === this.words) {
            const tookMin = ((new Date().getTime() - this.startTime)/60000);
            this.wpm = this.words.length/5 / tookMin;
            await this.reset();
        }
        this.render();
    }
}

function oppositeVisibility(x: string): string {
    console.assert(x === "visible" || x === "hidden");
    return x === "visible" ? "hidden" : "visible";
}

function defaultIfNaN(x: number, defaultNumber: number): number {
    return isNaN(x) ? defaultNumber : x;
}

function appendInputElementInside(x: HTMLElement, name: string, type: string, value: string, checked?: boolean): HTMLInputElement {
    const inputElement = document.createElement("input") as HTMLInputElement;
    inputElement.type = type;
    inputElement.value = value;

    const label = document.createElement("label") as HTMLLabelElement;
    label.innerText = name;

    if (typeof checked !== undefined) {
        inputElement.checked = checked as boolean;
    }

    x.appendChild(label);
    x.appendChild(inputElement);

    return inputElement;
}

window.onload = async () => {
    const app = getElementByIdOrError<HTMLCanvasElement>("app");
    app.width = 1200;
    app.height = 600;

    const appCtx = app.getContext("2d");
    if (appCtx === null) {
        throw new Error(`Could not initialize context 2d`);
    }

    const configMenu = getElementByIdOrError<HTMLDivElement>("menu");

    const supportedLangs = {
        "en": "English",
        "de": "German",
        "es": "Spanish",
        "zh": "Chinese",
    };
    const langLabel = document.createElement("label");
    langLabel.innerText = "Language";
    configMenu.appendChild(langLabel);
    const configLang = document.createElement("select");
    for (const [abbrev, lang] of Object.entries(supportedLangs)) {
        const langOption = document.createElement("option") as HTMLOptionElement;
        langOption.value = abbrev;
        langOption.innerText = lang;
        configLang.appendChild(langOption);
    }
    configMenu.appendChild(configLang);

    const configWordCount = appendInputElementInside(configMenu, "word count", "number", DEFAULT_WORD_COUNT.toString());
    const configWordLen = appendInputElementInside(configMenu, "words length", "number", DEFAULT_WORD_LEN.toString());
    const configNoCapital = appendInputElementInside(configMenu, "no capital characters", "checkbox", "", true);
    const configNoSpecial = appendInputElementInside(configMenu, "no special characters", "checkbox", "", true);

    const themeForeground = appendInputElementInside(configMenu, "foreground", "color", DEFAULT_FOREGROUND);
    document.body.style.color = themeForeground.value;
    const themeBackground = appendInputElementInside(configMenu, "background", "color", DEFAULT_BACKGROUND);
    document.body.style.background = themeBackground.value;
    const themeWrong = appendInputElementInside(configMenu, "wrong", "color", DEFAULT_WRONG);
    const themeRight = appendInputElementInside(configMenu, "right", "color", DEFAULT_RIGHT);
    const themeCurrent = appendInputElementInside(configMenu, "current", "color", DEFAULT_CURRENT);
    const themeFont = appendInputElementInside(configMenu, "font", "text", DEFAULT_FONT);
    const themeFontSize = appendInputElementInside(configMenu, "font size", "number", DEFAULT_FONT_SIZE.toString());


    const wpmText = getElementByIdOrError<HTMLParagraphElement>("wpm");
    const gorilla = new Gorilla(appCtx);
    await gorilla.reset();
    gorilla.update();
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
            case "Escape":
                configMenu.style.visibility = oppositeVisibility(configMenu.style.visibility);

                app.style.visibility = oppositeVisibility(configMenu.style.visibility);
                wpmText.style.visibility = oppositeVisibility(configMenu.style.visibility);

                gorilla.config.language = configLang.value;
                gorilla.config.wordCount = defaultIfNaN(parseInt(configWordCount.value), DEFAULT_WORD_COUNT);
                gorilla.config.maxWordsLength = defaultIfNaN(parseInt(configWordLen.value), DEFAULT_WORD_LEN);
                gorilla.config.noCapitalization = configNoCapital.checked;
                gorilla.config.noSpecialChars = configNoSpecial.checked;

                gorilla.theme.foregroundColor = themeForeground.value;
                gorilla.theme.backgroundColor = themeBackground.value;
                document.body.style.color = themeForeground.value;
                document.body.style.background = themeBackground.value;
                gorilla.theme.rightColor = themeRight.value;
                gorilla.theme.currentColor = themeCurrent.value;
                gorilla.theme.wrongColor = themeWrong.value;
                gorilla.theme.font = themeFont.value;
                gorilla.theme.fontSize = defaultIfNaN(parseInt(themeFontSize.value), 48);

                if (configMenu.style.visibility === "hidden") {
                    await gorilla.reset();
                }
                break;
        }

        gorilla.input(e.key);
        gorilla.update();
        wpmText.innerText = "Last WPM: "+gorilla.wpm.toFixed(2).toString();
    });
}

// TODO: add carret
// TODO: fix tab holding down
// TODO: implement text scrolling
// TODO: Find a better way to default the config values
