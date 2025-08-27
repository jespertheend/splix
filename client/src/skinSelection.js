import { SKIN_BLOCK_COUNT, SKIN_PATTERN_COUNT, VIEWPORT_RADIUS } from "./constants.js";
import {
	canOpenSkinSelection,
	ctxApplyCamTransform,
	doTransition,
	drawBlocks,
	fillArea,
	getBlock,
	hideBeginScreen,
	showBeginScreen,
} from "./main.js";
import { hasPlusRewards } from "./peliSdk.js";
import { lsSet, mod } from "./util.js";

let skinButtonCanvas, skinButtonCtx, skinButtonBlocks = [];
let skinCanvas, skinCtx, skinScreen, skinScreenVisible = false, skinScreenBlocks;

/**
 * @param {string} key
 */
function getStorageItem(key) {
	const stringValue = localStorage.getItem(key);
	if (stringValue == null) return 0;
	const intValue = parseInt(stringValue);
	if (isNaN(intValue)) return 0;
	return intValue;
}

let selectedColor = getStorageItem("skinColor");
let selectedPattern = getStorageItem("skinPattern");

export function getSkinColor() {
	return selectedColor;
}

export function getSkinPattern() {
	return selectedPattern;
}

/**
 * @param {number} colorId
 */
export function setSkinColor(colorId) {
	selectedColor = colorId;
	lsSet("skinColor", colorId);
}

/**
 * @param {number} patternId
 */
export function setSkinPattern(patternId) {
	selectedPattern = patternId;
	lsSet("skinPattern", patternId);
}

window.addEventListener("load", () => {
	skinScreen = document.getElementById("skinScreen");
	skinCanvas = document.getElementById("skinScreenCanvas");
	skinCtx = skinCanvas.getContext("2d");
});

export function initSkinScreen() {
	skinButtonCanvas = document.getElementById("skinButton");
	skinButtonCtx = skinButtonCanvas.getContext("2d");
	skinButtonCanvas.onclick = function () {
		if (canOpenSkinSelection()) {
			doTransition("", false, openSkinScreen);
		}
	};

	skinScreenBlocks = [];
	fillArea(0, 0, VIEWPORT_RADIUS * 2, VIEWPORT_RADIUS * 2, selectedColor + 1, selectedPattern, skinScreenBlocks);

	document.getElementById("prevColor").onclick = function () {
		skinButton(-1, 0);
	};
	document.getElementById("nextColor").onclick = function () {
		skinButton(1, 0);
	};
	document.getElementById("prevPattern").onclick = function () {
		skinButton(-1, 1);
	};
	document.getElementById("nextPattern").onclick = function () {
		skinButton(1, 1);
	};
	document.getElementById("skinSave").onclick = function () {
		doTransition("", false, showBeginHideSkin);
	};

	var block = getBlock(0, 0, skinButtonBlocks);
	block.setBlockId(selectedColor + 1, false);

	skinButtonCanvas.onmouseover = function () {
		if (selectedColor > 0) {
			skinButtonBlocks[0].setBlockId(selectedColor + 1 + SKIN_BLOCK_COUNT, false);
		}
	};
	skinButtonCanvas.onmouseout = function () {
		skinButtonBlocks[0].setBlockId(selectedColor + 1, false);
	};
}

export function renderSkinButton() {
	if (!skinButtonCtx) return;

	ctxApplyCamTransform(skinButtonCtx, true, true);

	drawBlocks(skinButtonCtx, skinButtonBlocks);
	skinButtonCtx.restore();
}

export function renderSkinScreen() {
	ctxApplyCamTransform(skinCtx, true);

	drawBlocks(skinCtx, skinScreenBlocks);
	skinCtx.restore();
}

export function getSkinScreenVisible() {
	return skinScreenVisible;
}

function openSkinScreen() {
	hideBeginScreen();
	showSkinScreen();
}

function showBeginHideSkin() {
	showBeginScreen();
	hideSkinScreen();
}

function showSkinScreen() {
	skinScreenVisible = true;
	skinScreen.style.display = null;
}

export function hideSkinScreen() {
	skinScreenVisible = false;
	skinScreen.style.display = "none";
}

//called when a skinbutton is pressed
//add = -1 or 1 (increment/decrement)
//type = 0 (color) or 1 (pattern)
function skinButton(add, type) {
	if (type === 0) {
		var oldC = selectedColor;
		var hiddenCs = [];
		if (!hasPlusRewards()) {
			hiddenCs.push(13);
		}
		if (oldC === null) {
			oldC = 0;
		}
		oldC = parseInt(oldC);
		var cFound = false;
		while (!cFound) {
			oldC += add;
			oldC = mod(oldC, SKIN_BLOCK_COUNT + 1);
			if (hiddenCs.indexOf(oldC) < 0) {
				cFound = true;
			}
		}
		setSkinColor(oldC);
	} else if (type == 1) {
		var oldP = selectedPattern;
		var hiddenPs = [18, 19, 20, 21, 23, 24, 25, 26];
		if (!hasPlusRewards()) {
			hiddenPs.push(27);
		}
		if (oldP === null) {
			oldP = 0;
		}
		oldP = parseInt(oldP);
		var pFound = false;
		while (!pFound) {
			oldP += add;
			oldP = mod(oldP, SKIN_PATTERN_COUNT);
			if (hiddenPs.indexOf(oldP) < 0) {
				pFound = true;
			}
		}
		setSkinPattern(oldP);
	}

	updateSkin();
}

function updateSkin() {
	var blockId = parseInt(localStorage.skinColor) + 1;
	fillArea(
		0,
		0,
		VIEWPORT_RADIUS * 2,
		VIEWPORT_RADIUS * 2,
		blockId,
		parseInt(localStorage.skinPattern),
		skinScreenBlocks,
	);
	skinButtonBlocks[0].setBlockId(blockId);
}
