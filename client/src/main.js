"use strict";
//#region constants
const GLOBAL_SPEED = 0.006;
const VIEWPORT_RADIUS = 30;
const MAX_ZOOM = 10000;
window.BLOCKS_ON_SCREEN = 1100; // Global for zoom mode
// const BLOCKS_ON_SCREEN = 20000;
const WAIT_FOR_DISCONNECTED_MS = 1000;
const USERNAME_SIZE = 6;
const SKIN_BLOCK_COUNT = 13;
const SKIN_PATTERN_COUNT = 28;

/**
 * @enum {number} Actions received from the server.
 */
const receiveAction = Object.freeze({
	UPDATE_BLOCKS: 1,
	PLAYER_POS: 2,
	FILL_AREA: 3,
	SET_TRAIL: 4,
	PLAYER_DIE: 5,
	CHUNK_OF_BLOCKS: 6,
	REMOVE_PLAYER: 7,
	PLAYER_NAME: 8,
	MY_SCORE: 9,
	MY_RANK: 10,
	LEADERBOARD: 11,
	MAP_SIZE: 12,
	YOU_DED: 13,
	MINIMAP: 14,
	PLAYER_SKIN: 15,
	EMPTY_TRAIL_WITH_LAST_POS: 16,
	READY: 17,
	PLAYER_HIT_LINE: 18,
	REFRESH_AFTER_DIE: 19,
	PLAYER_HONK: 20,
	PONG: 21,
	UNDO_PLAYER_DIE: 22,
	TEAM_LIFE_COUNT: 23,
});

/**
 * @enum {number} Actions sent to the server.
 */
const sendAction = Object.freeze({
	UPDATE_DIR: 1,
	SET_USERNAME: 2,
	SKIN: 3,
	READY: 4,
	REQUEST_CLOSE: 5,
	HONK: 6,
	PING: 7,
	REQUEST_MY_TRAIL: 8,
	MY_TEAM_URL: 9,
	SET_TEAM_USERNAME: 10,
	VERSION: 11,
	PATREON_CODE: 12,
});

/**
 * Possible move directions.
 */
const Direction = {
    RIGHT: 0,
    DOWN: 1,
    LEFT: 2,
    UP: 3,
    PAUSE: 4,
}

const colors = {
	grey: {
		BG: "#3a342f",
		brighter: "#4e463f",
		darker: "#2d2926",
		diagonalLines: "#c7c7c7",
	},
	red: {
		brighter: "#a22929",
		darker: "#7b1e1e",
		slightlyBrighter: "#af2c2c",
		pattern: "#8c2222",
		patternEdge: "#631717",
		boundsDark: "#420707",
		boundsBright: "#4c0808",
	},
	red2: {
		brighter: "#E3295E",
		darker: "#B3224B",
		slightlyBrighter: "#F02B63",
		pattern: "#CC2554",
		patternEdge: "#9C1C40",
	},
	pink: {
		brighter: "#A22974",
		darker: "#7A1F57",
		pattern: "#8A2262",
		patternEdge: "#5E1743",
		slightlyBrighter: "#B02C7E",
	},
	pink2: {
		brighter: "#7D26EF",
		darker: "#5E1DBA",
		pattern: "#6A21D1",
		patternEdge: "#4C1896",
		slightlyBrighter: "#882DFF",
	},
	purple: {
		brighter: "#531880",
		darker: "#391058",
		pattern: "#4b1573",
		patternEdge: "#3b115a",
		slightlyBrighter: "#5a198c",
	},
	blue: {
		brighter: "#27409c",
		darker: "#1d3179",
		pattern: "#213786",
		patternEdge: "#1b2b67",
		slightlyBrighter: "#2a44a9",
	},
	blue2: {
		brighter: "#3873E0",
		darker: "#2754A3",
		pattern: "#2F64BF",
		patternEdge: "#1F4587",
		slightlyBrighter: "#3B79ED",
	},
	green: {
		brighter: "#2ACC38",
		darker: "#1C9626",
		pattern: "#24AF30",
		patternEdge: "#178220",
		slightlyBrighter: "#2FD63D",
	},
	green2: {
		brighter: "#1e7d29",
		darker: "#18561f",
		pattern: "#1a6d24",
		patternEdge: "#14541c",
		slightlyBrighter: "#21882c",
	},
	leaf: {
		brighter: "#6a792c",
		darker: "#576325",
		pattern: "#5A6625",
		patternEdge: "#454F1C",
		slightlyBrighter: "#738430",
	},
	yellow: {
		brighter: "#d2b732",
		darker: "#af992b",
		pattern: "#D1A932",
		patternEdge: "#B5922B",
		slightlyBrighter: "#e6c938",
	},
	orange: {
		brighter: "#d06c18",
		darker: "#ab5a15",
		pattern: "#AF5B16",
		patternEdge: "#914A0F",
		slightlyBrighter: "#da7119",
	},
	gold: {
		brighter: "#F6B62C",
		darker: "#F7981B",
		pattern: "#DC821E",
		patternEdge: "#BD6B0E",
		slightlyBrighter: "#FBDF78",
		bevelBright: "#F9D485",
	},
};
/** gets color object for a player skin id
 * @param {number} id
 */
const getColorForBlockSkinId = id => {
	switch (id) {
		case 0:
			return colors.red;
		case 1:
			return colors.red2;
		case 2:
			return colors.pink;
		case 3:
			return colors.pink2;
		case 4:
			return colors.purple;
		case 5:
			return colors.blue;
		case 6:
			return colors.blue2;
		case 7:
			return colors.green;
		case 8:
			return colors.green2;
		case 9:
			return colors.leaf;
		case 10:
			return colors.yellow;
		case 11:
			return colors.orange;
		case 12:
			return colors.gold;
		default:
			return {
				brighter: "#000000",
				darker: "#000000",
				slightlyBrighter: "#000000",
			};
	}
}

/** styles an element with mainColor and edgeColor;
 * @param {HTMLElement} elem
 * @param {string} mainColor
 * @param {string} edgeColor
 */
const colorBox = (elem, mainColor, edgeColor) => {
	elem.style.backgroundColor = mainColor;
	elem.style.boxShadow = "1px 1px " + edgeColor + "," +
		"2px 2px " + edgeColor + "," +
		"3px 3px " + edgeColor + "," +
		"4px 4px " + edgeColor + "," +
		"5px 5px " + edgeColor + "," +
		"10px 30px 80px rgba(0,0,0,0.3)";
}

/**
 * Add a style section
 * @param {string} styleStr A CSS document
 */
const addStyle = styleStr => {
    const style = document.createElement('style');
    style.textContent = styleStr;
    document.head.append(style);
}

/**
 * Add some content to the first match of the selector.
 * @param {string} htmlStr content
 * @param {string} selector css selector
 */
const addHTML = (htmlStr, selector) => {
    var template = document.createElement('template');
    template.innerHTML = htmlStr.trim();
    document.querySelector(selector).appendChild(template.content);
}

const titleLines = [
	{ //S
		line: [[86, 82], [50, 57, 25, 99, 65, 105], [110, 110, 80, 158, 42, 129]],
		speed: 1,
		offset: 0,
		posOffset: [16, 0],
	},
	{ //P
		line: [[129, 74], [129, 169]],
		speed: 1,
		offset: 0.7,
		posOffset: [10, 0],
	},
	{ //P
		line: [[129, 106], [129, 63, 191, 63, 191, 106], [191, 149, 129, 149, 129, 106]],
		speed: 1,
		offset: 1.2,
		posOffset: [10, 0],
	},
	{ //L
		line: [[236, 41], [236, 138]],
		speed: 2,
		offset: 0.7,
		posOffset: [0, 0],
	},
	{ //I
		line: [[276, 41], [276, 45]],
		speed: 3,
		offset: 0.4,
		posOffset: [0, 0],
	},
	{ //I
		line: [[276, 74], [276, 138]],
		speed: 2,
		offset: 0,
		posOffset: [0, 0],
	},
	{ //X
		line: [[318, 74], [366, 138]],
		speed: 2,
		offset: 0.5,
		posOffset: [-5, 0],
	},
	{ //X
		line: [[318, 138], [366, 74]],
		speed: 4,
		offset: 0,
		posOffset: [-5, 0],
	},
	{ //.
		line: [[415, 136], [415, 134, 419, 134, 419, 136], [419, 138, 415, 138, 415, 136]],
		speed: 1,
		offset: 0,
		posOffset: [-25, 0],
	},
	{ //I
		line: [[454, 41], [454, 45]],
		speed: 3,
		offset: 0.8,
		posOffset: [-25, 0],
	},
	{ //I
		line: [[454, 74], [454, 138]],
		speed: 2,
		offset: 0.5,
		posOffset: [-25, 0],
	},
	{ //O
		line: [[500, 106], [500, 63, 562, 63, 562, 106], [562, 149, 500, 149, 500, 106]],
		speed: 1,
		offset: 0.2,
		posOffset: [-38, 0],
	},
];

const DeviceTypes = Object.freeze({
	DESKTOP: 0,
	IOS: 1,
	ANDROID: 2,
});

const canvasTransformTypes = Object.freeze({
	MAIN: 1,
	TUTORIAL: 2,
	SKIN: 3,
	SKIN_BUTTON: 4,
	TITLE: 5,
	LIFE: 6,
});

const honkSfx = new Audio("static/honk.mp3");

const filter = str => {
	str = str.replace(/[卐卍]/g, "❤");
	const words = str.split(" ");
	for (let i = 0; i < words.length; i++) {
		let word = words[i];
		const wasAllUpper = word.toUpperCase() == word;
		for (const swear of swearArr) {
			if (word.toLowerCase().indexOf(swear) >= 0) {
				if (word.length < swear.length + 2) {
					word = swearRepl;
				} else {
					word = word.toLowerCase().replace(swear, swearRepl);
				}
			}
		}
		if (wasAllUpper) {
			word = word.toUpperCase();
		}
		words[i] = word;
	}
	return words.join(" ");
}
const simpleRequest = (url, cb) => {
	const req = new XMLHttpRequest();
	req.onreadystatechange = function () {
		if (req.readyState == XMLHttpRequest.DONE) {
			if (req.status == 200) {
				if (cb !== null && cb !== undefined) {
					cb(req.responseText);
				}
			}
		}
	};
	req.open("GET", url, true);
	req.send();
};

const swearArr = [];
simpleRequest("./static/swearList.txt", result => {
	swearArr.push(...(result.split("\n").filter(n => n)));
});
const swearRepl = "balaboo";

const custom_gamepad_mappings = [
	{
		name: "Generic USB Joystick", //https://twitter.com/Mat2095/status/765566729812598784
		buttonMap: {
			0: 2,
			1: 1,
			2: 3,
			3: 0,
			4: 4,
			5: 5,
			6: 6,
			7: 7,
			8: 8,
			9: 9,
			10: 10,
			11: 11,
			12: 13,
			13: 14,
			14: 15,
			15: 16,
		},
		axesMap: { 0: 0, 1: 1, 2: 2, 3: 4 },
	},
	{
		name: "Bluetooth Gamepad", //https://twitter.com/2zqa_MC/status/765933750416994304 https://twitter.com/2zqa_MC/status/765606843339182084
		buttonMap: {
			0: 0,
			1: 1,
			2: 3,
			3: 4,
			4: 6,
			5: 7,
			6: 8,
			7: 9,
			8: 10,
			9: 11,
			10: 13,
			11: 14,
			12: 12,
			13: 13,
			14: 14,
			15: 15,
		},
		axesMap: { 0: 0, 1: 1, 2: 2, 3: 5 },
		//12 = axis 9 (-1.0)
		//13 = axis 9 (0.142857)
		//14 = axis 9 (0.714286)
		//15 = axis 9 (-0.428571)
	},
	{
		name: "USB DancePad",
		buttonMap: {
			0: 6,
			1: 7,
			2: 2,
			3: 3,
			4: 4,
			5: 5,
			6: 6,
			7: 7,
			8: 8,
			9: 9,
			10: 10,
			11: 11,
			12: 0,
			13: 1,
			14: 2,
			15: 3,
		},
		axesMap: { 0: 0, 1: 1, 2: 2, 3: 4 },
	},
]


//#endregion constants









//#region utils



//http://stackoverflow.com/a/7124052/3625298
const htmlEscape = str => {
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

/** easing functions */ 
const ease = {
	in: t => t * t * t * t,
	out: t =>  1 - Math.pow(1 - t, 4),
	inout: t => t < 0.5 ?
		8 * t * t * t * t
		:
		1 - 8 * Math.pow(-1 * t + 1, 4),
};

/* Basic lerp.
 * @param {number} a
 * @param {number} b
 * @param {number} t */
const lerp = (a, b, t) => {
	return a + t * (b - a);
}

/** inverse lerp
 * @param {number} a
 * @param {number} b
 * @param {number} t */
const iLerp = (a, b, t) => {
	return (t - a) / (b - a);
}

/** fixed lerp, calls lerp() multiple times when having a lower framerate
 * 
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @param {number} deltaTime
 */
const lerpt = (a, b, t, deltaTime) => {
	return lerptt(a, b, t, deltaTime / 16.6666);
}

/** lerps between a and b over t, where tt is the amount of times that lerp 
 * should be called
 * 
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @param {number} tt */
const lerptt = (a, b, t, tt) => {
	const newT = 1 - Math.pow(1 - t, tt);
	return lerp(a, b, newT);
}

/** lerps an array
 * @param {number[]} a
 * @param {number[]} b
 * @param {number} t 
*/
const lerpA = (a, b, t) => {
	const newArray = [];
	for (let i = 0; i < a.length; i++) {
		newArray.push(lerp(a[i], b[i], t));
	}
	return newArray;
}

/** fixed modulo
 * @param {number} n
 * @param {number} m
 * @returns {number} r such that 0<=r<m and n=qm+r for some q*/
const mod = (n, m) => {
	return ((n % m) + m) % m;
}

/** clamp
 * @param {number} v
 * @param {number} min 
 * @param {number} max
*/
const clamp = (v, min, max) => {
	return Math.max(min, Math.min(max, v));
}

/** clamp in the [0;1] interval.
 * @param {number} v */
const clamp01 = (v) => {
	return clamp(v, 0, 1);
}

/** returns random item from array
 * @template {Item}
 * @param {Item[]}
 * @return {Item} */
const randFromArray = (array) => {
	return array[Math.floor(Math.random() * array.length)];
}

/** limits a value between -1 and 1 without clamping,
 * smoothLimit(v) will gradually move towards 1/-1 as v goes away from zero
 * but will never actually reach it
 * @param {number} v
 * @returns {number} the smoothed value */
const smoothLimit = (v) => {
	const negative = v < 0;
	if (negative) {
		v *= -1;
	}
	v = 1 - Math.pow(2, -v);
	if (negative) {
		v *= -1;
	}
	return v;
}

/** orders two positions so that pos1 is in the top left and pos2 in the bottom right
 * @param {Vec2} pos1
 * @param {Vec2} pos2
 * @returns {[Vec2,Vec2]}
 */
const orderTwoPos = (pos1, pos2) => {
	const x1 = Math.min(pos1[0], pos2[0]);
	const y1 = Math.min(pos1[1], pos2[1]);
	const x2 = Math.max(pos1[0], pos2[0]);
	const y2 = Math.max(pos1[1], pos2[1]);
	return [[x1, y1], [x2, y2]];
}

/** random number between 0 and 1 using a seed
 * @param {number} seed
 * @returns {number}
 */
const rndSeed = seed => {
	const x = Math.sin(seed) * 10000;
	return x - Math.floor(x);
}


//stackoverflow.com/a/22373135/3625298
// http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt
/* utf.js - UTF-8 <=> UTF-16 convertion
 *
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 */

const Utf8ArrayToStr = (array) => {
	let out, i, len, c;
	let char2, char3;

	out = "";
	len = array.length;
	i = 0;
	while (i < len) {
		c = array[i++];
		switch (c >> 4) {
			case 0:
			case 1:
			case 2:
			case 3:
			case 4:
			case 5:
			case 6:
			case 7:
				// 0xxxxxxx
				out += String.fromCharCode(c);
				break;
			case 12:
			case 13:
				// 110x xxxx   10xx xxxx
				char2 = array[i++];
				out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
				break;
			case 14:
				// 1110 xxxx  10xx xxxx  10xx xxxx
				char2 = array[i++];
				char3 = array[i++];
				out += String.fromCharCode(
					((c & 0x0F) << 12) |
						((char2 & 0x3F) << 6) |
						((char3 & 0x3F) << 0),
				);
				break;
		}
	}
	return out;
}

//stackoverflow.com/a/18729931/3625298
const toUTF8Array = str => {
	const utf8 = [];
	for (let i = 0; i < str.length; i++) {
		let charcode = str.charCodeAt(i);
		if (charcode < 0x80) utf8.push(charcode);
		else if (charcode < 0x800) {
			utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
		} else if (charcode < 0xd800 || charcode >= 0xe000) {
			utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
		} // surrogate pair
		else {
			i++;
			// UTF-16 encodes 0x10000-0x10FFFF by
			// subtracting 0x10000 and splitting the
			// 20 bits of 0x0-0xFFFFF into two halves
			charcode = 0x10000 + (((charcode & 0x3ff) << 10) |
				(str.charCodeAt(i) & 0x3ff));
			utf8.push(
				0xf0 | (charcode >> 18),
				0x80 | ((charcode >> 12) & 0x3f),
				0x80 | ((charcode >> 6) & 0x3f),
				0x80 | (charcode & 0x3f),
			);
		}
	}
	return utf8;
}

/** Convert bytes to integers (numbers).
 * @param {...number} bytes
 * @returns {number}
 */
const bytesToInt = (...bytes) => {
	let integer = 0;
	let multiplier = 0;
	for (let i = bytes.length - 1; i >= 0; i--) {
		let thisArg = bytes[i];
		integer = (integer | (((thisArg & 0xff) << multiplier) >>> 0)) >>> 0;
		multiplier += 8;
	}
	return integer;
}

/**
 * Converts an integer into a binary representation with `byteCount` bytes.
 * @param {number} integer 
 * @param {number} byteCount 
 * @returns {number}
 */
const intToBytes = (integer, byteCount) => {
	const bytes = [];
	for (let i = 0; i < byteCount; i++) {
		const byte = integer & 0xff;
		bytes[byteCount - i - 1] = byte;
		integer = (integer - byte) / 256;
	}
	return bytes;
}

/**
 * Prints a UNIX time stamp in hh:mm:ss.
 * @param {number} seconds
 * @returns {string}
 */
const parseTimeToString = seconds => {
	let hours = Math.floor(seconds / 3600);
	let minutes = Math.floor((seconds - (hours * 3600)) / 60);
	seconds = seconds - (hours * 3600) - (minutes * 60);
	if (hours <= 0) {
		const secondsS = seconds == 1 ? "" : "s";
		if (minutes <= 0) {
			return seconds + " second" + secondsS;
		} else {
			const minutesS = minutes == 1 ? "" : "s";
			return minutes + " minute" + minutesS + " and " + seconds + " second" + secondsS;
		}
	} else {

		if (hours < 10) hours = "0" + hours;
		if (minutes < 10) minutes = "0" + minutes;
		if (seconds < 10) seconds = "0" + seconds;
		return hours + ":" + minutes + ":" + seconds;
	}
}

/**
 * Parse query in URL
 * @param {string} url
 * @returns {Record<string,string>}
 */
const parseQuery = url => {
	const startIndex = url.indexOf("?");
	if (startIndex < 0) {
		return {};
	}
	const queryString = url.substr(startIndex + 1);
	const queryItems = queryString.split("&");
	let query = {};
	for (const item of queryItems) {
		const split = item.split("=");
		if (split.length == 2) {
			query[split[0]] = split[1];
		}
	}
	return query;
}

//#endregion


//stackoverflow.com/a/15666143/3625298
const MAX_PIXEL_RATIO = (function () {
	const ctx = document.createElement("canvas").getContext("2d"),
		dpr = window.devicePixelRatio || 1,
		bsr = ctx.webkitBackingStorePixelRatio ||
			ctx.mozBackingStorePixelRatio ||
			ctx.msBackingStorePixelRatio ||
			ctx.oBackingStorePixelRatio ||
			ctx.backingStorePixelRatio || 1;

	return dpr / bsr;
})();

const deviceType = (function () {
	if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
		return DeviceTypes.IOS;
	}
	if (navigator.userAgent.toLowerCase().indexOf("android") > -1) {
		return DeviceTypes.ANDROID;
	}
	return DeviceTypes.DESKTOP;
})();
testHashForMobile();

const patreonQueryWasFound = checkPatreonQuery();

function redirectQuery() {
	const hashIndex = location.href.indexOf("#");
	const queryIndex = location.href.indexOf("?");
	if ((queryIndex >= 0 && (hashIndex == -1 || queryIndex < hashIndex)) || isIframe()) {
		if (!patreonQueryWasFound || isIframe()) {
			const allowedSearchParams = ["gp", "siteId", "channelId", "siteLocale", "storageId"];
			const query = parseQuery(location.href);
			for (const key in query) {
				if (query.hasOwnProperty(key)) {
					if (allowedSearchParams.indexOf(key) == -1) {
						delete query[key];
					}
				}
			}

			if (isIframe()) {
				query["gp"] = "1";
				query["siteId"] = window.location.hostname;
				query["channelId"] = "1";
				query["siteLocale"] = "en_EN";
				query["storageId"] = "72167631167";
			}

			const queryArr = [];
			for (const key in query) {
				if (query.hasOwnProperty(key)) {
					queryArr.push(window.encodeURIComponent(key) + "=" + window.encodeURIComponent(query[key]));
				}
			}
			const queryString = queryArr.join("&");
			if (queryString) queryString = "?" + queryString;
			const newLocation = location.href.split("?")[0] + queryString;
			if (newLocation != location.href) {
				location.href = newLocation;
			}
		}
	}
}
redirectQuery();

function isIframe() {
	try {
		return window.self !== window.top;
	} catch (e) {
		return true;
	}
}

