"use strict";
function getElementByIdOrError(id) {
    const element = document.getElementById(id);
    if (element === null) {
        throw new Error(`Could not find element with id ${id}`);
    }
    return element;
}
function containsSpecialChar(x) {
    return x.match(/[!"§$%&/()={};:\-,._^<°>`´']/) !== null;
}
function removeNonAlphabetic(x) {
    return x.split("").filter(c => !containsSpecialChar(c)).join("");
}
function stringDiffIdx(a, b) {
    let diff = [];
    for (let i = 0; i < a.length; ++i) {
        if (a[i] != b[i]) {
            diff.push(i);
        }
    }
    return diff;
}
async function getRandomWords(wordCount, maxWordsLength, language) {
    console.assert(wordCount >= 0);
    const baseUrl = "https://random-word-api.herokuapp.com/word?";
    const lengthParam = maxWordsLength <= 0 ? "" : `length=${maxWordsLength}`;
    const wordsParam = `number=${wordCount}`;
    const languageParam = `lang=${language}`;
    const response = await fetch([baseUrl, lengthParam, wordsParam, languageParam].join("&"));
    return await response.json();
}
function filterWords(words, noSpecialChars, noCapitalization) {
    if (noSpecialChars)
        words = words.map(word => removeNonAlphabetic(word));
    if (noCapitalization)
        words = words.map(word => word.toLowerCase());
    return words;
}
const DEFAULT_WORD_COUNT = 10;
const DEFAULT_WORD_LEN = 5;
const DEFAULT_LANGUAGE = "en";
const DEFAULT_FOREGROUND = "#e4e4ef";
const DEFAULT_BACKGROUND = "#181818";
const DEFAULT_CURRENT = "#ffdd33";
const DEFAULT_WRONG = "#f43841";
const DEFAULT_RIGHT = "#73c936";
const DEFAULT_FONT = "Poly";
const DEFAULT_FONT_SIZE = 48;
class Gorilla {
    constructor(ctx, configOptions, themeOptions) {
        this.userInput = "";
        this.words = "";
        this.config = {};
        this.theme = {};
        this.configure(configOptions, themeOptions);
        this.canReset = true;
        this.startTime = 0;
        this.keysPressed = 0;
        this.wpm = 0;
        this.ctx = ctx;
    }
    configure(configOptions, themeOptions) {
        setToInputElementVals(this.config, configOptions);
        setToInputElementVals(this.theme, themeOptions);
        document.body.style.color = this.theme.foregroundColor;
        document.body.style.background = this.theme.backgroundColor;
    }
    popBackInput() {
        this.userInput = this.userInput.slice(0, this.userInput.length - 1);
    }
    popBackWord() {
        const lastSpace = this.userInput.lastIndexOf(" ");
        if (lastSpace >= 0) {
            this.userInput = this.userInput.slice(0, lastSpace);
        }
        else {
            this.userInput = "";
        }
    }
    input(input) {
        if (input.length != 1)
            return;
        this.userInput += input;
        if (++this.keysPressed === 1) {
            this.startTime = new Date().getTime();
        }
    }
    async reset() {
        if (!this.canReset)
            return;
        this.canReset = false;
        this.userInput = "";
        let wordsArr = await getRandomWords(this.config.wordCount, this.config.maxWordsLength, this.config.language);
        this.words = filterWords(wordsArr, this.config.noSpecialChars, this.config.noCapitalization).join(" ");
        this.keysPressed = 0;
        this.ctx.font = `${this.theme.fontSize}px ${this.theme.font}`;
        this.canReset = true;
    }
    render() {
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
            if (spaceWidth * 2 + charX + wordWidth >= canvasWidth) {
                charX = 0;
                charY += this.theme.fontSize;
            }
            const char = chars[i];
            const charWidth = this.ctx.measureText(char).width;
            if (i === this.userInput.length) {
                this.ctx.fillStyle = this.theme.currentColor;
                if (this.theme.enableCursor)
                    this.ctx.fillRect(charX, charY, this.theme.fontSize / 10, -this.theme.fontSize);
            }
            else if (i > this.userInput.length) {
                this.ctx.fillStyle = this.theme.foregroundColor;
            }
            else {
                const expected = this.words.slice(0, i + 1);
                const actual = this.userInput.slice(0, i + 1);
                const diffIdxs = stringDiffIdx(expected, actual);
                if (diffIdxs.includes(i)) {
                    this.ctx.fillStyle = this.theme.wrongColor;
                    if (this.words[i] === " ") {
                        this.ctx.fillRect(charX, charY, spaceWidth, -this.theme.fontSize);
                    }
                }
                else {
                    this.ctx.fillStyle = this.theme.rightColor;
                }
            }
            this.ctx.fillText(char, charX, charY);
            charX += charWidth;
        }
    }
    async update() {
        if (this.userInput === this.words) {
            const tookMin = ((new Date().getTime() - this.startTime) / 60000);
            this.wpm = this.words.length / 5 / tookMin;
            await this.reset();
        }
        this.render();
    }
}
function setToInputElementVals(x, inputs) {
    for (let i = 0; i < inputs.length; ++i) {
        const option = inputs[i];
        if (option.type === "number") {
            x[option.name] = parseInt(option.value);
        }
        else if (option.type === "checkbox") {
            x[option.name] = option.checked;
        }
        else {
            x[option.name] = option.value;
        }
    }
}
function oppositeVisibility(x) {
    return x === "visible" ? "hidden" : "visible";
}
function camelToWords(x) {
    return x.split("").map(c => (c === c.toUpperCase() ? " " + c.toLowerCase() : c)).join("");
}
function createInputElement(name, type, value, checked, min, max) {
    const inputElement = document.createElement("input");
    inputElement.type = type;
    inputElement.value = value;
    inputElement.name = name;
    if (checked !== undefined) {
        inputElement.checked = true;
    }
    if (min !== undefined) {
        inputElement.min = min.toString();
    }
    if (max !== undefined) {
        inputElement.max = max.toString();
    }
    return inputElement;
}
function labelFromInputElement(x) {
    const label = document.createElement("label");
    label.innerText = camelToWords(x.name);
    return label;
}
window.onload = async () => {
    const app = getElementByIdOrError("app");
    app.width = 1200;
    app.height = 600;
    const appCtx = app.getContext("2d");
    if (appCtx === null) {
        throw new Error(`Could not initialize context 2d`);
    }
    const configMenu = getElementByIdOrError("menu");
    let configOptions = [];
    const supportedLangs = {
        "en": "English",
        "de": "German",
        "es": "Spanish",
        "zh": "Chinese",
    };
    const configLang = document.createElement("select");
    configLang.name = "language";
    configLang.value = DEFAULT_LANGUAGE;
    for (const [abbrev, lang] of Object.entries(supportedLangs)) {
        const langOption = document.createElement("option");
        langOption.value = abbrev;
        langOption.innerText = lang;
        configLang.appendChild(langOption);
    }
    configOptions.push(configLang);
    configOptions.push(createInputElement("wordCount", "number", DEFAULT_WORD_COUNT.toString(), undefined, 1));
    configOptions.push(createInputElement("maxWordsLength", "number", DEFAULT_WORD_LEN.toString(), undefined, 1));
    configOptions.push(createInputElement("noSpecialChars", "checkbox", "", true));
    configOptions.push(createInputElement("noCapitalization", "checkbox", "", true));
    let themeOptions = [];
    themeOptions.push(createInputElement("foregroundColor", "color", DEFAULT_FOREGROUND));
    themeOptions.push(createInputElement("backgroundColor", "color", DEFAULT_BACKGROUND));
    themeOptions.push(createInputElement("wrongColor", "color", DEFAULT_WRONG));
    themeOptions.push(createInputElement("rightColor", "color", DEFAULT_RIGHT));
    themeOptions.push(createInputElement("currentColor", "color", DEFAULT_CURRENT));
    themeOptions.push(createInputElement("enableCursor", "checkbox", "", true));
    themeOptions.push(createInputElement("font", "text", DEFAULT_FONT));
    themeOptions.push(createInputElement("fontSize", "number", DEFAULT_FONT_SIZE.toString(), undefined, 1));
    configOptions.forEach(o => {
        configMenu.appendChild(labelFromInputElement(o));
        configMenu.appendChild(o);
    });
    themeOptions.forEach(o => {
        configMenu.appendChild(labelFromInputElement(o));
        configMenu.appendChild(o);
    });
    const wpmText = getElementByIdOrError("wpm");
    const gorilla = new Gorilla(appCtx, configOptions, themeOptions);
    const settingsButton = getElementByIdOrError("settingsButton");
    settingsButton.addEventListener("click", async () => {
        configMenu.style.visibility = oppositeVisibility(configMenu.style.visibility);
        app.style.visibility = oppositeVisibility(configMenu.style.visibility);
        wpmText.style.visibility = oppositeVisibility(configMenu.style.visibility);
        gorilla.configure(configOptions, themeOptions);
        if (configMenu.style.visibility === "hidden") {
            await gorilla.reset();
            gorilla.update();
        }
    });
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
                }
                else {
                    gorilla.popBackInput();
                }
                break;
            case "Escape":
                configMenu.style.visibility = oppositeVisibility(configMenu.style.visibility);
                app.style.visibility = oppositeVisibility(configMenu.style.visibility);
                wpmText.style.visibility = oppositeVisibility(configMenu.style.visibility);
                gorilla.configure(configOptions, themeOptions);
                if (configMenu.style.visibility === "hidden") {
                    await gorilla.reset();
                }
                break;
            case " ":
                e.preventDefault();
                break;
        }
        gorilla.input(e.key);
        gorilla.update();
        wpmText.innerText = "Last WPM: " + gorilla.wpm.toFixed(2).toString();
    });
};
// TODO: add carret
// TODO: implement text scrolling
