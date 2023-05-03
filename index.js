"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
function getRandomWords(config) {
    return __awaiter(this, void 0, void 0, function* () {
        console.assert(config.wordCount >= 0);
        const baseUrl = "https://random-word-api.herokuapp.com/word?";
        const lengthParam = config.maxWordsLength <= 0 ? "" : `length=${config.maxWordsLength}`;
        const wordsParam = `number=${config.wordCount}`;
        const languageParam = `lang=${config.language}`;
        const response = yield fetch([baseUrl, lengthParam, wordsParam, languageParam].join("&"));
        return yield response.json();
    });
}
function filterWords(words, config) {
    if (config.noSpecialChars)
        words = words.map(word => removeNonAlphabetic(word));
    if (config.noCapitalization)
        words = words.map(word => word.toLowerCase());
    return words;
}
class Gorilla {
    constructor(ctx) {
        this.userInput = "";
        this.words = "";
        this.config = {
            language: "en",
            wordCount: 10,
            maxWordsLength: 5,
            noSpecialChars: true,
            noCapitalization: true,
        };
        this.theme = {
            backgroundColor: "#101010",
            foregroundColor: "white",
            currentColor: "yellow",
            wrongColor: "red",
            rightColor: "green",
            font: "iosevka",
            fontSize: 48,
        };
        this.time = 0;
        this.keysPressed = 0;
        this.wpm = 0;
        this.ctx = ctx;
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
        if (++this.keysPressed == 1) {
            console.log("time started");
            this.time = new Date().getTime();
        }
    }
    reset() {
        return __awaiter(this, void 0, void 0, function* () {
            this.userInput = "";
            let wordsArr = yield getRandomWords(this.config);
            this.words = filterWords(wordsArr, this.config).join(" ");
            this.keysPressed = 0;
            this.ctx.font = `${this.theme.fontSize}px ${this.theme.font}`;
        });
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
            if (charX + wordWidth >= canvasWidth) {
                charX = 0;
                charY += this.theme.fontSize;
            }
            const char = chars[i];
            if (i == this.userInput.length) {
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
                    if (this.words[i] == " ") {
                        this.ctx.fillRect(charX, charY, spaceWidth, -this.theme.fontSize);
                    }
                }
                else {
                    this.ctx.fillStyle = this.theme.rightColor;
                }
            }
            this.ctx.fillText(char, charX, charY);
            charX += this.ctx.measureText(char).width;
        }
    }
    update() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.userInput == this.words) {
                const tookMin = ((new Date().getTime() - this.time) / 60000);
                this.wpm = this.words.length / 5 / tookMin;
                yield this.reset();
            }
            this.render();
        });
    }
}
window.onload = () => __awaiter(void 0, void 0, void 0, function* () {
    const app = getElementByIdOrError("app");
    app.width = 800;
    app.height = 600;
    const appCtx = app.getContext("2d");
    if (appCtx === null) {
        throw new Error(`Could not initialize context 2d`);
    }
    const wpmParagraph = getElementByIdOrError("wpm");
    const gorilla = new Gorilla(appCtx);
    yield gorilla.reset();
    gorilla.update();
    document.addEventListener("keydown", (e) => __awaiter(void 0, void 0, void 0, function* () {
        switch (e.key) {
            case "Tab":
                e.preventDefault();
                yield gorilla.reset();
                break;
            case "Backspace":
                if (e.ctrlKey) {
                    gorilla.popBackWord();
                }
                else {
                    gorilla.popBackInput();
                }
                break;
        }
        gorilla.input(e.key);
        gorilla.update();
        wpmParagraph.innerText = gorilla.wpm.toFixed(2).toString();
    }));
});