function addSocketWrapper() {
	if (typeof WebSocket == "undefined") {
		return;
	}

	const simulatedLatency = parseInt(localStorage.simulatedLatency) / 2;
	if (simulatedLatency > 0) {
		const RealWebSocket = WebSocket;
		const WrappedWebSocket = function (url) {
			const websocket = new RealWebSocket(url);
			websocket.binaryType = "arraybuffer";

			this.onclose = function () {};
			this.onopen = function () {};
			this.onmessage = function () {};

			const me = this;
			websocket.onclose = () => window.setTimeout(() => me.onclose(), simulatedLatency);
			websocket.onopen = () => window.setTimeout(() => me.onopen(), simulatedLatency);
			websocket.onmessage = (data) => window.setTimeout(() => me.onmessage(data), simulatedLatency);
			this.send = (data) => window.setTimeout(() => websocket.send(data), simulatedLatency);
			this.close = () => window.setTimeout(() => websocket.close(), simulatedLatency);
		};
		window.WebSocket = WrappedWebSocket.bind();
	}
}
addSocketWrapper(); // TODO Unwrap WebSocket ?

class Stats {
	blocks = 0;
	kills = 0;
	leaderboard_rank = 0;
	alive = 0;
	no1_time = 0;
}

//#region Canvases
/**
 * @typedef {{
 * 	ctx: CanvasRenderingContext2D,
 * 	offset: number,
 * 	color: string | CanvasGradient | CanvasPattern,
 * }} DrawCall
 */

class SplixBaseCanvas {
	/**@type {HTMLCanvasElement} */
	canvas;
	/**@type {CanvasRenderingContext2D} */
	ctx;
	/**@type {canvasTransformTypes} */ // TODO: this should be removed in the end
	canvasTransformType;
	/**@type {number} */
	current_width;
	/**@type {number} */
	current_height;
	/**@type {number} */
	current_style_ratio;
	constructor(canvas){
		if(canvas === undefined){
			canvas = document.createElement('canvas');
			console.warn("The canvas is not attached. See trace :");
			console.trace();
		}
		this.canvas = canvas;
		this.ctx = this.canvas.getContext("2d");
	}

	/**
	 * sets the with/height of a full screen canvas, takes retina displays into account
	 * @param {boolean} [dontUseQuality]
	 */
	setCanvasSize(dontUseQuality,canvas) { // TODO: Clean up this arguments and their order.
		if(canvas === undefined){
			canvas = this.canvas;
		}
		const quality = dontUseQuality ? 1 : canvasQuality;
		const w = this.w, h = this.h;
		if(w !== this.current_width || h !== this.current_height || canvas !== this.canvas){
			this.current_width = w;
			this.current_height = h;
			this.current_style_ratio = this.styleRatio;
			// PIXEL_RATIO = 1;
			canvas.width = w * MAX_PIXEL_RATIO * quality;
			canvas.height = h * MAX_PIXEL_RATIO * quality;
			canvas.style.width = w * this.styleRatio + "px";
			canvas.style.height = h * this.styleRatio + "px";
		} else if(this.styleRatio !== this.current_style_ratio) {
			this.current_style_ratio = this.styleRatio;
			canvas.style.width = w * this.styleRatio + "px";
			canvas.style.height = h * this.styleRatio + "px";
		}
	}

	get w(){
		let w = window.innerWidth;
		if (this.canvasTransformType == canvasTransformTypes.SKIN_BUTTON) {
			w = 30;
		}
		else if (this.canvasTransformType == canvasTransformTypes.LIFE) {
			w = 60;
		}

		return w;
	}

	get h(){
		let h = window.innerHeight;
		if (this.canvasTransformType == canvasTransformTypes.SKIN_BUTTON) {
			h = 30;
		}
		else if (this.canvasTransformType == canvasTransformTypes.LIFE) {
			h = 60;
		}
		return h;
	}

	get styleRatio(){
		return 1;
	}

	/**
	 * 
	 * @param {boolean} setSize if true sets the size of the canvas
	 * @param {boolean} dontUseQuality
	 */
	ctxApplyCamTransform(setSize, dontUseQuality,ctx) {
		if(ctx === undefined){
			ctx = this.ctx;
		}
		if (setSize) {
			this.setCanvasSize(dontUseQuality,ctx.canvas);
			ctx.reset();
		}
		ctx.save();
		if (this.canvasTransformType != canvasTransformTypes.MAIN && this.canvasTransformType != canvasTransformTypes.SKIN) {
			const quality = dontUseQuality ? 1 : canvasQuality;
			ctx.setTransform(MAX_PIXEL_RATIO * quality, 0, 0, MAX_PIXEL_RATIO * quality, 0, 0);
		}
		if (this.canvasTransformType == canvasTransformTypes.MAIN || this.canvasTransformType == canvasTransformTypes.SKIN) {
			const isMain = this.canvasTransformType == canvasTransformTypes.MAIN;
			ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
			const biggest = Math.max(this.canvas.width, this.canvas.height);
			const zoomEdge = biggest / MAX_ZOOM;
			const pixelsAvailable = this.canvas.width * this.canvas.height;
			const pixelsPerBlock = pixelsAvailable / BLOCKS_ON_SCREEN;
			const zoomBlocks = Math.sqrt(pixelsPerBlock) / 10;
			zoom = Math.max(zoomBlocks, zoomEdge);
			if (isMain) {
				ctx.rotate(this.camRotOffset);
			}
			ctx.scale(zoom, zoom);
			if (isMain) {
				ctx.translate(-this.camPosPrevFrame[0] * 10 - this.camPosOffset[0], -this.camPosPrevFrame[1] * 10 - this.camPosOffset[1]);
			} else {
				ctx.translate(-VIEWPORT_RADIUS * 10, -VIEWPORT_RADIUS * 10);
			}
		} else if (
			this.canvasTransformType == canvasTransformTypes.TUTORIAL || this.canvasTransformType == canvasTransformTypes.SKIN_BUTTON
		) {
			ctx.scale(3, 3);
		}
	}
}


class SplixBaseCamera extends SplixBaseCanvas {

	/**@type {canvasTransformTypes} */ // TODO: this should be removed in the end
	canvasTransformType = canvasTransformTypes.MAIN;
	/**@type {CanvasRenderingContext2D} */
	tempCtx;
	/**@type {CanvasRenderingContext2D} */
	linesCtx;
	/**@type {HTMLCanvasElement} */
	linesCanvas;
	camPosPrevFrame = null;

	constructor(canvas){
		super(canvas);
		this.linesCanvas = document.createElement('canvas');
		this.linesCtx = this.linesCanvas.getContext('2d'); // TODO If possible, remove these contexts
		this.tempCtx = document.createElement('canvas').getContext('2d'); // TODO use OffscreenCanvas if possible
	}
	/**
	 * draws diagonal lines on a canvas, can be used as mask and stuff like that
	 * @param {CanvasRenderingContext2D} ctx 
	 * @param {string | CanvasGradient | CanvasPattern} color 
	 * @param {number} thickness
	 * @param {number} spaceBetween 
	 * @param {number} offset
	 */
	drawDiagonalLines(ctx, color, thickness, spaceBetween, offset) {
		if (thickness > 0) {
			ctx.lineCap = "butt";
			ctx.strokeStyle = color;
			ctx.lineWidth = thickness;
			const minSize = VIEWPORT_RADIUS * 20;
			let xOffset = 0;
			let yOffset = 0;
			if (this.camPosPrevFrame !== null) {
				xOffset = Math.round((this.camPosPrevFrame[0] * 10 - minSize / 2) / spaceBetween) * spaceBetween;
				yOffset = Math.round((this.camPosPrevFrame[1] * 10 - minSize / 2) / spaceBetween) * spaceBetween;
			}
			xOffset += offset % spaceBetween;
			for (let i = -minSize; i < minSize; i += spaceBetween) {
				const thisXOffset = xOffset + i;
				ctx.beginPath();
				ctx.moveTo(thisXOffset, yOffset);
				ctx.lineTo(thisXOffset + minSize, yOffset + minSize);
				ctx.stroke();
			}
		}
	}
	/** draws blocks on ctx
	 * Uses linesCtx
	 * @param {Map<Vec2,Block>} blocks
	 */
	drawBlocks(deltaTime,blocks, checkViewport) {
		for (const block of blocks.values()) { // TODO: in non ugly mode, consider reusing the generated block
			if (
				checkViewport &&
				(
					block.x < this.camPos[0] - VIEWPORT_RADIUS ||
					block.x > this.camPos[0] + VIEWPORT_RADIUS ||
					block.y < this.camPos[1] - VIEWPORT_RADIUS ||
					block.y > this.camPos[1] + VIEWPORT_RADIUS
				)
			) {
				//outside viewport, don't render this block
			} else {
				if (block.animDelay > 0) {
					block.animDelay -= deltaTime;
				} else {
					block.animProgress += deltaTime * block.animDirection * 0.003;
				}
				if (block.animProgress > 1) {
					block.animDirection = 0;
					block.animProgress = 1;
				}
				if (block.animProgress < 0) {
					block.currentBlock = block.nextBlock;
					block.animDirection = 1;
					block.animProgress = 0;
				} else {
					const t = block.animProgress;

					//edge
					if (block.currentBlock === 0) {
						this.ctx.fillStyle = colors.red.boundsDark;
						this.ctx.fillRect(block.x * 10, block.y * 10, 10, 10);
						if (!uglyMode) {
							this.linesCtx.fillStyle = colors.grey.diagonalLines;
							this.linesCtx.fillRect(block.x * 10, block.y * 10, 10, 10);
						}
					}
					//empty block
					if (block.currentBlock == 1) {
						//shadow edge
						if (t > 0.8 && !uglyMode) {
							this.ctx.fillStyle = colors.grey.darker;
							this.ctx.fillRect(block.x * 10 + 2, block.y * 10 + 2, 7, 7);
						}

						//bright surface
						this.ctx.fillStyle = colors.grey.brighter;
						if (t == 1 || uglyMode) {
							// ctx.fillStyle = colors.grey.darker; //shadow edge
							// ctx.beginPath();
							// ctx.moveTo(block.x*10 + 1, block.y*10 + 8);
							// ctx.lineTo(block.x*10 + 2, block.y*10 + 9);
							// ctx.lineTo(block.x*10 + 9, block.y*10 + 9);
							// ctx.lineTo(block.x*10 + 9, block.y*10 + 2);
							// ctx.lineTo(block.x*10 + 8, block.y*10 + 1);
							// ctx.fill();
							this.ctx.fillRect(block.x * 10 + 1, block.y * 10 + 1, 7, 7);
						} else if (t < 0.4) {
							const t2 = t * 2.5;
							this.ctx.beginPath();
							this.ctx.moveTo(block.x * 10 + 2, block.y * 10 + lerp(9, 2, t2));
							this.ctx.lineTo(block.x * 10 + 2, block.y * 10 + 9);
							this.ctx.lineTo(block.x * 10 + lerp(2, 9, t2), block.y * 10 + 9);
							this.ctx.fill();
						} else if (t < 0.8) {
							const t2 = t * 2.5 - 1;
							this.ctx.beginPath();
							this.ctx.moveTo(block.x * 10 + 2, block.y * 10 + 2);
							this.ctx.lineTo(block.x * 10 + 2, block.y * 10 + 9);
							this.ctx.lineTo(block.x * 10 + 9, block.y * 10 + 9);
							this.ctx.lineTo(block.x * 10 + 9, block.y * 10 + lerp(9, 2, t2));
							this.ctx.lineTo(block.x * 10 + lerp(2, 9, t2), block.y * 10 + 2);
							this.ctx.fill();
						} else {
							const t2 = t * 5 - 4;
							// ctx.fillStyle = colors.grey.darker; //shadow edge
							// ctx.beginPath();
							// ctx.moveTo(block.x*10 + lerp(2,1,t2), block.y*10 + lerp(9,8,t2));
							// ctx.lineTo(block.x*10 + 2, block.y*10 + 9);
							// ctx.lineTo(block.x*10 + 9, block.y*10 + 9);
							// ctx.lineTo(block.x*10 + 9, block.y*10 + 2);
							// ctx.lineTo(block.x*10 + lerp(9,8,t2), block.y*10 + lerp(2,1,t2));
							// ctx.fill();
							this.ctx.fillRect(
								block.x * 10 + lerp(2, 1, t2),
								block.y * 10 + lerp(2, 1, t2), 7, 7);
						}
					}
					//regular colors
					if (block.currentBlock >= 2) {
						const idForBlockSkinId = (block.currentBlock - 2) % SKIN_BLOCK_COUNT;
						const thisColor = getColorForBlockSkinId(idForBlockSkinId);

						const isPatternBlock = block.currentBlock > SKIN_BLOCK_COUNT + 1;

						const brightColor = isPatternBlock ? thisColor.pattern : thisColor.brighter;
						const darkColor = isPatternBlock ? thisColor.patternEdge : thisColor.darker;

						//shadow edge
						if (t > 0.8 && !uglyMode) {
							this.ctx.fillStyle = darkColor;
							this.ctx.fillRect(block.x * 10 + 1, block.y * 10 + 1, 9, 9);
						}

						//bright surface
						this.ctx.fillStyle = brightColor;
						if (t == 1 || uglyMode) {
							// ctx.fillStyle = thisColor.darker; //shadow edge
							// ctx.beginPath();
							// ctx.moveTo(block.x*10     , block.y*10 + 9 );
							// ctx.lineTo(block.x*10 + 1 , block.y*10 + 10);
							// ctx.lineTo(block.x*10 + 10, block.y*10 + 10);
							// ctx.lineTo(block.x*10 + 10, block.y*10 + 1 );
							// ctx.lineTo(block.x*10 + 9 , block.y*10     );
							// ctx.fill();

							this.ctx.fillRect(block.x * 10, block.y * 10, 9, 9);
							if (idForBlockSkinId == 12 && !uglyMode) {
								this.ctx.fillStyle = colors.gold.bevelBright;
								this.ctx.fillRect(block.x * 10 + 3, block.y * 10 + 0.1, 6, 0.1);
							}
						} else if (t < 0.4) {
							const t2 = t * 2.5;
							this.ctx.beginPath();
							this.ctx.moveTo(block.x * 10 + 1, block.y * 10 + lerp(10, 1, t2));
							this.ctx.lineTo(block.x * 10 + 1, block.y * 10 + 10);
							this.ctx.lineTo(block.x * 10 + lerp(1, 10, t2), block.y * 10 + 10);
							this.ctx.fill();
						} else if (t < 0.8) {
							const t2 = t * 2.5 - 1;
							this.ctx.beginPath();
							this.ctx.moveTo(block.x * 10 + 1, block.y * 10 + 1);
							this.ctx.lineTo(block.x * 10 + 1, block.y * 10 + 10);
							this.ctx.lineTo(block.x * 10 + 10, block.y * 10 + 10);
							this.ctx.lineTo(block.x * 10 + 10, block.y * 10 + lerp(10, 1, t2));
							this.ctx.lineTo(block.x * 10 + lerp(1, 10, t2), block.y * 10 + 1);
							this.ctx.fill();
						} else {
							const t2 = t * 5 - 4;
							// ctx.fillStyle = thisColor.darker; //shadow edge
							// ctx.beginPath();
							// ctx.moveTo(block.x*10 + lerp(1,0,t2) , block.y*10 + lerp(10,9,t2) );
							// ctx.lineTo(block.x*10 + 1 , block.y*10 + 10);
							// ctx.lineTo(block.x*10 + 10, block.y*10 + 10);
							// ctx.lineTo(block.x*10 + 10, block.y*10 + 1 );
							// ctx.lineTo(block.x*10 + lerp(10,9,t2) , block.y*10 + lerp(1,0,t2)  );
							// ctx.fill();

							this.ctx.fillRect(block.x * 10 + lerp(1, 0, t2), block.y * 10 + lerp(1, 0, t2), 9, 9);
						}
					}
				}
			}
		}
	}

	/**
	 * Draws a player.
	 * 
	 * Requires tempCtx and lineCtx
	 * @param {Player} player 
	 * @param {number} timeStamp 
	 * @param {number} deltaTime 
	 */
	drawPlayer(player, timeStamp, deltaTime) {
		const ctx = this.ctx;
		if (player.hasReceivedPosition) {
			/** @type {number} */
			let x, y;

			/** player color */
			const pc = getColorForBlockSkinId(player.skinBlock); //player color

			//draw trail
			if (player.trails.length > 0) {
				//iterate over each trail
				for (let trailI = player.trails.length - 1; trailI >= 0; trailI--) {
					const trail = player.trails[trailI];

					//increase vanish timer
					const last = trailI == player.trails.length - 1;
					if (!last || player.isDead) {
						if (uglyMode) {
							trail.vanishTimer = 10;
						} else {
							let speed = (player.isDead && last) ? 0.006 : 0.02;
							trail.vanishTimer += deltaTime * speed;
						}
						if (!last && (trail.vanishTimer > 10)) {
							player.trails.splice(trailI, 1);
						}
					}

					//if there's no trail, don't draw anything
					if (trail.trail.length > 0) {
						const lastPos = last ? player.drawPos : null;
						if (trail.vanishTimer > 0 && !uglyMode) {
							this.ctxApplyCamTransform(true, false, this.tempCtx);
							drawTrailOnCtx(
								[{
									ctx: this.tempCtx,
									color: pc.darker,
									offset: 5,
								}, {
									ctx: this.tempCtx,
									color: pc.brighter,
									offset: 4,
								}],
								trail.trail,
								lastPos,
							);

							this.tempCtx.globalCompositeOperation = "destination-out";
							this.drawDiagonalLines(this.tempCtx, "white", trail.vanishTimer, 10, timeStamp * 0.003);

							ctx.restore();
							this.tempCtx.restore();
							this.linesCtx.restore();

							ctx.drawImage(this.tempCtx.canvas, 0, 0);
							this.tempCtx.fillStyle = colors.grey.diagonalLines;
							this.tempCtx.globalCompositeOperation = "source-in";
							this.tempCtx.fillRect(0, 0, this.tempCtx.canvas.width, this.tempCtx.canvas.height);
							this.linesCtx.drawImage(this.tempCtx.canvas, 0, 0);
							this.ctxApplyCamTransform(false,false,ctx);
							this.ctxApplyCamTransform(false,false,this.linesCtx);
						} else if (trail.vanishTimer < 10) {
							if (uglyMode) {
								drawTrailOnCtx(
									[{
										ctx: ctx,
										color: pc.darker,
										offset: 5,
									}, {
										ctx: ctx,
										color: pc.brighter,
										offset: 4,
									}],
									trail.trail,
									lastPos,
								);
							} else {
								drawTrailOnCtx(
									[{
										ctx: ctx,
										color: pc.darker,
										offset: 5,
									}, {
										ctx: ctx,
										color: pc.brighter,
										offset: 4,
									}, {
										ctx: this.linesCtx,
										color: colors.grey.diagonalLines,
										offset: 4,
									}],
									trail.trail,
									lastPos,
								);
							}
						}
					}
				}
			}

			//draw player
			const dp = [player.drawPos[0] * 10 + 4.5, player.drawPos[1] * 10 + 4.5]; //draw position
			const pr = 6; //player radius
			const so = 0.3; //shadow offset
			const gradient = ctx.createRadialGradient(dp[0] - 3, dp[1] - 3, 0, dp[0], dp[1], pr);
			gradient.addColorStop(0, pc.slightlyBrighter);
			gradient.addColorStop(1, pc.brighter);
			this.linesCtx.fillStyle = "white";
			if (player.isDead) {
				player.isDeadTimer += deltaTime * 0.003;
				ctx.fillStyle = gradient;

				for (let i = 0; i < player.deadAnimParts.length - 1; i++) {
					const arcStart = player.deadAnimParts[i];
					const arcEnd = player.deadAnimParts[i + 1];
					const arcAvg = lerp(arcStart, arcEnd, 0.5);
					const dir = player.dir * Math.PI / 2 - Math.PI;
					const distanceModifier = Math.min(
						Math.abs(dir - arcAvg),
						Math.abs((dir - Math.PI * 2) - arcAvg),
						Math.abs((dir + Math.PI * 2) - arcAvg),
					);
					const rand = player.deadAnimPartsRandDist[i];
					const distance = (1 - Math.pow(2, -2 * player.isDeadTimer)) * distanceModifier * 5 * (rand + 1);
					const pOffset = [Math.cos(arcAvg) * distance, Math.sin(arcAvg) * distance]; //piece offset
					ctx.globalAlpha = this.linesCtx.globalAlpha = Math.max(0, 1 - (player.isDeadTimer * 0.2));
					ctx.beginPath();
					ctx.arc(dp[0] - so + pOffset[0], dp[1] - so + pOffset[1], pr, arcStart, arcEnd, false);
					ctx.lineTo(dp[0] - so + pOffset[0], dp[1] - so + pOffset[1]);
					ctx.fill();
					if (!uglyMode) {
						this.linesCtx.beginPath();
						this.linesCtx.arc(dp[0] - so + pOffset[0], dp[1] - so + pOffset[1], pr, arcStart, arcEnd, false);
						this.linesCtx.lineTo(dp[0] - so + pOffset[0], dp[1] - so + pOffset[1]);
						this.linesCtx.fill();
					}
				}
				ctx.globalAlpha = this.linesCtx.globalAlpha = 1;
			} else {
				ctx.fillStyle = pc.darker;
				ctx.beginPath();
				ctx.arc(dp[0] + so, dp[1] + so, pr, 0, 2 * Math.PI, false);
				ctx.fill();
				ctx.fillStyle = gradient;
				ctx.beginPath();
				ctx.arc(dp[0] - so, dp[1] - so, pr, 0, 2 * Math.PI, false);
				ctx.fill();
				if (player.mydata && localStorage.drawWhiteDot == "true") {
					ctx.fillStyle = "white";
					ctx.beginPath();
					ctx.arc(dp[0] - so, dp[1] - so, 1, 0, 2 * Math.PI, false);
					ctx.fill();
				}

				//lines canvas (remove lines)
				if (!uglyMode) {
					this.linesCtx.beginPath();
					this.linesCtx.arc(dp[0] + so, dp[1] + so, pr, 0, 2 * Math.PI, false);
					this.linesCtx.fill();
					this.linesCtx.beginPath();
					this.linesCtx.arc(dp[0] - so, dp[1] - so, pr, 0, 2 * Math.PI, false);
					this.linesCtx.fill();
				}
			}
			if (player.mydata && localStorage.drawActualPlayerPos == "true") {
				ctx.fillStyle = "#FF0000";
				ctx.beginPath();
				ctx.arc(player.mydata.serverPos[0] * 10 + 5, player.mydata.serverPos[1] * 10 + 5, pr, 0, 2 * Math.PI, false);
				ctx.fill();
			}

			//draw hitlines
			if (player.hitLines.length > 0) {
				for (let hitlineI = player.hitLines.length - 1; hitlineI >= 0; hitlineI--) {
					const thisHit = player.hitLines[hitlineI];

					//increase vanish timer
					thisHit.vanishTimer += deltaTime * 0.004;
					const t = thisHit.vanishTimer;
					if (t > 4) {
						player.hitLines.splice(hitlineI, 1);
					}

					const x = thisHit.pos[0] * 10 + 5;
					const y = thisHit.pos[1] * 10 + 5;

					//draw circle
					if (t < 2) {
						const radius1 = Math.max(0, ease.out(iLerp(0, 2, t)) * 18);
						const radius2 = Math.max(0, ease.out(iLerp(0.5, 2, t)) * 18);
						ctx.fillStyle = pc.brighter;
						ctx.beginPath();
						ctx.arc(x, y, radius1, 0, 2 * Math.PI, false);
						ctx.arc(x, y, radius2, 0, 2 * Math.PI, false);
						ctx.fill("evenodd");

						if (!uglyMode) {
							//lines canvas (remove lines)
							this.linesCtx.beginPath();
							this.linesCtx.arc(x, y, radius1, 0, 2 * Math.PI, false);
							this.linesCtx.arc(x, y, radius2, 0, 2 * Math.PI, false);
							this.linesCtx.fill("evenodd");
						}
					}

					//draw 500+
					if (thisHit.color !== undefined && player.mydata) {
						ctx.save();
						ctx.font = this.linesCtx.font = "6px Arial, Helvetica, sans-serif";
						ctx.fillStyle = thisHit.color.brighter;
						ctx.shadowColor = thisHit.color.darker;
						ctx.shadowOffsetX = ctx.shadowOffsetY = 0.4 * MAX_PIXEL_RATIO * zoom * canvasQuality;
						const w = ctx.measureText("+500").width;
						let opacity;
						if (t < 0.5) {
							opacity = iLerp(0, 0.5, t);
						} else if (t < 3.5) {
							opacity = 1;
						} else {
							opacity = iLerp(4, 3.5, t);
						}
						opacity = clamp01(opacity);
						let hOffset;
						if (t < 2) {
							hOffset = ease.out(t / 2) * 20;
						} else {
							hOffset = 20;
						}
						ctx.globalAlpha = opacity;
						ctx.fillText("+500", x - w / 2, y - hOffset);
						ctx.restore();
					}
				}
			}

			//draw honk
			if (player.honkTimer < player.honkMaxTime) {
				player.honkTimer += deltaTime * 0.255;
				ctx.fillStyle = pc.brighter;
				ctx.globalAlpha = clamp01(iLerp(player.honkMaxTime, 0, player.honkTimer));
				ctx.beginPath();
				ctx.arc(
					player.drawPos[0] * 10 + 4.5 + so,
					player.drawPos[1] * 10 + 4.5 + so,
					pr + player.honkTimer * 0.1,
					0,
					2 * Math.PI,
					false,
				);
				ctx.fill();
				ctx.globalAlpha = 1;

				if (!uglyMode) {
					this.linesCtx.globalAlpha = clamp01(iLerp(player.honkMaxTime, 0, player.honkTimer));
					this.linesCtx.beginPath();
					this.linesCtx.arc(
						player.drawPos[0] * 10 + 4.5 + so,
						player.drawPos[1] * 10 + 4.5 + so,
						pr + player.honkTimer * 0.1,
						0,
						2 * Math.PI,
						false,
					);
					this.linesCtx.fill();
					this.linesCtx.globalAlpha = 1;
				}
			}

			//draw name
			if (localStorage.hidePlayerNames != "true") {
				this.myNameAlphaTimer += deltaTime * 0.001;
				ctx.font = this.linesCtx.font = USERNAME_SIZE + "px Arial, Helvetica, sans-serif";
				if (player.name) {
					let myAlpha = 1;
					if (player.mydata) {
						myAlpha = 9 - this.myNameAlphaTimer;
					}
					let deadAlpha = 1;
					if (player.isDead) {
						deadAlpha = 1 - player.isDeadTimer;
					}
					const alpha = Math.min(deadAlpha, myAlpha);
					if (alpha > 0) {
						ctx.save();
						if (!uglyMode) {
							this.linesCtx.save();
						}
						ctx.globalAlpha = clamp01(alpha);
						let width = ctx.measureText(player.name).width;
						width = Math.min(100, width);
						const x = player.drawPos[0] * 10 + 5 - width / 2;
						const y = player.drawPos[1] * 10 - 5;

						ctx.rect(x - 4, y - USERNAME_SIZE * 1.2, width + 8, USERNAME_SIZE * 2);
						ctx.clip();
						if (!uglyMode) {
							this.linesCtx.rect(x - 4, y - USERNAME_SIZE * 1.2, width + 8, USERNAME_SIZE * 2);
							this.linesCtx.clip();
							this.linesCtx.fillText(player.name, x, y);
						}

						ctx.shadowColor = "rgba(0,0,0,0.9)";
						ctx.shadowBlur = 10;
						ctx.shadowOffsetX = ctx.shadowOffsetY = 2;
						ctx.fillStyle = pc.brighter;
						ctx.fillText(player.name, x, y);

						ctx.shadowColor = pc.darker;
						ctx.shadowBlur = 0;
						ctx.shadowOffsetX = ctx.shadowOffsetY = 0.8;
						ctx.fillText(player.name, x, y);

						ctx.restore();
						if (!uglyMode) {
							this.linesCtx.restore();
						}
					}
				}
			}

			//draw cool shades
			if (player.name == "Jesper" && !player.isDead) {
				ctx.fillStyle = "black";
				ctx.fillRect(dp[0] - 6.5, dp[1] - 2, 13, 1);
				ctx.fillRect(dp[0] - 1, dp[1] - 2, 2, 2);
				ctx.fillRect(dp[0] - 5.5, dp[1] - 2, 5, 3);
				ctx.fillRect(dp[0] + 0.5, dp[1] - 2, 5, 3);
			}
		}
	}
}

