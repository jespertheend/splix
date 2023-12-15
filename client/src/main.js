import "./globals.js";
import { getSelectedServer, initServerSelection } from "./network/serverSelection.js";

var GLOBAL_SPEED = 0.006;
var VIEWPORT_RADIUS = 30;
var MAX_ZOOM = 430;
// var MAX_ZOOM = 10000;
var BLOCKS_ON_SCREEN = 1100;
// var BLOCKS_ON_SCREEN = 20000;
var WAIT_FOR_DISCONNECTED_MS = 1000;
var USERNAME_SIZE = 6;

//stackoverflow.com/a/15666143/3625298
var MAX_PIXEL_RATIO = (function () {
	var ctx = document.createElement("canvas").getContext("2d"),
		dpr = window.devicePixelRatio || 1,
		bsr = ctx.webkitBackingStorePixelRatio ||
			ctx.mozBackingStorePixelRatio ||
			ctx.msBackingStorePixelRatio ||
			ctx.oBackingStorePixelRatio ||
			ctx.backingStorePixelRatio || 1;

	return dpr / bsr;
})();

var DeviceTypes = {
	DESKTOP: 0,
	IOS: 1,
	ANDROID: 2,
};

var deviceType = (function () {
	if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
		return DeviceTypes.IOS;
	}
	if (navigator.userAgent.toLowerCase().indexOf("android") > -1) {
		return DeviceTypes.ANDROID;
	}
	return DeviceTypes.DESKTOP;
})();
testHashForMobile();

var patreonQueryWasFound = checkPatreonQuery();

