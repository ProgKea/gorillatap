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
function clamp(x, min, max) {
    return Math.min(Math.max(x, min), max);
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
function getMatchingWordsAsString(a, b) {
    const bWords = b.split(" ");
    return a.split(" ").map((word, i) => {
        if (word === bWords[i]) {
            return word;
        }
    }).join(" ");
}
const DEFAULT_WORD_COUNT = 10;
const DEFAULT_WORD_LEN = 5;
const DEFAULT_LANGUAGE = "en";
const DEFAULT_CANVAS_WIDTH = 1200;
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
        this.canReset = true;
        this.startTime = 0;
        this.keysPressed = 0;
        this.mistakes = 0;
        this.wpm = 0;
        this.rawWpm = 0;
        this.accuracy = 0;
        this.ctx = ctx;
        this.configure(configOptions, themeOptions);
    }
    configure(configOptions, themeOptions) {
        setToInputElementVals(this.config, configOptions);
        setToInputElementVals(this.theme, themeOptions);
        document.body.style.color = this.theme.foregroundColor;
        document.body.style.background = this.theme.backgroundColor;
        this.ctx.canvas.width = this.config.canvasWidth;
        this.ctx.font = `${this.theme.fontSize}px ${this.theme.font}`;
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
        if (this.userInput[this.userInput.length - 1] !== this.words[this.userInput.length - 1]) {
            this.mistakes++;
        }
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
        this.mistakes = 0;
        this.canReset = true;
    }
    render() {
        const spaceWidth = this.ctx.measureText(" ").width;
        this.ctx.fillStyle = this.theme.backgroundColor;
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        const chars = this.words.split("");
        let charX = 0;
        let charY = this.theme.fontSize;
        for (let i = 0; i < chars.length; ++i) {
            const wordFromI = this.words.slice(i);
            const word = wordFromI.slice(0, wordFromI.search(" "));
            const wordWidth = this.ctx.measureText(word).width;
            if (spaceWidth * 2 + charX + wordWidth >= this.ctx.canvas.width) {
                charX = 0;
                charY += this.theme.fontSize;
            }
            const char = chars[i];
            const charWidth = this.ctx.measureText(char).width;
            if (i === this.userInput.length) {
                if (this.theme.enableCursor) {
                    this.ctx.fillStyle = this.theme.cursorColor;
                    this.ctx.fillRect(charX, charY, this.theme.fontSize / 10, -this.theme.fontSize);
                }
                this.ctx.fillStyle = this.theme.currentColor;
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
        if (this.userInput.length === this.words.length) {
            const tookMin = ((new Date().getTime() - this.startTime) / 60000);
            const totalCharacterCount = this.words.length;
            this.wpm = getMatchingWordsAsString(this.userInput, this.words).length / 5 / tookMin;
            this.rawWpm = totalCharacterCount / 5 / tookMin;
            this.accuracy = ((totalCharacterCount - this.mistakes) / totalCharacterCount) * 100;
            await this.reset();
        }
        this.render();
    }
}
function setToInputElementVals(x, inputs) {
    for (let i = 0; i < inputs.length; ++i) {
        const option = inputs[i];
        if (option.type === "number") {
            const inputElement = option;
            const max = parseInt(inputElement.max);
            const min = parseInt(inputElement.min);
            x[option.name] = clamp(parseInt(option.value), min, max);
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
    if (checked) {
        inputElement.checked = true;
    }
    if (min) {
        inputElement.min = min.toString();
    }
    if (max) {
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
    configOptions.push(createInputElement("wordCount", "number", DEFAULT_WORD_COUNT.toString(), undefined, 1, 100));
    configOptions.push(createInputElement("maxWordsLength", "number", DEFAULT_WORD_LEN.toString(), undefined, 1, 100));
    configOptions.push(createInputElement("noSpecialChars", "checkbox", "", true));
    configOptions.push(createInputElement("noCapitalization", "checkbox", "", true));
    configOptions.push(createInputElement("canvasWidth", "number", DEFAULT_CANVAS_WIDTH.toString(), undefined, 1, window.innerWidth));
    let themeOptions = [];
    themeOptions.push(createInputElement("foregroundColor", "color", DEFAULT_FOREGROUND));
    themeOptions.push(createInputElement("backgroundColor", "color", DEFAULT_BACKGROUND));
    themeOptions.push(createInputElement("wrongColor", "color", DEFAULT_WRONG));
    themeOptions.push(createInputElement("rightColor", "color", DEFAULT_RIGHT));
    themeOptions.push(createInputElement("cursorColor", "color", DEFAULT_CURRENT));
    themeOptions.push(createInputElement("currentColor", "color", DEFAULT_CURRENT));
    themeOptions.push(createInputElement("enableCursor", "checkbox", "", true));
    themeOptions.push(createInputElement("font", "text", DEFAULT_FONT));
    themeOptions.push(createInputElement("fontSize", "number", DEFAULT_FONT_SIZE.toString(), undefined, 1, 100));
    configOptions.forEach(o => {
        configMenu.appendChild(labelFromInputElement(o));
        configMenu.appendChild(o);
    });
    themeOptions.forEach(o => {
        configMenu.appendChild(labelFromInputElement(o));
        configMenu.appendChild(o);
    });
    const wpmText = getElementByIdOrError("wpm");
    const rawWpmText = getElementByIdOrError("rawWpm");
    const accuracyText = getElementByIdOrError("accuracy");
    const gorilla = new Gorilla(appCtx, configOptions, themeOptions);
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
                rawWpmText.style.visibility = oppositeVisibility(configMenu.style.visibility);
                accuracyText.style.visibility = oppositeVisibility(configMenu.style.visibility);
                gorilla.configure(configOptions, themeOptions);
                if (configMenu.style.visibility === "hidden") {
                    await gorilla.reset();
                }
                break;
            case " ":
                if (configMenu.style.visibility !== "visble") {
                    e.preventDefault();
                }
                break;
        }
        gorilla.input(e.key);
        gorilla.update();
        wpmText.innerText = "Last WPM: " + gorilla.wpm.toFixed(2).toString();
        rawWpmText.innerText = "Last raw WPM: " + gorilla.rawWpm.toFixed(2).toString();
        accuracyText.innerText = "Last accuracy: " + gorilla.accuracy.toFixed(2).toString() + "%";
    });
};