/**
 * @typedef {[number, number]} Vec2
 */

class SplixCanvas extends SplixBaseCamera {
	/**@type {canvasTransformTypes} */ // TODO: this should be removed in the end
	canvasTransformType = canvasTransformTypes.MAIN;

	//// DATA
	/**@type {Vec2} */
	camPos = [0,0];
	camPosSet = false;
	/**@type {Vec2} */
	camPosPrevFrame = [0,0];
	/**@type {[number,number,number][]} */
	camShakeForces = [];
	/**@type {Vec2} */
	camPosOffset = [0,0];
	/**@type {Vec2} */
	camRotOffset = 0;
	myNameAlphaTimer = 0;
	/**@type {SplixState} */
	state;
	constructor(canvas,state){
		super(canvas);
		this.state=state;
	}

	show(){
		this.canvas.style.display = null;
		this.myNameAlphaTimer = 0;
	}

	hide(){
		this.canvas.style.display = 'none';
	}

	reset(){
		this.camPosSet = false;
		this.camShakeForces = [];
	}

	get w (){ return window.innerWidth }
	get h (){ return window.innerHeight }

	/**
	 * Render the main canvas.
	 * @param {number} deltaTime 
	 */
	render(timeStamp,deltaTime){
		debugging.frames += 1;
		const ctx = this.ctx;
		this.setCanvasSize();
		this.ctx.reset()
		if (!uglyMode) {
			this.setCanvasSize(false,this.linesCanvas);
			this.linesCtx.reset();
		}

		//BG
		ctx.fillStyle = colors.grey.BG;
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		if (!uglyMode) {
			this.linesCtx.fillStyle = "white";
			this.linesCtx.fillRect(0, 0, this.linesCanvas.width, this.linesCanvas.height);
		}

		//cam transforms
		this.camPosPrevFrame = [this.camPos[0], this.camPos[1]];
		this.calcCamOffset(deltaTime);
		this.ctxApplyCamTransform(false,false,ctx);
		if (!uglyMode) {
			this.ctxApplyCamTransform(false,false,this.linesCtx);
		}

		//draw blocks
		this.drawBlocks(deltaTime,this.state.blocks, true);

		//players
		for (const player of this.state.players.values()) {
			this.drawPlayer(player, timeStamp, deltaTime);
		}

		if (!uglyMode) {
			this.drawDiagonalLines(this.linesCtx, "white", 5, 10, timeStamp * 0.008);
		}

		//restore cam transforms
		ctx.restore();

		if (!uglyMode) {
			this.linesCtx.restore();
			ctx.globalCompositeOperation = "multiply";
			// ctx.clearRect(0,0,mainCanvas.width, mainCanvas.height)
			ctx.drawImage(this.linesCanvas, 0, 0);
			ctx.globalCompositeOperation = "source-over";
		}
	}
	
	/** applies camShakeForces */
	calcCamOffset(deltaTime){
		this.camPosOffset = [0, 0];
		this.camRotOffset = 0;
		for (let i = this.camShakeForces.length - 1; i >= 0; i--) {
			const force = this.camShakeForces[i];
			force[2] += deltaTime * 0.003;
			const t = force[2];
			let t3 = 0, t2 = 0;
			if (t < 1) {
				t2 = ease.out(t);
				t3 = ease.inout(t);
			} else if (t < 8) {
				t2 = ease.inout(iLerp(8, 1, t));
				t3 = ease.in(iLerp(8, 1, t));
			} else {
				this.camShakeForces.splice(i, 1);
			}
			this.camPosOffset[0] += force[0] * t2;
			this.camPosOffset[1] += force[1] * t2;

			this.camPosOffset[0] += force[0] * Math.cos(t * 8) * 0.04 * t3;
			this.camPosOffset[1] += force[1] * Math.cos(t * 7) * 0.04 * t3;
			if (force[3]) {
				this.camRotOffset += Math.cos(t * 9) * 0.003 * t3;
			}
		}
		if(this.camPosOffset[0] != 0 && this.camPosOffset[1] != 0) console.log(this.camPosOffset);
		const limit = 80;
		this.camPosOffset[0] /= limit;
		this.camPosOffset[1] /= limit;
		this.camPosOffset[0] = smoothLimit(this.camPosOffset[0]);
		this.camPosOffset[1] = smoothLimit(this.camPosOffset[1]);
		this.camPosOffset[0] *= limit;
		this.camPosOffset[1] *= limit;
	}

	//shakes the camera but uses a dir (ranges from 0-3) as input
	doCamShakeDir(dir, amount, doRotate) { // BUG
		if (amount === undefined) {
			amount = 6;
		}
		if (doRotate === undefined) {
			doRotate = true;
		}
		let x = 0, y = 0;
		switch (dir) {
			case 0:
				x = amount;
				break;
			case 1:
				y = amount;
				break;
			case 2:
				x = -amount;
				break;
			case 3:
				y = -amount;
				break;
		}
		this.camShakeForces.push([x, y, 0, !!doRotate]);
	}

	/** display the ping information */
	display_ping(avg,last,diff){
		avg = avg ? Math.round(avg) : "";
		last = last ? Math.round(last) : "";
		diff = diff ? Math.round(diff) : "";
		const str = "avg:" + avg + " last:" + last + " diff:" + diff;
		this.ctx.font = "14px Arial, Helvetica, sans-serif";
		this.ctx.fillStyle = colors.red.brighter;
		const textWidth = this.ctx.measureText(str).width;
		this.ctx.fillText(str, this.canvas.width - textWidth - 10, this.canvas.height - 10);
	}

	move_camera(pos,deltaTime){
		if (this.camPosSet) {
			this.camPos[0] = lerpt(this.camPos[0], pos[0], 0.03, deltaTime);
			this.camPos[1] = lerpt(this.camPos[1], pos[1], 0.03, deltaTime);
		} else {
			this.camPos = [pos[0], pos[1]];
			this.camPosSet = true;
		}
	}
}

class SplixLogoCanvas extends SplixBaseCanvas {
	timer = -1;
	resetNextFrame = true;
	lastRender = 0;
	canvasTransformType = canvasTransformTypes.TITLE;
	w = 520;
	h = 180;
	constructor(canvas){
		super(canvas);
		for (const line of titleLines) {
			for (const subline of line.line) {
				for (let coordI = 0; coordI < subline.length; coordI += 2) {
					subline[coordI] += line.posOffset[0] - 40;
					subline[coordI + 1] += line.posOffset[1] - 20;
				}
			}
		}
	}

	get styleRatio(){
		return Math.min(1, (window.innerWidth - 30) / this.w)
	}
	
	/**
	 * draws main title
	 * @param {boolean} [isShadow]
	 * @param {number} [maxExtrude]
	 * @param {boolean} [extraShadow]
	 */
	drawTitle(isShadow, maxExtrude, extraShadow) {
		this.ctx.strokeStyle = (!!isShadow) ? colors.red.patternEdge : colors.red.brighter;
		this.ctx.lineWidth = 16;
		this.ctx.lineJoin = "round";
		this.ctx.lineCap = "round";

		if (extraShadow) {
			this.ctx.shadowBlur = 40 * MAX_PIXEL_RATIO;
			this.ctx.shadowColor = "rgba(0,0,0,0.4)";
			this.ctx.shadowOffsetX = this.ctx.shadowOffsetY = 10 * MAX_PIXEL_RATIO;
		} else {
			this.ctx.shadowColor = "rgba(0,0,0,0)";
		}

		const t = this.timer;
		for (const line of titleLines) {
			const lineT = clamp01(t * line.speed - line.offset);
			let extrude = clamp01(t) * 5;
			if (maxExtrude !== undefined) {
				extrude = Math.min(extrude, maxExtrude);
			}
			this.ctx.beginPath();
			for (let subLineI = 0; subLineI < line.line.length; subLineI++) {
				const subline = line.line[subLineI];
				const sublineT = clamp01(lineT * (line.line.length - 1) - subLineI + 1);
				if (sublineT > 0) {
					if (sublineT == 1) {
						if (subLineI === 0 && subline.length == 2) {
							this.ctx.moveTo(subline[0] - extrude, subline[1] - extrude);
						} else if (subline.length == 2) {
							this.ctx.lineTo(subline[0] - extrude, subline[1] - extrude);
						} else if (subline.length == 6) {
							this.ctx.bezierCurveTo(
								subline[0] - extrude,
								subline[1] - extrude,
								subline[2] - extrude,
								subline[3] - extrude,
								subline[4] - extrude,
								subline[5] - extrude,
							);
						}
					} else {
						const lastLine = line.line[subLineI - 1];
						const lastPos = [lastLine[lastLine.length - 2], lastLine[lastLine.length - 1]];
						if (subline.length == 2) {
							this.ctx.lineTo(
								lerp(lastPos[0], subline[0], sublineT) - extrude,
								lerp(lastPos[1], subline[1], sublineT) - extrude,
							);
						} else if (subline.length == 6) {
							const p0 = lastPos;
							const p1 = [subline[0], subline[1]];
							const p2 = [subline[2], subline[3]];
							const p3 = [subline[4], subline[5]];
							const p4 = lerpA(p0, p1, sublineT);
							const p5 = lerpA(p1, p2, sublineT);
							const p6 = lerpA(p2, p3, sublineT);
							const p7 = lerpA(p4, p5, sublineT);
							const p8 = lerpA(p5, p6, sublineT);
							const p9 = lerpA(p7, p8, sublineT);
							this.ctx.bezierCurveTo(
								p4[0] - extrude,
								p4[1] - extrude,
								p7[0] - extrude,
								p7[1] - extrude,
								p9[0] - extrude,
								p9[1] - extrude,
							);
						}
					}
				}
			}
			this.ctx.stroke();
		}
	}

	render(timeStamp){
		if (this.resetNextFrame) {
			this.resetNextFrame = false;
			this.timer = -1;
			this.lastRender = timeStamp;
		}
		this.timer += (timeStamp - this.lastRender) * 0.002;
		this.lastRender = timeStamp;

		this.setCanvasSize(true);
		this.ctx.reset();
		this.ctxApplyCamTransform(false, true);

		this.drawTitle(true, 0, true);
		this.drawTitle(true, 2.5);
		this.drawTitle();
		this.ctx.restore();
	}
}

class TransitionCanvas extends SplixBaseCanvas {
	/**@type {HTMLCanvasElement} */
	tempCanvas;
	/**@type {CanvasRenderingContext2D} */
	tempCtx;
	/**@type {canvasTransformTypes} */
	canvasTransformType = canvasTransformTypes.MAIN;
	/** @type {number} */
	timer = 0;
	/** @type {number} */
	prevTimer = 0;
	/** @type {number} */
	direction = 1;
	/** @type {(()=>void)?}*/
	callback1 = null;
	/** @type {(()=>void)?}*/
	callback2 = null;
	/** @type {boolean}*/
	reverseOnHalf = false;
	/** @type {string}*/
	text = "GAME OVER";
	constructor(canvas){
		super(canvas);
		this.tempCanvas = document.createElement("canvas");
		this.tempCtx = this.tempCanvas.getContext("2d");
	}

	render(deltaTime){
		let DARK_EDGE_SIZE = 10, TITLE_HEIGHT = 60, TITLE_DURATION = 2, TITLE_PADDING = 10, TEXT_EXTRUDE = 5;
		TITLE_HEIGHT *= MAX_PIXEL_RATIO;
		TEXT_EXTRUDE *= MAX_PIXEL_RATIO;
		this.timer += deltaTime * this.direction * 0.001;

		if (
			this.direction == 1 && this.callback1 !== null && this.timer >= 0.5 &&
			this.prevTimer < 0.5
		) {
			this.timer = 0.5;
			this.callback1();
		}

		if (
			this.direction == -1 && this.callback2 !== null && this.timer <= 0.5 &&
			this.prevTimer > 0.5
		) {
			this.timer = 0.5;
			this.callback2();
		}

		if (
			this.reverseOnHalf && this.direction == 1 && this.timer >= 1 + TITLE_DURATION &&
			this.prevTimer < 1 + TITLE_DURATION
		) {
			this.direction = -1;
			this.timer = 1;
		}

		this.prevTimer = this.timer;
		if (
			(this.timer <= 0 && this.reverseOnHalf) ||
			(this.timer >= TITLE_DURATION + 1.5 && !this.reverseOnHalf)
		) {
			this.direction = 0;
			isTransitioning = false;
			this.canvas.style.display = "none";
		} else {
			this.setCanvasSize(true);
			this.ctx.reset();

			const w = this.w, h = this.h;
			const t = this.timer;
			if (t < 0.5) {
				let t2 = t * 2;
				t2 = ease.in(t2);
				this.ctx.fillStyle = colors.green2.darker;
				this.ctx.fillRect(0, lerp(-DARK_EDGE_SIZE, h / 2, t2), w, DARK_EDGE_SIZE);
				this.ctx.fillStyle = colors.green2.brighter;
				this.ctx.fillRect(0, -DARK_EDGE_SIZE, w, lerp(0, h / 2 + DARK_EDGE_SIZE, t2));
				this.ctx.fillRect(0, lerp(h, h / 2, t2), w, h);
			} else if (t < 1) {
				let t2 = t * 2 - 1;
				t2 = ease.out(t2);
				if (this.text) {
					this.ctx.fillStyle = colors.green2.darker;
					this.ctx.fillRect(
						0,
						lerp(0, h / 2 - TITLE_HEIGHT / 2, t2),
						w,
						lerp(h, TITLE_HEIGHT + DARK_EDGE_SIZE, t2),
					);
					this.ctx.fillStyle = colors.green2.brighter;
					this.ctx.fillRect(0, lerp(0, h / 2 - TITLE_HEIGHT / 2, t2), w, lerp(h, TITLE_HEIGHT, t2));
				} else {
					this.ctx.fillStyle = colors.green2.darker;
					this.ctx.fillRect(0, lerp(0, h / 2, t2), w, lerp(h, DARK_EDGE_SIZE, t2));
					this.ctx.fillStyle = colors.green2.brighter;
					this.ctx.fillRect(0, lerp(0, h / 2, t2), w, lerp(h, 0, t2));
				}
			} else if (t < 1 + TITLE_DURATION) {
				if (this.text) {
					this.ctx.fillStyle = colors.green2.darker;
					this.ctx.fillRect(0, h / 2, w, TITLE_HEIGHT / 2 + DARK_EDGE_SIZE);
					this.ctx.fillStyle = colors.green2.brighter;
					this.ctx.fillRect(0, h / 2 - TITLE_HEIGHT / 2, w, TITLE_HEIGHT);
				} else {
					this.timer = TITLE_DURATION + 1.5;
				}
			} else if (t < TITLE_DURATION + 1.5) {
				let t2 = (t - TITLE_DURATION - 1) * 2;
				t2 = ease.in(t2);
				this.ctx.fillStyle = colors.green2.darker;
				this.ctx.fillRect(0, h / 2, w, lerp(TITLE_HEIGHT / 2 + DARK_EDGE_SIZE, DARK_EDGE_SIZE, t2));
				this.ctx.fillStyle = colors.green2.brighter;
				this.ctx.fillRect(0, lerp(h / 2 - TITLE_HEIGHT / 2, h / 2, t2), w, lerp(TITLE_HEIGHT, 0, t2));
			}

			if (t > 0.5 && t < 3.5) {
				const fontHeight = TITLE_HEIGHT - TITLE_PADDING * 2;
				this.ctx.font = fontHeight + "px Arial, Helvetica, sans-serif";
				const totalWidth = this.ctx.measureText(this.text).width;
				const x = w / 2 - totalWidth / 2 + TEXT_EXTRUDE / 2;
				const y = h / 2 + fontHeight * 0.37 + TEXT_EXTRUDE / 2;
				let t2;
				if (t < 1.1) {
					t2 = iLerp(0.5, 1.1, t);
				} else if (t < 2.9) {
					t2 = 1;
				} else {
					t2 = iLerp(3.5, 2.9, t);
				}
				this.drawAnimatedText(
					t2,
					x,
					y,
					fontHeight,
					"white",
					"Arial, Helvetica, sans-serif",
					TEXT_EXTRUDE,
					3,
					16842438,
				);
				// this.ctx.fillStyle = "white";
				// this.ctx.fillText(transitionText, x, y);
			}

			this.ctx.restore();
		}

		//skip death transition
		if (skipDeathTransition && this.text == "GAME OVER" && this.time > 1) {
			this.timer = 1.1;
			this.direction = -1;
			allowSkipDeathTransition = false;
			skipDeathTransition = false;
		}
	}

