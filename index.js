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
const FONT_SIZE = 48;
const BACKGROUND = "#181818";
const FOREGROUND = "white";
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
function stringDiffMap(a, b) {
    let diff = new Map;
    for (let i = 0; i < a.length; ++i) {
        if (a[i] != b[i]) {
            diff.set(i, a[i]);
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
            this.wordsArr = yield getRandomWords(this.config);
            this.wordsArr = filterWords(this.wordsArr, this.config);
            this.wordsStr = this.wordsArr.join(" ");
            this.keysPressed = 0;
        });
    }
    render(ctx) {
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
            if (wordX + wordWidth + spaceWidth >= canvasWidth) {
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
                }
                else if (currentIdx <= this.userInput.length) {
                    ctx.fillStyle = "green";
                }
                else {
                    ctx.fillStyle = FOREGROUND;
                }
                if (diffMap.has(currentIdx)) {
                    ctx.fillStyle = "red";
                }
                ctx.fillText(c, wordX + charX, wordY);
                charX += charWidth;
                currentIdx += 1;
            }
            // ctx.fillRect(wordX-spaceWidth, wordY, spaceWidth, -2);
            ctx.fillText(" ", wordX, wordY);
            wordX += wordWidth + spaceWidth;
            currentIdx += 1; // new word = new whitespace character
        }
    }
    update(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(this.userInput, this.wordsStr);
            if (this.userInput == this.wordsStr) {
                const tookMin = ((new Date().getTime() - this.time) / 60000);
                console.log(this.wordsArr.length / tookMin);
                yield this.reset();
            }
            this.render(ctx);
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
    appCtx.font = `${FONT_SIZE}px serif`;
    const gorilla = new Gorilla();
    yield gorilla.reset();
    gorilla.update(appCtx);
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
        gorilla.update(appCtx);
    }));
});
/*
  TODO:
  create a function that filters the words according to the users configuration
  if the user does not want any special characters in their words let them disable it.
  if the user does not want any capitalization let them disable that too.
*/