function redirectQuery() {
	var hashIndex = location.href.indexOf("#");
	var queryIndex = location.href.indexOf("?");
	if ((queryIndex >= 0 && (hashIndex == -1 || queryIndex < hashIndex)) || isIframe()) {
		if (!patreonQueryWasFound || isIframe()) {
			var allowedSearchParams = ["gp", "siteId", "channelId", "siteLocale", "storageId"];
			var query = parseQuery(location.href);
			for (var key in query) {
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

			var queryArr = [];
			for (var key in query) {
				if (query.hasOwnProperty(key)) {
					queryArr.push(window.encodeURIComponent(key) + "=" + window.encodeURIComponent(query[key]));
				}
			}
			var queryString = queryArr.join("&");
			if (queryString) queryString = "?" + queryString;
			var newLocation = location.href.split("?")[0] + queryString;
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

// Some dated code is using these in places like `for(i = 0`.
// While ideally these variables should all be made local,
// I'm worried some locations actually rely on them not being local.
// So for now these are all global, but we should slowly try to get rid of these.
var i, w;

var IS_SECURE = location.protocol.indexOf("https") >= 0;
// if(IS_SECURE && (["#nohttpsredirect", "#pledged"].indexOf(location.hash) < 0) && !isIframe() && !patreonQueryWasFound){
// 	location.protocol = "http:";
// }
var SECURE_WS = IS_SECURE ? "wss://" : "ws://";

// var flashIsInstalled = false;
// try {
// 	flashIsInstalled = Boolean(new ActiveXObject('ShockwaveFlash.ShockwaveFlash'));
// } catch(exception) {
// 	flashIsInstalled = ('undefined' != typeof navigator.mimeTypes['application/x-shockwave-flash']);
// }
// ga('set', 'dimension1', flashIsInstalled ? 'yes': 'no');
var SKIN_BLOCK_COUNT = 13;
var SKIN_PATTERN_COUNT = 28;
var ws = null, mainCanvas, ctx, prevTimeStamp = null, blocks = [], players = [];
var camPos = [0, 0], camPosSet = false, camPosPrevFrame = [0, 0], myNameAlphaTimer = 0;
var myPos = null,
	myPlayer = null,
	changeDirAt = null,
	changeDirAtIsHorizontal = false,
	myNextDir = 0,
	lastChangedDirPos = null;
var lastClientsideMoves = [],
	trailPushesDuringRequest = [],
	isRequestingMyTrail = false,
	skipTrailRequestResponse = false;
var mapSize = 2000, closedBecauseOfDeath = false, minimapCtx, beginScreenVisible = true, wsOnOpenTime;
var minimapCanvas;
var canvasQuality = 1,
	currentDtCap = 0,
	totalDeltaTimeFromCap = 0,
	deltaTime = 16.66,
	lerpedDeltaTime = 16.66,
	missedFrames = [],
	gainedFrames = [];
var myScoreElem,
	myKillsElem,
	myRealScoreElem,
	myRankElem,
	myRank = 0,
	myRankSent = false,
	totalPlayersElem,
	totalPlayers = 0;
var leaderboardElem, leaderboardDivElem, leaderboardHidden = localStorage.leaderboardHidden == "true";
var miniMapPlayer,
	playUI,
	beginScreen,
	notificationElem,
	formElem,
	nameInput,
	lastNameValue = "",
	lastNameChangeCheck = 0;
var scoreStatTarget = 25, scoreStat = 25, realScoreStatTarget = 25, realScoreStat = 25;
var linesCanvas, linesCtx, tempCanvas, tempCtx;
var showCouldntConnectAfterTransition = false, playingAndReady = false, canRunAds = false;
var transitionCanvas,
	tCtx,
	transitionTimer = 0,
	transitionPrevTimer = 0,
	transitionDirection = 1,
	transitionText = "GAME OVER";
var isTransitioning = false, transitionCallback1 = null, transitionCallback2 = null, transitionReverseOnHalf = false;
var tutorialCanvas, tutCtx, tutorialTimer = 0, tutorialPrevTimer = 0, tutorialBlocks, tutorialPlayers, tutorialText;
var touchControlsElem;
var skinButtonCanvas, skinButtonCtx, skinButtonBlocks = [], skinButtonShadow;
var skinCanvas, skinCtx, skinScreen, skinScreenVisible = false, skinScreenBlocks;
var titCanvas, titCtx, titleTimer = -1, resetTitleNextFrame = true, titleLastRender = 0;
var currentTouches = [], doRefreshAfterDie = false, pressedKeys = [];
var camPosOffset = [0, 0], camRotOffset = 0, camShakeForces = [];
var honkStartTime, lastHonkTime = 0, honkSfx = null;
var skipDeathTransition = false, allowSkipDeathTransition = false, deathTransitionTimeout = null;
var thisServerAvgPing = 0,
	thisServerDiffPing = 0,
	thisServerLastPing = 0,
	lastPingTime = 0,
	waitingForPing = false;
var closeNotification = null, connectionLostNotification = null;
var lastMyPosSetClientSideTime = 0,
	lastMyPosServerSideTime = 0,
	lastMyPosSetValidClientSideTime = 0,
	lastMyPosHasBeenConfirmed = false;
var uiElems = [], zoom, myColorId, uglyMode = false;
var hasReceivedChunkThisGame = false, didSendSecondReady = false;
var lastStatBlocks = 0,
	lastStatKills = 0,
	lastStatLbRank = 0,
	lastStatAlive = 0,
	lastStatNo1Time = 0,
	lastStatDeathType = 0,
	lastStatKiller = "";
var bestStatBlocks = 0, bestStatKills = 0, bestStatLbRank = 0, bestStatAlive = 0, bestStatNo1Time = 0;
var lastStatTimer = 0, lastStatCounter = 0, lastStatValueElem, bestStatValueElem;
var lastMousePos = [0, 0], mouseHidePos = [0, 0];
var joinButton,
	gamemodeDropDownEl;
var didConfirmOpenInApp = false;

//adinplay banner ads
var aiptag = window["aiptag"] = window["aiptag"] || {};
aiptag.cmd = aiptag.cmd || [];
aiptag.cmd.display = aiptag.cmd.display || [];
aiptag.cmd.player = aiptag.cmd.player || [];

var receiveAction = {
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
};

var sendAction = {
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
};

var colors = {
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

var titleLines = [
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

function addSocketWrapper() {
	if (typeof WebSocket == "undefined") {
		return;
	}

	var simulatedLatency = parseInt(localStorage.simulatedLatency) / 2;
	if (simulatedLatency > 0) {
		const RealWebSocket = WebSocket;
		const WrappedWebSocket = function (url) {
			var websocket = new RealWebSocket(url);
			websocket.binaryType = "arraybuffer";

			this.onclose = function () {};
			this.onopen = function () {};
			this.onmessage = function () {};

			var me = this;
			websocket.onclose = function () {
				window.setTimeout(function () {
					me.onclose();
				}, simulatedLatency);
			};
			websocket.onopen = function () {
				window.setTimeout(function () {
					me.onopen();
				}, simulatedLatency);
			};
			websocket.onmessage = function (data) {
				window.setTimeout(function () {
					me.onmessage(data);
				}, simulatedLatency);
			};
			this.send = function (data) {
				window.setTimeout(function () {
					websocket.send(data);
				}, simulatedLatency);
			};
			this.close = function () {
				window.setTimeout(function () {
					websocket.close();
				}, simulatedLatency);
			};
		};
		window.WebSocket = WrappedWebSocket.bind();
	}
}
addSocketWrapper();

function simpleRequest(url, cb) {
	var req = new XMLHttpRequest();
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
}

function trackGameStart() {
	// var idString = "";
	// if(localStorage.playId){
	// 	idString = "&id="+localStorage.playId;
	// }else{
	// 	//test if local storage is available
	// 	lsSet("playId","test");
	// 	if(localStorage.playId != "test"){
	// 		//doesn't work, set playId to do not track
	// 		idString = "&id=donottrack";
	// 	}
	// }
	// simpleRequest("http://stats.splix.io/play.php?type=0"+idString, function(response){
	// 	if(response){
	// 		lsSet("playId", response);
	// 	}
	// });
}

function countPlayGame() {
	var old = 0;
	if (localStorage.getItem("totalGamesPlayed") !== null) {
		old = localStorage.totalGamesPlayed;
	}
	old++;
	lsSet("totalGamesPlayed", old);
}

function generateServerLocation(originalLocationObj) {
	var port = IS_SECURE ? "7998" : "7999";
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
			var parent = this;
			this.ws.onmessage = function () {
				if (parent.waitingForPing) {
					var pingTime = Date.now() - parent.lastPingTime;
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
			var parent = this;
			this.ws6.onmessage = function () {
				if (parent.waitingForPing6) {
					var pingTime = Date.now() - parent.lastPingTime6;
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
				var pingTime = Date.now() - this.lastPingTime;
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
				var pingTime = Date.now() - this.lastPingTime6;
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

function startPingServers() {
	for (var i = 0; i < servers.length; i++) {
		var thisServer = servers[i];
		thisServer.initSocket();
		thisServer.initSocket6();
	}
}

//gets a block from the specified array,
//creates it if it doesn't exist yet
//if array is not specified it will default to the blocks[] array
function getBlock(x, y, array) {
	var block;
	if (array === undefined) {
		array = blocks;
	}
	for (var i = 0; i < array.length; i++) {
		block = array[i];
		if (block.x == x && block.y == y) {
			return block;
		}
	}
	//block doesn't exist, create it
	block = {
		x: x,
		y: y,
		currentBlock: -1,
		nextBlock: -1,
		animDirection: 0,
		animProgress: 0,
		animDelay: 0,
		lastSetTime: Date.now(),
		//changes the blockId with optional animatino
		//animateDelay defaults to 0
		//if animateDelay === false, don't do any animation at all
		setBlockId: function (blockId, animateDelay) {
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

				var isCurrentBlock = blockId == this.currentBlock;
				var isNextBlock = blockId == this.nextBlock;

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
		},
	};
	array.push(block);
	return block;
}

//gets a player from the the specified array,
//creates it if it doesn't exist yet
//if array is not specified it will default to the players[] array
function getPlayer(id, array) {
	var player;
	if (array === undefined) {
		array = players;
	}
	for (var i = 0; i < array.length; i++) {
		player = array[i];
		if (player.id == id) {
			return player;
		}
	}

	//player doesn't exist, create it
	player = {
		id: id,
		pos: [0, 0],
		drawPos: [-1, -1],
		drawPosSet: false,
		serverPos: [0, 0],
		dir: 0,
		isMyPlayer: id === 0,
		isDead: false,
		deathWasCertain: false,
		didUncertainDeathLastTick: false,
		isDeadTimer: 0,
		uncertainDeathPosition: [0, 0],
		die: function (deathWasCertain) {
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
					if (this.isMyPlayer) {
						doCamShakeDir(this.dir);
					}
					var prev = 0;
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
		},
		undoDie: function () {
			this.isDead = false;
		},
		deadAnimParts: [],
		deadAnimPartsRandDist: [],
		addHitLine: function (pos, color) {
			this.hitLines.push({
				pos: pos,
				vanishTimer: 0,
				color: color,
			});
		},
		hitLines: [],
		doHonk: function (time) {
			this.honkTimer = 0;
			this.honkMaxTime = time;
			if (this.name.toLowerCase() == "joris") {
				if (honkSfx == null) {
					honkSfx = new Audio("./static/honk.mp3");
				}
				honkSfx.play();
			}
		},
		moveRelativeToServerPosNextFrame: false, //if true, lastServerPosSentTime will be used instead of deltatime for one frame
		lastServerPosSentTime: 0,
		honkTimer: 0,
		honkMaxTime: 0,
		trails: [],
		name: "",
		skinBlock: 0,
		lastBlock: null,
		hasReceivedPosition: false,
	};
	array.push(player);
	if (player.isMyPlayer) {
		myPlayer = player;
	}
	return player;
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
	var lower = name.toLowerCase();

	if (lower == "denniskoe") {
		var s = document.body.style;
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

//sends name to websocket
function sendName() {
	var n = nameInput.value;
	if (n !== undefined && n !== null && n !== "" && n.trim() !== "") {
		wsSendMsg(sendAction.SET_USERNAME, n);
	}
}

function nameInputOnChange() {
	lsSet("name", nameInput.value);
}

//sends a legacy message which is required for older servers
function sendLegacyVersion() {
	wsSendMsg(sendAction.VERSION, {
		type: 0,
		ver: 28,
	});
}

//sends current skin to websocket
function sendSkin() {
	var blockColor = localStorage.getItem("skinColor");
	if (blockColor === null) {
		blockColor = 0;
	}
	var pattern = localStorage.getItem("skinPattern");
	if (pattern === null) {
		pattern = 0;
	}
	wsSendMsg(sendAction.SKIN, {
		blockColor: blockColor,
		pattern: pattern,
	});
}

function sendPatreonCode() {
	if (localStorage.patreonLastSplixCode !== "" && localStorage.patreonLastSplixCode !== undefined) {
		wsSendMsg(sendAction.PATREON_CODE, localStorage.patreonLastSplixCode);
	}
}

function parseDirKey(c) {
	var pd = false;
	//up
	if (c == 38 || c == 87 || c == 56 || c == 73) {
		sendDir(3);
		pd = true;
	}
	//left
	if (c == 37 || c == 65 || c == 52 || c == 74) {
		sendDir(2);
		pd = true;
	}
	//right
	if (c == 39 || c == 68 || c == 54 || c == 76) {
		sendDir(0);
		pd = true;
	}
	//down
	if (c == 40 || c == 83 || c == 50 || c == 75) {
		sendDir(1);
		pd = true;
	}
	//pause
	if (c == 80) {
		sendDir(4);
		pd = true;
	}
	//space
	if (c == 32 || c == 53) {
		honkStart();
		pd = true;
	}
	//enter
	if (c == 13) {
		doSkipDeathTransition();
		pd = true;
	}
	return pd;
}

//sends new direction to websocket
var lastSendDir = -1, lastSendDirTime = 0; //used to prevent spamming buttons
function sendDir(dir, skipQueue) {
	// console.log("======sendDir",dir, skipQueue);
	if (!ws || !myPos) {
		return false;
	}
	//myPlayer doesn't exist
	if (!myPlayer) {
		return false;
	}

	//prevent spamming sendDir function
	if (
		dir == lastSendDir && //if dir is same as old sendDir call
		(Date.now() - lastSendDirTime) < 0.7 / GLOBAL_SPEED // if last call was less than 'one block travel time' ago
	) {
		return false;
	}
	lastSendDir = dir;
	lastSendDirTime = Date.now();

	//dir is already the current direction, don't do anything
	if (myPlayer.dir == dir) {
		// console.log("already current direction, don't do anything");
		addSendDirQueue(dir, skipQueue);
		return false;
	}

	//if dir is the opposite direction
	if (
		(dir === 0 && myPlayer.dir == 2) ||
		(dir == 2 && myPlayer.dir === 0) ||
		(dir == 1 && myPlayer.dir == 3) ||
		(dir == 3 && myPlayer.dir == 1)
	) {
		// console.log("already opposite direction, don't send");
		addSendDirQueue(dir, skipQueue);
		return false;
	}

	//hide cursor
	mouseHidePos = [lastMousePos[0], lastMousePos[1]];
	document.body.style.cursor = "none";

	var horizontal = myPlayer.dir == 1 || myPlayer.dir == 3; //wether next direction is horizontal movement or not
	var coord = myPos[horizontal ? 1 : 0];
	var newPos = [myPos[0], myPos[1]];
	var roundCoord = Math.round(coord);
	newPos[horizontal ? 1 : 0] = roundCoord;

	// console.log("test already sent");

	//test if the coordinate being sent wasn't already sent earlier
	// console.log(lastChangedDirPos);
	if (
		(myPlayer.dir === 0 && newPos[0] <= lastChangedDirPos[0]) ||
		(myPlayer.dir == 1 && newPos[1] <= lastChangedDirPos[1]) ||
		(myPlayer.dir == 2 && newPos[0] >= lastChangedDirPos[0]) ||
		(myPlayer.dir == 3 && newPos[1] >= lastChangedDirPos[1])
	) {
		// console.log("same coordinate, don't send");
		addSendDirQueue(dir, skipQueue);
		return false;
	}

	var changeDirNow = false;
	var blockPos = coord - Math.floor(coord);
	if (myPlayer.dir <= 1) { //right or down
		if (blockPos < 0.45) {
			changeDirNow = true;
		}
	} else if (myPlayer.dir <= 3) { //left or up
		if (blockPos > 0.55) {
			changeDirNow = true;
		}
	} else { //paused
		changeDirNow = true;
	}

	// console.log("changeDirNow",changeDirNow);

	if (changeDirNow) {
		changeMyDir(dir, newPos);
	} else {
		myNextDir = dir;
		changeDirAt = roundCoord;
		changeDirAtIsHorizontal = horizontal;
		lastChangedDirPos = [newPos[0], newPos[1]];
	}
	lastMyPosSetClientSideTime = Date.now();
	if (lastMyPosHasBeenConfirmed) {
		lastMyPosSetValidClientSideTime = Date.now();
	}
	lastMyPosHasBeenConfirmed = false;
	// console.log("send ======= UPDATE_DIR ======",dir,newPos);
	wsSendMsg(sendAction.UPDATE_DIR, {
		dir: dir,
		coord: newPos,
	});
	return true;
}

var sendDirQueue = [];
function addSendDirQueue(dir, skip) {
	// console.log("adding sendDir to queue", dir, skip);
	if (!skip && sendDirQueue.length < 3) {
		sendDirQueue.push({
			dir: dir,
			addTime: Date.now(),
		});
	}
}

function changeMyDir(dir, newPos, extendTrail, isClientside) {
	// console.log("changeMyDir");
	myPlayer.dir = myNextDir = dir;
	myPlayer.pos = [newPos[0], newPos[1]];
	lastChangedDirPos = [newPos[0], newPos[1]];

	if (extendTrail === undefined) {
		extendTrail = true;
	}
	if (isClientside === undefined) {
		isClientside = true;
	}

	if (extendTrail) {
		trailPush(myPlayer);
	}

	if (isClientside) {
		lastClientsideMoves.push({
			dir: dir,
			pos: newPos,
		});
	}
}

function startRequestMyTrail() {
	isRequestingMyTrail = true;
	trailPushesDuringRequest = [];
	wsSendMsg(sendAction.REQUEST_MY_TRAIL);
}

function trailPush(player, pos) {
	if (player.trails.length > 0) {
		var lastTrail = player.trails[player.trails.length - 1].trail;
		if (lastTrail.length > 0) {
			var lastPos = lastTrail[lastTrail.length - 1];
			if (lastPos[0] != player.pos[0] || lastPos[1] != player.pos[1]) {
				if (pos === undefined) {
					pos = [player.pos[0], player.pos[1]];
				} else {
					pos = [pos[0], pos[1]];
				}
				lastTrail.push(pos);
				if (player.isMyPlayer && isRequestingMyTrail) {
					trailPushesDuringRequest.push(pos);
				}
			}
		}
	}
}

function honkStart() {
	honkStartTime = Date.now();
}

function honkEnd() {
	var now = Date.now();
	if (now > lastHonkTime) {
		var time = now - honkStartTime;
		time = clamp(time, 0, 1000);
		lastHonkTime = now + time;
		time = iLerp(0, 1000, time);
		time *= 255;
		time = Math.floor(time);
		wsSendMsg(sendAction.HONK, time);
		for (var playerI = 0; playerI < players.length; playerI++) {
			var player = players[playerI];
			if (player.isMyPlayer) {
				player.doHonk(Math.max(70, time));
			}
		}
	}
}

//when page is finished loading
window.onload = function () {
	//piwik
	// _paq = _paq || [];
	// _paq.push(["setDomains", ["*.splix.io"]]);
	// _paq.push(['trackPageView']);
	// _paq.push(['enableLinkTracking']);
	// (function() {
	//   var u="//139.59.211.221/";
	//   _paq.push(['setTrackerUrl', u+'piwik.php']);
	//   _paq.push(['setSiteId', '1']);
	//   var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
	//   g.type='text/javascript'; g.async=true; g.defer=true; g.src=u+'piwik.js'; s.parentNode.insertBefore(g,s);
	// })();

	mainCanvas = document.getElementById("mainCanvas");
	ctx = mainCanvas.getContext("2d");
	minimapCanvas = document.getElementById("minimapCanvas");
	minimapCtx = minimapCanvas.getContext("2d");
	linesCanvas = document.createElement("canvas");
	linesCtx = linesCanvas.getContext("2d");
	tempCanvas = document.createElement("canvas");
	tempCtx = tempCanvas.getContext("2d");
	transitionCanvas = document.getElementById("transitionCanvas");
	tCtx = transitionCanvas.getContext("2d");
	tutorialCanvas = document.getElementById("tutorialCanvas");
	tutCtx = tutorialCanvas.getContext("2d");
	tutorialText = document.getElementById("tutorialText");
	touchControlsElem = document.getElementById("touchControls");
	notificationElem = document.getElementById("notification");
	skinScreen = document.getElementById("skinScreen");
	skinCanvas = document.getElementById("skinScreenCanvas");
	skinCtx = skinCanvas.getContext("2d");
	lastStatValueElem = document.getElementById("lastStatsRight");
	bestStatValueElem = document.getElementById("bestStatsRight");
	joinButton = document.getElementById("joinButton");
	qualityText = document.getElementById("qualityText");
	uglyText = document.getElementById("uglyText");
	lifeBox = document.getElementById("lifeBox");
	adBox = document.getElementById("adbox");
	adBox2 = document.getElementById("adbox2");

	window.onkeydown = function (e) {
		var c = e.keyCode;
		if (pressedKeys.indexOf(c) < 0) {
			pressedKeys.push(c);

			var pd = parseDirKey(c);
			if (c == 79 && myPos) {
				leaderboardHidden = !leaderboardHidden;
				setLeaderboardVisibility();
				lsSet("leaderboardHidden", leaderboardHidden);
			}

			if (pd && playingAndReady) {
				e.preventDefault();
			}
		}
	};
	window.onkeyup = function (e) {
		var c = e.keyCode;
		var index = pressedKeys.indexOf(c);
		pressedKeys.splice(index, 1);
		//space
		if (c == 32 || c == 53) {
			honkEnd();
		}

		//senddir of still holding keys
		for (var i = 0; i < pressedKeys.length; i++) {
			parseDirKey(pressedKeys[i]);
		}
	};
	window.addEventListener("blur", function (event) {
		pressedKeys = [];
	}, false);
	bindSwipeEvents();
	window.oncontextmenu = function (e) {
		if (e.target.nodeName.toLowerCase() == "embed") {
			return true;
		} else {
			e.preventDefault();
			return false;
		}
	};
	myScoreElem = document.getElementById("blockCaptureCount");
	myRealScoreElem = document.getElementById("score");
	myKillsElem = document.getElementById("myKills");
	myRankElem = document.getElementById("myRank");
	totalPlayersElem = document.getElementById("totalPlayers");
	leaderboardElem = document.createElement("tbody");
	var table = document.createElement("table");
	table.appendChild(leaderboardElem);
	leaderboardDivElem = document.getElementById("leaderboard");
	leaderboardDivElem.appendChild(table);
	uiElems.push(leaderboardDivElem);
	miniMapPlayer = document.getElementById("miniMapPlayer");
	beginScreen = document.getElementById("beginScreen");
	playUI = document.getElementById("playUI");
	uiElems.push(document.getElementById("scoreBlock"));
	uiElems.push(document.getElementById("miniMap"));
	// closeNotification = document.getElementById("closeNotification");
	// uiElems.push(closeNotification);
	prerollElem = document.getElementById("preroll");

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

	//show cursor
	window.addEventListener("click", showCursor);
	window.addEventListener("mousemove", function (e) {
		lastMousePos = [e.screenX, e.screenY];
		var distX = lastMousePos[0] - mouseHidePos[0];
		var distY = lastMousePos[1] - mouseHidePos[1];
		var dist = Math.sqrt(Math.pow(distX, 2) + Math.pow(distY, 2));
		if (dist > 15) {
			showCursor();
		}
	});

	//quality button
	qualityText.onclick = toggleQuality;
	uglyText.onclick = toggleUglyMode;
	setQuality();
	setUglyText();

	initTutorial();
	initSkinScreen();
	initTitle();
	setLeaderboardVisibility();

	//pledged
	if (location.hash.indexOf("#pledged") === 0) {
		var hrefQuerry = parseQuery(location.href);
		if (!("action" in hrefQuerry) || ["update", "create"].indexOf(hrefQuerry.action) != -1) {
			setPatreonOverlay(true);
		}
	}
	requestPatreonPledgeData();

	//init video ads if refreshed during ad
	if (localStorage.refreshDuringAd) {
		initVideoAdsScript();
	}

	//banner ads
	if (testPatreonAdsAllowed()) {
		setUpAdBoxContent();
		var script = document.createElement("script");
		script.src = "//api.adinplay.com/libs/aiptag/pub/JTE/splix.io/tag.min.js";
		script.type = "text/javascript";
		document.head.appendChild(script);
		refreshBanner();
	}

	//best stats
	bestStatBlocks = Math.max(bestStatBlocks, localStorage.getItem("bestStatBlocks"));
	bestStatKills = Math.max(bestStatKills, localStorage.getItem("bestStatKills"));
	bestStatLbRank = Math.max(bestStatLbRank, localStorage.getItem("bestStatLbRank"));
	bestStatAlive = Math.max(bestStatAlive, localStorage.getItem("bestStatAlive"));
	bestStatNo1Time = Math.max(bestStatNo1Time, localStorage.getItem("bestStatNo1Time"));

	initServerSelection();

	document.getElementById("serverSelect").addEventListener(
		"change",
		(e) => localStorage.setItem("lastSelectedEndpoint", e.target.value),
	);

	window.requestAnimationFrame(loop);

	var devString = IS_DEV_BUILD ? " (dev build)" : "";
	console.log(
		"%c splix.io %c\n\n\nversion " + CLIENT_VERSION + " loaded" + devString,
		"color: #a22929; font-size: 50px; font-family: arial; text-shadow: 1px 1px #7b1e1e, 2px 2px #7b1e1e;",
		"",
	);
};

//when WebSocket connection is established
function onOpen() {
	isConnecting = false;
	sendLegacyVersion();
	sendPatreonCode();
	sendName();
	sendSkin();
	wsSendMsg(sendAction.READY);
	if (playingAndReady) {
		onConnectOrMiddleOfTransition();
	}
	// ga("send","event","Game","game_start");
	trackGameStart();
	countPlayGame();
	// _paq.push(['trackEvent', 'Game', 'game_start']);
	wsOnOpenTime = Date.now();
}

//called when successfully connected and when the transition is full screen
function onConnectOrMiddleOfTransition() {
	hideSkinScreen();
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
	mainCanvas.style.display = null;
	if ("ontouchstart" in window) {
		touchControlsElem.style.display = null;
	}
	myNameAlphaTimer = 0;
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
	setAdBoxLeft();
}

function hideMainCanvas() {
	playUI.style.display = "none";
	mainCanvas.style.display = "none";
	touchControlsElem.style.display = "none";
}

function showSkinScreen() {
	skinScreenVisible = true;
	skinScreen.style.display = null;
}

function hideSkinScreen() {
	skinScreenVisible = false;
	skinScreen.style.display = "none";
}

function openSkinScreen() {
	hideBegin();
	showSkinScreen();
}

//hides main canvas and ui and shows beginScreen
function showBeginHideMainCanvas() {
	showBegin();
	hideMainCanvas();
}

function showBeginHideSkin() {
	showBegin();
	hideSkinScreen();
}

//when WebSocket connection is closed
function onClose() {
	if (!!ws && ws.readyState == WebSocket.OPEN) {
		ws.close();
	}
	if (!playingAndReady) {
		if (!isTransitioning) {
			if (couldntConnect()) {
				showBeginHideMainCanvas();
			}
		} else {
			showCouldntConnectAfterTransition = true;
		}
	} else if (!closedBecauseOfDeath) {
		doTransition("", false, resetAll);
		// ga("send","event","Game","lost_connection_mid_game");
		// _paq.push(['trackEvent', 'Game', 'lost_connection_mid_game']);
		setNotification("The connection was lost :/");
	} else { //disconnect because of death
		// var gameTime = Date.now() - wsOnOpenTime;
		// ga("send","timing","Game","game_session_time", gameTime);
		// _paq.push(['trackEvent', 'Game', 'game_session', 'time', gameTime]);
	}
	ws = null;
	isConnecting = false;
}

//if trying to establish a connection but failed
//returns true if it actually couldn't connect,
//false if it will try again
function couldntConnect() {
	setNotification("Couldn't connect to the server :/");
	var err = new Error("couldntConnectError");
	console.log(err.stack);
	isTransitioning = true;
	return true;
}

//called by form, connects with transition and error handling
var isConnectingWithTransition = false;
function connectWithTransition(dontDoAds) {
	if (!isConnectingWithTransition && !isWaitingForAd) {
		isConnectingWithTransition = true;
		if (doConnect(dontDoAds)) {
			doTransition("", false, function () {
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

//starts websocket connection
//return true if it should start the transition on submit
var isConnecting = false;
function doConnect(dontDoAds) {
	if (!ws && !isConnecting && !isTransitioning) {
		if (canRunAds && !dontDoAds && testPatreonAdsAllowed()) {
			var adCounter = getAdCounter();
			var lastAdTime = localStorage.lastAdTime;
			lastAdTime = parseInt(lastAdTime);
			lastAdTime = Date.now() - lastAdTime;
			if (adCounter == 1 || (!isNaN(lastAdTime) && lastAdTime > 300000)) {
				displayAd();
				return false;
			} else {
				countAd();
			}
		}
		isConnecting = true;
		showCouldntConnectAfterTransition = false;
		closedBecauseOfDeath = false;
		// if(!serversRequestDone){
		// 	console.log("set true 2 ");
		// 	doConnectAfterServersGet = true;
		// 	return true;
		// }
		var server = getSelectedServer();
		if (!server) {
			onClose();
			return false;
		}
		thisServerAvgPing = thisServerLastPing = 0;
		ws = new WebSocket(server);
		ws.binaryType = "arraybuffer";
		ws.onmessage = function (evt) {
			if (ws == this) {
				onMessage(evt);
			}
		};
		ws.onclose = function (evt) {
			if (ws == this) {
				onClose(evt);
			}
		};
		ws.onopen = function (evt) {
			if (ws == this) {
				onOpen(evt);
			}
		};
		return true;
	}
	return false;
}

//when receiving a message from the websocket
function onMessage(evt) {
	// console.log(evt);
	var x, y, type, id, player, w, h, block, i, j, nameBytes;
	var data = new Uint8Array(evt.data);
	// console.log(evt.data);
	// for(var key in receiveAction){
	// 	if(receiveAction[key] == data[0]){
	// 		console.log(key);
	// 	}
	// }
	if (data[0] == receiveAction.UPDATE_BLOCKS) {
		x = bytesToInt(data[1], data[2]);
		y = bytesToInt(data[3], data[4]);
		type = data[5];
		block = getBlock(x, y);
		block.setBlockId(type);
	}
	if (data[0] == receiveAction.PLAYER_POS) {
		x = bytesToInt(data[1], data[2]);
		y = bytesToInt(data[3], data[4]);
		id = bytesToInt(data[5], data[6]);
		player = getPlayer(id);
		player.hasReceivedPosition = true;
		player.moveRelativeToServerPosNextFrame = true;
		player.lastServerPosSentTime = Date.now();
		lastMyPosHasBeenConfirmed = true;
		var newDir = data[7];
		var newPos = [x, y];
		var newPosOffset = [x, y];

		//add distance traveled during server delay (ping/2)
		var posOffset = 0;
		if (player.isMyPlayer || thisServerAvgPing > 50) {
			posOffset = thisServerAvgPing / 2 * GLOBAL_SPEED;
		}
		movePos(newPosOffset, newDir, posOffset);

		var doSetPos = true;
		if (player.isMyPlayer) {
			lastMyPosServerSideTime = Date.now();
			// console.log("current dir:",player.dir, "myNextDir", myNextDir, "newDir", newDir);
			// console.log("newPosOffset",newPosOffset, "player.pos", player.pos);

			//if dir and pos are close enough to the current dir and pos
			if (
				(player.dir == newDir || myNextDir == newDir) &&
				Math.abs(newPosOffset[0] - player.pos[0]) < 1 &&
				Math.abs(newPosOffset[1] - player.pos[1]) < 1
			) {
				// console.log("newPosOffset",newPosOffset);
				// console.log("doSetPos is false because dir and pos are close enough to current dir and pos");
				doSetPos = false;
			}

			//if dir and pos are the first item of lastClientsideMoves
			//when two movements are made shortly after each other the
			//previous check (dir && pos) won't suffice, eg:
			// client makes move #1
			// client makes move #2
			// receives move #1 <-- different from current dir & pos
			// recieves move #2
			// console.log(lastClientsideMoves);
			if (lastClientsideMoves.length > 0) {
				var lastClientsideMove = lastClientsideMoves.shift();
				if (
					lastClientsideMove.dir == newDir &&
					lastClientsideMove.pos[0] == newPos[0] &&
					lastClientsideMove.pos[1] == newPos[1]
				) {
					doSetPos = false;
					// console.log("new dir is same as last isClientside move");
					// console.log("doSetPos = false;");
				} else {
					lastClientsideMoves = [];
					// console.log("empty lastClientsideMoves");
				}
			}

			if (player.dir == 4 || newDir == 4) { //is paused or is about to be paused
				// console.log("player.dir == 4 or newDir == 4, doSetPos = true");
				doSetPos = true;
			}

			// console.log("doSetPos:",doSetPos);
			if (doSetPos) {
				// console.log("==================doSetPos is true================");
				myNextDir = newDir;
				changeMyDir(newDir, newPos, false, false);
				//doSetPos is true, so the server thinks the player is somewhere
				//else than the client thinks he is. To prevent the trail from
				//getting messed up, request the full trail
				startRequestMyTrail();
				sendDirQueue = [];
			}

			//always set the server position
			player.serverPos = [newPosOffset[0], newPosOffset[1]];
			player.serverDir = newDir;

			removeBlocksOutsideViewport(player.pos);
		} else {
			player.dir = newDir;
		}

		if (doSetPos) {
			player.pos = newPosOffset;
			// console.log("doSetPos",newPosOffset);

			var extendTrailFlagSet = data.length > 8;
			if (extendTrailFlagSet) {
				var extendTrail = data[8] == 1;
				if (extendTrail) {
					trailPush(player, newPos);
				} else {
					player.trails.push({
						trail: [],
						vanishTimer: 0,
					});
				}
			}
		}

		if (!player.drawPosSet) {
			player.drawPos = [player.pos[0], player.pos[1]];
			player.drawPosSet = true;
		}
	}
	if (data[0] == receiveAction.FILL_AREA) {
		x = bytesToInt(data[1], data[2]);
		y = bytesToInt(data[3], data[4]);
		w = bytesToInt(data[5], data[6]);
		h = bytesToInt(data[7], data[8]);
		type = data[9];
		const pattern = data[10];
		const isEdgeChunk = data[11];
		fillArea(x, y, w, h, type, pattern, undefined, isEdgeChunk);
	}
	if (data[0] == receiveAction.SET_TRAIL) {
		id = bytesToInt(data[1], data[2]);
		player = getPlayer(id);
		var newTrail = [];
		//wether the new trail should replace the old trail (don't play animation)
		//or append it to the trails list (do play animation)
		var replace = false;
		for (i = 3; i < data.length; i += 4) {
			var coord = [bytesToInt(data[i], data[i + 1]), bytesToInt(data[i + 2], data[i + 3])];
			newTrail.push(coord);
		}
		if (player.isMyPlayer) {
			if (skipTrailRequestResponse) {
				skipTrailRequestResponse = false;
				trailPushesDuringRequest = [];
			} else {
				if (isRequestingMyTrail) {
					isRequestingMyTrail = false;
					replace = true;
					for (i = 0; i < trailPushesDuringRequest.length; i++) {
						newTrail.push(trailPushesDuringRequest[i]);
					}
					trailPushesDuringRequest = [];
				}
				//if last trail was emtpy (if entering enemy land) send a request for the new trail
				if (player.trails.length > 0) {
					var lastTrail = player.trails[player.trails.length - 1];
					if (lastTrail.trail.length <= 0 && newTrail.length > 0) {
						startRequestMyTrail();
					}
				}
			}
		}
		if (replace) {
			if (player.trails.length > 0) {
				var last = player.trails[player.trails.length - 1];
				last.trail = newTrail;
				last.vanishTimer = 0;
			} else {
				replace = false;
			}
		}
		if (!replace) {
			player.trails.push({
				trail: newTrail,
				vanishTimer: 0,
			});
		}
	}
	if (data[0] == receiveAction.EMPTY_TRAIL_WITH_LAST_POS) {
		id = bytesToInt(data[1], data[2]);
		player = getPlayer(id);
		if (player.trails.length > 0) {
			var prevTrail = player.trails[player.trails.length - 1].trail;
			if (prevTrail.length > 0) {
				x = bytesToInt(data[3], data[4]);
				y = bytesToInt(data[5], data[6]);
				prevTrail.push([x, y]);
			}
		}

		//fix for trailing while in own land
		//when your ping is high and trail very short
		//(one block or so) you'll start trailing
		//in your own land. It's a ghost trail and you make
		//ghost deaths every time you hit the line
		if (player.isMyPlayer && isRequestingMyTrail) {
			skipTrailRequestResponse = true;
		}

		player.trails.push({
			trail: [],
			vanishTimer: 0,
		});
	}
	if (data[0] == receiveAction.PLAYER_DIE) {
		id = bytesToInt(data[1], data[2]);
		player = getPlayer(id);
		if (data.length > 3) {
			x = bytesToInt(data[3], data[4]);
			y = bytesToInt(data[5], data[6]);
			player.pos = [x, y];
		}
		player.die(true);
	}
	if (data[0] == receiveAction.CHUNK_OF_BLOCKS) {
		x = bytesToInt(data[1], data[2]);
		y = bytesToInt(data[3], data[4]);
		w = bytesToInt(data[5], data[6]);
		h = bytesToInt(data[7], data[8]);
		i = 9;
		for (j = x; j < x + w; j++) {
			for (var k = y; k < y + h; k++) {
				block = getBlock(j, k);
				block.setBlockId(data[i], false);
				i++;
			}
		}
		if (!hasReceivedChunkThisGame) {
			hasReceivedChunkThisGame = true;
			wsSendMsg(sendAction.READY);
			didSendSecondReady = true;
		}
	}
	if (data[0] == receiveAction.REMOVE_PLAYER) {
		id = bytesToInt(data[1], data[2]);
		for (i = players.length - 1; i >= 0; i--) {
			player = players[i];
			if (id == player.id) {
				players.splice(i, 1);
			}
		}
	}
	if (data[0] == receiveAction.PLAYER_NAME) {
		id = bytesToInt(data[1], data[2]);
		nameBytes = data.subarray(3, data.length);
		var name = Utf8ArrayToStr(nameBytes);
		player = getPlayer(id);
		player.name = filter(name);
	}
	if (data[0] == receiveAction.MY_SCORE) {
		var score = bytesToInt(data[1], data[2], data[3], data[4]);
		var kills = 0;
		if (data.length > 5) {
			kills = bytesToInt(data[5], data[6]);
		}
		scoreStatTarget = score;
		realScoreStatTarget = score + kills * 500;
		myKillsElem.innerHTML = kills;
	}
	if (data[0] == receiveAction.MY_RANK) {
		myRank = bytesToInt(data[1], data[2]);
		myRankSent = true;
		updateStats();
	}
	if (data[0] == receiveAction.LEADERBOARD) {
		leaderboardElem.innerHTML = "";
		totalPlayers = bytesToInt(data[1], data[2]);
		updateStats();
		i = 3;
		var rank = 1;
		while (true) {
			if (i >= data.length) {
				break;
			}
			var thisPlayerScore = bytesToInt(data[i], data[i + 1], data[i + 2], data[i + 3]);
			var nameLen = data[i + 4];
			nameBytes = data.subarray(i + 5, i + 5 + nameLen);
			var thisPlayerName = Utf8ArrayToStr(nameBytes);

			//create table row
			var tr = document.createElement("tr");
			tr.className = "scoreRank";
			var rankElem = document.createElement("td");
			rankElem.innerHTML = "#" + rank;
			tr.appendChild(rankElem);
			var nameElem = document.createElement("td");
			nameElem.innerHTML = filter(htmlEscape(thisPlayerName));
			tr.appendChild(nameElem);
			var scoreElem = document.createElement("td");
			scoreElem.innerHTML = thisPlayerScore;
			tr.appendChild(scoreElem);
			leaderboardElem.appendChild(tr);

			i = i + 5 + nameLen;
			rank++;
		}
		if (totalPlayers < 30 && doRefreshAfterDie && closeNotification === null) {
			closeNotification = doTopNotification("This server is about to close, refresh to join a full server.");
		}
	}
	if (data[0] == receiveAction.MAP_SIZE) {
		mapSize = bytesToInt(data[1], data[2]);
	}
	if (data[0] == receiveAction.YOU_DED) {
		if (data.length > 1) {
			lastStatBlocks = bytesToInt(data[1], data[2], data[3], data[4]);
			if (lastStatBlocks > bestStatBlocks) {
				bestStatBlocks = lastStatBlocks;
				lsSet("bestStatBlocks", bestStatBlocks);
			}
			lastStatKills = bytesToInt(data[5], data[6]);
			if (lastStatKills > bestStatKills) {
				bestStatKills = lastStatKills;
				lsSet("bestStatKills", bestStatKills);
			}
			lastStatLbRank = bytesToInt(data[7], data[8]);
			if ((lastStatLbRank < bestStatLbRank || bestStatLbRank <= 0) && lastStatLbRank > 0) {
				bestStatLbRank = lastStatLbRank;
				lsSet("bestStatLbRank", bestStatLbRank);
			}
			lastStatAlive = bytesToInt(data[9], data[10], data[11], data[12]);
			if (lastStatAlive > bestStatAlive) {
				bestStatAlive = lastStatAlive;
				lsSet("bestStatAlive", bestStatAlive);
			}
			lastStatNo1Time = bytesToInt(data[13], data[14], data[15], data[16]);
			if (lastStatNo1Time > bestStatNo1Time) {
				bestStatNo1Time = lastStatNo1Time;
				lsSet("bestStatNo1Time", bestStatNo1Time);
			}
			lastStatDeathType = data[17];
			lastStatKiller = "";
			document.getElementById("lastStats").style.display = null;
			document.getElementById("bestStats").style.display = null;
			lastStatCounter = 0;
			lastStatTimer = 0;
			lastStatValueElem.innerHTML = bestStatValueElem.innerHTML = "";
			switch (lastStatDeathType) {
				case 1:
					if (data.length > 18) {
						nameBytes = data.subarray(18, data.length);
						lastStatKiller = Utf8ArrayToStr(nameBytes);
					}
					break;
				case 2:
					lastStatKiller = "the wall";
					break;
				case 3:
					lastStatKiller = "yourself";
					break;
			}
		}
		closedBecauseOfDeath = true;
		allowSkipDeathTransition = true;
		hideBanners();
		refreshBanner();
		//show newsbox
		document.getElementById("newsbox").style.display = null;
		deathTransitionTimeout = window.setTimeout(function () {
			// resetAll();
			if (skipDeathTransition) {
				doTransition("", false, function () {
					onClose();
					resetAll();
				});
			} else {
				// console.log("before doTransition",isTransitioning);
				doTransition("GAME OVER", true, null, function () {
					onClose();
					resetAll();
					initVideoAdsScript();
				}, true);
				// console.log("after doTransition",isTransitioning);
			}
			deathTransitionTimeout = null;
		}, 1000);
	}
	if (data[0] == receiveAction.MINIMAP) {
		var part = data[1];
		var xOffset = part * 20;
		minimapCtx.clearRect(xOffset * 2, 0, 40, 160);
		minimapCtx.fillStyle = "#000000";
		for (i = 1; i < data.length; i++) {
			for (j = 0; j < 8; j++) {
				var filled = (data[i] & (1 << j)) !== 0;
				if (filled) {
					var bitNumber = (i - 2) * 8 + j;
					x = Math.floor(bitNumber / 80) % 80 + xOffset;
					y = bitNumber % 80;
					minimapCtx.fillRect(x * 2, y * 2, 2, 2);
				}
			}
		}
	}
	if (data[0] == receiveAction.PLAYER_SKIN) {
		id = bytesToInt(data[1], data[2]);
		player = getPlayer(id);
		if (player.isMyPlayer) {
			myColorId = data[3];
			colorUI();
		}
		player.skinBlock = data[3];
	}
	if (data[0] == receiveAction.READY) {
		playingAndReady = true;
		if (!isTransitioning) {
			isTransitioning = true;
			onConnectOrMiddleOfTransition();
		}
	}
	if (data[0] == receiveAction.PLAYER_HIT_LINE) {
		id = bytesToInt(data[1], data[2]);
		player = getPlayer(id);
		var pointsColor = getColorForBlockSkinId(data[3]);
		x = bytesToInt(data[4], data[5]);
		y = bytesToInt(data[6], data[7]);
		var hitSelf = false;
		if (data.length > 8) {
			hitSelf = data[8] == 1;
		}
		player.addHitLine([x, y], pointsColor, hitSelf);
		if (player.isMyPlayer && !hitSelf) {
			doCamShakeDir(player.dir, 10, false);
		}
	}
	if (data[0] == receiveAction.REFRESH_AFTER_DIE) {
		doRefreshAfterDie = true;
	}
	if (data[0] == receiveAction.PLAYER_HONK) {
		id = bytesToInt(data[1], data[2]);
		player = getPlayer(id);
		var time = data[3];
		player.doHonk(time);
	}
	if (data[0] == receiveAction.PONG) {
		var ping = Date.now() - lastPingTime;
		var thisDiff = Math.abs(ping - thisServerLastPing);
		thisServerDiffPing = Math.max(thisServerDiffPing, thisDiff);
		thisServerDiffPing = lerp(thisDiff, thisServerDiffPing, 0.5);
		thisServerAvgPing = lerp(thisServerAvgPing, ping, 0.5);
		thisServerLastPing = ping;
		lastPingTime = Date.now();
		waitingForPing = false;
	}
	if (data[0] == receiveAction.UNDO_PLAYER_DIE) {
		id = bytesToInt(data[1], data[2]);
		player = getPlayer(id);
		player.undoDie();
	}
	if (data[0] == receiveAction.TEAM_LIFE_COUNT) {
		var currentLives = data[1];
		var totalLives = data[2];
		setLives(currentLives, totalLives);
	}
}

//send a message to the websocket, returns true if successful
function wsSendMsg(action, data) {
	var utf8Array;
	if (!!ws && ws.readyState == WebSocket.OPEN) {
		var array = [action];
		if (action == sendAction.UPDATE_DIR) {
			array.push(data.dir);
			var coordBytesX = intToBytes(data.coord[0], 2);
			array.push(coordBytesX[0]);
			array.push(coordBytesX[1]);
			var coordBytesY = intToBytes(data.coord[1], 2);
			array.push(coordBytesY[0]);
			array.push(coordBytesY[1]);
		}
		if (
			action == sendAction.SET_USERNAME || action == sendAction.SET_TEAM_USERNAME ||
			action == sendAction.PATREON_CODE
		) {
			utf8Array = toUTF8Array(data);
			array.push.apply(array, utf8Array);
		}
		if (action == sendAction.SKIN) {
			array.push(data.blockColor);
			array.push(data.pattern);
		}
		if (action == sendAction.REQUEST_CLOSE) {
			for (var i = 0; i < data.length; i++) {
				array.push(data[i]);
			}
		}
		if (action == sendAction.HONK) {
			array.push(data);
		}
		if (action == sendAction.MY_TEAM_URL) {
			utf8Array = toUTF8Array(data);
			array.push.apply(array, utf8Array);
		}
		if (action == sendAction.VERSION) {
			array.push(data.type);
			var verBytes = intToBytes(data.ver, 2);
			array.push(verBytes[0]);
			array.push(verBytes[1]);
		}
		var payload = new Uint8Array(array);
		try {
			ws.send(payload);
			return true;
		} catch (ex) {
			console.log("error sending message", action, data, array, ex);
		}
	}
	return false;
}

//basically like refreshing the page
function resetAll() {
	if (!!ws && ws.readyState == WebSocket.OPEN) {
		ws.close();
	}
	ws = null;
	isConnecting = false;
	blocks = [];
	players = [];
	camPosSet = false;
	beginScreenVisible = true;
	updateCmpPersistentLinkVisibility();
	myPos = null;
	myRank = 0;
	scoreStat =
		scoreStatTarget =
		realScoreStat =
		realScoreStatTarget =
			25;
	myRankSent = false;
	totalPlayers = 0;
	playingAndReady = false;
	camShakeForces = [];
	resetTitleNextFrame = true;
	allowSkipDeathTransition = false;
	skipDeathTransition = false;
	minimapCtx.clearRect(0, 0, 160, 160);
	hasReceivedChunkThisGame = false;
	didSendSecondReady = false;
	showBeginHideMainCanvas();
	if (doRefreshAfterDie) {
		location.reload();
	}
	var s = document.body.style;
	s.webkitFilter = s.filter = null;
	for (var topNotificationI = currentTopNotifications.length - 1; topNotificationI >= 0; topNotificationI--) {
		var thisTopNotification = currentTopNotifications[topNotificationI];
		thisTopNotification.destroy();
	}
	currentTopNotifications = [];
	sendDirQueue = [];
	clearAllLives();
}

//initiate tutorialBlocks and tutorialPlayers
function initTutorial() {
	tutorialBlocks = [];
	for (var x = 0; x < 10; x++) {
		for (var y = 0; y < 10; y++) {
			var block = getBlock(x, y, tutorialBlocks);
			var id = 1;
			if (x >= 1 && x <= 3 && y >= 1 && y <= 3) {
				id = 10;
			}
			block.setBlockId(id, false);
		}
	}
	tutorialPlayers = [];
	var p1 = getPlayer(1, tutorialPlayers);
	p1.skinBlock = 8;
	p1.hasReceivedPosition = true;
	var p2 = getPlayer(2, tutorialPlayers);
	p2.skinBlock = 0;
	p2.pos = [-2, 7];
	p2.hasReceivedPosition = true;
}

//initiate skinScreenBlocks and buttons
function initSkinScreen() {
	skinButtonCanvas = document.getElementById("skinButton");
	skinButtonShadow = document.getElementById("skinButtonShadow");
	skinButtonCtx = skinButtonCanvas.getContext("2d");
	skinButtonCanvas.onclick = function () {
		if (!ws && !isTransitioning && !playingAndReady) {
			doTransition("", false, openSkinScreen);
		}
	};

	var currentColor = localStorage.getItem("skinColor");
	if (currentColor === null) {
		currentColor = 0;
	}
	currentColor = parseInt(currentColor);

	var currentPattern = localStorage.getItem("skinPattern");
	if (currentPattern === null) {
		currentPattern = 0;
	}
	currentPattern = parseInt(currentPattern);

	skinScreenBlocks = [];
	fillArea(0, 0, VIEWPORT_RADIUS * 2, VIEWPORT_RADIUS * 2, currentColor + 1, currentPattern, skinScreenBlocks);

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
	block.setBlockId(currentColor + 1, false);

	skinButtonCanvas.onmouseover = function () {
		var currentColor = localStorage.getItem("skinColor");
		if (currentColor === null) {
			currentColor = 0;
		}
		currentColor = parseInt(currentColor);
		if (currentColor > 0) {
			skinButtonBlocks[0].setBlockId(currentColor + 1 + SKIN_BLOCK_COUNT, false);
		}
	};
	skinButtonCanvas.onmouseout = function () {
		var currentColor = localStorage.getItem("skinColor");
		if (currentColor === null) {
			currentColor = 0;
		}
		skinButtonBlocks[0].setBlockId(parseInt(currentColor) + 1, false);
	};
}

//initiate title players
function initTitle() {
	for (var lineI = 0; lineI < titleLines.length; lineI++) {
		var thisLine = titleLines[lineI];
		for (var subLineI = 0; subLineI < thisLine.line.length; subLineI++) {
			var thisSubLine = thisLine.line[subLineI];
			for (var coordI = 0; coordI < thisSubLine.length; coordI += 2) {
				thisSubLine[coordI] += thisLine.posOffset[0] - 40;
				thisSubLine[coordI + 1] += thisLine.posOffset[1] - 20;
			}
		}
	}
	titCanvas = document.getElementById("logoCanvas");
	titCtx = titCanvas.getContext("2d");
}

function testHashForMobile() {
	if (deviceType != DeviceTypes.DESKTOP) {
		var hash = location.hash;
		if (hash != "" && hash != "#pledged") {
			var confirmText = "Would you like to join this server in the app?";
			if (confirm(confirmText)) {
				didConfirmOpenInApp = true;
				openSplixApp(hash.substring(1, hash.length));
			}
		}
	}
}

function openSplixApp(data) {
	var url = location.href = "splix://" + data;
	if (deviceType == DeviceTypes.ANDROID && navigator.userAgent.toLowerCase().indexOf("chrome") > -1) {
		window.document.body.innerHTML = "Chrome doesn't like auto redirecting, click <a href=\"" + url +
			'">here</a> to open the splix.io app.';
	}
}

//request canrunads js
var canRunAdsRequested = false;
function requestCanRunAds() {
	if (!canRunAdsRequested && testPatreonAdsAllowed()) {
		fetch("https://api.adinplay.com/libs/aiptag/pub/JTE/splix.io/tag.min.js", { mode: "no-cors" }).then(
			function () {
				canRunAds = true;
				canRunAdsRequested = true;
			},
			function () {
				//failed, can't run ads
				canRunAdsRequested = true;
			},
		);
	}
}

var initVidAdsCalled = false;
var adplayer;
function initVideoAdsScript() {
	requestCanRunAds();

	if (!initVidAdsCalled && testPatreonAdsAllowed()) {
		initVidAdsCalled = true;
		aiptag.cmd.player.push(function () {
			adplayer = new aipPlayer({
				AD_WIDTH: 960,
				AD_HEIGHT: 540,
				AD_FULLSCREEN: false,
				AD_CENTERPLAYER: false,
				LOADING_TEXT: "loading advertisement",
				PREROLL_ELEM: function () {
					return prerollElem;
				},
				AIP_COMPLETE: function (AD_TYPE) {
					console.log("Ad: " + AD_TYPE + " Completed");
					onAdFinish();
				},
				AIP_REMOVE: function () {},
			});
		});
	}
}

var prerollElem, isWaitingForAd = false, boltIsRendered = false;
function displayAd() {
	isWaitingForAd = true;
	formElem.style.display = "none";
	prerollElem.style.display = null;

	aiptag.cmd.player.push(function () {
		adplayer.startPreRoll();
	});
	onAdLoaded();

	scrollAd();
}

var prerollIsVisible = false;
function onAdLoaded(evt) {
	lsSet("refreshDuringAd", "true");
	prerollIsVisible = true;
	hideBanners();
}

function scrollAd() {
	var top = prerollElem.offsetTop;
	var bottom = top + prerollElem.offsetHeight;
	var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
	var scrollBottom = scrollTop + window.innerHeight;
	var middle = (top + bottom) / 2;
	if (top < scrollTop || bottom > scrollBottom) {
		window.scroll(0, middle - window.innerHeight / 2);
	}
}

function onAdFinish() {
	countAd();
	lsSet("refreshDuringAd", "");
	prerollIsVisible = false;
	lsSet("lastAdTime", Date.now());
	formElem.style.display = null;
	prerollElem.style.display = "none";
	isConnectingWithTransition = false;
	isWaitingForAd = false;
	connectWithTransition(true);
}

function getAdCounter() {
	var adCounter = localStorage.adCounter;
	if (adCounter === undefined) {
		adCounter = 0;
	}
	adCounter = parseInt(adCounter);
	if (isNaN(adCounter)) {
		adCounter = 0;
	}
	return adCounter;
}

function countAd() {
	var adCounter = getAdCounter();
	adCounter++;
	if (adCounter > 5) {
		adCounter = 0;
	}
	lsSet("adCounter", adCounter);
}
/* jshint ignore:end */

function refreshBanner() {
	if (testPatreonAdsAllowed()) {
		aiptag.cmd.display.push(function () {
			aipDisplayTag.display("JTE_splix-io_300x250");
		});
	}
}

function showBanner() {
	if (!prerollIsVisible) {
		adBox.style.visibility = null;
	}
}

function showBanner2() {
	if (!prerollIsVisible) {
		adBox2.style.visibility = null;
	}
}

function hideBanners() {
	adBox.style.visibility = adBox2.style.visibility = "hidden";
}

function setAdBoxLeft() {
	adBox.style.left = "-" + (adBox.clientWidth + 20) + "px";
}

function setUpAdBoxContent() {
	adBoxContentDiv = document.createElement("div");
	adBoxContentDiv2 = document.createElement("div");
	adBoxContentDiv.id = "JTE_splix-io_300x250";
	adBox.appendChild(adBoxContentDiv);
	adBox2.appendChild(adBoxContentDiv2);
}

function onAdBoxLoaded() {
	showBanner();
	setAdBoxLeft();
}

function onAdBox2Loaded() {
	showBanner2();
}

var adBoxContentDiv = null, prevAdboxContentWidth = 0, prevAdboxContentHeight = 0, adBox = null;
function testAdBoxLoaded() {
	if (!adBoxContentDiv) {
		return;
	}
	if (
		prevAdboxContentWidth != adBoxContentDiv.clientWidth || prevAdboxContentHeight != adBoxContentDiv.clientHeight
	) {
		prevAdboxContentWidth = adBoxContentDiv.clientWidth;
		prevAdboxContentHeight = adBoxContentDiv.clientHeight;
		onAdBoxLoaded();
	}
}
var adBoxContentDiv2 = null, prevAdbox2ContentWidth = 0, prevAdbox2ContentHeight = 0, adBox2 = null;
function testAdBox2Loaded() {
	if (!adBoxContentDiv2) return;
	if (
		prevAdbox2ContentWidth != adBoxContentDiv2.clientWidth ||
		prevAdbox2ContentHeight != adBoxContentDiv2.clientHeight
	) {
		prevAdbox2ContentWidth = adBoxContentDiv2.clientWidth;
		prevAdbox2ContentHeight = adBoxContentDiv2.clientHeight;
		onAdBox2Loaded();
	}
}

//called when moving mouse/ clicking
function showCursor() {
	document.body.style.cursor = null;
}

function updateCmpPersistentLinkVisibility() {
	const el = document.querySelector(".qc-cmp2-persistent-link");
	if (el) {
		el.style.display = beginScreenVisible ? "" : "none";
	}
}

function popUp(url, w, h) {
	var left = (screen.width / 2) - (w / 2);
	var top = (screen.height / 2) - (h / 2);
	window.open(
		url,
		"_blank",
		"toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=" +
			w + ", height=" + h + ", top=" + top + ", left=" + left,
	);
}

//sets the right color for UI
//by skinId
function colorUI() {
	var c = getColorForBlockSkinId(myColorId);
	var mainColor = c.brighter;
	var edgeColor = c.darker;
	for (var i = 0; i < uiElems.length; i++) {
		var thisElem = uiElems[i];
		colorBox(thisElem, mainColor, edgeColor);
	}
}

//styles an element with mainColor and edgeColor;
function colorBox(elem, mainColor, edgeColor) {
	elem.style.backgroundColor = mainColor;
	elem.style.boxShadow = "1px 1px " + edgeColor + "," +
		"2px 2px " + edgeColor + "," +
		"3px 3px " + edgeColor + "," +
		"4px 4px " + edgeColor + "," +
		"5px 5px " + edgeColor + "," +
		"10px 30px 80px rgba(0,0,0,0.3)";
}

//called when a skinbutton is pressed
//add = -1 or 1 (increment/decrement)
//type = 0 (color) or 1 (pattern)
function skinButton(add, type) {
	if (type === 0) {
		var oldC = localStorage.getItem("skinColor");
		var hiddenCs = [];
		if (localStorage.patreonLastPledgedValue >= 300) {
			//access to patreon color
		} else {
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
		lsSet("skinColor", oldC);
	} else if (type == 1) {
		var oldP = localStorage.getItem("skinPattern");
		var hiddenPs = [18, 19, 20, 21, 23, 24, 25, 26];
		if (localStorage.patreonLastPledgedValue > 0) {
			//access to patreon pattern
		} else {
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
		lsSet("skinPattern", oldP);
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

//lives stuff
var lives = [];
var lifeBox;
function clearAllLives() {
	lifeBox.innerHTML = "";
	lives = [];
}

function setLives(current, total) {
	var life, i;
	var oldLength = lives.length;
	for (i = 0; i < total - oldLength; i++) {
		var el = document.createElement("canvas");
		el.style.margin = "-15px";
		var ctx = el.getContext("2d");
		life = {
			node: el,
			ctx: ctx,
			timer: 0,
			animDir: 0,
			isLife: true,
			render: function (dt, force) {
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
					canvasTransformType = canvasTransformTypes.LIFE;
					ctxApplyCamTransform(this.ctx, true, true);
					this.ctx.fillStyle = "rgba(0,0,0,0.3)";
					this.drawHeart(false, 15.7, 15.7);

					if (this.animDir == 1) {
						this.ctx.fillStyle = colors.red.darker;
						this.ctx.translate(30, 30);
						var s = this.timer;
						if (s < 0.8) {
							s = lerp(0, 1.2, ease.in(iLerp(0, 0.8, s)));
						} else {
							s = lerp(1.2, 1, ease.in(iLerp(0.8, 1, s)));
						}
						var r = (1 - s) * 0.5;
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
			},
			drawHeart: function (useTimer, xo, yo) { //xo = xOffset, yo = yOffset
				if (!useTimer || this.timer == 1) {
					this.ctx.beginPath();
					this.ctx.moveTo(15 + xo, 12 + yo);
					this.ctx.bezierCurveTo(15 + xo, 3 + yo, 27 + xo, 3 + yo, 27 + xo, 12 + yo);
					this.ctx.bezierCurveTo(27 + xo, 18 + yo, 15 + xo, 27 + yo, 15 + xo, 27 + yo);
					this.ctx.bezierCurveTo(15 + xo, 27 + yo, 3 + xo, 18 + yo, 3 + xo, 12 + yo);
					this.ctx.bezierCurveTo(3 + xo, 3 + yo, 15 + xo, 3 + yo, 15 + xo, 12 + yo);
					this.ctx.fill();
				} else {
					var txo, tyo; //time x/y offset
					var t = ease.out(1 - this.timer);

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
			},
			afterAnimate: function () {
				this.animDir = 0;
				this.set(this.isLife);
			},
			set: function (isLife) {
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
			},
		};
		lifeBox.appendChild(el);
		lives.push(life);
		life.render(0, true);
	}
	for (i = oldLength - 1; i >= total; i--) {
		life = lives[i];
		lifeBox.removeChild(life.node);
		lives.splice(i, 1);
	}

	for (i = 0; i < lives.length; i++) {
		life = lives[i];
		life.set(current > i);
	}
}

function renderAllLives(dt) {
	for (var i = 0; i < lives.length; i++) {
		var life = lives[i];
		life.render(dt);
	}
}

//engagement meter
var engagementIsPlaying = localStorage.engagementIsPlaying == "true";
var engagementLastPlayTime = localStorage.engagementLastPlayTime;
if (engagementLastPlayTime === undefined) {
	engagementLastPlayTime = Date.now();
}
var engagementLastNoPlayTime = 0;
var engagementLastChangeTime = localStorage.engagementLastChangeTime;
if (engagementLastChangeTime === undefined) {
	engagementLastChangeTime = Date.now();
}
var engagementValue = localStorage.engagementValue;
if (engagementValue === undefined) {
	engagementValue = 0.5;
} else {
	engagementValue = parseFloat(engagementValue);
}
function engagementSetIsPlaying(set) {
	var now = Date.now();
	if (set != engagementIsPlaying) {
		lsSet("engagementIsPlaying", set);
		engagementIsPlaying = set;
		var lastSet;
		if (set) {
			lastSet = engagementLastNoPlayTime;
		} else {
			lastSet = engagementLastPlayTime;
		}
		var setDiff = lastSet - engagementLastChangeTime;
		setDiff /= 20000;
		if (set) {
			//subtract non play time
			engagementValue = lerptt(engagementValue, 0, 0.01, setDiff / 100);
		} else {
			//add play time
			engagementValue = lerptt(engagementValue, 1, 0.01, setDiff);
		}
		lsSet("engagementValue", engagementValue);
		engagementLastChangeTime = now;
		lsSet("engagementLastChangeTime", now);
	}
	if (set) {
		lsSet("engagementLastPlayTime", now);
		engagementLastPlayTime = now;
	} else {
		engagementLastNoPlayTime = now;
	}
}

//patreon stuff
/* jshint ignore:start */
function loginWithPatreon() {
	lsSet("clickedLoginWithPatreonButton", "true");
	var redirectUri = getPatreonRedirectUri();
	window.location =
		"//www.patreon.com/oauth2/authorize?response_type=code&client_id=29edae8672a352342c2ecda5ff440eda65e5e52ebc7500b02eefb481c94c88b1&scope=users%20pledges-to-me%20my-campaign&redirect_uri=" +
		encodeURIComponent(redirectUri);
}
/* jshint ignore:end */

function getPatreonRedirectUri() {
	return location.origin + location.pathname;
}

function setPatreonOverlay(visible, content) {
	var el = document.getElementById("patreonOverlay");
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
	var query = parseQuery(location.href);
	var found = false;
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

//remove blocks that are too far away from the camera and are likely
//to be seen without an updated state
function removeBlocksOutsideViewport(pos) {
	for (i = blocks.length - 1; i >= 0; i--) {
		var block = blocks[i];
		if (
			block.x < pos[0] - VIEWPORT_RADIUS * 2 ||
			block.x > pos[0] + VIEWPORT_RADIUS * 2 ||
			block.y < pos[1] - VIEWPORT_RADIUS * 2 ||
			block.y > pos[1] + VIEWPORT_RADIUS * 2
		) {
			blocks.splice(i, 1);
		}
	}
}

//gets color object for a player skin id
function getColorForBlockSkinId(id) {
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

//sets the with/height of a full screen canvas, takes retina displays into account
function ctxCanvasSize(ctx, dontUseQuality) {
	var w = window.innerWidth, h = window.innerHeight;
	if (canvasTransformType == canvasTransformTypes.TUTORIAL) {
		w = h = 300;
	}
	if (canvasTransformType == canvasTransformTypes.SKIN_BUTTON) {
		w = h = 30;
	}
	if (canvasTransformType == canvasTransformTypes.LIFE) {
		w = h = 60;
	}
	if (canvasTransformType == canvasTransformTypes.TITLE) {
		w = 520;
		h = 180;
	}
	var quality = dontUseQuality ? 1 : canvasQuality;
	var c = ctx.canvas;
	// PIXEL_RATIO = 1;
	c.width = w * MAX_PIXEL_RATIO * quality;
	c.height = h * MAX_PIXEL_RATIO * quality;
	var styleRatio = 1;
	if (canvasTransformType == canvasTransformTypes.TITLE) {
		styleRatio = Math.min(1, (window.innerWidth - 30) / w);
	}
	c.style.width = w * styleRatio + "px";
	c.style.height = h * styleRatio + "px";
}

//apply camera transformations on a canvas
//canvasTransformType is a global that determines what
//transformation should be used
var canvasTransformTypes = {
	MAIN: 1,
	TUTORIAL: 2,
	SKIN: 3,
	SKIN_BUTTON: 4,
	TITLE: 5,
	LIFE: 6,
};
var canvasTransformType = canvasTransformTypes.MAIN;
function ctxApplyCamTransform(ctx, setSize, dontUseQuality) {
	if (setSize) {
		ctxCanvasSize(ctx, dontUseQuality);
	}
	ctx.save();
	var quality = dontUseQuality ? 1 : canvasQuality;
	if (canvasTransformType != canvasTransformTypes.MAIN && canvasTransformType != canvasTransformTypes.SKIN) {
		ctx.setTransform(MAX_PIXEL_RATIO * quality, 0, 0, MAX_PIXEL_RATIO * quality, 0, 0);
	}
	if (canvasTransformType == canvasTransformTypes.MAIN || canvasTransformType == canvasTransformTypes.SKIN) {
		var isMain = canvasTransformType == canvasTransformTypes.MAIN;
		ctx.translate(mainCanvas.width / 2, mainCanvas.height / 2);
		var biggest = Math.max(mainCanvas.width, mainCanvas.height);
		var zoomEdge = biggest / MAX_ZOOM;
		var pixelsAvailable = mainCanvas.width * mainCanvas.height;
		var pixelsPerBlock = pixelsAvailable / BLOCKS_ON_SCREEN;
		var zoomBlocks = Math.sqrt(pixelsPerBlock) / 10;
		zoom = Math.max(zoomBlocks, zoomEdge);
		if (isMain) {
			ctx.rotate(camRotOffset);
		}
		ctx.scale(zoom, zoom);
		if (isMain) {
			ctx.translate(-camPosPrevFrame[0] * 10 - camPosOffset[0], -camPosPrevFrame[1] * 10 - camPosOffset[1]);
		} else {
			ctx.translate(-VIEWPORT_RADIUS * 10, -VIEWPORT_RADIUS * 10);
		}
	} else if (
		canvasTransformType == canvasTransformTypes.TUTORIAL || canvasTransformType == canvasTransformTypes.SKIN_BUTTON
	) {
		ctx.scale(3, 3);
	}
}

//shakes the camera
function doCamShake(x, y, doRotate) {
	if (doRotate === undefined) {
		doRotate = true;
	}
	camShakeForces.push([x, y, 0, !!doRotate]);
}

//shakes the camera but uses a dir (ranges from 0-3) as input
function doCamShakeDir(dir, amount, doRotate) {
	if (amount === undefined) {
		amount = 6;
	}
	var x = 0, y = 0;
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
	doCamShake(x, y, doRotate);
}

//applyes camShakeForces
function calcCamOffset() {
	camPosOffset = [0, 0];
	camRotOffset = 0;
	for (var i = camShakeForces.length - 1; i >= 0; i--) {
		var force = camShakeForces[i];
		force[2] += deltaTime * 0.003;
		var t = force[2];
		var t3 = 0, t2 = 0;
		if (t < 1) {
			t2 = ease.out(t);
			t3 = ease.inout(t);
		} else if (t < 8) {
			t2 = ease.inout(iLerp(8, 1, t));
			t3 = ease.in(iLerp(8, 1, t));
		} else {
			camShakeForces.splice(i, 1);
		}
		camPosOffset[0] += force[0] * t2;
		camPosOffset[1] += force[1] * t2;

		camPosOffset[0] += force[0] * Math.cos(t * 8) * 0.04 * t3;
		camPosOffset[1] += force[1] * Math.cos(t * 7) * 0.04 * t3;
		if (force[3]) {
			camRotOffset += Math.cos(t * 9) * 0.003 * t3;
		}
	}
	var limit = 80;
	camPosOffset[0] /= limit;
	camPosOffset[1] /= limit;
	camPosOffset[0] = smoothLimit(camPosOffset[0]);
	camPosOffset[1] = smoothLimit(camPosOffset[1]);
	camPosOffset[0] *= limit;
	camPosOffset[1] *= limit;
}

function lerp(a, b, t) {
	return a + t * (b - a);
}

//inverse lerp
function iLerp(a, b, t) {
	return (t - a) / (b - a);
}

//fixed lerp, calls lerp() multiple times when having a lower framerate
function lerpt(a, b, t) {
	return lerptt(a, b, t, deltaTime / 16.6666);
}

//lerps between a and b over t, where tt is the amount of times that lerp should becalled
function lerptt(a, b, t, tt) {
	var newT = 1 - Math.pow(1 - t, tt);
	return lerp(a, b, newT);
}

//lerps an array
function lerpA(a, b, t) {
	var newArray = [];
	for (var i = 0; i < a.length; i++) {
		newArray.push(lerp(a[i], b[i], t));
	}
	return newArray;
}

//fixed modulo
function mod(n, m) {
	return ((n % m) + m) % m;
}

//clamp
function clamp(v, min, max) {
	return Math.max(min, Math.min(max, v));
}

function clamp01(v) {
	return clamp(v, 0, 1);
}

//returns random item from array
function randFromArray(array) {
	return array[Math.floor(Math.random() * array.length)];
}

//limits a value between -1 and 1 without clamping,
//v will gradually move towards 1/-1 but will never actually reach it
function smoothLimit(v) {
	var negative = v < 0;
	if (negative) {
		v *= -1;
	}
	v = 1 - Math.pow(2, -v);
	if (negative) {
		v *= -1;
	}
	return v;
}

//updates the stats in the bottom left corner
function updateStats() {
	if (myRank > totalPlayers && myRankSent) {
		totalPlayers = myRank;
	} else if ((totalPlayers < myRank) || (myRank === 0 && totalPlayers > 0)) {
		myRank = totalPlayers;
	}
	myRankElem.innerHTML = myRank;
	totalPlayersElem.innerHTML = totalPlayers;
}

//draws a trail on a canvas, can be drawn on multiple canvases
//when drawCalls contains more than one object
function drawTrailOnCtx(drawCalls, trail, lastPos) {
	if (trail.length > 0) {
		for (var ctxI = 0; ctxI < drawCalls.length; ctxI++) {
			var thisDrawCall = drawCalls[ctxI];
			var thisCtx = thisDrawCall.ctx;
			thisCtx.lineCap = "round";
			thisCtx.lineJoin = "round";
			thisCtx.lineWidth = 6;
			thisCtx.strokeStyle = thisDrawCall.color;
			var offset = thisDrawCall.offset;

			thisCtx.beginPath();
			thisCtx.moveTo(trail[0][0] * 10 + offset, trail[0][1] * 10 + offset);
			for (var i = 1; i < trail.length; i++) {
				thisCtx.lineTo(trail[i][0] * 10 + offset, trail[i][1] * 10 + offset);
			}
			if (lastPos !== null) {
				thisCtx.lineTo(lastPos[0] * 10 + offset, lastPos[1] * 10 + offset);
			}
			thisCtx.stroke();
		}
	}
}

//draws diagonal lines on a canvas, can be used as mask and stuff like that
function drawDiagonalLines(ctx, color, thickness, spaceBetween, offset) {
	if (thickness > 0) {
		ctx.lineCap = "butt";
		ctx.strokeStyle = color;
		ctx.lineWidth = thickness;
		var minSize = VIEWPORT_RADIUS * 20;
		var xOffset = 0;
		var yOffset = 0;
		if (camPosPrevFrame !== null && canvasTransformType == canvasTransformTypes.MAIN) {
			xOffset = Math.round((camPosPrevFrame[0] * 10 - minSize / 2) / spaceBetween) * spaceBetween;
			yOffset = Math.round((camPosPrevFrame[1] * 10 - minSize / 2) / spaceBetween) * spaceBetween;
		}
		xOffset += offset % spaceBetween;
		for (var i = -minSize; i < minSize; i += spaceBetween) {
			var thisXOffset = xOffset + i;
			ctx.beginPath();
			ctx.moveTo(thisXOffset, yOffset);
			ctx.lineTo(thisXOffset + minSize, yOffset + minSize);
			ctx.stroke();
		}
	}
}

function drawAnimatedText(ctx, text, time, x, y, fontHeight, color, font, textExtrude, charSpeed, orderSeed) {
	var t2;
	if (color === undefined) {
		color = "white";
	}
	ctx.fillStyle = color;
	if (font === undefined) {
		font = "Arial, Helvetica, sans-serif";
	}
	ctx.font = font = fontHeight + "px " + font;
	if (orderSeed === undefined) {
		orderSeed = 0;
	}
	var lastWidth = 0;
	for (var charI = 0; charI < transitionText.length; charI++) {
		var rndOffset = rndSeed(charI + orderSeed);
		if (charSpeed === undefined) {
			charSpeed = 3;
		}
		var charT = time * charSpeed - (rndOffset * (charSpeed - rndOffset));
		var thisChar = transitionText[charI];
		var charWidth = ctx.measureText(thisChar).width;
		var yMin = y - fontHeight * 0.77;
		if (charT < 0.8) {
			tempCanvas.width = charWidth;
			tempCanvas.height = fontHeight;
			tempCtx.font = font;
			tempCtx.fillStyle = "white";
			tempCtx.fillText(thisChar, 0, fontHeight * 0.77);
			if (charT < 0.4) {
				t2 = charT / 0.4;

				tempCtx.beginPath();
				tempCtx.moveTo(0, lerp(fontHeight, 0, t2));
				tempCtx.lineTo(0, fontHeight);
				tempCtx.lineTo(lerp(0, charWidth, t2), fontHeight);
				tempCtx.closePath();
			} else {
				t2 = charT / 0.4 - 1;
				tempCtx.moveTo(0, 0);
				tempCtx.lineTo(0, fontHeight);
				tempCtx.lineTo(charWidth, fontHeight);
				tempCtx.lineTo(charWidth, lerp(fontHeight, 0, t2));
				tempCtx.lineTo(lerp(0, charWidth, t2), 0);
			}
			tempCtx.globalCompositeOperation = "destination-in";
			tempCtx.fill();
			ctx.drawImage(tempCanvas, x + lastWidth, yMin);
		} else {
			t2 = Math.min(1, charT * 5 - 4);
			var offset = t2 * textExtrude;
			ctx.fillStyle = colors.green2.darker;
			for (var i = 0; i < offset; i++) {
				ctx.fillText(thisChar, x + lastWidth - offset + i, y - offset + i);
			}
			ctx.fillStyle = "white";
			ctx.fillText(thisChar, x + lastWidth - offset, y - offset);
		}
		lastWidth += charWidth - 0.5;
	}
}

//orders two positions so that pos1 is in the top left and pos2 in the bottom right
function orderTwoPos(pos1, pos2) {
	var x1 = Math.min(pos1[0], pos2[0]);
	var y1 = Math.min(pos1[1], pos2[1]);
	var x2 = Math.max(pos1[0], pos2[0]);
	var y2 = Math.max(pos1[1], pos2[1]);
	return [[x1, y1], [x2, y2]];
}

//fills an area, if array is not specified it defaults to blocks[]
function fillArea(x, y, w, h, type, pattern, array, isEdgeChunk = false) {
	var defaultArray = array === undefined;
	if (defaultArray) {
		array = blocks;
	}

	if (pattern === undefined) {
		pattern = 0;
	}

	var x2 = x + w;
	var y2 = y + h;
	if (myPos !== null && defaultArray) {
		x = Math.max(x, Math.round(myPos[0]) - VIEWPORT_RADIUS);
		y = Math.max(y, Math.round(myPos[1]) - VIEWPORT_RADIUS);
		x2 = Math.min(x2, Math.round(myPos[0]) + VIEWPORT_RADIUS);
		y2 = Math.min(y2, Math.round(myPos[1]) + VIEWPORT_RADIUS);
	}

	for (var i = x; i < x2; i++) {
		for (var j = y; j < y2; j++) {
			var block = getBlock(i, j, array);
			var thisType = applyPattern(type, pattern, i, j);
			block.setBlockId(thisType, isEdgeChunk ? false : Math.random() * 400);
		}
	}
}

//changes blockId in to a blockId with a pattern applied
function applyPattern(blockId, pattern, x, y) {
	var modX, modY;
	if (blockId < 2) {
		return blockId;
	}
	var doPattern = false;
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
			var bitMap, bitMapW, bitMapH, xShift = 0, yShift = 0;
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

//top notification stuffs
var currentTopNotifications = [];
function doTopNotification(text) {
	var thisTopNotification = {
		text: text,
		elem: null,
		initiate: function () {
			var el = document.createElement("div");
			this.elem = el;
			el.innerHTML = this.text;
			el.className = "topNotification greenBox";
			el.style.visibility = "hidden";
			document.getElementById("topNotifications").appendChild(el);
			var c = getColorForBlockSkinId(myColorId);
			var mainColor = c.brighter;
			var edgeColor = c.darker;
			colorBox(el, mainColor, edgeColor);
		},
		animationTimer: 0,
		animationDirection: 1,
		update: function (dt) {
			this.animationTimer += dt * 0.001 * this.animationDirection;
			var hiddenPos = -this.elem.offsetHeight - 10;
			var topPos = lerp(hiddenPos, 10, ease.out(clamp01(this.animationTimer)));
			this.elem.style.top = topPos + "px";
			this.elem.style.visibility = null;
			//if return true, destroy notification object
			if (this.animationDirection == -1 && this.animationTimer < 0) {
				this.destroy();
			}
		},
		animateOut: function () {
			this.animationDirection = -1;
			if (this.animationTimer > 1) {
				this.animationTimer = 1;
			}
		},
		destroy: function () {
			this.elem.parentElement.removeChild(this.elem);
			for (var notI = currentTopNotifications.length - 1; notI >= 0; notI--) {
				var not = currentTopNotifications[notI];
				if (not == this) {
					currentTopNotifications.splice(notI, 1);
				}
			}
		},
	};
	thisTopNotification.initiate();
	currentTopNotifications.push(thisTopNotification);
	return thisTopNotification;
}

//touch stuffs
function bindSwipeEvents() {
	touchControlsElem.addEventListener("touchstart", onTouchStart);
	touchControlsElem.addEventListener("touchmove", onTouchMove);
	touchControlsElem.addEventListener("touchend", onTouchEnd);
	touchControlsElem.addEventListener("touchcancel", onTouchEnd);
}

function onTouchStart(e) {
	var touch = e.touches[e.touches.length - 1];
	currentTouches.push({
		prevPos: [touch.pageX, touch.pageY],
		prevTime: Date.now(),
		id: touch.identifier,
	});
}

function onTouchMove(e) {
	var touches = e.touches;
	for (var i = 0; i < touches.length; i++) {
		var touch = touches[i];
		var currentTouch = null;
		for (var j = 0; j < currentTouches.length; j++) {
			if (currentTouches[j].id == touch.identifier) {
				currentTouch = currentTouches[j];
				break;
			}
		}
		if (currentTouch) {
			calcTouch(currentTouch, touch);
		}
	}
	e.preventDefault();
}

function calcTouch(customTouch, touch) {
	var currentTime = Date.now();
	var deltaTime = currentTime - customTouch.prevTime;
	var curPos = [touch.pageX, touch.pageY];
	var prevPos = customTouch.prevPos;
	var xOffset = prevPos[0] - curPos[0];
	var yOffset = prevPos[1] - curPos[1];
	var dist = Math.sqrt(Math.pow(xOffset, 2) + Math.pow(yOffset, 2));
	var speed = dist / deltaTime;
	speed *= MAX_PIXEL_RATIO * canvasQuality;
	customTouch.prevTime = currentTime;
	customTouch.prevPos = curPos;
	if (deltaTime > 0 && speed > 2) {
		if (Math.abs(xOffset) > Math.abs(yOffset)) {
			if (xOffset > 0) {
				sendDir(2);
			} else {
				sendDir(0);
			}
		} else {
			if (yOffset > 0) {
				sendDir(3);
			} else {
				sendDir(1);
			}
		}
	}
}

function onTouchEnd(e) {
	for (var i = currentTouches.length - 1; i >= 0; i--) {
		for (var j = 0; j < e.touches.length; j++) {
			if (currentTouches[i].id == e.touches[j].identifier) {
				calcTouch(currentTouches[i], e.touches[j]);
				currentTouches.splice(i, 1);
			}
		}
	}
}

//starts the transition
//reverseOnHalf: start playing backwords once it is showing the title
//callback1: callback fired once the transition is full screen for the first time
//callback2: fired when full screen for the second time, only shown when reverseOnHalf = true
function doTransition(text, reverseOnHalf, callback1, callback2, overrideExisting) {
	// console.log("doTransition()", text, reverseOnHalf, callback1, callback2, overrideExisting);
	// console.log("isTransitioning:",isTransitioning);
	if (!isTransitioning || overrideExisting) {
		transitionText = text;
		isTransitioning = true;
		transitionDirection = 1;
		transitionTimer = transitionPrevTimer = 0;
		transitionCanvas.style.display = null;
		if (reverseOnHalf === undefined) {
			reverseOnHalf = false;
		}
		transitionReverseOnHalf = reverseOnHalf;
		transitionCallback1 = callback1;
		transitionCallback2 = callback2;
	}
}

function doSkipDeathTransition() {
	if (allowSkipDeathTransition) {
		if (deathTransitionTimeout !== null) {
			window.clearTimeout(deathTransitionTimeout);
			deathTransitionTimeout = null;
			onClose();
			doTransition("", false, function () {
				window.setTimeout(() => {
					initVideoAdsScript();
				}, 700);
				resetAll();
			});
		}
		skipDeathTransition = true;
	}
}

//random number between 0 and 1 using a seed
function rndSeed(seed) {
	var x = Math.sin(seed) * 10000;
	return x - Math.floor(x);
}

//easing functions
var ease = {
	// in: function(t){
	// 	return t === 0 ? 0 : Math.pow( 2, 10 * t - 10 );
	// },
	// out: function(t){
	// 	return t === 1 ? 1 : 1 - Math.pow( 2, -10 * t );
	// },
	// inout: function(t){
	// 	return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ?
	// 				Math.pow( 2, 20 * t - 10 ) / 2 :
	// 				( 2 - Math.pow( 2, -20 * t + 10 ) ) / 2;
	// }
	in: function (t) {
		return t * t * t * t;
	},
	out: function (t) {
		return 1 - Math.pow(1 - t, 4);
	},
	inout: function (t) {
		return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
	},
};

//draws main title
function drawTitle(ctx, time, isShadow, maxExtrude, extraShadow) {
	ctx.strokeStyle = (!!isShadow) ? colors.red.patternEdge : colors.red.brighter;
	ctx.lineWidth = 16;
	ctx.lineJoin = "round";
	ctx.lineCap = "round";

	if (extraShadow) {
		ctx.shadowBlur = 40 * MAX_PIXEL_RATIO;
		ctx.shadowColor = "rgba(0,0,0,0.4)";
		ctx.shadowOffsetX = ctx.shadowOffsetY = 10 * MAX_PIXEL_RATIO;
	} else {
		ctx.shadowColor = "rgba(0,0,0,0)";
	}

	var t = titleTimer;
	for (var lineI = 0; lineI < titleLines.length; lineI++) {
		var thisLine = titleLines[lineI];
		var lineT = clamp01(t * thisLine.speed - thisLine.offset);
		var extrude = clamp01(t);
		extrude *= 5;
		if (maxExtrude !== undefined) {
			extrude = Math.min(extrude, maxExtrude);
		}
		ctx.beginPath();
		for (var subLineI = 0; subLineI < thisLine.line.length; subLineI++) {
			var thisSubLine = thisLine.line[subLineI];
			var subLineT = clamp01(lineT * (thisLine.line.length - 1) - subLineI + 1);
			if (subLineT > 0) {
				if (subLineT == 1) {
					if (subLineI === 0 && thisSubLine.length == 2) {
						ctx.moveTo(thisSubLine[0] - extrude, thisSubLine[1] - extrude);
					} else if (thisSubLine.length == 2) {
						ctx.lineTo(thisSubLine[0] - extrude, thisSubLine[1] - extrude);
					} else if (thisSubLine.length == 6) {
						ctx.bezierCurveTo(
							thisSubLine[0] - extrude,
							thisSubLine[1] - extrude,
							thisSubLine[2] - extrude,
							thisSubLine[3] - extrude,
							thisSubLine[4] - extrude,
							thisSubLine[5] - extrude,
						);
					}
				} else {
					var lastLine = thisLine.line[subLineI - 1];
					var lastPos = [lastLine[lastLine.length - 2], lastLine[lastLine.length - 1]];
					if (thisSubLine.length == 2) {
						ctx.lineTo(
							lerp(lastPos[0], thisSubLine[0], subLineT) - extrude,
							lerp(lastPos[1], thisSubLine[1], subLineT) - extrude,
						);
					} else if (thisSubLine.length == 6) {
						var p0 = lastPos;
						var p1 = [thisSubLine[0], thisSubLine[1]];
						var p2 = [thisSubLine[2], thisSubLine[3]];
						var p3 = [thisSubLine[4], thisSubLine[5]];
						var p4 = lerpA(p0, p1, subLineT);
						var p5 = lerpA(p1, p2, subLineT);
						var p6 = lerpA(p2, p3, subLineT);
						var p7 = lerpA(p4, p5, subLineT);
						var p8 = lerpA(p5, p6, subLineT);
						var p9 = lerpA(p7, p8, subLineT);
						ctx.bezierCurveTo(
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
		ctx.stroke();
	}
}

//draws blocks on ctx
function drawBlocks(ctx, blocks, checkViewport) {
	var t2;
	for (var i = 0; i < blocks.length; i++) {
		var block = blocks[i];
		if (
			checkViewport &&
			(
				block.x < camPos[0] - VIEWPORT_RADIUS ||
				block.x > camPos[0] + VIEWPORT_RADIUS ||
				block.y < camPos[1] - VIEWPORT_RADIUS ||
				block.y > camPos[1] + VIEWPORT_RADIUS
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
				var t = block.animProgress;

				//edge
				if (block.currentBlock === 0) {
					ctx.fillStyle = colors.red.boundsDark;
					ctx.fillRect(block.x * 10, block.y * 10, 10, 10);
					if (!uglyMode) {
						linesCtx.fillStyle = colors.grey.diagonalLines;
						linesCtx.fillRect(block.x * 10, block.y * 10, 10, 10);
					}
				}
				//empty block
				if (block.currentBlock == 1) {
					//shadow edge
					if (t > 0.8 && !uglyMode) {
						ctx.fillStyle = colors.grey.darker;
						ctx.fillRect(block.x * 10 + 2, block.y * 10 + 2, 7, 7);
					}

					//bright surface
					ctx.fillStyle = colors.grey.brighter;
					if (t == 1 || uglyMode) {
						// ctx.fillStyle = colors.grey.darker; //shadow edge
						// ctx.beginPath();
						// ctx.moveTo(block.x*10 + 1, block.y*10 + 8);
						// ctx.lineTo(block.x*10 + 2, block.y*10 + 9);
						// ctx.lineTo(block.x*10 + 9, block.y*10 + 9);
						// ctx.lineTo(block.x*10 + 9, block.y*10 + 2);
						// ctx.lineTo(block.x*10 + 8, block.y*10 + 1);
						// ctx.fill();
						ctx.fillRect(block.x * 10 + 1, block.y * 10 + 1, 7, 7);
					} else if (t < 0.4) {
						t2 = t * 2.5;
						ctx.beginPath();
						ctx.moveTo(block.x * 10 + 2, block.y * 10 + lerp(9, 2, t2));
						ctx.lineTo(block.x * 10 + 2, block.y * 10 + 9);
						ctx.lineTo(block.x * 10 + lerp(2, 9, t2), block.y * 10 + 9);
						ctx.fill();
					} else if (t < 0.8) {
						t2 = t * 2.5 - 1;
						ctx.beginPath();
						ctx.moveTo(block.x * 10 + 2, block.y * 10 + 2);
						ctx.lineTo(block.x * 10 + 2, block.y * 10 + 9);
						ctx.lineTo(block.x * 10 + 9, block.y * 10 + 9);
						ctx.lineTo(block.x * 10 + 9, block.y * 10 + lerp(9, 2, t2));
						ctx.lineTo(block.x * 10 + lerp(2, 9, t2), block.y * 10 + 2);
						ctx.fill();
					} else {
						t2 = t * 5 - 4;
						// ctx.fillStyle = colors.grey.darker; //shadow edge
						// ctx.beginPath();
						// ctx.moveTo(block.x*10 + lerp(2,1,t2), block.y*10 + lerp(9,8,t2));
						// ctx.lineTo(block.x*10 + 2, block.y*10 + 9);
						// ctx.lineTo(block.x*10 + 9, block.y*10 + 9);
						// ctx.lineTo(block.x*10 + 9, block.y*10 + 2);
						// ctx.lineTo(block.x*10 + lerp(9,8,t2), block.y*10 + lerp(2,1,t2));
						// ctx.fill();
						ctx.fillRect(block.x * 10 + lerp(2, 1, t2), block.y * 10 + lerp(2, 1, t2), 7, 7);
					}
				}
				//regular colors
				if (block.currentBlock >= 2) {
					var idForBlockSkinId = (block.currentBlock - 2) % SKIN_BLOCK_COUNT;
					var thisColor = getColorForBlockSkinId(idForBlockSkinId);

					var isPatternBlock = block.currentBlock > SKIN_BLOCK_COUNT + 1;

					var brightColor = isPatternBlock ? thisColor.pattern : thisColor.brighter;
					var darkColor = isPatternBlock ? thisColor.patternEdge : thisColor.darker;

					//shadow edge
					if (t > 0.8 && !uglyMode) {
						ctx.fillStyle = darkColor;
						ctx.fillRect(block.x * 10 + 1, block.y * 10 + 1, 9, 9);
					}

					//bright surface
					ctx.fillStyle = brightColor;
					if (t == 1 || uglyMode) {
						// ctx.fillStyle = thisColor.darker; //shadow edge
						// ctx.beginPath();
						// ctx.moveTo(block.x*10     , block.y*10 + 9 );
						// ctx.lineTo(block.x*10 + 1 , block.y*10 + 10);
						// ctx.lineTo(block.x*10 + 10, block.y*10 + 10);
						// ctx.lineTo(block.x*10 + 10, block.y*10 + 1 );
						// ctx.lineTo(block.x*10 + 9 , block.y*10     );
						// ctx.fill();

						ctx.fillRect(block.x * 10, block.y * 10, 9, 9);
						if (idForBlockSkinId == 12 && !uglyMode) {
							ctx.fillStyle = colors.gold.bevelBright;
							ctx.fillRect(block.x * 10 + 3, block.y * 10 + 0.1, 6, 0.1);
						}
					} else if (t < 0.4) {
						t2 = t * 2.5;
						ctx.beginPath();
						ctx.moveTo(block.x * 10 + 1, block.y * 10 + lerp(10, 1, t2));
						ctx.lineTo(block.x * 10 + 1, block.y * 10 + 10);
						ctx.lineTo(block.x * 10 + lerp(1, 10, t2), block.y * 10 + 10);
						ctx.fill();
					} else if (t < 0.8) {
						t2 = t * 2.5 - 1;
						ctx.beginPath();
						ctx.moveTo(block.x * 10 + 1, block.y * 10 + 1);
						ctx.lineTo(block.x * 10 + 1, block.y * 10 + 10);
						ctx.lineTo(block.x * 10 + 10, block.y * 10 + 10);
						ctx.lineTo(block.x * 10 + 10, block.y * 10 + lerp(10, 1, t2));
						ctx.lineTo(block.x * 10 + lerp(1, 10, t2), block.y * 10 + 1);
						ctx.fill();
					} else {
						t2 = t * 5 - 4;
						// ctx.fillStyle = thisColor.darker; //shadow edge
						// ctx.beginPath();
						// ctx.moveTo(block.x*10 + lerp(1,0,t2) , block.y*10 + lerp(10,9,t2) );
						// ctx.lineTo(block.x*10 + 1 , block.y*10 + 10);
						// ctx.lineTo(block.x*10 + 10, block.y*10 + 10);
						// ctx.lineTo(block.x*10 + 10, block.y*10 + 1 );
						// ctx.lineTo(block.x*10 + lerp(10,9,t2) , block.y*10 + lerp(1,0,t2)  );
						// ctx.fill();

						ctx.fillRect(block.x * 10 + lerp(1, 0, t2), block.y * 10 + lerp(1, 0, t2), 9, 9);
					}
				}
			}
		}
	}
}

//draws a player on ctx
function drawPlayer(ctx, player, timeStamp) {
	if (player.hasReceivedPosition) {
		var x, y;

		var pc = getColorForBlockSkinId(player.skinBlock); //player color

		//draw trail
		if (player.trails.length > 0) {
			//iterate over each trail
			for (var trailI = player.trails.length - 1; trailI >= 0; trailI--) {
				var thisTrail = player.trails[trailI];

				//increase vanish timer
				var last = trailI == player.trails.length - 1;
				if (!last || player.isDead) {
					if (uglyMode) {
						thisTrail.vanishTimer = 10;
					} else {
						var speed = (player.isDead && last) ? 0.006 : 0.02;
						thisTrail.vanishTimer += deltaTime * speed;
					}
					if (!last && (thisTrail.vanishTimer > 10)) {
						player.trails.splice(trailI, 1);
					}
				}

				//if there's no trail, don't draw anything
				if (thisTrail.trail.length > 0) {
					var lastPos = last ? player.drawPos : null;
					if (thisTrail.vanishTimer > 0 && !uglyMode) {
						ctxApplyCamTransform(tempCtx, true);
						drawTrailOnCtx(
							[{
								ctx: tempCtx,
								color: pc.darker,
								offset: 5,
							}, {
								ctx: tempCtx,
								color: pc.brighter,
								offset: 4,
							}],
							thisTrail.trail,
							lastPos,
						);

						tempCtx.globalCompositeOperation = "destination-out";
						drawDiagonalLines(tempCtx, "white", thisTrail.vanishTimer, 10, timeStamp * 0.003);

						ctx.restore();
						tempCtx.restore();
						linesCtx.restore();

						ctx.drawImage(tempCanvas, 0, 0);
						tempCtx.fillStyle = colors.grey.diagonalLines;
						tempCtx.globalCompositeOperation = "source-in";
						tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
						linesCtx.drawImage(tempCanvas, 0, 0);
						ctxApplyCamTransform(ctx);
						ctxApplyCamTransform(linesCtx);
					} else if (thisTrail.vanishTimer < 10) {
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
								thisTrail.trail,
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
									ctx: linesCtx,
									color: colors.grey.diagonalLines,
									offset: 4,
								}],
								thisTrail.trail,
								lastPos,
							);
						}
					}
				}
			}
		}

		//draw player
		var dp = [player.drawPos[0] * 10 + 4.5, player.drawPos[1] * 10 + 4.5]; //draw position
		var pr = 6; //player radius
		var so = 0.3; //shadow offset
		var gradient = ctx.createRadialGradient(dp[0] - 3, dp[1] - 3, 0, dp[0], dp[1], pr);
		gradient.addColorStop(0, pc.slightlyBrighter);
		gradient.addColorStop(1, pc.brighter);
		linesCtx.fillStyle = "white";
		if (player.isDead) {
			player.isDeadTimer += deltaTime * 0.003;
			ctx.fillStyle = gradient;

			for (var i = 0; i < player.deadAnimParts.length - 1; i++) {
				var arcStart = player.deadAnimParts[i];
				var arcEnd = player.deadAnimParts[i + 1];
				var arcAvg = lerp(arcStart, arcEnd, 0.5);
				var dir = player.dir * Math.PI / 2 - Math.PI;
				var distanceModifier = Math.min(
					Math.abs(dir - arcAvg),
					Math.abs((dir - Math.PI * 2) - arcAvg),
					Math.abs((dir + Math.PI * 2) - arcAvg),
				);
				var rand = player.deadAnimPartsRandDist[i];
				var distance = (1 - Math.pow(2, -2 * player.isDeadTimer)) * distanceModifier * 5 * (rand + 1);
				var pOffset = [Math.cos(arcAvg) * distance, Math.sin(arcAvg) * distance]; //piece offset
				ctx.globalAlpha = linesCtx.globalAlpha = Math.max(0, 1 - (player.isDeadTimer * 0.2));
				ctx.beginPath();
				ctx.arc(dp[0] - so + pOffset[0], dp[1] - so + pOffset[1], pr, arcStart, arcEnd, false);
				ctx.lineTo(dp[0] - so + pOffset[0], dp[1] - so + pOffset[1]);
				ctx.fill();
				if (!uglyMode) {
					linesCtx.beginPath();
					linesCtx.arc(dp[0] - so + pOffset[0], dp[1] - so + pOffset[1], pr, arcStart, arcEnd, false);
					linesCtx.lineTo(dp[0] - so + pOffset[0], dp[1] - so + pOffset[1]);
					linesCtx.fill();
				}
			}
			ctx.globalAlpha = linesCtx.globalAlpha = 1;
		} else {
			ctx.fillStyle = pc.darker;
			ctx.beginPath();
			ctx.arc(dp[0] + so, dp[1] + so, pr, 0, 2 * Math.PI, false);
			ctx.fill();
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(dp[0] - so, dp[1] - so, pr, 0, 2 * Math.PI, false);
			ctx.fill();
			if (player.isMyPlayer && localStorage.drawWhiteDot == "true") {
				ctx.fillStyle = "white";
				ctx.beginPath();
				ctx.arc(dp[0] - so, dp[1] - so, 1, 0, 2 * Math.PI, false);
				ctx.fill();
			}

			//lines canvas (remove lines)
			if (!uglyMode) {
				linesCtx.beginPath();
				linesCtx.arc(dp[0] + so, dp[1] + so, pr, 0, 2 * Math.PI, false);
				linesCtx.fill();
				linesCtx.beginPath();
				linesCtx.arc(dp[0] - so, dp[1] - so, pr, 0, 2 * Math.PI, false);
				linesCtx.fill();
			}
		}
		if (player.isMyPlayer && localStorage.drawActualPlayerPos == "true") {
			ctx.fillStyle = "#FF0000";
			ctx.beginPath();
			ctx.arc(player.serverPos[0] * 10 + 5, player.serverPos[1] * 10 + 5, pr, 0, 2 * Math.PI, false);
			ctx.fill();
		}

		//draw hitlines
		if (player.hitLines.length > 0) {
			for (var hitlineI = player.hitLines.length - 1; hitlineI >= 0; hitlineI--) {
				var thisHit = player.hitLines[hitlineI];

				//increase vanish timer
				thisHit.vanishTimer += deltaTime * 0.004;
				var t = thisHit.vanishTimer;
				if (t > 4) {
					player.hitLines.splice(hitlineI, 1);
				}

				x = thisHit.pos[0] * 10 + 5;
				y = thisHit.pos[1] * 10 + 5;

				//draw circle
				if (t < 2) {
					var radius1 = Math.max(0, ease.out(iLerp(0, 2, t)) * 18);
					var radius2 = Math.max(0, ease.out(iLerp(0.5, 2, t)) * 18);
					ctx.fillStyle = pc.brighter;
					ctx.beginPath();
					ctx.arc(x, y, radius1, 0, 2 * Math.PI, false);
					ctx.arc(x, y, radius2, 0, 2 * Math.PI, false);
					ctx.fill("evenodd");

					if (!uglyMode) {
						//lines canvas (remove lines)
						linesCtx.beginPath();
						linesCtx.arc(x, y, radius1, 0, 2 * Math.PI, false);
						linesCtx.arc(x, y, radius2, 0, 2 * Math.PI, false);
						linesCtx.fill("evenodd");
					}
				}

				//draw 500+
				if (thisHit.color !== undefined && player.isMyPlayer) {
					ctx.save();
					ctx.font = linesCtx.font = "6px Arial, Helvetica, sans-serif";
					ctx.fillStyle = thisHit.color.brighter;
					ctx.shadowColor = thisHit.color.darker;
					ctx.shadowOffsetX = ctx.shadowOffsetY = 0.4 * MAX_PIXEL_RATIO * zoom * canvasQuality;
					w = ctx.measureText("+500").width;
					var hOffset;
					var opacity;
					if (t < 0.5) {
						opacity = iLerp(0, 0.5, t);
					} else if (t < 3.5) {
						opacity = 1;
					} else {
						opacity = iLerp(4, 3.5, t);
					}
					opacity = clamp01(opacity);
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
				linesCtx.globalAlpha = clamp01(iLerp(player.honkMaxTime, 0, player.honkTimer));
				linesCtx.beginPath();
				linesCtx.arc(
					player.drawPos[0] * 10 + 4.5 + so,
					player.drawPos[1] * 10 + 4.5 + so,
					pr + player.honkTimer * 0.1,
					0,
					2 * Math.PI,
					false,
				);
				linesCtx.fill();
				linesCtx.globalAlpha = 1;
			}
		}

		//draw name
		if (localStorage.hidePlayerNames != "true") {
			myNameAlphaTimer += deltaTime * 0.001;
			ctx.font = linesCtx.font = USERNAME_SIZE + "px Arial, Helvetica, sans-serif";
			if (player.name) {
				var deadAlpha = 1;
				var myAlpha = 1;
				if (player.isMyPlayer) {
					myAlpha = 9 - myNameAlphaTimer;
				}
				if (player.isDead) {
					deadAlpha = 1 - player.isDeadTimer;
				}
				var alpha = Math.min(deadAlpha, myAlpha);
				if (alpha > 0) {
					ctx.save();
					if (!uglyMode) {
						linesCtx.save();
					}
					ctx.globalAlpha = clamp01(alpha);
					var width = ctx.measureText(player.name).width;
					width = Math.min(100, width);
					x = player.drawPos[0] * 10 + 5 - width / 2;
					y = player.drawPos[1] * 10 - 5;

					ctx.rect(x - 4, y - USERNAME_SIZE * 1.2, width + 8, USERNAME_SIZE * 2);
					ctx.clip();
					if (!uglyMode) {
						linesCtx.rect(x - 4, y - USERNAME_SIZE * 1.2, width + 8, USERNAME_SIZE * 2);
						linesCtx.clip();
						linesCtx.fillText(player.name, x, y);
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
						linesCtx.restore();
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

//moves (lerp) drawPos to the actual player position
function moveDrawPosToPos(player) {
	// var xDist = Math.abs(player.pos[0] - player.drawPos[0]);
	// var yDist = Math.abs(player.pos[1] - player.drawPos[1]);
	var target = null;
	if (player.isDead && !player.deathWasCertain) {
		target = player.uncertainDeathPosition;
	} else {
		target = player.pos;
	}
	player.drawPos[0] = lerpt(player.drawPos[0], target[0], 0.23);
	player.drawPos[1] = lerpt(player.drawPos[1], target[1], 0.23);
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

var dtCaps = [0, 6.5, 16, 33, 49, 99];
function getDtCap(index) {
	return dtCaps[clamp(index, 0, dtCaps.length - 1)];
}

function toggleQuality() {
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
	setQuality();
}

var qualityText;
function setQuality() {
	if (localStorage.getItem("quality") === null) {
		lsSet("quality", "1");
	}
	if (localStorage.quality != "auto") {
		canvasQuality = parseFloat(localStorage.quality);
		qualityText.innerHTML = "Quality: " + {
			"0.4": "low",
			"0.7": "medium",
			"1": "high",
		}[localStorage.quality];
	} else {
		qualityText.innerHTML = "Quality: auto";
	}
}

var uglyText;
function setUglyText() {
	updateUglyMode();
	var onOff = uglyMode ? "on" : "off";
	uglyText.innerHTML = "Ugly mode: " + onOff;
}

function toggleUglyMode() {
	switch (localStorage.uglyMode) {
		case "true":
			lsSet("uglyMode", "false");
			break;
		case "false":
		default:
			lsSet("uglyMode", "true");
			break;
	}
	setUglyText();
}

function updateUglyMode() {
	uglyMode = localStorage.uglyMode == "true";
}

function setLeaderboardVisibility() {
	leaderboardDivElem.style.display = leaderboardHidden ? "none" : null;
}

function loop(timeStamp) {
	var i, lastTrail, t, t2;
	var realDeltaTime = timeStamp - prevTimeStamp;
	if (realDeltaTime > lerpedDeltaTime) {
		lerpedDeltaTime = realDeltaTime;
	} else {
		lerpedDeltaTime = lerpt(lerpedDeltaTime, realDeltaTime, 0.05);
	}

	if (localStorage.quality == "auto" || localStorage.getItem("quality") === null) {
		if (lerpedDeltaTime > 33) {
			canvasQuality -= 0.01;
		} else if (lerpedDeltaTime < 28) {
			canvasQuality += 0.01;
		}
		canvasQuality = Math.min(1, Math.max(0.4, canvasQuality));
	}

	if (realDeltaTime < lerp(getDtCap(currentDtCap), getDtCap(currentDtCap - 1), 0.9)) {
		gainedFrames.push(Date.now());
		while (gainedFrames.length > 190) {
			if (Date.now() - gainedFrames[0] > 10000) {
				gainedFrames.splice(0, 1);
			} else {
				currentDtCap--;
				gainedFrames = [];
				currentDtCap = clamp(currentDtCap, 0, dtCaps.length - 1);
				break;
			}
		}
	}

	if (realDeltaTime > lerp(getDtCap(currentDtCap), getDtCap(currentDtCap + 1), 0.05)) {
		missedFrames.push(Date.now());
		gainedFrames = [];
		while (missedFrames.length > 5) {
			if (Date.now() - missedFrames[0] > 5000) {
				missedFrames.splice(0, 1);
			} else {
				currentDtCap++;
				missedFrames = [];
				currentDtCap = clamp(currentDtCap, 0, dtCaps.length - 1);
				break;
			}
		}
	}

	deltaTime = realDeltaTime + totalDeltaTimeFromCap;
	prevTimeStamp = timeStamp;

	if (deltaTime < getDtCap(currentDtCap) && localStorage.dontCapFps != "true") {
		totalDeltaTimeFromCap += realDeltaTime;
	} else {
		totalDeltaTimeFromCap = 0;

		canvasTransformType = canvasTransformTypes.MAIN;

		ctxCanvasSize(ctx);
		if (!uglyMode) {
			ctxCanvasSize(linesCtx);
		}

		//BG
		ctx.fillStyle = colors.grey.BG;
		ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
		if (!uglyMode) {
			linesCtx.fillStyle = "white";
			linesCtx.fillRect(0, 0, linesCanvas.width, linesCanvas.height);
		}

		//cam transforms
		camPosPrevFrame = [camPos[0], camPos[1]];
		calcCamOffset();
		ctxApplyCamTransform(ctx);
		if (!uglyMode) {
			ctxApplyCamTransform(linesCtx);
		}

		//draw blocks
		drawBlocks(ctx, blocks, true);

		//players
		var offset = deltaTime * GLOBAL_SPEED;
		for (var playerI = 0; playerI < players.length; playerI++) {
			var player = players[playerI];

			//move player
			if (!player.isDead || !player.deathWasCertain) {
				if (player.moveRelativeToServerPosNextFrame) {
					offset = (Date.now() - player.lastServerPosSentTime) * GLOBAL_SPEED;
				}
				if (player.isMyPlayer) {
					movePos(player.serverPos, player.serverDir, offset);
					if (player.serverDir == player.dir) {
						var clientServerDist = 0;
						if (localStorage.dontSlowPlayersDown != "true") {
							if (player.dir === 0 || player.dir == 2) { //left or right
								if (player.pos.y == player.serverPos.y) {
									if (player.dir === 0) { //right
										clientServerDist = player.pos[0] - player.serverPos[0];
									} else { //left
										clientServerDist = player.serverPos[0] - player.pos[0];
									}
								}
							} else { //up or down
								if (player.pos.x == player.serverPos.x) {
									if (player.dir == 1) { //down
										clientServerDist = player.pos[1] - player.serverPos[1];
									} else { //up
										clientServerDist = player.serverPos[1] - player.pos[1];
									}
								}
							}
						}
						clientServerDist = Math.max(0, clientServerDist);
						offset *= lerp(0.5, 1, iLerp(5, 0, clientServerDist));
					}
				}
				movePos(player.pos, player.dir, offset);
			}
			player.moveRelativeToServerPosNextFrame = false;

			moveDrawPosToPos(player);

			//test if player should be dead
			var playerShouldBeDead = false;
			if (
				player.drawPos[0] <= 0 || player.drawPos[1] <= 0 || player.drawPos[0] >= mapSize - 1 ||
				player.drawPos[1] >= mapSize - 1
			) {
				playerShouldBeDead = true;
			} else if (player.trails.length > 0) {
				lastTrail = player.trails[player.trails.length - 1].trail;
				var roundedPos = [Math.round(player.drawPos[0]), Math.round(player.drawPos[1])];
				if (
					Math.abs(roundedPos[0] - player.drawPos[0]) < 0.2 &&
					Math.abs(roundedPos[1] - player.drawPos[1]) < 0.2
				) {
					//only die if player.pos is close to the center of a block
					var touchingPrevTrail = true;
					for (i = lastTrail.length - 3; i >= 0; i--) {
						var pos1 = [Math.round(lastTrail[i][0]), Math.round(lastTrail[i][1])];
						var pos2 = [Math.round(lastTrail[i + 1][0]), Math.round(lastTrail[i + 1][1])];
						var twoPos = orderTwoPos(pos1, pos2);
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
				if (!player.isDead) {
					player.die();
				}
			} else {
				player.didUncertainDeathLastTick = false;
			}

			//test if player shouldn't be dead after all
			if (player.isDead && !player.deathWasCertain && player.isDeadTimer > 1.5) {
				player.isDead = false;
				if (player.trails.length > 0) {
					lastTrail = player.trails[player.trails.length - 1];
					lastTrail.vanishTimer = 0;
				}
			}

			//if my player
			if (player.isMyPlayer) {
				myPos = [player.pos[0], player.pos[1]];
				miniMapPlayer.style.left = (myPos[0] / mapSize * 160 + 1.5) + "px";
				miniMapPlayer.style.top = (myPos[1] / mapSize * 160 + 1.5) + "px";
				if (camPosSet) {
					camPos[0] = lerpt(camPos[0], player.pos[0], 0.03);
					camPos[1] = lerpt(camPos[1], player.pos[1], 0.03);
				} else {
					camPos = [player.pos[0], player.pos[1]];
					camPosSet = true;
				}

				if (myNextDir != player.dir) {
					// console.log("myNextDir != player.dir (",myNextDir,"!=",player.dir,")");
					var horizontal = player.dir === 0 || player.dir == 2;
					//only change when currently traveling horizontally and new dir is not horizontal
					//or when new dir is horizontal but not currently traveling horizontally
					if (changeDirAtIsHorizontal != horizontal) {
						var changeDirNow = false;
						var currentCoord = player.pos[horizontal ? 0 : 1];
						if (player.dir === 0 || player.dir == 1) { //right & down
							if (changeDirAt < currentCoord) {
								changeDirNow = true;
							}
						} else {
							if (changeDirAt > currentCoord) {
								changeDirNow = true;
							}
						}
						if (changeDirNow) {
							var newPos = [player.pos[0], player.pos[1]];
							var tooFarTraveled = Math.abs(changeDirAt - currentCoord);
							newPos[horizontal ? 0 : 1] = changeDirAt;
							changeMyDir(myNextDir, newPos);
							movePos(player.pos, player.dir, tooFarTraveled);
						}
					}
				}
			}

			drawPlayer(ctx, player, timeStamp);
		}

		//change dir queue
		if (sendDirQueue.length > 0) {
			var thisDir = sendDirQueue[0];
			if (
				Date.now() - thisDir.addTime > 1.2 / GLOBAL_SPEED || // older than '1.2 blocks travel time'
				sendDir(thisDir.dir, true) // senddir call was successful
			) {
				sendDirQueue.shift(); //remove item
			}
		}

		if (!uglyMode) {
			//draw lines canvas
			drawDiagonalLines(linesCtx, "white", 5, 10, timeStamp * 0.008);
		}

		//restore cam transforms
		ctx.restore();

		if (!uglyMode) {
			linesCtx.restore();
			ctx.globalCompositeOperation = "multiply";
			// ctx.clearRect(0,0,mainCanvas.width, mainCanvas.height)
			ctx.drawImage(linesCanvas, 0, 0);
			ctx.globalCompositeOperation = "source-over";
		}

		//corner stats
		scoreStat = lerpt(scoreStat, scoreStatTarget, 0.1);
		myScoreElem.innerHTML = Math.round(scoreStat);
		realScoreStat = lerpt(realScoreStat, realScoreStatTarget, 0.1);
		myRealScoreElem.innerHTML = Math.round(realScoreStat);

		//transition canvas
		if (isTransitioning) {
			// transitionTimer = 1;
			var DARK_EDGE_SIZE = 10, TITLE_HEIGHT = 60, TITLE_DURATION = 2, TITLE_PADDING = 10, TEXT_EXTRUDE = 5;
			TITLE_HEIGHT *= MAX_PIXEL_RATIO;
			TEXT_EXTRUDE *= MAX_PIXEL_RATIO;
			transitionTimer += deltaTime * transitionDirection * 0.001;

			if (
				transitionDirection == 1 && transitionCallback1 !== null && transitionTimer >= 0.5 &&
				transitionPrevTimer < 0.5
			) {
				transitionTimer = 0.5;
				transitionCallback1();
			}

			if (
				transitionDirection == -1 && transitionCallback2 !== null && transitionTimer <= 0.5 &&
				transitionPrevTimer > 0.5
			) {
				transitionTimer = 0.5;
				transitionCallback2();
			}

			if (
				transitionReverseOnHalf && transitionDirection == 1 && transitionTimer >= 1 + TITLE_DURATION &&
				transitionPrevTimer < 1 + TITLE_DURATION
			) {
				transitionDirection = -1;
				transitionTimer = 1;
			}

			transitionPrevTimer = transitionTimer;
			if (
				(transitionTimer <= 0 && transitionReverseOnHalf) ||
				(transitionTimer >= TITLE_DURATION + 1.5 && !transitionReverseOnHalf)
			) {
				transitionDirection = 0;
				isTransitioning = false;
				transitionCanvas.style.display = "none";
			} else {
				ctxCanvasSize(tCtx, true);

				var w = transitionCanvas.width, h = transitionCanvas.height;
				t = transitionTimer;
				if (t < 0.5) {
					t2 = t * 2;
					t2 = ease.in(t2);
					tCtx.fillStyle = colors.green2.darker;
					tCtx.fillRect(0, lerp(-DARK_EDGE_SIZE, h / 2, t2), w, DARK_EDGE_SIZE);
					tCtx.fillStyle = colors.green2.brighter;
					tCtx.fillRect(0, -DARK_EDGE_SIZE, w, lerp(0, h / 2 + DARK_EDGE_SIZE, t2));
					tCtx.fillRect(0, lerp(h, h / 2, t2), w, h);
				} else if (t < 1) {
					t2 = t * 2 - 1;
					t2 = ease.out(t2);
					if (transitionText) {
						tCtx.fillStyle = colors.green2.darker;
						tCtx.fillRect(
							0,
							lerp(0, h / 2 - TITLE_HEIGHT / 2, t2),
							w,
							lerp(h, TITLE_HEIGHT + DARK_EDGE_SIZE, t2),
						);
						tCtx.fillStyle = colors.green2.brighter;
						tCtx.fillRect(0, lerp(0, h / 2 - TITLE_HEIGHT / 2, t2), w, lerp(h, TITLE_HEIGHT, t2));
					} else {
						tCtx.fillStyle = colors.green2.darker;
						tCtx.fillRect(0, lerp(0, h / 2, t2), w, lerp(h, DARK_EDGE_SIZE, t2));
						tCtx.fillStyle = colors.green2.brighter;
						tCtx.fillRect(0, lerp(0, h / 2, t2), w, lerp(h, 0, t2));
					}
				} else if (t < 1 + TITLE_DURATION) {
					if (transitionText) {
						tCtx.fillStyle = colors.green2.darker;
						tCtx.fillRect(0, h / 2, w, TITLE_HEIGHT / 2 + DARK_EDGE_SIZE);
						tCtx.fillStyle = colors.green2.brighter;
						tCtx.fillRect(0, h / 2 - TITLE_HEIGHT / 2, w, TITLE_HEIGHT);
					} else {
						transitionTimer = TITLE_DURATION + 1.5;
					}
				} else if (t < TITLE_DURATION + 1.5) {
					t2 = (t - TITLE_DURATION - 1) * 2;
					t2 = ease.in(t2);
					tCtx.fillStyle = colors.green2.darker;
					tCtx.fillRect(0, h / 2, w, lerp(TITLE_HEIGHT / 2 + DARK_EDGE_SIZE, DARK_EDGE_SIZE, t2));
					tCtx.fillStyle = colors.green2.brighter;
					tCtx.fillRect(0, lerp(h / 2 - TITLE_HEIGHT / 2, h / 2, t2), w, lerp(TITLE_HEIGHT, 0, t2));
				}

				if (t > 0.5 && t < 3.5) {
					var fontHeight = TITLE_HEIGHT - TITLE_PADDING * 2;
					tCtx.font = fontHeight + "px Arial, Helvetica, sans-serif";
					var totalWidth = tCtx.measureText(transitionText).width;
					var x = w / 2 - totalWidth / 2 + TEXT_EXTRUDE / 2;
					var y = h / 2 + fontHeight * 0.37 + TEXT_EXTRUDE / 2;
					t2 = t;
					if (t < 1.1) {
						t2 = iLerp(0.5, 1.1, t);
					} else if (t < 2.9) {
						t2 = 1;
					} else {
						t2 = iLerp(3.5, 2.9, t);
					}
					drawAnimatedText(
						tCtx,
						transitionText,
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
					// tCtx.fillStyle = "white";
					// tCtx.fillText(transitionText, x, y);
				}

				tCtx.restore();
			}

			//skip death transition
			if (skipDeathTransition && transitionText == "GAME OVER" && transitionTimer > 1) {
				transitionTimer = 1.1;
				transitionDirection = -1;
				allowSkipDeathTransition = false;
				skipDeathTransition = false;
			}
		}

		//lives
		renderAllLives(deltaTime);

		//top notification
		for (var topNotificationI = currentTopNotifications.length - 1; topNotificationI >= 0; topNotificationI--) {
			var thisTopNotification = currentTopNotifications[topNotificationI];
			thisTopNotification.update(deltaTime);
		}

		engagementSetIsPlaying(playingAndReady && (Date.now() - lastSendDirTime) < 20000);

		//title
		if (beginScreenVisible && timeStamp - titleLastRender > 49) {
			if (resetTitleNextFrame) {
				resetTitleNextFrame = false;
				titleTimer = -1;
				titleLastRender = timeStamp;
			}
			titleTimer += (timeStamp - titleLastRender) * 0.002;
			titleLastRender = timeStamp;

			canvasTransformType = canvasTransformTypes.TITLE;
			ctxCanvasSize(titCtx, true);
			ctxApplyCamTransform(titCtx, false, true);

			drawTitle(titCtx, titleTimer, true, 0, true);
			drawTitle(titCtx, titleTimer, true, 2.5);
			drawTitle(titCtx, titleTimer);
			titCtx.restore();
		}

		//tutorial canvas
		if (beginScreenVisible) {
			tutorialTimer += deltaTime * GLOBAL_SPEED * 0.7;

			canvasTransformType = canvasTransformTypes.TUTORIAL;
			ctxCanvasSize(tutCtx);
			if (!uglyMode) {
				ctxCanvasSize(linesCtx);
			}

			//BG
			tutCtx.fillStyle = colors.grey.BG;
			tutCtx.fillRect(0, 0, tutorialCanvas.width, tutorialCanvas.height);
			if (!uglyMode) {
				linesCtx.fillStyle = "white";
				linesCtx.fillRect(0, 0, linesCanvas.width, linesCanvas.height);
			}

			//cam transforms
			ctxApplyCamTransform(tutCtx);
			if (!uglyMode) {
				ctxApplyCamTransform(linesCtx);
			}

			t = tutorialTimer;
			drawBlocks(tutCtx, tutorialBlocks);
			var p1 = getPlayer(1, tutorialPlayers);
			var p2 = getPlayer(2, tutorialPlayers);

			//p1
			if (t < 10) {
				p1.pos = [2, 2];
			} else if (t < 15) {
				p1.pos = [t - 8, 2];
			} else if (t < 18) {
				p1.pos = [7, t - 13];
			} else if (t < 23) {
				p1.pos = [25 - t, 5];
			} else if (t < 26) {
				p1.pos = [2, 28 - t];
			} else if (t < 30) {
			} else if (t < 36) {
				p1.pos = [2, t - 28];
			} else if (t < 39) {
				p1.pos = [t - 34, 8];
			}

			//p1 trail
			if (t < 12) {
			} else if (t < 15) {
				p1.trails = [{
					trail: [[4, 2]],
					vanishTimer: 0,
				}];
			} else if (t < 18) {
				p1.trails = [{
					trail: [[4, 2], [7, 2]],
					vanishTimer: 0,
				}];
			} else if (t < 23) {
				p1.trails = [{
					trail: [[4, 2], [7, 2], [7, 5]],
					vanishTimer: 0,
				}];
			} else if (t < 24) {
				p1.trails = [{
					trail: [[4, 2], [7, 2], [7, 5], [2, 5]],
					vanishTimer: 0,
				}];
			}
			if (t > 24 && tutorialPrevTimer < 24) {
				p1.trails = [{
					trail: [[4, 2], [7, 2], [7, 5], [2, 5], [2, 4]],
					vanishTimer: 0,
				}, {
					trail: [],
					vanishTimer: 0,
				}];
			}
			if (t < 34) {
			} else if (t < 36) {
				p1.trails = [{
					trail: [[2, 6]],
					vanishTimer: 0,
				}];
			} else if (t < 39) {
				p1.trails = [{
					trail: [[2, 6], [2, 8]],
					vanishTimer: 0,
				}];
			}

			//p2
			if (t < 34) {
			} else if (t < 50) {
				p2.pos = [t - 37, 7];
				p2.trails = [{
					trail: [[-2, 7]],
					vanishTimer: 0,
				}];
			}

			if (t > 25 && tutorialPrevTimer < 25) {
				fillArea(2, 2, 6, 4, 10, 0, tutorialBlocks);
			}
			if (t > 39 && tutorialPrevTimer < 39) {
				p1.die(true);
				fillArea(1, 1, 7, 5, 1, 0, tutorialBlocks);
				p2.addHitLine([2, 7]);
			}
			if (t > 50) {
				tutorialTimer = tutorialPrevTimer = 0;
				fillArea(1, 1, 3, 3, 10, 0, tutorialBlocks);
				p1.isDeadTimer = 0;
				p1.isDead = false;
				p1.trails = [];
				p1.pos = [100, 100];
				p2.trails = [{
					trail: [[-2, 7], [12, 7]],
					vanishTimer: 0,
				}, {
					trail: [],
					vanishTimer: 0,
				}];
				p2.pos = p2.drawPos = [-2, 7];
			}

			//tutorial text
			if (t > 1 && tutorialPrevTimer < 1) {
				tutorialText.innerHTML = "Close an area to fill it with your color.";
			}
			if (t > 30 && tutorialPrevTimer < 30) {
				tutorialText.innerHTML = "Don't get hit by other players.";
			}
			var textOpacity = clamp01(5 - Math.abs((t - 20) * 0.5));
			textOpacity += clamp01(4 - Math.abs((t - 40) * 0.5));
			tutorialText.style.opacity = clamp(textOpacity, 0, 0.9);

			moveDrawPosToPos(p1);
			moveDrawPosToPos(p2);

			tutCtx.globalAlpha = Math.min(1, Math.max(0, t * 0.3 - 1));
			drawPlayer(tutCtx, p1, timeStamp);
			drawPlayer(tutCtx, p2, timeStamp);
			tutCtx.globalAlpha = 1;
			tutorialPrevTimer = t;

			//draw lines canvas
			if (!uglyMode) {
				drawDiagonalLines(linesCtx, "white", 5, 10, timeStamp * 0.008);
			}

			//restore cam transforms
			tutCtx.restore();

			if (!uglyMode) {
				linesCtx.restore();
				tutCtx.globalCompositeOperation = "multiply";
				tutCtx.drawImage(linesCanvas, 0, 0);
				tutCtx.globalCompositeOperation = "source-over";
			}
		}

		//skin button
		if (beginScreenVisible) {
			canvasTransformType = canvasTransformTypes.SKIN_BUTTON;

			ctxApplyCamTransform(skinButtonCtx, true, true);

			drawBlocks(skinButtonCtx, skinButtonBlocks);
			skinButtonCtx.restore();
		}

		//skin screen canvas
		if (skinScreenVisible) {
			canvasTransformType = canvasTransformTypes.SKIN;

			ctxApplyCamTransform(skinCtx, true);

			drawBlocks(skinCtx, skinScreenBlocks);
			skinCtx.restore();
		}

		//lastStats
		if (beginScreenVisible) {
			lastStatTimer += deltaTime;
			t = lastStatTimer / 2000;
			if (t > 1) {
				lastStatTimer = 0;
				lastStatCounter++;
				if (lastStatCounter > 5) {
					lastStatCounter = 0;
				}

				if (lastStatCounter === 0) {
					if (lastStatNo1Time <= 0 && bestStatNo1Time <= 0) {
						lastStatCounter++;
					} else {
						lastStatValueElem.innerHTML = parseTimeToString(lastStatNo1Time) + " on #1";
						bestStatValueElem.innerHTML = parseTimeToString(bestStatNo1Time) + " on #1";
					}
				}
				if (lastStatCounter == 1) {
					if (lastStatKiller === "" && lastStatKiller.replace(/\s/g, "").length > 0) {
						lastStatCounter++;
					} else {
						lastStatValueElem.innerHTML = "killed by " + filter(htmlEscape(lastStatKiller));
						bestStatValueElem.innerHTML = "";
					}
				}
				if (lastStatCounter == 2) {
					if (lastStatKills <= 0 && bestStatKills <= 0) {
						lastStatCounter++;
					} else {
						var killsS = lastStatKills == 1 ? "" : "s";
						lastStatValueElem.innerHTML = lastStatKills + " player" + killsS + " killed";
						var killsS2 = bestStatKills == 1 ? "" : "s";
						bestStatValueElem.innerHTML = bestStatKills + " player" + killsS2 + " killed";
					}
				}
				if (lastStatCounter == 3) {
					lastStatValueElem.innerHTML = parseTimeToString(lastStatAlive) + " alive";
					bestStatValueElem.innerHTML =
						parseTimeToString(Math.max(lastStatAlive, localStorage.getItem("bestStatAlive"))) + " alive";
				}
				if (lastStatCounter == 4) {
					if (lastStatBlocks <= 0 && bestStatBlocks <= 0) {
						lastStatCounter++;
					} else {
						var blockS = lastStatBlocks == 1 ? "" : "s";
						lastStatValueElem.innerHTML = lastStatBlocks + " block" + blockS + " captured";
						var blockS2 = bestStatBlocks == 1 ? "" : "s";
						bestStatValueElem.innerHTML = bestStatBlocks + " block" + blockS2 + " captured";
					}
				}
				if (lastStatCounter == 5) {
					if (lastStatLbRank <= 0 && bestStatLbRank <= 0) {
						lastStatCounter = 0;
					} else {
						lastStatValueElem.innerHTML = lastStatLbRank == 0 ? "" : "#" + lastStatLbRank + " highest rank";
						bestStatValueElem.innerHTML = bestStatLbRank == 0 ? "" : "#" + bestStatLbRank + " highest rank";
					}
				}
			}
			var speed = 5;
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

		//debug info
		if (localStorage.drawDebug == "true") {
			var avg = Math.round(thisServerAvgPing);
			var last = Math.round(thisServerLastPing);
			var diff = Math.round(thisServerDiffPing);
			var str = "avg:" + avg + " last:" + last + " diff:" + diff;
			ctx.font = "14px Arial, Helvetica, sans-serif";
			ctx.fillStyle = colors.red.brighter;
			var textWidth = ctx.measureText(str).width;
			ctx.fillText(str, ctx.canvas.width - textWidth - 10, ctx.canvas.height - 10);
		}

		testAdBoxLoaded();
		testAdBox2Loaded();

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
	var clientSideSetPosPassed = Date.now() - lastMyPosSetClientSideTime;
	var clientSideValidSetPosPassed = Date.now() - lastMyPosSetValidClientSideTime;
	var serverSideSetPosPassed = Date.now() - lastMyPosServerSideTime;
	// console.log(clientSideSetPosPassed, clientSideValidSetPosPassed, serverSideSetPosPassed);
	if (
		clientSideValidSetPosPassed > WAIT_FOR_DISCONNECTED_MS &&
		serverSideSetPosPassed - clientSideSetPosPassed > WAIT_FOR_DISCONNECTED_MS && !myPlayer.isDead
	) {
		if (!connectionLostNotification) {
			connectionLostNotification = doTopNotification(
				"It seems like you're disconnected. Please check your connection.",
			);
		}
	} else {
		if (connectionLostNotification) {
			connectionLostNotification.animateOut();
			connectionLostNotification = null;
		}
	}

	var maxPingTime = waitingForPing ? 10000 : 5000;
	if (ws !== null && Date.now() - lastPingTime > maxPingTime) {
		lastPingTime = Date.now();
		if (wsSendMsg(sendAction.PING)) {
			waitingForPing = true;
		}
	}

	// if(window.innerWidth != prevWindowWidth || window.innerHeight != prevWindowHeight){
	// 	prevWindowWidth = window.innerWidth;
	// 	prevWindowHeight = window.innerHeight;
	// 	onResize(prevWindowWidth, prevWindowHeight);
	// }

	parseGamepads();

	window.requestAnimationFrame(loop);
}

var gamePadIsHonking = false;
var customMappings = [
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
];

var currentGamepad;
var currentMap = {
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
function getButton(id) {
	if (currentGamepad) {
		if (currentGamepad.buttons) {
			var button = currentGamepad.buttons[currentMap.buttonMap[id]];
			if (button) {
				return button.pressed;
			}
		}
	}
	return false;
}

function getAxis(id) {
	if (currentGamepad) {
		if (currentGamepad.axes) {
			var axis = currentGamepad.axes[currentMap.axesMap[id]];
			if (axis !== undefined) {
				return axis;
			}
		}
	}
	return 0;
}

function parseGamepads() {
	if ("getGamepads" in navigator) {
		var gamepads = navigator.getGamepads();
		var honkButtonPressedAnyPad = false;
		for (var i = 0; i < gamepads.length; i++) {
			currentGamepad = gamepads[i];
			if (currentGamepad !== undefined && currentGamepad !== null) {
				var validGamepad = false;
				if (currentGamepad.mapping == "standard") {
					currentMap = {
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
					for (var j = 0; j < customMappings.length; j++) {
						if (currentGamepad.id.indexOf(customMappings[j].name) >= 0) {
							validGamepad = true;
							currentMap = customMappings[j];
						}
					}
				}
				if (validGamepad) {
					if (getButton(12)) { //up
						sendDir(3);
					}
					if (getButton(13)) { //down
						sendDir(1);
					}
					if (getButton(14)) { //left
						sendDir(2);
					}
					if (getButton(15)) { //right
						sendDir(0);
					}
					if (getButton(0)) { // X / A
						honkButtonPressedAnyPad = true;
					}
					if (getButton(1)) { // O / B
						doSkipDeathTransition();
					}
					if (getButton(9)) { // pause
						sendDir(4);
					}
					if (getAxis(0) < -0.9 || getAxis(2) < -0.9) { //left
						sendDir(2);
					}
					if (getAxis(0) > 0.9 || getAxis(2) > 0.9) { //right
						sendDir(0);
					}
					if (getAxis(1) < -0.9 || getAxis(3) < -0.9) { //up
						sendDir(3);
					}
					if (getAxis(1) > 0.9 || getAxis(3) > 0.9) { //down
						sendDir(1);
					}
				}
			}
		}

		if (honkButtonPressedAnyPad) { // X / A
			if (beginScreenVisible) {
				connectWithTransition();
			} else if (!gamePadIsHonking) {
				gamePadIsHonking = true;
				honkStart();
			}
		} else {
			if (gamePadIsHonking) {
				gamePadIsHonking = false;
				honkEnd();
			}
		}
	}
}

//stackoverflow.com/a/18729931/3625298
function toUTF8Array(str) {
	var utf8 = [];
	for (var i = 0; i < str.length; i++) {
		var charcode = str.charCodeAt(i);
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

//http://stackoverflow.com/a/7124052/3625298
function htmlEscape(str) {
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

var swearArr = [];
simpleRequest("./static/swearList.txt", function (result) {
	swearArr = result.split("\n").filter(function (n) {
		return n;
	});
});
var swearRepl = "balaboo";
function filter(str) {
	str = str.replace(/[卐卍]/g, "❤");
	var words = str.split(" ");
	for (var i = 0; i < words.length; i++) {
		var word = words[i];
		var wasAllUpper = word.toUpperCase() == word;
		for (var j = 0; j < swearArr.length; j++) {
			var swear = swearArr[j];
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

//stackoverflow.com/a/22373135/3625298
// http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt

/* utf.js - UTF-8 <=> UTF-16 convertion
 *
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 */

function Utf8ArrayToStr(array) {
	var out, i, len, c;
	var char2, char3;

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

function bytesToInt() {
	var integer = 0;
	var multiplier = 0;
	for (var i = arguments.length - 1; i >= 0; i--) {
		var thisArg = arguments[i];
		integer = (integer | (((thisArg & 0xff) << multiplier) >>> 0)) >>> 0;
		multiplier += 8;
	}
	return integer;
}

function intToBytes(integer, byteCount) {
	var bytes = [];
	for (var i = 0; i < byteCount; i++) {
		var byte = integer & 0xff;
		bytes[byteCount - i - 1] = byte;
		integer = (integer - byte) / 256;
	}
	return bytes;
}

function parseTimeToString(seconds) {
	var hours = Math.floor(seconds / 3600);
	var minutes = Math.floor((seconds - (hours * 3600)) / 60);
	seconds = seconds - (hours * 3600) - (minutes * 60);
	if (hours <= 0) {
		var secondsS = seconds == 1 ? "" : "s";
		if (minutes <= 0) {
			return seconds + " second" + secondsS;
		} else {
			var minutesS = minutes == 1 ? "" : "s";
			return minutes + " minute" + minutesS + " and " + seconds + " second" + secondsS;
		}
	} else {
		if (hours < 10) hours = "0" + hours;
		if (minutes < 10) minutes = "0" + minutes;
		if (seconds < 10) seconds = "0" + seconds;
		return hours + ":" + minutes + ":" + seconds;
	}
}

function parseQuery(url) {
	var startIndex = url.indexOf("?");
	if (startIndex < 0) {
		return {};
	}
	var queryString = url.substr(startIndex + 1);
	var queryItems = queryString.split("&");
	var query = {};
	for (var i = 0; i < queryItems.length; i++) {
		var split = queryItems[i].split("=");
		if (split.length == 2) {
			query[split[0]] = split[1];
		}
	}
	return query;
}