	 /** starts the transition
	  * @param {string} text
	  * @param {boolean} [reverseOnHalf] start playing backwords once it is showing the title
	  * @param {(()=>void)?} [callback1] fired once the transition is full screen for the first time
	  * @param {(()=>void)?} [callback2] fired when full screen for the second time, only shown when reverseOnHalf = true
	  * @param {boolean} [overrideExisting] */
	doTransition(text, reverseOnHalf, callback1, callback2, overrideExisting) {
		// console.log("doTransition()", text, reverseOnHalf, callback1, callback2, overrideExisting);
		// console.log("isTransitioning:",isTransitioning);
		if (!isTransitioning || overrideExisting) {
			this.text = text;
			isTransitioning = true;
			this.direction = 1;
			this.timer = this.prevTimer = 0;
			this.canvas.style.display = null;
			if (reverseOnHalf === undefined) {
				reverseOnHalf = false;
			}
			this.reverseOnHalf = reverseOnHalf;
			this.callback1 = callback1;
			this.callback2 = callback2;
		}
	}

	/**
	 * Draw and animate text on the transition canvas.
	 * @param {number} time 
	 * @param {number} x 
	 * @param {number} y 
	 * @param {number} fontHeight 
	 * @param {*} color 
	 * @param {string} font 
	 * @param {number} textExtrude 
	 * @param {number} charSpeed 
	 * @param {number} orderSeed 
	 */
	drawAnimatedText(time, x, y, fontHeight, color, font, textExtrude, charSpeed, orderSeed) {
		if (color === undefined) {
			color = "white";
		}
		this.ctx.fillStyle = color;
		if (font === undefined) {
			font = "Arial, Helvetica, sans-serif";
		}
		this.ctx.font = font = fontHeight + "px " + font;
		if (orderSeed === undefined) {
			orderSeed = 0;
		}
		let lastWidth = 0;
		for (let charI = 0; charI < this.text.length; charI++) {
			const rndOffset = rndSeed(charI + orderSeed);
			if (charSpeed === undefined) {
				charSpeed = 3;
			}
			const charT = time * charSpeed - (rndOffset * (charSpeed - rndOffset));
			const thisChar = this.text[charI];
			const charWidth = this.ctx.measureText(thisChar).width;
			const yMin = y - fontHeight * 0.77;
			if (charT < 0.8) {
				this.tempCanvas.width = charWidth;
				this.tempCanvas.height = fontHeight;
				this.tempCtx.font = font;
				this.tempCtx.fillStyle = "white";
				this.tempCtx.fillText(thisChar, 0, fontHeight * 0.77);
				if (charT < 0.4) {
					const t2 = charT / 0.4;
	
					this.tempCtx.beginPath();
					this.tempCtx.moveTo(0, lerp(fontHeight, 0, t2));
					this.tempCtx.lineTo(0, fontHeight);
					this.tempCtx.lineTo(lerp(0, charWidth, t2), fontHeight);
					this.tempCtx.closePath();
				} else {
					const t2 = charT / 0.4 - 1;
					this.tempCtx.moveTo(0, 0);
					this.tempCtx.lineTo(0, fontHeight);
					this.tempCtx.lineTo(charWidth, fontHeight);
					this.tempCtx.lineTo(charWidth, lerp(fontHeight, 0, t2));
					this.tempCtx.lineTo(lerp(0, charWidth, t2), 0);
				}
				this.tempCtx.globalCompositeOperation = "destination-in";
				this.tempCtx.fill();
				this.ctx.drawImage(this.tempCanvas, x + lastWidth, yMin);
			} else {
				const t2 = Math.min(1, charT * 5 - 4);
				const offset = t2 * textExtrude;
				this.ctx.fillStyle = colors.green2.darker;
				for (let i = 0; i < offset; i++) {
					this.ctx.fillText(thisChar, x + lastWidth - offset + i, y - offset + i);
				}
				this.ctx.fillStyle = "white";
				this.ctx.fillText(thisChar, x + lastWidth - offset, y - offset);
			}
			lastWidth += charWidth - 0.5;
		}
	}
}

class LifeCanvas extends SplixBaseCanvas {
	timer = 0;
	animDir = 0;
	isLife = true;
	canvasTransformType = canvasTransformTypes.LIFE;
	constructor(canvas){
		super(canvas);
	}
	render(dt, force) {
		if (this.animDir !== 0 || force) {
			this.timer += dt * this.animDir * 0.002;
			if (this.animDir == 1) {
				if (this.timer > 1) {
					this.timer = 1;
					this.afterAnimate();
				}
			} else {
				if (this.timer < 0) {
					this.timer = 0;
					this.afterAnimate();
				}
			}
			this.ctxApplyCamTransform(true, true);
			this.ctx.fillStyle = "rgba(0,0,0,0.3)";
			this.drawHeart(false, 15.7, 15.7);

			if (this.animDir == 1) {
				this.ctx.fillStyle = colors.red.darker;
				this.ctx.translate(30, 30);
				let s = this.timer;
				if (s < 0.8) {
					s = lerp(0, 1.2, ease.in(iLerp(0, 0.8, s)));
				} else {
					s = lerp(1.2, 1, ease.in(iLerp(0.8, 1, s)));
				}
				const r = (1 - s) * 0.5;
				this.ctx.rotate(r);
				this.ctx.scale(s, s);
				this.ctx.translate(-30, -30);
				this.drawHeart(false, 15.7, 15.7);
				this.ctx.fillStyle = colors.red.brighter;
				this.drawHeart(false, 14.3, 14.3);
				this.ctx.restore();
			} else {
				this.ctx.globalAlpha = this.timer;
				this.ctx.fillStyle = colors.red.darker;
				this.drawHeart(true, 15.7, 15.7);
				this.ctx.fillStyle = colors.red.brighter;
				this.drawHeart(true, 14.3, 14.3);
				this.ctx.restore();
			}
		}
	}
	/**
	 * Draw a heart.
	 * @param {boolean} useTimer 
	 * @param {number} xo x offset
	 * @param {number} yo y offset
	 */
	drawHeart(useTimer, xo, yo) {
		if (!useTimer || this.timer == 1) {
			this.ctx.beginPath();
			this.ctx.moveTo(15 + xo, 12 + yo);
			this.ctx.bezierCurveTo(15 + xo, 3 + yo, 27 + xo, 3 + yo, 27 + xo, 12 + yo);
			this.ctx.bezierCurveTo(27 + xo, 18 + yo, 15 + xo, 27 + yo, 15 + xo, 27 + yo);
			this.ctx.bezierCurveTo(15 + xo, 27 + yo, 3 + xo, 18 + yo, 3 + xo, 12 + yo);
			this.ctx.bezierCurveTo(3 + xo, 3 + yo, 15 + xo, 3 + yo, 15 + xo, 12 + yo);
			this.ctx.fill();
		} else {
			let txo, tyo; //time x/y offset
			const t = ease.out(1 - this.timer);

			txo = xo + t * 3;
			tyo = yo - t * 12;
			this.ctx.beginPath();
			this.ctx.moveTo(15 + txo, 16.5 + tyo);
			this.ctx.lineTo(15 + txo, 12 + tyo);
			this.ctx.bezierCurveTo(15 + txo, 8.1 + tyo, 17.4 + txo, 5.25 + tyo, 21 + txo, 5.25 + tyo);
			this.ctx.fill();

			txo = xo + t * 9;
			tyo = yo - t * 1.5;
			this.ctx.beginPath();
			this.ctx.moveTo(15 + txo, 16.5 + tyo);
			this.ctx.lineTo(21 + txo, 5.25 + tyo);
			this.ctx.bezierCurveTo(24 + txo, 5.25 + tyo, 27 + txo, 7.5 + tyo, 27 + txo, 12 + tyo);
			this.ctx.bezierCurveTo(27 + txo, 15.3 + tyo, 23.25 + txo, 19.35 + tyo, 23.1 + txo, 19.5 + tyo);
			this.ctx.fill();

			txo = xo + t * 6;
			tyo = yo + t * 9;
			this.ctx.beginPath();
			this.ctx.moveTo(15 + txo, 16.5 + tyo);
			this.ctx.lineTo(23.1 + txo, 19.5 + tyo);
			this.ctx.bezierCurveTo(23.1 + txo, 19.8 + tyo, 17.55 + txo, 25.11 + tyo, 17.1 + txo, 25.35 + tyo);
			this.ctx.fill();

			txo = xo - t * 1.5;
			tyo = yo + t * 9;
			this.ctx.beginPath();
			this.ctx.moveTo(15 + txo, 16.5 + tyo);
			this.ctx.lineTo(17.1 + txo, 25.35 + tyo);
			this.ctx.lineTo(15 + txo, 27 + tyo);
			this.ctx.bezierCurveTo(14.91 + txo, 27 + tyo, 10.5 + txo, 23.28 + tyo, 10.5 + txo, 23.16 + tyo);
			this.ctx.fill();

			txo = xo - t * 12;
			tyo = yo + t * 1.5;
			this.ctx.beginPath();
			this.ctx.moveTo(15 + txo, 16.5 + tyo);
			this.ctx.lineTo(10.5 + txo, 23.16 + tyo);
			this.ctx.bezierCurveTo(10.5 + txo, 23.16 + tyo, 3 + txo, 16.65 + tyo, 3 + txo, 12 + tyo);
			this.ctx.fill();

			txo = xo - t * 3;
			tyo = yo - t * 6;
			this.ctx.beginPath();
			this.ctx.moveTo(15 + txo, 16.5 + tyo);
			this.ctx.lineTo(3 + txo, 12 + tyo);
			this.ctx.bezierCurveTo(3 + txo, 3 + tyo, 15 + txo, 3 + tyo, 15 + txo, 12 + tyo);
			this.ctx.fill();
		}
	}
	afterAnimate(){
		this.animDir = 0;
		this.set(this.isLife);
	}
	set(isLife) {
		this.isLife = isLife;
		if (this.animDir === 0) {
			if (isLife) {
				if (this.timer < 1) {
					this.animDir = 1;
				}
			} else {
				if (this.timer > 0) {
					this.animDir = -1;
				}
			}
		}
	}
}

class TutorialCanvas extends SplixBaseCamera {
	/**@type {canvasTransformTypes} */ // TODO: this should be removed in the end
	canvasTransformType = canvasTransformTypes.TUTORIAL;
	/** @type {number} */
	timer = 0;
	/** @type {number} */
	prevTimer = 0;
	/** @type {Player} */
	p1;
	/** @type {Player} */
	p2;
	text;
	state = new SplixState();
	constructor(canvas,text){
		super(canvas);
		this.text = text;
		this.p1 = this.state.getPlayer(1);
		this.p1.skinBlock = 8;
		this.p1.hasReceivedPosition = true;
		this.p2 = this.state.getPlayer(2);
		this.p2.skinBlock = 0;
		this.p2.pos = [-2, 7];
		this.p2.hasReceivedPosition = true;
		for (let x = 0; x < 10; x++) {
			for (let y = 0; y < 10; y++) {
				const block = this.state.getBlock(x, y);
				let id = 1;
				if (x >= 1 && x <= 3 && y >= 1 && y <= 3) {
					id = 10;
				}
				block.setBlockId(id, false);
			}
		}
	}

	render(timeStamp,deltaTime){
		this.timer += deltaTime * GLOBAL_SPEED * 0.7;
		this.setCanvasSize();
		this.ctx.reset();
		if (!uglyMode) {
			this.setCanvasSize(undefined,this.linesCanvas);
			this.linesCtx.reset();

		}

		//BG
		this.ctx.fillStyle = colors.grey.BG;
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		if (!uglyMode) {
			this.linesCtx.fillStyle = "white";
			this.linesCtx.fillRect(0, 0, this.linesCanvas.width, this.linesCanvas.height);
		}

		//cam transforms
		this.ctxApplyCamTransform(undefined,undefined,this.ctx);
		if (!uglyMode) {
			this.ctxApplyCamTransform(undefined,undefined,this.linesCtx);
		}

		const t = this.timer;
		this.drawBlocks(deltaTime,this.state.blocks);

		//p1
		if (t < 10) {
			this.p1.pos = [2, 2];
		} else if (t < 15) {
			this.p1.pos = [t - 8, 2];
		} else if (t < 18) {
			this.p1.pos = [7, t - 13];
		} else if (t < 23) {
			this.p1.pos = [25 - t, 5];
		} else if (t < 26) {
			this.p1.pos = [2, 28 - t];
		} else if (t < 30) {
		} else if (t < 36) {
			this.p1.pos = [2, t - 28];
		} else if (t < 39) {
			this.p1.pos = [t - 34, 8];
		}

		//p1 trail
		if (t < 12) {
		} else if (t < 15) {
			this.p1.trails = [{
				trail: [[4, 2]],
				vanishTimer: 0,
			}];
		} else if (t < 18) {
			this.p1.trails = [{
				trail: [[4, 2], [7, 2]],
				vanishTimer: 0,
			}];
		} else if (t < 23) {
			this.p1.trails = [{
				trail: [[4, 2], [7, 2], [7, 5]],
				vanishTimer: 0,
			}];
		} else if (t < 24) {
			this.p1.trails = [{
				trail: [[4, 2], [7, 2], [7, 5], [2, 5]],
				vanishTimer: 0,
			}];
		}
		if (t > 24 && this.prevTimer < 24) {
			this.p1.trails = [{
				trail: [[4, 2], [7, 2], [7, 5], [2, 5], [2, 4]],
				vanishTimer: 0,
			}, {
				trail: [],
				vanishTimer: 0,
			}];
		}
		if (t < 34) {
		} else if (t < 36) {
			this.p1.trails = [{
				trail: [[2, 6]],
				vanishTimer: 0,
			}];
		} else if (t < 39) {
			this.p1.trails = [{
				trail: [[2, 6], [2, 8]],
				vanishTimer: 0,
			}];
		}

		//p2
		if (t < 34) {
		} else if (t < 50) {
			this.p2.pos = [t - 37, 7];
			this.p2.trails = [{
				trail: [[-2, 7]],
				vanishTimer: 0,
			}];
		}

		if (t > 25 && this.prevTimer < 25) {
			this.state.fillArea(2, 2, 6, 4, 10, 0);
		}
		if (t > 39 && this.prevTimer < 39) {
			this.p1.die(true);
			this.state.fillArea(1, 1, 7, 5, 1, 0);
			this.p2.addHitLine([2, 7]);
		}
		if (t > 50) {
			this.timer = this.prevTimer = 0;
			this.state.fillArea(1, 1, 3, 3, 10, 0);
			this.p1.isDeadTimer = 0;
			this.p1.isDead = false;
			this.p1.trails = [];
			this.p1.pos = [100, 100];
			this.p2.trails = [{
				trail: [[-2, 7], [12, 7]],
				vanishTimer: 0,
			}, {
				trail: [],
				vanishTimer: 0,
			}];
			this.p2.pos = this.p2.drawPos = [-2, 7];
		}

		//tutorial text
		if (t > 1 && this.prevTimer < 1) {
			this.text.innerHTML = "Close an area to fill it with your color.";
		}
		if (t > 30 && this.prevTimer < 30) {
			this.text.innerHTML = "Don't get hit by other players.";
		}
		const textOpacity = ( clamp01(5 - Math.abs((t - 20) * 0.5))
						  	+ clamp01(4 - Math.abs((t - 40) * 0.5)));
		this.text.style.opacity = clamp(textOpacity, 0, 0.9);

		this.p1.moveDrawPosToPos(deltaTime);
		this.p2.moveDrawPosToPos(deltaTime);
		this.ctx.globalAlpha = Math.min(1, Math.max(0, t * 0.3 - 1));

		this.drawPlayer(this.p1, timeStamp, deltaTime);
		this.drawPlayer(this.p2, timeStamp, deltaTime);
		this.ctx.globalAlpha = 1;
		this.prevTimer = t;

		//draw lines canvas
		if (!uglyMode) {
			this.drawDiagonalLines(this.linesCtx, "white", 5, 10, timeStamp * 0.008);
		}

		//restore cam transforms
		this.ctx.restore();

		if (!uglyMode) {
			this.linesCtx.restore();
			this.ctx.globalCompositeOperation = "multiply";
			this.ctx.drawImage(this.linesCanvas, 0, 0);
			this.ctx.globalCompositeOperation = "source-over";
		}
	}

	get h(){
		return 300;
	}

	get w(){
		return 300;
	}
}

class SkinButtonCanvas extends SplixBaseCamera {
	canvasTransformType = canvasTransformTypes.SKIN_BUTTON;
	block = new Block();
	shadow;
	constructor(canvas,shadow){
		super(canvas);
		let currentColor = localStorage.getItem("skinColor");
		if (currentColor === null) {
			currentColor = 0;
		} else {
			currentColor = parseInt(currentColor);
		}
		this.shadow = shadow;
		this.canvas.addEventListener('click', () => {
			if (!one_game && !isTransitioning && !playingAndReady) {
				transition_canvas.doTransition("", false, openSkinScreen);
			}
		});
		this.block.setBlockId(currentColor + 1, false);
		this.block.x = 0;
		this.block.y = 0;
		this.canvas.addEventListener('mouseover', () => {
			// TODO Live update skin color without needing to mouseover (listen to storage events)
			// this currently is just for animation purposes
			let currentColor = localStorage.getItem("skinColor");
			if (currentColor === null) {
				currentColor = 0;
			}
			currentColor = parseInt(currentColor);
			if (currentColor > 0) {
				this.block.setBlockId(currentColor + 1 + SKIN_BLOCK_COUNT, false);
			}
		});
		this.canvas.addEventListener('mouseout',() => {
			let currentColor = localStorage.getItem("skinColor");
			if (currentColor === null) {
				currentColor = 0;
			}
			this.block.setBlockId(parseInt(currentColor) + 1, false);
		});
	}
	
	render(deltaTime){
		this.ctxApplyCamTransform(true,true);
		this.drawBlocks(deltaTime,[this.block]);
		this.ctx.restore();
	}

}


class Minimap {
	/** @type {HTMLCanvasElement} */
	canvas;
	/** @type {CanvasRenderingContext2D} */
	ctx;
	/** @type {HTMLElement} */
	dot_elem;

	/** @type {SplixState} */
	state;
	/** @type {number?} */
	map_size;
	constructor(state,canvas,dot_elem){
		this.canvas = canvas;
		this.ctx = this.canvas.getContext("2d");
		this.dot_elem = dot_elem;
		this.state = state;
	}

	update_map(data){
		const part = data[1];
		const xOffset = part * 20;
		this.ctx.clearRect(xOffset * 2, 0, 40, 160);
		this.ctx.fillStyle = "#000000";
		for (let i = 1; i < data.length; i++) {
			for (let j = 0; j < 8; j++) {
				const filled = (data[i] & (1 << j)) !== 0;
				if (filled) {
					const bitNumber = (i - 2) * 8 + j;
					const x = Math.floor(bitNumber / 80) % 80 + xOffset;
					const y = bitNumber % 80;
					this.ctx.fillRect(x * 2, y * 2, 2, 2);
				}
			}
		}
	}

	update_size(map_size){
		this.map_size = map_size;
	}

	update_player(pos){

		this.dot_elem.style.left = (pos[0] / this.map_size * 160 + 1.5) + "px";
		this.dot_elem.style.top = (pos[1] / this.map_size * 160 + 1.5) + "px";
	}

	reset(){
		this.ctx.clearRect(0, 0, 160, 160);
	}

}


class SkinScreen extends SplixBaseCamera {
	canvasTransformType = canvasTransformTypes.SKIN;
	state = new SplixState();
	#visible = true;
	/** @type {HTMLElement} */
	container;
	constructor(canvas,container){
		super(canvas);
		this.container = container;
		let currentColor = localStorage.getItem("skinColor");
		if (currentColor === null) {
			currentColor = 0;
		}
		currentColor = parseInt(currentColor);

		let currentPattern = localStorage.getItem("skinPattern");
		if (currentPattern === null) {
			currentPattern = 0;
		}
		currentPattern = parseInt(currentPattern);
		this.state.fillArea(0, 0, VIEWPORT_RADIUS * 2, VIEWPORT_RADIUS * 2, currentColor + 1, currentPattern);

		//called when a skinbutton is pressed
		//add = -1 or 1 (increment/decrement)
		//type = 0 (color) or 1 (pattern)
		const skinButton = (add, type) => {
			if (type === 0) {
				let oldC = localStorage.getItem("skinColor");
				const hiddenCs = [];
				if (localStorage.patreonLastPledgedValue >= 300) {
					//access to patreon color
				} else {
					hiddenCs.push(13);
				}
				if (oldC === null) {
					oldC = 0;
				}
				oldC = parseInt(oldC);
				let cFound = false;
				while (!cFound) {
					oldC += add;
					oldC = mod(oldC, SKIN_BLOCK_COUNT + 1);
					if (hiddenCs.indexOf(oldC) < 0) {
						cFound = true;
					}
				}
				lsSet("skinColor", oldC);
			} else if (type == 1) {
				let oldP = localStorage.getItem("skinPattern");
				const hiddenPs = [18, 19, 20, 21, 23, 24, 25, 26];
				if (localStorage.patreonLastPledgedValue > 0) {
					//access to patreon pattern
				} else {
					hiddenPs.push(27);
				}
				if (oldP === null) {
					oldP = 0;
				}
				oldP = parseInt(oldP);
				let pFound = false;
				while (!pFound) {
					oldP += add;
					oldP = mod(oldP, SKIN_PATTERN_COUNT);
					if (hiddenPs.indexOf(oldP) < 0) {
						pFound = true;
					}
				}
				lsSet("skinPattern", oldP);
			}
			updateSkin();
		}
	
		document.getElementById("prevColor").addEventListener('click', () => {
			skinButton(-1, 0);
		});
		document.getElementById("nextColor").addEventListener('click', () => {
			skinButton(1, 0);
		});
		document.getElementById("prevPattern").addEventListener('click', () => {
			skinButton(-1, 1);
		});
		document.getElementById("nextPattern").addEventListener('click', () => {
			skinButton(1, 1);
		});
		document.getElementById("skinSave").addEventListener('click', () => {
			transition_canvas.doTransition("", false, showBeginHideSkin);
		});
	
	}

	render(deltaTime){
		this.ctxApplyCamTransform(true);
		this.ctx.clearRect(0,0,this.w,this.h);
		this.drawBlocks(deltaTime,this.state.blocks);
		this.ctx.restore();
	}

	show(){
		this.container.style.display = null;
		this.#visible = true;
	}

	hide(){
		this.container.style.display = "none";
		this.#visible = false;
	}

	get visible() {
		return this.#visible;
	}
}
//#endregion
class LifeBox {
	/**@type {LifeCanvas[]} */
	lives = [];
	box;

	constructor(){
		this.box = document.getElementById("lifeBox");
	}

	clearAllLives() {
		this.box.innerHTML = "";
		this.lives = [];
	}
	
	/** 
	 * @param {number} current
	 * @param {number} total
	 */
	setLives(current, total) {
		const oldLength = this.lives.length;
		for (let i = 0; i < total - oldLength; i++) {
			const el = document.createElement("canvas");
			el.style.margin = "-15px";
			const life = new LifeCanvas(el);
			this.box.appendChild(el);
			this.lives.push(life);
			life.render(0, true);
		}
		for (let i = oldLength - 1; i >= total; i--) {
			const life = this.lives[i];
			this.box.removeChild(life.node);
			this.lives.splice(i, 1);
		}
	
		for (let i = 0; i < this.lives.length; i++) {
			const life = this.lives[i];
			life.set(current > i);
		}
	}

	/**
	 * @param {number} dt
	 */
	renderAllLives(dt) {
		for (const life of this.lives) {
			life.render(dt);
		}
	}
}


class TopNotification {
	/** @type {string} */
	text;
	/** @type {HTMLElement} */
	elem = null;
	/** @type {number} */
	animationTimer = 0;
	/** @type {number} */
	animationDirection = 1;
	/** @type {Set<TopNotification>} */
	static current_notifications = new Set();
	/**
	 * @param {string} text 
	 * @param {TopNotification} manager 
	 */
	constructor(text){
		this.text = text;
		const el = document.createElement("div");
		this.elem = el;
		el.innerHTML = this.text;
		el.classList.add("topNotification", "greenBox");
		el.style.visibility = "hidden";
		document.getElementById("topNotifications").appendChild(el);
		const c = getColorForBlockSkinId(game_state.my_player?.skinBlock ?? 9);
		const mainColor = c.brighter;
		const edgeColor = c.darker;
		colorBox(el, mainColor, edgeColor);
		TopNotification.current_notifications.add(this);
	}

	static update_all(deltaTime) {
		for (const n of TopNotification.current_notifications) {
			n.update(deltaTime);
		}
	}

	static reset_all(){
		for(const n of TopNotification.current_notifications){
			n.destroy();
		}
		TopNotification.current_notifications.clear();
	}

	update(deltaTime){
		this.animationTimer += deltaTime * 0.001 * this.animationDirection;
		const hiddenPos = -this.elem.offsetHeight - 10;
		const topPos = lerp(hiddenPos, 10, ease.out(clamp01(this.animationTimer)));
		this.elem.style.top = topPos + "px";
		this.elem.style.visibility = null;
		//if return true, destroy notification object
		if (this.animationDirection == -1 && this.animationTimer < 0) {
			this.destroy();
		}
	}

	animateOut() {
		this.animationDirection = -1;
		if (this.animationTimer > 1) {
			this.animationTimer = 1;
		}
	}

	destroy() {
		this.elem.parentElement.removeChild(this.elem);
		TopNotification.current_notifications.delete(this);
	}
}

class LeftStats {

	blocks_target = 25;
	blocks = 25;
	score_target = 25;
	score = 25;
	/**
	 * Handles the bottom left stats.
	 * @param {HTMLElement} blocks 
	 * @param {HTMLElement} kills 
	 * @param {HTMLElement} score 
	 * @param {HTMLElement} rank 
	 * @param {HTMLElement} total 
	 */
	constructor(kills, blocks, score, rank, total){
		this.ui = {
			blocks,
			kills,
			score,
			rank,
			total,
		}
		this.score_target;
	};

	reset(){
		this.blocks = this.blocks_target = this.score = this.score_target = 25;
	}

	render(deltaTime){
		this.score = lerpt(this.score, this.score_target, 0.1, deltaTime);
		this.ui.score.innerText = Math.round(this.score);
		this.blocks = lerpt(this.blocks, this.blocks_target, 0.1, deltaTime);
		this.ui.blocks.innerText = Math.round(this.blocks);
	}

	rank_update(rank,total){
		this.ui.rank.innerText = rank;
		this.ui.total.innerText = total;
	}

	score_update(kills,blocks){
		this.blocks_target = blocks;
		this.score_target = blocks + kills * 500;
		this.ui.kills.innerText = kills;
	}
}

class Leaderboard {
	/**
	 * @type {HTMLTableSectionElement}
	 */
	body;
	/**
	 * @type {HTMLElement}
	 */
	container;
	/**
	 * The in game leaderboard.
	 * @param {HTMLElement} container 
	 */
	constructor(container) {
		this.body = document.createElement("tbody");
		const table = document.createElement("table");
		table.appendChild(this.body);
		this.container = container;
		this.container.appendChild(table);
	}

	update(records){
		let rows = [];
		for(const {rank, name, score} of records) {
			//create table row
			const tr = document.createElement("tr");
			tr.className = "scoreRank";
			const rankElem = document.createElement("td");
			rankElem.innerHTML = "#" + rank;
			tr.appendChild(rankElem);
			const nameElem = document.createElement("td");
			nameElem.innerHTML = filter(htmlEscape(name));
			tr.appendChild(nameElem);
			const scoreElem = document.createElement("td");
			scoreElem.innerHTML = score;
			tr.appendChild(scoreElem);
			rows.push(tr);
		}
		this.body.replaceChildren(...rows);
	}

	set_visibility(visibility) {
		this.container.style.display = visibility ? "none" : null;
	}
}

class QualityUI {
	/** @type {HTMLElement} */
	element;

	constructor(element){
		this.element = element;
		element.addEventListener('click',()=>this.toggle());
		this.set();
	}
	set(){
		if (localStorage.getItem("quality") === null) {
			lsSet("quality", "1");
		}
		if (localStorage.quality != "auto") {
			canvasQuality = parseFloat(localStorage.quality);
			this.element.innerHTML = "Quality: " + {
				"0.4": "low",
				"0.7": "medium",
				"1": "high",
			}[localStorage.quality];
		} else {
			this.element.innerHTML = "Quality: auto";
		}
	}

	toggle(){
		switch (localStorage.quality) {
			case "auto":
				lsSet("quality", "0.4");
				break;
			case "0.4":
				lsSet("quality", "0.7");
				break;
			case "0.7":
				lsSet("quality", "1");
				break;
			case "1":
				lsSet("quality", "auto");
				break;
		}
		this.set();
	}
}

class UglyUI {
	element;
	constructor(element){
		this.element = element;
		element.addEventListener('click',()=>this.toggle());
		this.set();
	}
	set(){
		updateUglyMode();
		const onOff = uglyMode ? "on" : "off";
		this.element.innerHTML = "Ugly mode: " + onOff;
	}

	toggle(){
		window.hc.flags.toggle('uglyMode');
	}
}

class InputHanlder {

	/** @type {OneGame} */
	game;

	//Honk
	honkStartTime = undefined;
	lastHonkTime = 0;
	
	//Mouse/Pointer
	lastMousePos = [0, 0];
	mouseHidePos = [0, 0];

	// Touch stuffs
	current_touches = new Map();
	/** @type {HTMLElement} */
	touchcontrol_elem;

	// Keyboard
	pressed_keys = [];

	// Game pad
	current_gamepad;
	current_gamepad_map = {
		buttonMap: {
			0: 0,
			1: 1,
			2: 2,
			3: 3,
			4: 4,
			5: 5,
			6: 6,
			7: 7,
			8: 8,
			9: 9,
			10: 10,
			11: 11,
			12: 12,
			13: 13,
			14: 14,
			15: 15,
		},
		axesMap: { 0: 0, 1: 1, 2: 2, 3: 3 },
	};
	gamepad_is_honking = false;
	
	constructor(state,touchcontrol_elem){
		this.state = state;
		//Blur
		window.addEventListener("blur", function (event) {
			this.pressedKeys = [];
		}, false);

		// Mouse/pointer
		window.addEventListener("click", showCursor);
		window.addEventListener("mousemove", (e) => {
			this.lastMousePos = [e.screenX, e.screenY];
			const distX = this.lastMousePos[0] - this.mouseHidePos[0];
			const distY = this.lastMousePos[1] - this.mouseHidePos[1];
			const dist = Math.sqrt(Math.pow(distX, 2) + Math.pow(distY, 2));
			if (dist > 15) {
				showCursor();
			}
		});
		window.addEventListener("contextmenu", e => {
			if (e.target.nodeName.toLowerCase() == "embed") {
				return true;
			} else {
				e.preventDefault();
				return false;
			}
		});

		// Swipe events
		this.touchcontrol_elem = touchcontrol_elem;
		touchcontrol_elem.addEventListener('touchstart', e => {
			let touch = e.touches[e.touches.length - 1];
			this.current_touches.set(touch.identifier,{
				prevPos: [touch.pageX, touch.pageY],
				prevTime: Date.now(),
				id: touch.identifier,
			});
		});
		touchcontrol_elem.addEventListener('touchmove', e => {
			for (const touch of e.touches) {
				const currentTouch = this.current_touches.get(touch.identifier);
				if (currentTouch) {
					this.game.sendDir(calcTouch(currentTouch, touch));
				}
			}
			e.preventDefault();
		});
		const touch_end = e => {
			for (const touch of e.touches) {
				const  current_touch = this.current_touches.get(touch.identifier);
				if(current_touch){
					this.game.sendDir(calcTouch(current_touch, touch));
					this.current_touches.delete(current_touch.id);
				}
			}
		};
		touchcontrol_elem.addEventListener('touchend', touch_end);
		touchcontrol_elem.addEventListener('touchcancel', touch_end);
	}

	honkStart() {
		if(this.honkStartTime === undefined){
			this.honkStartTime = Date.now();
		}
	}

	honkEnd() {
		const now = Date.now();
		if (now > this.lastHonkTime && this.honkStartTime !== undefined) {
			let time = now - this.honkStartTime;
			time = clamp(time, 0, 1000);
			this.lastHonkTime = now + time;
			this.honkStartTime = undefined;
			time = iLerp(0, 1000, time);
			time *= 255;
			time = Math.floor(time);
			time = Math.max(time,70);
			one_game.honk(time);
		}
	}

	parse_gamepads(){
		if ("getGamepads" in navigator) {
			const gamepads = navigator.getGamepads();
			let honkButtonPressedAnyPad = false;
			for (let i = 0; i < gamepads.length; i++) {
				this.current_gamepad = gamepads[i];
				if (this.current_gamepad !== undefined && this.current_gamepad !== null) {
					let validGamepad = false;
					if (this.current_gamepad.mapping == "standard") {
						this.current_gamepad_map = {
							buttonMap: {
								0: 0,
								1: 1,
								2: 2,
								3: 3,
								4: 4,
								5: 5,
								6: 6,
								7: 7,
								8: 8,
								9: 9,
								10: 10,
								11: 11,
								12: 12,
								13: 13,
								14: 14,
								15: 15,
							},
							axesMap: { 0: 0, 1: 1, 2: 2, 3: 3 },
						};
						validGamepad = true;
					} else {
						for (const custom_mapping of custom_gamepad_mappings) {
							if (this.current_gamepad.id.indexOf(custom_mapping.name) >= 0) {
								validGamepad = true;
								this.current_gamepad_map = custom_mapping;
							}
						}
					}
					if (validGamepad) {
						if (this.get_current_gamepad_button(12)) { //up
							this.game.sendDir(3);
						}
						if (this.get_current_gamepad_button(13)) { //down
							this.game.sendDir(1);
						}
						if (this.get_current_gamepad_button(14)) { //left
							this.game.sendDir(2);
						}
						if (this.get_current_gamepad_button(15)) { //right
							this.game.sendDir(0);
						}
						if (this.get_current_gamepad_button(0)) { // X / A
							honkButtonPressedAnyPad = true;
						}
						if (this.get_current_gamepad_button(1)) { // O / B
							doSkipDeathTransition();
						}
						if (this.get_current_gamepad_button(9)) { // pause
							this.game.sendDir(4);
						}
						if (this.get_current_gamepad_axis(0) < -0.9 || this.get_current_gamepad_axis(2) < -0.9) { //left
							this.game.sendDir(2);
						}
						if (this.get_current_gamepad_axis(0) > 0.9 || this.get_current_gamepad_axis(2) > 0.9) { //right
							this.game.sendDir(0);
						}
						if (this.get_current_gamepad_axis(1) < -0.9 || this.get_current_gamepad_axis(3) < -0.9) { //up
							this.game.sendDir(3);
						}
						if (this.get_current_gamepad_axis(1) > 0.9 || this.get_current_gamepad_axis(3) > 0.9) { //down
							this.game.sendDir(1);
						}
					}
				}
			}
	
			if (honkButtonPressedAnyPad) { // X / A
				if (beginScreenVisible) {
					connectWithTransition();
				} else if (!this.gamepad_is_honking) {
					this.gamepad_is_honking = true;
					input_handler.honkStart();
				}
			} else {
				if (this.gamepad_is_honking) {
					this.gamepad_is_honking = false;
					input_handler.honkEnd();
				}
			}
		}
	}

	get_current_gamepad_button(id){
		if (this.current_gamepad) {
			if (this.current_gamepad.buttons) {
				const button = this.current_gamepad.buttons[this.current_gamepad_map.buttonMap[id]];
				if (button) {
					return button.pressed;
				}
			}
		}
		return false;
	}

	get_current_gamepad_axis(id){
		if (this.current_gamepad) {
			if (this.current_gamepad.axes) {
				const axis = this.current_gamepad.axes[this.current_gamepad_map.axesMap[id]];
				if (axis !== undefined) {
					return axis;
				}
			}
		}
		return 0;
	}
}

//#region Main loop
class RenderingLoop {
	prevTimeStamp = null;
	currentDtCap = 0;
	totalDeltaTimeFromCap = 0;
	deltaTime = 16.66;
	lerpedDeltaTime = 16.66;
	missedFrames = [];
	gainedFrames = [];
	constructor(){}
	loop(timeStamp) {
		if(timeStamp - debugging.time_start > 500) {
			debugging.time_start = timeStamp;
			debugging.frames = 0;
		}

		const realDeltaTime = timeStamp - this.prevTimeStamp;
		if (realDeltaTime > this.lerpedDeltaTime) {
			this.lerpedDeltaTime = realDeltaTime;
		} else {
			this.lerpedDeltaTime = lerpt(this.lerpedDeltaTime, realDeltaTime, 0.05, this.deltaTime);
		}

		if (localStorage.quality == "auto" || localStorage.getItem("quality") === null) {
			if (this.lerpedDeltaTime > 33) {
				canvasQuality -= 0.01;
			} else if (this.lerpedDeltaTime < 28) {
				canvasQuality += 0.01;
			}
			canvasQuality = Math.min(1, Math.max(0.4, canvasQuality));
		}

		if (realDeltaTime < lerp(getDtCap(this.currentDtCap), getDtCap(this.currentDtCap - 1), 0.9)) {
			this.gainedFrames.push(Date.now());
			while (this.gainedFrames.length > 190) {
				if (Date.now() - this.gainedFrames[0] > 10000) {
					this.gainedFrames.splice(0, 1);
				} else {
					this.currentDtCap--;
					this.gainedFrames = [];
					this.currentDtCap = clamp(this.currentDtCap, 0, dtCaps.length - 1);
					break;
				}
			}
		}

		if (realDeltaTime > lerp(getDtCap(this.currentDtCap), getDtCap(this.currentDtCap + 1), 0.05)) {
			this.missedFrames.push(Date.now());
			this.gainedFrames = [];
			while (this.missedFrames.length > 5) {
				if (Date.now() - this.missedFrames[0] > 5000) {
					this.missedFrames.splice(0, 1);
				} else {
					this.currentDtCap++;
					this.missedFrames = [];
					this.currentDtCap = clamp(this.currentDtCap, 0, dtCaps.length - 1);
					break;
				}
			}
		}

		this.deltaTime = realDeltaTime + this.totalDeltaTimeFromCap;
		this.prevTimeStamp = timeStamp;
		if (this.deltaTime < getDtCap(this.currentDtCap) && localStorage.dontCapFps != "true") {
			this.totalDeltaTimeFromCap += realDeltaTime;
		} else {
			this.totalDeltaTimeFromCap = 0;
			//main canvas
			if(playingAndReady){
				one_game.update(this.deltaTime);
				main_canvas.render(timeStamp,this.deltaTime);
				//debug info (red ping stats)
				if (localStorage.drawDebug == "true" && one_game) {
						main_canvas.display_ping(...one_game.get_ping_info());
				}
			}
			//corner stats
			left_stats.render(this.deltaTime);

			//transition canvas
			if (isTransitioning) {
				transition_canvas.render(this.deltaTime);
			}

			//lives
			life_box.renderAllLives(this.deltaTime);

			//top notification
			TopNotification.update_all(this.deltaTime)

			//title
			if (beginScreenVisible && timeStamp - title_canvas.lastRender > 49) {
				title_canvas.render(timeStamp);
			}

			//tutorial canvas
			if (beginScreenVisible) {
				tutorial.render(timeStamp,this.deltaTime);
			}

			//skin button
			if (beginScreenVisible) {
				skin_button.render(this.deltaTime);
			}

			//skin screen canvas
			if (skin_screen.visible) {
				skin_screen.render(this.deltaTime);
			}

			//lastStats
			if (beginScreenVisible) {
				lastStatTimer += this.deltaTime;
				const t = lastStatTimer / 2000;
				if (t > 1) {
					lastStatTimer = 0;
					lastStatCounter++;
					if (lastStatCounter > 5) {
						lastStatCounter = 0;
					}

					if (lastStatCounter === 0) {
						if (last_stat.no1_time <= 0 && best_stat.no1_time <= 0) {
							lastStatCounter++;
						} else {
							lastStatValueElem.innerHTML = parseTimeToString(last_stat.no1_time) + " on #1";
							bestStatValueElem.innerHTML = parseTimeToString(best_stat.no1_time) + " on #1";
						}
					}
					if (lastStatCounter == 1) {
						if (last_stat_killer === "" && last_stat_killer.replace(/\s/g, "").length > 0) {
							lastStatCounter++;
						} else {
							lastStatValueElem.innerHTML = "killed by " + filter(htmlEscape(last_stat_killer));
							bestStatValueElem.innerHTML = "";
						}
					}
					if (lastStatCounter == 2) {
						if (last_stat.kills <= 0 && best_stat.kills <= 0) {
							lastStatCounter++;
						} else {
							const killsS = last_stat.kills == 1 ? "" : "s";
							lastStatValueElem.innerHTML = last_stat.kills + " player" + killsS + " killed";
							const killsS2 = best_stat.kills == 1 ? "" : "s";
							bestStatValueElem.innerHTML = best_stat.kills + " player" + killsS2 + " killed";
						}
					}
					if (lastStatCounter == 3) {
						lastStatValueElem.innerHTML = parseTimeToString(last_stat.alive) + " alive";
						bestStatValueElem.innerHTML =
							parseTimeToString(Math.max(last_stat.alive, localStorage.getItem("bestStatAlive"))) + " alive";
					}
					if (lastStatCounter == 4) {
						if (last_stat.blocks <= 0 && best_stat.blocks <= 0) {
							lastStatCounter++;
						} else {
							const blockS = last_stat.blocks == 1 ? "" : "s";
							lastStatValueElem.innerHTML = last_stat.blocks + " block" + blockS + " captured";
							const blockS2 = best_stat.blocks == 1 ? "" : "s";
							bestStatValueElem.innerHTML = best_stat.blocks + " block" + blockS2 + " captured";
						}
					}
					if (lastStatCounter == 5) {
						if (last_stat.leaderboard_rank <= 0 && best_stat.leaderboard_rank <= 0) {
							lastStatCounter = 0;
						} else {
							lastStatValueElem.innerHTML = last_stat.leaderboard_rank == 0 ? "" : "#" + last_stat.leaderboard_rank + " highest rank";
							bestStatValueElem.innerHTML = best_stat.leaderboard_rank == 0 ? "" : "#" + best_stat.leaderboard_rank + " highest rank";
						}
					}
				}
				const speed = 5;
				lastStatValueElem.style.opacity = bestStatValueElem.style.opacity = speed - Math.abs((t - 0.5) * speed * 2);
			}

			if (beginScreenVisible) {
				if (Date.now() - lastNameChangeCheck > 1000) {
					if (lastNameValue != nameInput.value) {
						nameInputOnChange();
						lastNameValue = nameInput.value;
					}
					lastNameChangeCheck = Date.now();
				}
			}



			//ping overload test
			// if(Date.now() - lastPingOverloadTestTime > 10000){
			// 	lastPingOverloadTestTime = Date.now();
			// 	if(pingOverLoadWs !== null && pingOverLoadWs.readyState == WebSocket.OPEN){
			// 		pingOverLoadWs.close();
			// 	}
			// 	pingOverLoadWs = new WebSocket("ws://37.139.24.137:7999/overloadTest");
			// 	pingOverLoadWs.onopen = function(){
			// 		pingOverLoadWs.send(new Uint8Array([0]));
			// 	};
			// }
		}

		// if my position confirmation took too long
		const clientSideSetPosPassed = Date.now() - lastMyPosSetClientSideTime;
		const clientSideValidSetPosPassed = Date.now() - lastMyPosSetValidClientSideTime;
		const serverSideSetPosPassed = Date.now() - lastMyPosServerSideTime;
		// console.log(clientSideSetPosPassed, clientSideValidSetPosPassed, serverSideSetPosPassed);
		if (
			clientSideValidSetPosPassed > WAIT_FOR_DISCONNECTED_MS &&
			serverSideSetPosPassed - clientSideSetPosPassed > WAIT_FOR_DISCONNECTED_MS && !game_state.my_player.isDead
		) {
			if (!connectionLostNotification) {
				connectionLostNotification = new TopNotification(
					"It seems like you're disconnected. Please check your connection.",
				);
			}
		} else {
			if (connectionLostNotification) {
				connectionLostNotification.animateOut();
				connectionLostNotification = null;
			}
		}

		// if(window.innerWidth != prevWindowWidth || window.innerHeight != prevWindowHeight){
		// 	prevWindowWidth = window.innerWidth;
		// 	prevWindowHeight = window.innerHeight;
		// 	onResize(prevWindowWidth, prevWindowHeight);
		// }

		input_handler.parse_gamepads();

		window.requestAnimationFrame((timeStamp)=>{this.loop(timeStamp)});
	}
}
//#endregion

class Block {
	currentBlock = -1;
	nextBlock =  -1;
	animDirection =  0;
	animProgress =  0;
	animDelay =  0;
	lastSetTime= Date.now();
	constructor(x,y){
		this.x = x;
		this.y = y;
	}
	//changes the blockId with optional animatino
	//animateDelay defaults to 0
	//if animateDelay === false, don't do any animation at all
	setBlockId(blockId, animateDelay) {
		this.lastSetTime = Date.now();
		if (animateDelay === false) {
			this.currentBlock = this.nextBlock = blockId;
			this.animDirection = 0;
			this.animProgress = 1;
		} else {
			if (animateDelay === undefined) {
				animateDelay = 0;
			}
			this.animDelay = animateDelay;

			const isCurrentBlock = blockId == this.currentBlock;
			const isNextBlock = blockId == this.nextBlock;

			if (isCurrentBlock && isNextBlock) {
				if (this.animDirection == -1) {
					this.animDirection = 1;
				}
			}

			if (isCurrentBlock && !isNextBlock) {
				this.animDirection = 1;
				this.nextBlock = this.currentBlock;
			}

			if (!isCurrentBlock && isNextBlock) {
				if (this.animDirection == 1) {
					this.animDirection = -1;
				}
			}

			if (!isCurrentBlock && !isNextBlock) {
				this.nextBlock = blockId;
				this.animDirection = -1;
			}
		}
	}
}

class SplixState {
	/** @type {Map<Vec2, Block>} */
	blocks = new Map();
	/** @type {Map<number, Player>} */
	players = new Map();
	/** @type {Player?} */
	my_player = null;
	/** @type {number} */
	map_size = 2000;
	/** @type {number} */
	total_players = 0;

	reset(){
		this.blocks = new Map();
		this.players = new Map();
		this.my_player.mydata.reset();
		this.total_players = 0;
	}
	/**
	 * Gets the block at the (x,y) coordinates. If it does not exist, one
	 * will be created.
	 * @param {number} x
	 * @param {number} y
	 * @returns {Block}
	 */
	getBlock(x, y) {
		const hash = SplixState.hash_vec2(x,y);
		if(this.blocks.has(hash)){
			return this.blocks.get(hash);
		} else {
			const block = new Block(x,y);
			this.blocks.set(hash, block);
			return block;
		}
	}

	static hash_vec2(x,y){
		return x*1_000_000+y;
	}

	//fills an area, if array is not specified it defaults to blocks[]
	fillArea(x, y, w, h, type, pattern, isEdgeChunk = false) {
		if (pattern === undefined) {
			pattern = 0;
		}

		let x2 = x + w;
		let y2 = y + h;
		if (this?.my_player?.mydata?.myPos) {
			x = Math.max(x, Math.round(this.my_player.mydata.myPos[0]) - VIEWPORT_RADIUS);
			y = Math.max(y, Math.round(this.my_player.mydata.myPos[1]) - VIEWPORT_RADIUS);
			x2 = Math.min(x2, Math.round(this.my_player.mydata.myPos[0]) + VIEWPORT_RADIUS);
			y2 = Math.min(y2, Math.round(this.my_player.mydata.myPos[1]) + VIEWPORT_RADIUS);
		}

		for (let i = x; i < x2; i++) {
			for (let j = y; j < y2; j++) {
				const block = this.getBlock(i,j);
				const thisType = applyPattern(type, pattern, i, j);
				block.setBlockId(thisType, isEdgeChunk ? false : Math.random() * 400);
			}
		}
	}

	/** remove blocks that are too far away from the camera and are likely
	 * to be seen without an updated state
	 * @param {Vec2} pos
	 */
	removeBlocksOutsideViewport(pos) {
		for(const [hash,block] of this.blocks){
			if (
				block.x < pos[0] - VIEWPORT_RADIUS * 2 ||
				block.x > pos[0] + VIEWPORT_RADIUS * 2 ||
				block.y < pos[1] - VIEWPORT_RADIUS * 2 ||
				block.y > pos[1] + VIEWPORT_RADIUS * 2
			) {
				this.blocks.delete(hash);
			}
		}
	}


	/**
	 * Gets the player at the (x,y) coordinates. If it does not exist, one
	 * will be created.
	 * @param {number} id
	 * @returns {Player}
	 */
	getPlayer(id) {
		if(this.players.has(id)){
			return this.players.get(id);
		} else {
			const player = new Player(id);
			this.players.set(id, player);
			if(id === 0){
				this.my_player = player;
			}
			return player;
		}
	}

	update(deltaTime){
		for (const player of this.players.values()) {
			player.update(deltaTime,this.map_size);
		}
	}
}

class Player extends EventTarget {
	constructor(id){
		super();
		this.id = id;
		this.pos = [0,0];
		this.drawPos = [-1,-1];
		this.drawPosSet = false;
		this.dir= 0;
		this.mydata= id === 0 ? new MyPlayerData() : null;
		this.isDead= false;
		this.deathWasCertain= false;
		this.didUncertainDeathLastTick= false;
		this.isDeadTimer= 0;
		this.uncertainDeathPosition= [0, 0];
		this.deadAnimParts= [];
		this.deadAnimPartsRandDist= [];
		this.hitLines= [];
		this.moveRelativeToServerPosNextFrame= false; //if true, lastServerPosSentTime will be used instead of deltatime for one frame
		this.lastServerPosSentTime= 0;
		this.honkTimer= 0;
		this.honkMaxTime= 0;
		this.trails= [];
		this.name= "";
		this.skinBlock= 0;
		this.hasReceivedPosition= false;
	}

	die(deathWasCertain) {
		deathWasCertain = !!deathWasCertain;
		if (this.isDead) {
			this.deathWasCertain = deathWasCertain || this.deathWasCertain;
		} else {
			if (deathWasCertain || !this.didUncertainDeathLastTick) {
				if (!deathWasCertain) {
					this.didUncertainDeathLastTick = true;
					this.uncertainDeathPosition = [this.pos[0], this.pos[1]];
				}
				this.isDead = true;
				this.deathWasCertain = deathWasCertain;
				this.deadAnimParts = [0];
				this.isDeadTimer = 0;
				if (this.mydata) {
					main_canvas.doCamShakeDir(this.dir);
				}
				let prev = 0;
				while (true) {
					prev += Math.random() * 0.4 + 0.5;
					if (prev >= Math.PI * 2) {
						this.deadAnimParts.push(Math.PI * 2);
						break;
					}
					this.deadAnimParts.push(prev);
					this.deadAnimPartsRandDist.push(Math.random());
				}
			}
		}
	}
	undoDie() {
			this.isDead = false;
	}
	addHitLine(pos, color) {
		this.hitLines.push({
			pos: pos,
			vanishTimer: 0,
			color: color,
		});
	}
	doHonk(time) {
		this.honkTimer = 0;
		this.honkMaxTime = time;
		this.dispatchEvent(new CustomEvent('honk', {detail: time}));
		if (this.name.toLowerCase() == "joris") {
			honkSfx.play();
		}
	}
	//moves (lerp) drawPos to the actual player position
	moveDrawPosToPos(deltaTime){
		let target;
		if (this.isDead && !this.deathWasCertain) {
			target = this.uncertainDeathPosition;
		} else {
			target = this.pos;
		}
		this.drawPos[0] = lerpt(this.drawPos[0], target[0], 0.23, deltaTime);
		this.drawPos[1] = lerpt(this.drawPos[1], target[1], 0.23, deltaTime);
	}

	update(deltaTime,map_size){
		let offset = deltaTime * GLOBAL_SPEED;
		//move player
		if (!this.isDead || !this.deathWasCertain) {
			if (this.moveRelativeToServerPosNextFrame) {
				offset = (Date.now() - this.lastServerPosSentTime) * GLOBAL_SPEED;
			}
			if (this.mydata) {
				movePos(this.mydata.serverPos, this.mydata.serverDir, offset);
				if (this.mydata.serverDir == this.dir) {
					let clientServerDist = 0;
					if (localStorage.dontSlowPlayersDown != "true") {
						if (this.dir === 0 || this.dir == 2) { //left or right
							if (this.pos.y == this.mydata.serverPos.y) {
								if (this.dir === 0) { //right
									clientServerDist = this.pos[0] - this.mydata.serverPos[0];
								} else { //left
									clientServerDist = this.mydata.serverPos[0] - this.pos[0];
								}
							}
						} else { //up or down
							if (this.pos.x == this.mydata.serverPos.x) {
								if (this.dir == 1) { //down
									clientServerDist = this.pos[1] - this.mydata.serverPos[1];
								} else { //up
									clientServerDist = this.mydata.serverPos[1] - this.pos[1];
								}
							}
						}
					}
					clientServerDist = Math.max(0, clientServerDist);
					offset *= lerp(0.5, 1, iLerp(5, 0, clientServerDist));
				}
			}
			movePos(this.pos, this.dir, offset);
		}
		this.moveRelativeToServerPosNextFrame = false;

		this.moveDrawPosToPos(deltaTime);

		//test if player should be dead
		let playerShouldBeDead = false;
		if (
			this.drawPos[0] <= 0 || this.drawPos[1] <= 0 || this.drawPos[0] >= map_size - 1 ||
			this.drawPos[1] >= map_size - 1
		) {
			playerShouldBeDead = true;
		} else if (this.trails.length > 0) {
			const lastTrail = this.trails[this.trails.length - 1].trail;
			const roundedPos = [Math.round(this.drawPos[0]), Math.round(this.drawPos[1])];
			if (
				Math.abs(roundedPos[0] - this.drawPos[0]) < 0.2 &&
				Math.abs(roundedPos[1] - this.drawPos[1]) < 0.2
			) {
				//only die if player.pos is close to the center of a block
				let touchingPrevTrail = true;
				for (let i = lastTrail.length - 3; i >= 0; i--) {
					const pos1 = [Math.round(lastTrail[i][0]), Math.round(lastTrail[i][1])];
					const pos2 = [Math.round(lastTrail[i + 1][0]), Math.round(lastTrail[i + 1][1])];
					const twoPos = orderTwoPos(pos1, pos2);
					if (
						roundedPos[0] >= twoPos[0][0] &&
						roundedPos[0] <= twoPos[1][0] &&
						roundedPos[1] >= twoPos[0][1] &&
						roundedPos[1] <= twoPos[1][1]
					) {
						if (!touchingPrevTrail) {
							playerShouldBeDead = true;
						}
						touchingPrevTrail = true;
					} else {
						touchingPrevTrail = false;
					}
				}
			}
		}
		if (playerShouldBeDead) {
			if (!this.isDead) {
				this.die();
			}
		} else {
			this.didUncertainDeathLastTick = false;
		}

		//test if player shouldn't be dead after all
		if (this.isDead && !this.deathWasCertain && this.isDeadTimer > 1.5) {
			this.isDead = false;
			if (this.trails.length > 0) {
				const lastTrail = this.trails[this.trails.length - 1];
				lastTrail.vanishTimer = 0;
			}
		}

		//if my player
		if (this.mydata) {
			this.mydata.myPos = [this.pos[0], this.pos[1]];
			minimap_canvas.update_player(this.mydata.myPos);
			main_canvas.move_camera(this.pos,deltaTime);
			if (this.mydata.nextDir != this.dir) {
				// console.log("myNextDir != player.dir (",myNextDir,"!=",player.dir,")");
				const horizontal = this.dir === 0 || this.dir == 2;
				//only change when currently traveling horizontally and new dir is not horizontal
				//or when new dir is horizontal but not currently traveling horizontally
				if (this.mydata.changeDirAtIsHorizontal != horizontal) {
					let changeDirNow = false;
					const currentCoord = this.pos[horizontal ? 0 : 1];
					if (this.dir === 0 || this.dir == 1) { //right & down
						if (this.mydata.changeDirAt < currentCoord) {
							changeDirNow = true;
						}
					} else {
						if (this.mydata.changeDirAt > currentCoord) {
							changeDirNow = true;
						}
					}
					if (changeDirNow) {
						const newPos = [this.pos[0], this.pos[1]];
						const tooFarTraveled = Math.abs(this.mydata.changeDirAt - currentCoord);
						newPos[horizontal ? 0 : 1] = this.mydata.changeDirAt;
						this.mydata.changedir(this.mydata.nextDir, newPos);
						movePos(this.pos, this.dir, tooFarTraveled);
					}
				}
			}
		}
	}
}

class MyPlayerData {
	constructor(){
		this.nextDir = 0;
		/** @type {Vec2} */
		this.myPos = null;
		this.rank = 0;
		this.serverPos= [0, 0];
		this.serverDir = null;
		this.changedir = undefined;
		this.changeDirAt = null;
		this.changeDirAtIsHorizontal = false;
	}

	reset(){
		this.myPos = null;
		this.rank = 0;
	}
}

const request = window.indexedDB.open("test");
/**
 * @type {IDBDatabase}
 */
let db;
request.onerror = (event) => {
	console.error("Why didn't you allow my web app to use IndexedDB?!");
  };
request.onsuccess = (event) => {
db = event.target.result;
db.onerror = (event) => {
	// Generic error handler for all errors targeted at this database's
	// requests!
	console.error(`Database error: ${event.target.error?.message}`);
};
};

request.onupgradeneeded = (event) => {
	// Save the IDBDatabase interface
	const db = event.target.result;
  
	// Create an objectStore for this database
	const data_store = db.createObjectStore("recording_data", { autoIncrement: true });
	data_store.createIndex("time","time");
	data_store.createIndex("recording","recording");
	data_store.transaction.oncomplete = () => {
		console.log("Succesfully created !");
	}

	const listing_store = db.createObjectStore("recording_listing", { autoIncrement: true });
	listing_store.createIndex("time","time");
	listing_store.transaction.oncomplete = () => {
		console.log("Succesfully created !");
	}

};

class OneGame extends EventTarget {
	/**
	 * @type {SplixState}
	 */
	#state;
	/**
	 * @type {GameConnection}
	 */
	connection;
	constructor(url,state,fake){
		super();
		this.#state = state;
		this.fake = fake;
		if(!fake){
			let listing_store = db.transaction(["recording_listing"],"readwrite").objectStore('recording_listing');
			listing_store.add({time: Date.now()}).onsuccess = ev => {
				this.listing = ev.target.result;
				connection_worker.postMessage({
						request: "start_connection",
						args: {
							url,
							name: nameInput.value,
							skinColor: localStorage.getItem("skinColor"),
							skinPattern: localStorage.getItem("skinPattern"),
							patreonLastSplixCode: localStorage.patreonLastSplixCode,
							recording: ev.target.result,
							replay: "recording",
						}
				});
			};
		} else {
			connection_worker.postMessage({
					request: "start_connection",
					args: {
						url,
						name: nameInput.value,
						skinColor: localStorage.getItem("skinColor"),
						skinPattern: localStorage.getItem("skinPattern"),
						patreonLastSplixCode: localStorage.patreonLastSplixCode,
						recording: url,
						replay: "replay",
					}
			});
		}
	}

	sendDir(dir,skipQueue){
		connection_worker.postMessage({
			call: "sendDir",
			args: [dir,skipQueue,this.#state.my_player.mydata.myPos,this.#state.my_player.dir],
		})
	}

	honk(time){
		connection_worker.postMessage({
			call: "wsSendMsg",
			args: [sendAction.HONK, time],
		})
	}

	update(deltaTime){
		// update the player positions
		this.#state.update(deltaTime);
	}

	/**
	 * 
	 * @param {Player} player 
	 * @param {Vec2} pos 
	 */
	trailPush(player, pos) {
		if (player.trails.length > 0) {
			const lastTrail = player.trails[player.trails.length - 1].trail;
			if (lastTrail.length > 0) {
				const lastPos = lastTrail[lastTrail.length - 1];
				if (lastPos[0] != player.pos[0] || lastPos[1] != player.pos[1]) {
					if (pos === undefined) {
						pos = [player.pos[0], player.pos[1]];
					} else {
						pos = [pos[0], pos[1]];
					}
					lastTrail.push(pos);
					if (player.mydata) {
						connection_worker.postMessage({
							call: "myTrailPush",
							args: [pos],
						})
					}
				}
			}
		}
	}

	/**
	 * Changes my player's direction.
	 * @param {number} dir 
	 * @param {Vec2} newPos 
	 * @param {boolean} extendTrail 
	 * @param {boolean} isClientside 
	 */
	changeMyDir(dir, newPos, extendTrail, isClientside) {
		this.#state.my_player.dir = this.#state.my_player.mydata.nextDir = dir;
		this.#state.my_player.pos = [newPos[0], newPos[1]];
		
		if (extendTrail === undefined) {
			extendTrail = true;
		}
		if (isClientside === undefined) {
			isClientside = true;
		}
		
		if (extendTrail) {
			this.trailPush(this.#state.my_player);
		}
		
		connection_worker.postMessage({
			call: "changeMyDir",
			args: [newPos,dir,isClientside],
		})
	}

	update_change_dir({next_dir, at, is_horizontal}){
		this.#state.my_player.mydata.nextDir = next_dir;
		this.#state.my_player.mydata.changeDirAt = at;
		this.#state.my_player.mydata.changeDirAtIsHorizontal = is_horizontal;
		//hide cursor // TODO Move this somewhere else
		input_handler.mouseHidePos = [input_handler.lastMousePos[0], input_handler.lastMousePos[1]];
		document.body.style.cursor = "none";
		lastMyPosHasBeenConfirmed = false;
	}

	update_change_my_dir(dir,newPos){
		this.changeMyDir(dir, newPos);
		//hide cursor // TODO Move this somewhere else
		input_handler.mouseHidePos = [input_handler.lastMousePos[0], input_handler.lastMousePos[1]];
		document.body.style.cursor = "none";
		lastMyPosHasBeenConfirmed = false;
	}

	
	/**
	 * A copy of the data needed for sendDir.
	 */
	get_send_dir_data(){
		return this.#state.my_player && this.#state.my_player.mydata.myPos ? {
			my_pos: this.#state.my_player.mydata.myPos.map(x=>x),
			my_dir: this.#state.my_player.dir
		} : undefined;
	}

	/**
	 * Get ping information.
	 */
	get_ping_info(){
		return [this.serverAvgPing,this.serverLastPing,this.serverDiffPing];
	}

	getPlayer(id){
		const player = this.#state.getPlayer(id);
		if(id === 0){
			player.mydata.changedir ??= this.changeMyDir.bind(this);
		}
		return player;
	}

	getBlock(x,y){
		return this.#state.getBlock(x,y);
	}

	update_block(x,y,type){
		const block = this.getBlock(x, y);
		block.setBlockId(type);
	}

	update_player_pos(id,x,y,newDir,extendTrail,reqdoSetPos,serverAvgPing){
		const player = this.getPlayer(id);
		player.hasReceivedPosition = true;
		player.moveRelativeToServerPosNextFrame = true;
		player.lastServerPosSentTime = Date.now();
		lastMyPosHasBeenConfirmed = true;
		const newPos = [x, y];
		let newPosOffset = [x, y];

		//add distance traveled during server delay (ping/2)
		let posOffset = 0;
		if (player.mydata || serverAvgPing > 50) {
			posOffset = serverAvgPing / 2 * GLOBAL_SPEED;
		}
		movePos(newPosOffset, newDir, posOffset);

		let doSetPos = true;
		if (player.mydata) {
			lastMyPosServerSideTime = Date.now();
			// console.log("current dir:",player.dir, "myNextDir", myNextDir, "newDir", newDir);
			// console.log("newPosOffset",newPosOffset, "player.pos", player.pos);

			//if dir and pos are close enough to the current dir and pos
			if (
				(player.dir == newDir || player.mydata.nextDir == newDir) &&
				Math.abs(newPosOffset[0] - player.pos[0]) < 1 &&
				Math.abs(newPosOffset[1] - player.pos[1]) < 1
			) {
				// console.log("newPosOffset",newPosOffset);
				// console.log("doSetPos is false because dir and pos are close enough to current dir and pos");
				doSetPos = false;
			}

			doSetPos = doSetPos && reqdoSetPos;

			if (player.dir == 4 || newDir == 4) { //is paused or is about to be paused
				// console.log("player.dir == 4 or newDir == 4, doSetPos = true");
				doSetPos = true;
			}

			// console.log("doSetPos:",doSetPos);
			if (doSetPos) {
				// console.log("==================doSetPos is true================");
				player.mydata.nextDir = newDir;
				this.changeMyDir(newDir, newPos, false, false);
				//doSetPos is true, so the server thinks the player is somewhere
				//else than the client thinks he is. To prevent the trail from
				//getting messed up, request the full trail
				connection_worker.postMessage({
					call: "startRequestMyTrail",
					args: [true],
				});
			}

			//always set the server position
			player.mydata.serverPos = [newPosOffset[0], newPosOffset[1]];
			player.mydata.serverDir = newDir;

			this.#state.removeBlocksOutsideViewport(player.pos); // TODO Fog mode
		} else {
			player.dir = newDir;
		}

		if (doSetPos) {
			player.pos = newPosOffset;
			// console.log("doSetPos",newPosOffset);
			if (extendTrail) {
				this.trailPush(player, newPos);
			} else {
				player.trails.push({
					trail: [],
					vanishTimer: 0,
				});
			}
		}

		if (!player.drawPosSet) {
			player.drawPos = [player.pos[0], player.pos[1]];
			player.drawPosSet = true;
		}
	}

	update_player_trail(id,new_trail,replace){
		const player = this.getPlayer(id);
		if(id === 0){
			//if last trail was emtpy (if entering enemy land) send a request for the new trail
			if (player.trails.length > 0) {
				const lastTrail = player.trails[player.trails.length - 1];
				if (lastTrail.trail.length <= 0 && new_trail.length > 0) {
					connection_worker.postMessage({
						call: "startRequestMyTrail",
						args: [],
					})
				}
			}
		}
		if (replace) {
			if (player.trails.length > 0) {
				const last = player.trails[player.trails.length - 1];
				last.trail = new_trail;
				last.vanishTimer = 0;
			} else {
				replace = false;
			}
		}
		if (!replace) {
			player.trails.push({
				trail: new_trail,
				vanishTimer: 0,
			});
		}
	}

	update_player_empty_trail_with_last_pos(id,x,y){
		const player = this.getPlayer(id);
		if (player.trails.length > 0) {
			const prevTrail = player.trails[player.trails.length - 1].trail;
			if (prevTrail.length > 0) {
				prevTrail.push([x, y]);
			}
		}
		player.trails.push({
			trail: [],
			vanishTimer: 0,
		});
	}

	update_player_die(id,x,y){
		const player = this.getPlayer(id);
		if(x !== undefined){
			player.pos[0] = x;
			player.pos[1] = y;
		}
		player.die(true);
	}

	update_player_remove(id){
		this.#state.players.delete(id);
	}

	update_player_name(id,name){
		const player = this.getPlayer(id);
		player.name = filter(name);
	}

	update_player_skin(id,skin){
		const player = this.getPlayer(id);
		player.skinBlock = skin;
		if (player.mydata) {
			colorUI();
		}
	}

	update_player_hit_line(id,pointsColor,x,y,hitSelf){
		pointsColor=getColorForBlockSkinId(pointsColor);
		const player = this.getPlayer(id);
		player.addHitLine([x, y], pointsColor, hitSelf);
		if (player.mydata && !hitSelf) {
			main_canvas.doCamShakeDir(player.dir, 10, false);
		}
	}

	update_player_honk(id,time){
		const player = this.getPlayer(id);
		player.doHonk(time);
	}

	update_player_undo_die(id){
		const player = this.getPlayer(id);
		player.undoDie();
	}

	update_you_ded(data){
		if (data.length > 1) {
			last_stat.blocks = bytesToInt(data[1], data[2], data[3], data[4]);
			if (last_stat.blocks > best_stat.blocks) {
				best_stat.blocks = last_stat.blocks;
				lsSet("bestStatBlocks", best_stat.blocks);
			}
			last_stat.kills = bytesToInt(data[5], data[6]);
			if (last_stat.kills > best_stat.kills) {
				best_stat.kills = last_stat.kills;
				lsSet("bestStatKills", best_stat.kills);
			}
			last_stat.leaderboard_rank = bytesToInt(data[7], data[8]);
			if ((last_stat.leaderboard_rank < best_stat.leaderboard_rank || best_stat.leaderboard_rank <= 0) && last_stat.leaderboard_rank > 0) {
				best_stat.leaderboard_rank = last_stat.leaderboard_rank;
				lsSet("bestStatLbRank", best_stat.leaderboard_rank);
			}
			last_stat.alive = bytesToInt(data[9], data[10], data[11], data[12]);
			if (last_stat.alive > best_stat.alive) {
				best_stat.alive = last_stat.alive;
				lsSet("bestStatAlive", best_stat.alive);
			}
			last_stat.no1_time = bytesToInt(data[13], data[14], data[15], data[16]);
			if (last_stat.no1_time > best_stat.no1_time) {
				best_stat.no1_time = last_stat.no1_time;
				lsSet("bestStatNo1Time", best_stat.no1_time);
			}
			last_stat_death_type = data[17];
			last_stat_killer = "";
			document.getElementById("lastStats").style.display = null;
			document.getElementById("bestStats").style.display = null;
			lastStatCounter = 0;
			lastStatTimer = 0;
			lastStatValueElem.innerHTML = bestStatValueElem.innerHTML = "";
			switch (last_stat_death_type) {
				case 1:
					if (data.length > 18) {
						const nameBytes = data.subarray(18, data.length);
						last_stat_killer = Utf8ArrayToStr(nameBytes);
					}
					break;
				case 2:
					last_stat_killer = "the wall";
					break;
				case 3:
					last_stat_killer = "yourself";
					break;
			}
		}
		allowSkipDeathTransition = true;
		deathTransitionTimeout = window.setTimeout(() => {
			// resetAll();
			if (skipDeathTransition) {
				transition_canvas.doTransition("", false, () => {
					onClose();
					resetAll();
					connectWithTransition(true);
				});
			} else {
				// console.log("before doTransition",isTransitioning);
				transition_canvas.doTransition("GAME OVER", true, null, () => {
					connection_worker.postMessage({
						call: "onClose",
						args: [],
					});
					resetAll();
				}, true);
				// console.log("after doTransition",isTransitioning);
			}
			deathTransitionTimeout = null;
		}, 1000);
	}

	update_my_rank(rank){
		if(rank !== undefined) this.#state.my_player.mydata.rank = rank;
		this.update_stats(true);
	}

	update_stats(ranksent){
		if (this.#state.my_player.mydata.rank > this.#state.total_players && ranksent) {
			this.#state.total_players = this.#state.my_player.mydata.rank;
		} else if ((this.#state.total_players < this.#state.my_player.mydata.rank) || (this.#state.my_player.mydata.rank === 0 && this.#state.total_players > 0)) {
			this.#state.my_player.mydata.rank = this.#state.total_players;
		}
		this.dispatchEvent(new CustomEvent('update_my_rank', {detail: {
			rank: this.#state.my_player.mydata.rank,
			total_players: this.#state.total_players,
		}}));
	}

	update_leaderboard(total_players,data){
		data=Uint8Array.from(data);
		this.#state.total_players = total_players;
		this.update_stats(false);
		let i = 0;
		let rank = 1;
		const rows = [];
		while (true) {
			if (i >= data.length) {
				break;
			}
			const score = bytesToInt(data[i], data[i + 1], data[i + 2], data[i + 3]);
			const name_len = data[i + 4];
			const name_bytes = data.subarray(i + 5, i + 5 + name_len);
			const name = Utf8ArrayToStr(name_bytes);
			rows.push({
				rank: rank,
				name: name,
				score: score,
			});
			i = i + 5 + name_len;
			rank++;
		}
		leaderboard_ui.update(rows);
		if (this.#state.total_players < 30 && doRefreshAfterDie && closeNotification === null) {
			closeNotification = new TopNotification("This server is about to close, refresh to join a full server.");
		}
	}

	update_my_score(kills,blocks){
		this.dispatchEvent(new CustomEvent('update_my_score',{detail: {
			kills,
			blocks,
		}}));
	}

	update_chunk_of_blocks(x,y,w,h,data){
		let i = 0;
		for (let j = x; j < x + w; j++) {
			for (let k = y; k < y + h; k++) {
				const block = this.getBlock(j, k);
				block.setBlockId(data[i], false);
				i++;
			}
		}
	}

	update_fill_area(x, y, w, h, type, pattern, isEdgeChunk){
		this.#state.fillArea(x, y, w, h, type, pattern, isEdgeChunk);
	}

	update_minimap(data){
		minimap_canvas.update_map(data);
	}

	update_map_size(size){
		this.#state.map_size = size;
		minimap_canvas.update_size(size);
	}

	update_life_count(currentLives,totalLives){
		life_box.setLives(currentLives, totalLives);
	}

	update_ready(){
		playingAndReady = true;
		if (!isTransitioning) {
			isTransitioning = true;
			onConnectOrMiddleOfTransition();
		}
	}

	update_ping(avg,last,diff){
		this.serverAvgPing = avg;
		this.serverLastPing = last;
		this.serverDiffPing = diff;
	}

	update_onopen(){
		countPlayGame();
		document.body.dataset.state="playing";
		window.hc.km.enable_scope("playing");
		if (playingAndReady) {
			onConnectOrMiddleOfTransition();
		}
	}

	update_onclose(closedBecauseOfDeath){
		if (!playingAndReady) {
			if (!isTransitioning) {
				if (couldntConnect()) {
					showBeginHideMainCanvas();
				}
			} else {
				// TODO showCouldntConnectAfterTransition = true;
			}
		} else if (!closedBecauseOfDeath) {
			transition_canvas.doTransition("", false, resetAll);
			// ga("send","event","Game","lost_connection_mid_game");
			// _paq.push(['trackEvent', 'Game', 'lost_connection_mid_game']);
			setNotification("The connection was lost :/");
		} else {
			//disconnect because of death 
		}
	}
}

// Some dated code is using these in places like `for(i = 0`.
// While ideally these variables should all be made local,
// I'm worried some locations actually rely on them not being local.
// So for now these are all global, but we should slowly try to get rid of these.
// Jesper
//
// var i, w;
// Nothing to worry about !
// Tartasprint

//#region Declarations
const IS_SECURE = location.protocol.indexOf("https") >= 0;
const SECURE_WS = IS_SECURE ? "wss://" : "ws://";
/** @type {SplixCanvas} main ctx */
let main_canvas;

let game_state = new SplixState();
/**@type {Minimap} */
let minimap_canvas;
/** @type {TransitionCanvas} */
let transition_canvas;
/** @type {TutorialCanvas} */
let tutorial;
/** @type {SkinButtonCanvas} */
let skin_button;
/** @type {SkinScreen} */
let skin_screen;
/** @type {SplixLogoCanvas} Canvas for splix animated logo */ 
let title_canvas;
/** @type {LifeBox} */
let life_box;
/** @type {LeftStats} */
let left_stats;
/** @type {InputHanlder} */
let input_handler;
/** @type {RenderingLoop} */
let rendering_loop;
/** @type {QualityUI} */
let quality_ui;
/** @type {UglyUI} */
let ugly_ui;
/** @type {Leaderboard} */
let leaderboard_ui;
let logger = null;
var beginScreenVisible = true;
var canvasQuality = 1, zoom, uglyMode = false;
var playUI,
	beginScreen,
	notificationElem,
	formElem,
	nameInput,
	lastNameValue = "",
	lastNameChangeCheck = 0;
var scoreStatTarget = 25, scoreStat = 25, realScoreStatTarget = 25, realScoreStat = 25;
var showCouldntConnectAfterTransition = false, playingAndReady = false;
var isTransitioning = false;
var doRefreshAfterDie = false, pressedKeys = [];
var skipDeathTransition = false, allowSkipDeathTransition = false, deathTransitionTimeout = null;
var closeNotification = null, connectionLostNotification = null;
var lastMyPosSetClientSideTime = 0,
	lastMyPosServerSideTime = 0,
	lastMyPosSetValidClientSideTime = 0,
	lastMyPosHasBeenConfirmed = false;
var uiElems = [];
let last_stat = new Stats();
let last_stat_death_type = 0,
	last_stat_killer = "";
let best_stat = new Stats();
var lastStatTimer = 0, lastStatCounter = 0, lastStatValueElem, bestStatValueElem;
var joinButton,
	gamemodeDropDownEl;
var didConfirmOpenInApp = false;
let debugging = {
	frames: 0,
	time_start: 0,
	getFPS: () => {
		return debugging.frames*1000/(Date.now()-debugging.time_start)
	},
}

//called by form, connects with transition and error handling
var isConnectingWithTransition = false;

/**@type {OneGame?} */
let one_game = null;

let connection_worker = new Worker('src/connection.js');

connection_worker.onmessage = ev => {
	const message = ev.data;
	if(typeof message.request === "string"){
		if(message.request === "get_send_dir_data"){
			connection_worker.postMessage({
				response: "get_send_dir_data",
				result: one_game.get_send_dir_data(),
				id: message.id,
			})
		} else {
			console.warn('Unknown request :', message.request);
		}
	} else if (typeof message.call === "string") {
		if(one_game) one_game['update_'+message.call].call(one_game,...message.args);
	}
};
//#endregion Declarations


function countPlayGame() {
	let old = 0;
	if (localStorage.getItem("totalGamesPlayed") !== null) {
		old = localStorage.totalGamesPlayed;
	}
	old++;
	lsSet("totalGamesPlayed", old);
}

function generateServerLocation(originalLocationObj) {
	const port = IS_SECURE ? "7998" : "7999";
	return {
		pingUrlV4: originalLocationObj.pingIpv4 + "/ping",
		pingUrlV6: originalLocationObj.pingIpv6 + "/ping",
		gamemodes: originalLocationObj.gamemodes,
		loc: originalLocationObj.loc,
		locId: originalLocationObj.locId,
		ws: null,
		ws6: null,
		pingTries: 0,
		pingTries6: 0,
		avgPing: 0,
		avgPing6: 0,
		open: false,
		open6: false,
		initSocket: function () {
			this.connectionTries++;
			this.lastConnectionTry = Date.now();
			if (this.ws !== null) {
				this.ws.onmessage = null;
				this.ws.onopen = null;
				this.ws.onclose = null;
				this.ws.close();
				this.pingTries = 0;
				this.avgPing = 0;
				this.lastPingTime = 0;
				this.waitingForPing = false;
			}
			this.ws = new WebSocket(SECURE_WS + this.pingUrlV4);
			this.ws.binaryType = "arraybuffer";
			const parent = this;
			this.ws.onmessage = function () {
				if (parent.waitingForPing) {
					let pingTime = Date.now() - parent.lastPingTime;
					pingTime += 10;
					parent.avgPing = parent.avgPing * parent.pingTries + pingTime;
					parent.pingTries++;
					parent.avgPing /= parent.pingTries;
					parent.lastPingTime = Date.now();
					parent.waitingForPing = false;

					if (parent.pingTries >= 4) {
						parent.open = false;
						parent.ws.close();
					}
				}
			};
			this.ws.onopen = function () {
				parent.open = true;
				parent.connectedOnce = true;
			};
			this.ws.onclose = function () {
				parent.open = false;
			};
		},
		initSocket6: function () {
			this.connectionTries6++;
			this.lastConnectionTry6 = Date.now();
			if (this.ws6 !== null) {
				this.ws6.onmessage = null;
				this.ws6.onopen = null;
				this.ws6.onclose = null;
				this.ws6.close();
				this.pingTries6 = 0;
				this.avgPing6 = 0;
				this.lastPingTime6 = 0;
				this.waitingForPing6 = false;
			}
			this.ws6 = new WebSocket(SECURE_WS + this.pingUrlV6);
			this.ws6.binaryType = "arraybuffer";
			const parent = this;
			this.ws6.onmessage = function () {
				if (parent.waitingForPing6) {
					const pingTime = Date.now() - parent.lastPingTime6;
					parent.avgPing6 = parent.avgPing6 * parent.pingTries6 + pingTime;
					parent.pingTries6++;
					parent.avgPing6 /= parent.pingTries6;
					parent.lastPingTime6 = Date.now();
					parent.waitingForPing6 = false;

					if (parent.pingTries6 >= 4) {
						parent.open6 = false;
						parent.ws6.close();
					}
				}
			};
			this.ws6.onopen = function () {
				parent.open6 = true;
				parent.connectedOnce6 = true;
			};
			this.ws6.onclose = function () {
				parent.open6 = false;
			};
		},
		lastPingTime: 0,
		lastPingTime6: 0,
		waitingForPing: false,
		waitingForPing6: false,
		//returns true if done checking ping
		//returns false if not finished yet
		ping: function () {
			if (this.waitingForPing) {
				//if waiting for too long (longer than 10 seconds)
				const pingTime = Date.now() - this.lastPingTime;
				if (pingTime > 10000) {
					this.initSocket();
				}
			} else {
				//not waiting for ping
				if (this.open && this.ws && this.ws.readyState == WebSocket.OPEN) {
					//start new ping
					this.waitingForPing = true;
					this.lastPingTime = Date.now();
					this.ws.send(new Uint8Array([0]));
					return this.pingTries >= 4;
				} else {
					//why is it closed? test if it should try again
					return this.testSuccessfulConnection();
				}
			}
		},
		ping6: function () {
			if (this.waitingForPing6) {
				//if waiting for too long (longer than 10 seconds)
				const pingTime = Date.now() - this.lastPingTime6;
				if (pingTime > 10000) {
					this.initSocket6();
				}
			} else {
				//not waiting for ping
				if (this.open6 && this.ws6 && this.ws6.readyState == WebSocket.OPEN) {
					//start new ping
					this.waitingForPing6 = true;
					this.lastPingTime6 = Date.now();
					this.ws6.send(new Uint8Array([0]));
					return this.pingTries6 >= 4;
				} else {
					//why is it closed? test if it should try again
					return this.testSuccessfulConnection();
				}
			}
		},
		connectedOnce: false,
		connectedOnce6: false,
		connectionTries: 0,
		connectionTries6: 0,
		lastConnectionTry: Date.now(),
		lastConnectionTry6: Date.now(),
		testSuccessfulConnection: function () {
			if (this.connectedOnce || this.connectedOnce6) {
				return true;
			}
			if (this.connectionTries > 3) {
				return true;
			}
			if (Date.now() - this.lastConnectionTry < 5000) {
				return false;
			}
			this.initSocket();
			return false;
		},
		testSuccessfulConnection6: function () {
			if (this.connectedOnce || this.connectedOnce6) {
				return true;
			}
			if (this.connectionTries6 > 3) {
				return true;
			}
			if (Date.now() - this.lastConnectionTry6 < 5000) {
				return false;
			}
			this.initSocket6();
			return false;
		},
	};
}

const ergomoves = [];
function activateDir(d){
    const index = ergomoves.indexOf(d);
    if(index < 0) {
        ergomoves.push(d);
        one_game.sendDir(d);
    }
}

function deactivateDir(d){
    const index = ergomoves.indexOf(d);
    ergomoves.splice(index,1);
    if(ergomoves.length > 0){
        for(const dir of ergomoves){
            one_game.sendDir(dir);
        }
    }
}

function showTopNotification(text, timeAlive = 4) {
    var notification = doTopNotification(text);
    setTimeout(function () { notification.animateOut(); notification.destroy(); }, timeAlive * 1000);
}

function startPingServers() {
	for (const server of servers) {
		server.initSocket();
		server.initSocket6();
	}
}

//localStorage with ios private mode error handling
function lsSet(name, value) {
	try {
		localStorage.setItem(name, value);
		return true;
	} catch (error) {
		return false;
	}
}

function checkUsername(name) {
	const lower = name.toLowerCase();

	if (lower == "denniskoe") {
		const s = document.body.style;
		s.webkitFilter = s.filter = "contrast(200%) hue-rotate(90deg) invert(100%)";
	} else if (lower == "kwebbelkop") {
		lsSet("skinColor", 12);
		lsSet("skinPattern", 18);
		updateSkin();
	} else if (lower == "templar") {
		lsSet("skinPattern", 28);
		updateSkin();
	} else if (lower == "templar2") {
		lsSet("skinPattern", 29);
		updateSkin();
	} else if (lower == "jelly") {
		lsSet("skinColor", 8);
		lsSet("skinPattern", 19);
		updateSkin();
	} else if (lower.indexOf("masterov") > -1 || lower.indexOf("[mg]") === 0 || lower.indexOf("(mg)") === 0) {
		lsSet("skinColor", 12);
		lsSet("skinPattern", 20);
		updateSkin();
	} else if (lower == "farsattack") {
		lsSet("skinColor", 8);
		lsSet("skinPattern", 21);
		updateSkin();
	} else if (lower.indexOf("[am]") === 0 || lower.indexOf("(am)") === 0) {
		lsSet("skinColor", 11);
		lsSet("skinPattern", 23);
		updateSkin();
	} else if (lower == "hetgames") {
		lsSet("skinColor", 1);
		lsSet("skinPattern", 24);
		updateSkin();
	} else if (lower.indexOf("[gym]") === 0 || lower.indexOf("(gym)") === 0) {
		lsSet("skinColor", 4);
		lsSet("skinPattern", 25);
		updateSkin();
	} else if (lower == "luh") {
		lsSet("skinColor", 12);
		lsSet("skinPattern", 26);
		updateSkin();
	}
}

function nameInputOnChange() {
	lsSet("name", nameInput.value);
}

//when page is finished loading
window.addEventListener('load', function () {
	window.CSS.registerProperty({
		name: "--menu-opacity",
		syntax: "<number>",
		inherits: true,
		initialValue: "0.7",
	  });
	rendering_loop = new RenderingLoop();
	input_handler  = new InputHanlder(
		game_state,
		document.getElementById("touchControls")
	);
	main_canvas = new SplixCanvas(document.getElementById("mainCanvas"), game_state);
	minimap_canvas = new Minimap(
		game_state,
		document.getElementById("minimapCanvas"),
		document.getElementById("miniMapPlayer"),
	);
	transition_canvas = new TransitionCanvas(document.getElementById("transitionCanvas"));
	tutorial = new TutorialCanvas(
		document.getElementById("tutorialCanvas"),
		document.getElementById("tutorialText")
	);
	skin_screen = new SkinScreen(
		document.getElementById("skinScreenCanvas"),
		document.getElementById("skinScreen"),
	);
	skin_button = new SkinButtonCanvas(
		document.getElementById("skinButton"),
		document.getElementById("skinButtonShadow"),
	);
	title_canvas = new SplixLogoCanvas(document.getElementById("logoCanvas"));
	life_box = new LifeBox();
	quality_ui = new QualityUI(document.getElementById("qualityText"));
	ugly_ui = new UglyUI(document.getElementById("uglyText"));
	left_stats = new LeftStats(
		document.getElementById("myKills"),
		document.getElementById("blockCaptureCount"),
		document.getElementById("score"),
		document.getElementById("myRank"),
		document.getElementById("totalPlayers"),
	);
	
	
	notificationElem = document.getElementById("notification");
	lastStatValueElem = document.getElementById("lastStatsRight");
	bestStatValueElem = document.getElementById("bestStatsRight");
	joinButton = document.getElementById("joinButton");

	leaderboard_ui = new Leaderboard(document.getElementById("leaderboard"));
	leaderboard_ui.set_visibility(
		localStorage.leaderboardHidden == "true",
	);
	uiElems.push(leaderboard_ui.container);
	beginScreen = document.getElementById("beginScreen");
	playUI = document.getElementById("playUI");
	uiElems.push(document.getElementById("scoreBlock"));
	uiElems.push(document.getElementById("miniMap"));
	// closeNotification = document.getElementById("closeNotification");
	// uiElems.push(closeNotification);
	window.prerollElem = document.getElementById("preroll"); // TODO remove global window

	nameInput = document.getElementById("nameInput");
	if (localStorage.name) {
		nameInput.value = localStorage.name;
	}
	nameInput.focus();
	if (localStorage.autoConnect) {
		doConnect();
	}
	formElem = document.getElementById("nameForm");
	formElem.onsubmit = function () {
		try {
			connectWithTransition();
		} catch (e) {
			console.log("Error", e.stack);
			console.log("Error", e.name);
			console.log("Error", e.message);
			setNotification("An error occurred :/");
		}
		return false;
	};

	//best stats
	best_stat.blocks = Math.max(best_stat.blocks, localStorage.getItem("bestStatBlocks"));
	best_stat.kills = Math.max(best_stat.kills, localStorage.getItem("bestStatKills"));
	best_stat.leaderboard_rank = Math.max(best_stat.leaderboard_rank, localStorage.getItem("bestStatLbRank"));
	best_stat.alive = Math.max(best_stat.alive, localStorage.getItem("bestStatAlive"));
	best_stat.no1_time = Math.max(best_stat.no1_time, localStorage.getItem("bestStatNo1Time"));

	initServerSelection();

	document.getElementById("serverSelect").addEventListener(
		"change",
		e => localStorage.setItem("lastSelectedEndpoint", e.target.value),
	);
	debugging.time_start = Date.now();
	window.requestAnimationFrame(  timeStamp => {rendering_loop.loop(timeStamp)}  );

	const devString = IS_DEV_BUILD ? " (dev build)" : "";
	console.log(
		"%c splix.io %c\n\n\nversion " + CLIENT_VERSION + " loaded" + devString,
		"color: #a22929; font-size: 50px; font-family: arial; text-shadow: 1px 1px #7b1e1e, 2px 2px #7b1e1e;",
		"",
	);
});

//called when successfully connected and when the transition is full screen
function onConnectOrMiddleOfTransition() {
	skin_screen.hide();
	hideBeginShowMain();
}

//hides beginScreen and shows the main canvas and ui
function hideBeginShowMain() {
	hideBegin();
	showMainCanvas();
}

function hideBegin() {
	beginScreen.style.display = "none";
	beginScreenVisible = false;
	updateCmpPersistentLinkVisibility();
}

function showMainCanvas() {
	playUI.style.display = null;
	main_canvas.show();
	if ("ontouchstart" in window) {
		input_handler.touchcontrol_elem.style.display = null;
	}
	setNotification("");
}

function setNotification(str) {
	notificationElem.innerHTML = str;
	notificationElem.style.display = str ? null : "none";
}

function showBegin() {
	beginScreen.style.display = null;
	beginScreenVisible = true;
	updateCmpPersistentLinkVisibility();
	nameInput.focus();
}

function hideMainCanvas() {
	playUI.style.display = "none";
	main_canvas.hide()
	input_handler.touchcontrol_elem.style.display = "none";
}

function openSkinScreen() {
	hideBegin();
	skin_screen.show();
}

//hides main canvas and ui and shows beginScreen
function showBeginHideMainCanvas() {
	document.body.dataset.state="begin";
	showBegin();
	hideMainCanvas();
}

function showBeginHideSkin() {
	showBegin();
	skin_screen.hide();
}

//if trying to establish a connection but failed
//returns true if it actually couldn't connect,
//false if it will try again
function couldntConnect() {
	setNotification("Couldn't connect to the server :/");
	const err = new Error("couldntConnectError");
	console.log(err.stack);
	isTransitioning = true;
	return true;
}

function connectWithTransition(dontDoAds) {
	if (!isConnectingWithTransition) {
		isConnectingWithTransition = true;
		if (doConnect(dontDoAds)) {
			transition_canvas.doTransition("", false, function () {
				if (!playingAndReady) {
					isTransitioning = false;
				}
				if (showCouldntConnectAfterTransition) {
					couldntConnect();
				} else {
					onConnectOrMiddleOfTransition();
				}
				showCouldntConnectAfterTransition = false;
			});
			nameInput.blur();
			checkUsername(nameInput.value);
		}
		isConnectingWithTransition = false;
	}
}

function doConnect() {
	if (!one_game && !isTransitioning) {
		const server = getSelectedServer();
		if (!server) {
			onClose(); // TODO  onClose does not exist
			return false;
		}
		if(Number.isNaN(Number.parseInt(server))){
			one_game = new OneGame(server,game_state);
		}else{
			one_game = new OneGame(Number.parseInt(server),game_state,true);
		}
		one_game.addEventListener('update_my_rank', ev => {
			left_stats.rank_update(ev.detail.rank,ev.detail.total_players)
		});
		one_game.addEventListener('update_my_score', ev => {
			left_stats.score_update(ev.detail.kills,ev.detail.blocks);
		});
		return true;
	}
	return false;
}

//basically like refreshing the page
function resetAll() {
	connection_worker.postMessage({
		request: "close_connection",
	});
	/* if(one_game.listing){
		const option = document.createElement('option');
		option.value = one_game.listing;
		option.text = "Replay #" + one_game.listing;
		document.getElementById("replayGroup").append(option);
	} */
	one_game = null;
	game_state.reset();
	main_canvas.reset();
	beginScreenVisible = true;
	updateCmpPersistentLinkVisibility();
	left_stats.reset();
	playingAndReady = false;
	title_canvas.resetNextFrame = true;
	allowSkipDeathTransition = false;
	skipDeathTransition = false;
	minimap_canvas.reset();
	showBeginHideMainCanvas();
	if (doRefreshAfterDie) {
		location.reload();
	}
	const s = document.body.style;
	s.webkitFilter = s.filter = null;
	TopNotification.reset_all();
	life_box.clearAllLives();
}

function testHashForMobile() {
	if (deviceType != DeviceTypes.DESKTOP) {
		const hash = location.hash;
		if (hash != "" && hash != "#pledged") {
			const confirmText = "Would you like to join this server in the app?";
			if (confirm(confirmText)) {
				didConfirmOpenInApp = true;
				openSplixApp(hash.substring(1, hash.length));
			}
		}
	}
}

function openSplixApp(data) {
	const url = location.href = "splix://" + data;
	if (deviceType == DeviceTypes.ANDROID && navigator.userAgent.toLowerCase().indexOf("chrome") > -1) {
		window.document.body.innerHTML = "Chrome doesn't like auto redirecting, click <a href=\"" + url +
			'">here</a> to open the splix.io app.';
	}
}



//called when moving mouse/ clicking
const showCursor = () => {
	document.body.style.cursor = null;
}

function updateCmpPersistentLinkVisibility() {
	const el = document.querySelector(".qc-cmp2-persistent-link");
	if (el) {
		el.style.display = beginScreenVisible ? "" : "none";
	}
}

const popUp = (url, w, h) => {
	const left = (screen.width / 2) - (w / 2);
	const top = (screen.height / 2) - (h / 2);
	window.open(
		url,
		"_blank",
		"toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=" +
			w + ", height=" + h + ", top=" + top + ", left=" + left,
	);
}

//sets the right color for UI
//by skinId
const colorUI = () => {
	const c = getColorForBlockSkinId(game_state.my_player.skinBlock);
	const mainColor = c.brighter;
	const edgeColor = c.darker;
	for (const elem of uiElems) {
		colorBox(elem, mainColor, edgeColor);
	}
}

const updateSkin = () => {
	const blockId = parseInt(localStorage.skinColor) + 1;
	skin_screen.state.fillArea(
		0,
		0,
		VIEWPORT_RADIUS * 2,
		VIEWPORT_RADIUS * 2,
		blockId,
		parseInt(localStorage.skinPattern),
	);
	skin_button.block.setBlockId(blockId);
}

//engagement meter
class Engagement {
	is_playing = localStorage.engagementIsPlaying == "true";
	last_play_time = localStorage.engagementLastPlayTime ?? Date.now();
	last_no_play_time = 0;
	last_change_time = localStorage.engagementLastChangeTime ?? Date.now();
	value = parseFloat(localStorage.engagementValue ?? "0.5");
	set_is_playing(set){
		const now = Date.now();
		if (set != this.is_playing) {
			lsSet("engagementIsPlaying", set);
			this.is_playing = set;
			const lastSet = set ? this.last_no_play_time : this.last_play_time;
			const setDiff = (lastSet - this.last_change_time)/20_000;
			if (set) {
				//subtract non play time
				this.value = lerptt(this.value, 0, 0.01, setDiff / 100);
			} else {
				//add play time
				this.value = lerptt(this.value, 1, 0.01, setDiff);
			}
			lsSet("engagementValue", this.value);
			this.last_change_time = now;
			lsSet("engagementLastChangeTime", now);
		}
		if (set) {
			lsSet("engagementLastPlayTime", now);
			this.last_play_time = now;
		} else {
			this.last_no_play_time = now;
		}
	}
}

const engagement = new Engagement(); // TODO: is this really useful ?

//#region patreon stuff
/* jshint ignore:start */
function loginWithPatreon() {
	lsSet("clickedLoginWithPatreonButton", "true");
	const redirectUri = getPatreonRedirectUri();
	window.location =
		"//www.patreon.com/oauth2/authorize?response_type=code&client_id=29edae8672a352342c2ecda5ff440eda65e5e52ebc7500b02eefb481c94c88b1&scope=users%20pledges-to-me%20my-campaign&redirect_uri=" +
		encodeURIComponent(redirectUri);
}
/* jshint ignore:end */

function getPatreonRedirectUri() {
	return location.origin + location.pathname;
}

function setPatreonOverlay(visible, content) {
	const el = document.getElementById("patreonOverlay");
	el.style.display = visible ? null : "none";
	if (content !== undefined) {
		document.getElementById("patreonBox").innerHTML = content;
	}
}

function requestPatreonPledgeData(showMessageWhenDone) {
	if (localStorage.patreonDeviceId === undefined || localStorage.patreonDeviceId == "") {
		resetPatreonPledgedData();
	} else {
		simpleRequest(
			"https://patreon.splix.io/requestPledge2.php?deviceId=" + localStorage.patreonDeviceId,
			function (data) {
				data = JSON.parse(data);
				if ("pledged" in data && "splixCode" in data) {
					lsSet("patreonLastPledgedValue", data.pledged);
					lsSet("patreonLastSplixCode", data.splixCode);
					if (showMessageWhenDone) {
						setPatreonOverlay(
							true,
							'<h2 style="margin-top: 0;">All set!</h2><p>Successfully logged in with patreon.<br>Reload the page to activate your pledge.</p><a class="fancyBox fancyBtn" href="javascript:window.location.href = window.location.origin + window.location.pathname + \'#nohttpsredirect\'">Reload</a>',
						);
					}
				} else {
					//@fixme show notification
					resetPatreonPledgedData();
				}
			},
		);
	}
}

function resetPatreonPledgedData() {
	lsSet("patreonLastPledgedValue", 0);
	lsSet("patreonLastSplixCode", "");
}

function testPatreonAdsAllowed() {
	if (localStorage.fuckAds == "true") {
		return false;
	}
	if (localStorage.patreonLastPledgedValue > 0) {
		return false;
	} else {
		return true;
	}
}

//checks href query for patreon data
//returns true if a patreon code was found
function checkPatreonQuery() {
	//if referred after patreon api login
	const query = parseQuery(location.href);
	let found = false;
	if ("code" in query && localStorage.clickedLoginWithPatreonButton == "true") {
		if (localStorage.skipPatreon == "true") {
			console.log("code: ", query.code);
		} else {
			if (deviceType != DeviceTypes.DESKTOP && confirm("Would you like to activate patreon in the app?")) {
				openSplixApp("patreoncode-" + query.code);
			} else {
				setPatreonOverlay(true, "Logging in with patreon...");
				simpleRequest(
					"https://patreon.splix.io/login2.php?code=" + query.code + "&redirectUri=" +
						encodeURIComponent(getPatreonRedirectUri()),
					function (data) {
						lsSet("patreonDeviceId", data);
						requestPatreonPledgeData(true);
					},
				);
			}
			found = true;
		}
	}
	lsSet("clickedLoginWithPatreonButton", "false");
	return found;
}
//#endregion

/** draws a trail on a canvas, can be drawn on multiple canvases
 * when drawCalls contains more than one object
 * @param {DrawCall[]} drawCalls 
 * @param {*} trail 
 * @param {Vec2?} lastPos 
 */
function drawTrailOnCtx(drawCalls, trail, lastPos) {
	if (trail.length > 0) {
		for (const draw_call of drawCalls) {
			const ctx = draw_call.ctx;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.lineWidth = 6;
			ctx.strokeStyle = draw_call.color;
			const offset = draw_call.offset;

			ctx.beginPath();
			ctx.moveTo(trail[0][0] * 10 + offset, trail[0][1] * 10 + offset);
			for (const segment of trail) {
				ctx.lineTo(segment[0] * 10 + offset, segment[1] * 10 + offset);
			}
			if (lastPos !== null) {
				ctx.lineTo(lastPos[0] * 10 + offset, lastPos[1] * 10 + offset);
			}
			ctx.stroke();
		}
	}
}

//changes blockId in to a blockId with a pattern applied
function applyPattern(blockId, pattern, x, y) {
	let modX, modY;
	if (blockId < 2) {
		return blockId;
	}
	let doPattern = false;
	switch (pattern) {
		case 1:
			doPattern = (x % 2 === 0) && (y % 2 === 0);
			break;
		case 2:
			doPattern = x % 2 == ((y % 2 === 0) ? 0 : 1);
			break;
		case 3:
			doPattern = (y % 3 < 1) ? (x % 3 > 0) : (x % 3 < 1);
			break;
		case 4:
			doPattern = (x % 5 === 0) || (y % 5 === 0);
			break;
		case 5:
			doPattern = (x - y) % 5 === 0;
			break;
		case 6:
			doPattern = Math.random() > 0.5;
			break;
		case 7:
			modX = (x + 7) % 100;
			modY = (y + 7) % 100;
			doPattern = (modY < 2 && (modX < 2 || (modX > 3 && modX < 6))) ||
				(modY == 2 && modX > 1 && modX < 4) ||
				(modY > 2 && modY < 5 && modX > 0 && modX < 5) ||
				(modY == 5 && (modX == 1 || modX == 4));
			break;
		case 8:
			doPattern = (x % 2 == ((y % 2 === 0) ? 0 : 1)) && x % 4 !== 0 && y % 4 != 1;
			break;
		case 9:
			doPattern = mod((x % 8 < 4) ? (x + y) : (x - y - 4), 8) < 3;
			break;
		case 10:
			doPattern = (x % 2 == ((y % 2 === 0) ? 0 : 1)) && mod((x % 8 < 4) ? (x + y) : (x - y - 4), 8) < 3;
			break;
		case 11:
			modX = x % 10;
			modY = y % 10;
			doPattern = ((modX === 0 || modX == 6) && modY < 7) ||
				((modX == 2 || modX == 4) && modY > 1 && modY < 5) ||
				((modX == 7 || modX == 9) && modY > 6) ||
				((modY === 0 || modY == 6) && modX < 7) ||
				((modY == 2 || modY == 4) && modX > 1 && modX < 5) ||
				((modY == 7 || modY == 9) && modX > 6);
			break;
		case 12:
			modX = ((y % 12 < 6) ? (x + 5) : x) % 10;
			modY = y % 6;
			doPattern = (modY < 4 && (modX > 0 && modX < 6 && modX != 3)) ||
				(modY > 0 && modY < 3 && modX < 7) ||
				(modX > 1 && modX < 5 && modY > 2 && modY < 5) ||
				(modX == 3 && modY == 5);
			break;
		case 13:
			doPattern = (
				((x + y) % 10 < 1) ||
				(mod(x - y, 10) < 1) ||
				(((x + 1) % 10 < 3) && ((y + 1) % 10 < 3)) ||
				(((x + 6) % 10 < 3) && ((y + 6) % 10 < 3))
			) &&
				!(x % 10 === 0 && y % 10 === 0) &&
				!(x % 10 == 5 && y % 10 == 5);
			break;
		case 14:
			modX = ((y % 10 < 5) ? (x + 5) : x) % 10;
			modY = y % 5;
			doPattern = ((modX == 1 || modX == 4) && modY > 1 && modY < 4) ||
				((modY == 1 || modY == 4) && modX > 1 && modX < 4);
			break;
		case 15:
			doPattern = ((x + y) % 6 < 1) ||
				(mod(x - y, 6) < 1 && (x % 6 < 3));
			break;
		case 16:
			modX = x % 6;
			modY = y % 6;
			doPattern = (modX == 1 && modY > 2 && modY < 5) ||
				(modX == 4 && modY > 0 && modY < 3) ||
				(modY == 4 && modX > 2 && modX < 5) ||
				(modY == 1 && modX > 0 && modX < 3);
			break;
		case 17:
			doPattern = Math.random() > 0.99;
			break;
		case 18:
		case 19:
		case 20:
		case 21:
		case 22:
		case 23:
		case 24:
		case 25:
		case 26:
		case 27:
		case 28:
		case 29:
			let bitMap, bitMapW, bitMapH, xShift = 0, yShift = 0;
			switch (pattern) {
				case 18:
					bitMapW = 18;
					bitMapH = 18;
					yShift = 6;
					bitMap = [
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0],
						[0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0],
						[0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0],
						[1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
						[1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
						[1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0],
						[1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
						[1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
						[1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0],
						[1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0],
						[1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
						[1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
						[1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
						[1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0],
						[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
						[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
					];
					break;
				case 19:
					bitMapW = 14;
					bitMapH = 10;
					xShift = 7;
					yShift = 0;
					bitMap = [
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						[0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0],
						[0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						[0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
						[0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0],
						[0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
						[0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
					];
					break;
				case 20:
					bitMapW = 12;
					bitMapH = 7;
					xShift = 6;
					yShift = 0;
					bitMap = [
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						[0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0],
						[0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1],
						[0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0],
						[0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1],
						[0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
						[0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0],
					];
					break;
				case 21:
					bitMapW = 17;
					bitMapH = 15;
					xShift = 0;
					yShift = 5;
					bitMap = [
						[1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1],
						[1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1],
						[0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1],
						[0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1],
						[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
						[1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1],
						[1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1],
						[1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1],
						[1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
						[1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
						[1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
						[1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
						[1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
						[1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
						[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
					];
					break;
				case 22:
					bitMapW = 10;
					bitMapH = 10;
					xShift = 0;
					yShift = 0;
					bitMap = [
						[1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						[1, 0, 1, 1, 1, 1, 1, 1, 1, 0],
						[1, 0, 0, 1, 0, 1, 0, 1, 0, 0],
						[1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
						[1, 1, 1, 1, 0, 1, 0, 1, 1, 1],
						[0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
						[1, 1, 1, 1, 0, 1, 0, 1, 1, 1],
						[1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
						[1, 0, 0, 1, 0, 1, 0, 1, 0, 0],
						[1, 0, 1, 1, 1, 1, 1, 1, 1, 0],
					];
					break;
				case 23:
					bitMapW = 12;
					bitMapH = 7;
					xShift = 6;
					yShift = 0;
					bitMap = [
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						[0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
						[0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1],
						[0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1],
						[0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1],
						[0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
						[0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
					];
					break;
				case 24:
					bitMapW = 14;
					bitMapH = 13;
					xShift = 7;
					yShift = 0;
					bitMap = [
						[1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1],
						[1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1],
						[1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
						[1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1],
						[1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
						[1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
						[1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0],
						[1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
						[1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0],
						[1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
						[1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1],
						[1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
						[1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1],
					];
					break;
				case 25:
					bitMapW = 22;
					bitMapH = 7;
					xShift = 11;
					yShift = 0;
					bitMap = [
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						[0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
						[0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0],
						[0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0],
						[0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
						[0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
						[0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
					];
					break;
				case 26:
					bitMapW = 15;
					bitMapH = 19;
					xShift = 0;
					yShift = 6;
					bitMap = [
						[0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
						[0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
						[0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
						[0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						[0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
						[0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
						[0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
						[0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
						[0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
						[0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
						[0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
						[0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
						[0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
						[0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
					];
					break;
				case 27:
					bitMapW = 10;
					bitMapH = 10;
					xShift = 0;
					yShift = 5;
					bitMap = [
						[0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
						[1, 1, 0, 0, 0, 1, 1, 0, 0, 0],
						[1, 0, 1, 1, 1, 0, 1, 1, 0, 0],
						[1, 0, 1, 1, 1, 1, 0, 1, 0, 0],
						[1, 0, 1, 1, 1, 1, 0, 1, 0, 0],
						[1, 0, 1, 1, 1, 0, 1, 1, 0, 0],
						[1, 0, 1, 0, 0, 1, 1, 0, 0, 0],
						[1, 0, 1, 1, 1, 1, 0, 0, 0, 0],
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
					];
					break;
				case 28:
					bitMapW = 16;
					bitMapH = 16;
					xShift = 8;
					yShift = 0;
					bitMap = [
						[0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
						[0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0],
						[0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1],
						[0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1],
						[0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
						[0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1],
						[0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
						[0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1],
						[0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
						[0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1],
						[0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
						[0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1],
						[0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1],
						[0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0],
						[0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
						[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
					];
					break;
				case 29:
					bitMapW = 16;
					bitMapH = 14;
					xShift = 0;
					yShift = 0;
					bitMap = [
						[0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1],
						[0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
						[1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0],
						[1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0],
						[1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0],
						[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0],
						[1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0],
						[1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0],
						[1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0],
						[0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
						[0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1],
						[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
						[1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0],
						[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
					];
					break;
			}
			xShift *= Math.floor(y / bitMapH);
			yShift *= Math.floor(x / bitMapW);
			modX = (x + xShift) % bitMapW;
			modY = (y + yShift) % bitMapH;
			doPattern = bitMap[modY][modX] == 1 ? true : false;
			break;
	}
	if (doPattern) {
		blockId += SKIN_BLOCK_COUNT;
	}
	return blockId;
}

function calcTouch(customTouch, touch) {
	const currentTime = Date.now();
	const deltaTime = currentTime - customTouch.prevTime;
	const curPos = [touch.pageX, touch.pageY];
	const prevPos = customTouch.prevPos;
	const xOffset = prevPos[0] - curPos[0];
	const yOffset = prevPos[1] - curPos[1];
	const dist = Math.sqrt(Math.pow(xOffset, 2) + Math.pow(yOffset, 2));
	let speed = dist / deltaTime;
	speed *= MAX_PIXEL_RATIO * canvasQuality;
	customTouch.prevTime = currentTime;
	customTouch.prevPos = curPos;
	if (deltaTime > 0 && speed > 2) {
		if (Math.abs(xOffset) > Math.abs(yOffset)) {
			if (xOffset > 0) {
				return 2;
			} else {
				return 0;
			}
		} else {
			if (yOffset > 0) {
				return 3;
			} else {
				return 1;
			}
		}
	}
}
//#endregion

function doSkipDeathTransition() {
	if (allowSkipDeathTransition) {
		if (deathTransitionTimeout !== null) {
			window.clearTimeout(deathTransitionTimeout);
			deathTransitionTimeout = null;
			onClose();
			resetAll();
		}
		skipDeathTransition = true;
	}
}

//move pos along dir with offset
function movePos(pos, dir, offset) {
	switch (dir) {
		case 0:
			pos[0] += offset;
			break;
		case 1:
			pos[1] += offset;
			break;
		case 2:
			pos[0] -= offset;
			break;
		case 3:
			pos[1] -= offset;
			break;
	}
}

const dtCaps = [0, 6.5, 16, 33, 49, 99];
function getDtCap(index) {
	return dtCaps[clamp(index, 0, dtCaps.length - 1)];
}

function updateUglyMode() {
	uglyMode = localStorage.uglyMode == "true";
}