const GLOBAL_SPEED = 0.006;
const VIEWPORT_RADIUS = 30;
const MAX_ZOOM = 10000;
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



let request_counter = 0;

self.onmessage = evt => {
    const data = evt.data;
    if(typeof data.response === "string"){
        if(data.response === "get_send_dir_data"){
            if(game_connection === null) return;
            else if(game_connection.lastSendDirRequest === null){
                console.error('get_send_dir_data received but was not requested.');
                return;
            } else if(game_connection.lastSendDirRequest.id != data.id){
                console.error(`get_send_dir_data has the wrong id. Got ${data.id} but expected ${game_connection.lastSendDirRequest.id}`);
                return;
            }else{
                game_connection.sendDir(game_connection.lastSendDirRequest.dir,game_connection.lastSendDirRequest.skipQueue,data.result.my_pos,data.result.my_dir);
            }
        }
    }else if(typeof data.call === "string"){
        if(!replay){
            game_connection[data.call].call(game_connection,...data.args);
        }
    } else if(typeof data.request === "string"){
        if(data.request === "start_connection"){
            if(data.args.replay==="replay"){
                replay = true;
                game_connection = new RegisteredConnection(data.args);
            }else{
                replay = false;
                game_connection = new GameConnection(data.args);
            }
        }else if(data.request === "close_connection"){
            if(replay) return;
            if(game_connection && game_connection.ws && game_connection.ws.readyState == WebSocket.OPEN){
                game_connection.ws.close();
            }
            game_connection = null;
        }
    }
}

/**
 *@type {GameConnection|null}
 */
let game_connection = null;
let replay = false;

const request = indexedDB.open("test");
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


class GameConnection {
	ws;
	url;

	/** @type {OneGame} Associated state */
	game;
	
	// Status
	isConnecting = true;
	closedBecauseOfDeath = false;
	myRankSent = false;
	hasReceivedChunkThisGame = false;
	
	// Ping
	serverAvgPing = 0;
	serverLastPing = 0;
	serverDiffPing = 0;
	lastPingTime = 0;
	waitingForPing = false;
	
	// Trail
	isRequestingMyTrail = false;
	skipTrailRequestResponse = false;
	trailPushesDuringRequest = [];

	// Direction/moving
    lastSendDirRequest = null;
	lastSendDir = -1;
	lastSendDirTime = 0;
	sendDirQueue = [];
	lastChangedDirPos = null;
	lastClientsideMoves = [];

	/** @type {number}  time stamp of the opening of the websocket connection */
	onOpenTime;
	constructor({url,skinColor,skinPattern,patreonLastSplixCode,name,recording,replay}){
		this.url = url;
        this.skinColor = skinColor;
        this.skinPattern = skinPattern;
        this.name = name;
        this.recording = recording;
        this.replay = replay;
        this.patreonLastSplixCode = patreonLastSplixCode;
		// TODO showCouldntConnectAfterTransition = false; 
		this.ws = new WebSocket(url); // TODO add simulated latency
		this.ws.binaryType = "arraybuffer";
		const that = this;
		this.ws.onmessage = function (evt) {
			if (that.ws == this) {
				that.onMessage(evt);
			}
		};
		this.ws.onclose = function (evt) {
			if (that.ws == this) {
				that.onClose(evt);
			}
		};
		this.ws.onopen = function (evt) {
			if (that.ws == this) {
				that.onOpen(evt);				
			}
		};
        const loop = ()=>{
            if(this){
                this.render();
                requestAnimationFrame(loop)
            }
        }
        requestAnimationFrame(loop);
	}

    post(data){
        self.postMessage(data);
		/*
        if(this.replay !== "recording") return;
        if(!data.call) return;
		if(data.call === "player_honk"){
			db.transaction(["recording_data"], "readwrite").objectStore("recording_data").add({
				time: performance.now(),
				recording: this.recording,
				call: data.call,
				args: [data.args[0],Math.round(data.args[1]/20)*20],
			});
		} else {
			db.transaction(["recording_data"], "readwrite").objectStore("recording_data").add({
				time: performance.now(),
				recording: this.recording,
				call: data.call,
				args: data.args,
			});
		}
		*/
    }

	//#region Server communication
	//when WebSocket connection is established
	onOpen(evt){
		this.isConnecting = false;
		this.sendLegacyVersion();
		this.sendPatreonCode();
		this.sendName();
		this.sendSkin();
		this.wsSendMsg(sendAction.READY);
        this.post({
            call: "onopen",
            args: [],
        });
		this.onOpenTime = Date.now();
	}

	//when WebSocket connection is closed
	onClose() {
		if (!!this && !!this.ws && this.ws.readyState == WebSocket.OPEN) {
			this.ws.close();
		}
        this.post({
            call: "onclose",
            args: [this.closedBecauseOfDeath],
        });
		this.ws = null;
		this.isConnecting = false;
	}

	//sends a legacy message which is required for older servers
	sendLegacyVersion() {
		this.wsSendMsg(sendAction.VERSION, {
			type: 0,
			ver: 28,
		});
	}

	//sends current skin to websocket
	sendSkin() {
		let blockColor = this.skinColor;
		if (blockColor === null) {
			blockColor = 0;
		}
		let pattern = this.skinPattern;
		if (pattern === null) {
			pattern = 0;
		}
		this.wsSendMsg(sendAction.SKIN, {
			blockColor: blockColor,
			pattern: pattern,
		});
	}

	sendPatreonCode() {
		const patreonLastSplixCode = this.patreonLastSplixCode;
		if (patreonLastSplixCode !== "" && patreonLastSplixCode !== undefined) {
			this.wsSendMsg(sendAction.PATREON_CODE, patreonLastSplixCode);
		}
	}

	//sends name to websocket
	sendName() {
		const n = this.name;
		if (n !== undefined && n !== null && n !== "" && n.trim() !== "") {
			this.wsSendMsg(sendAction.SET_USERNAME, n);
		}
	}

	startRequestMyTrail(emptySendDirQueue) {
        if(emptySendDirQueue){
            this.sendDirQueue = [];
        }
		this.isRequestingMyTrail = true;
		this.trailPushesDuringRequest = [];
		this.wsSendMsg(sendAction.REQUEST_MY_TRAIL);
	}

    prepareSendDir(dir,skipQueue){
        const id = request_counter;
        request_counter+=1;
        this.lastSendDirRequest = {id,dir,skipQueue};
        this.post({
            request: "get_send_dir_data",
            args: [],
            id,
        });

    }

    changeMyDir(newPos,dir,isClientside){
		this.lastChangedDirPos = [newPos[0], newPos[1]];
		if (isClientside) {
			this.lastClientsideMoves.push({
				dir: dir,
				pos: newPos,
			});
		}
    }

    myTrailPush(pos){
        if (this.isRequestingMyTrail) {
            this.trailPushesDuringRequest.push(pos);
        }
    }
	
	sendDir(dir, skipQueue,my_pos,my_dir) {
        if(!my_pos || !Number.isFinite(my_pos[0]) ||!Number.isFinite(my_pos[1])){
            console.trace("ERROR",dir,skipQueue,my_pos,my_dir);
        }
		//prevent spamming sendDir function
		if (
			dir == this.lastSendDir && //if dir is same as old sendDir call
			(Date.now() - this.lastSendDirTime) < 0.7 / GLOBAL_SPEED // if last call was less than 'one block travel time' ago
		) {
			return false;
		}
		this.lastSendDir = dir;
		this.lastSendDirTime = Date.now();
	
		//dir is already the current direction, don't do anything
		if (my_dir == dir) {
			// console.log("already current direction, don't do anything");
			this.addSendDirQueue(dir, skipQueue);
			return false;
		}
	
		//if dir is the opposite direction
		if (
			(dir === 0 && my_dir == 2) ||
			(dir == 2 && my_dir === 0) ||
			(dir == 1 && my_dir == 3) ||
			(dir == 3 && my_dir == 1)
		) {
			// console.log("already opposite direction, don't send");
			this.addSendDirQueue(dir, skipQueue);
			return false;
		}
	
		//wether next direction is horizontal movement or not
		const horizontal = my_dir == 1 || my_dir == 3;
		const coord = my_pos[horizontal ? 1 : 0];
		const newPos = [my_pos[0], my_pos[1]];
		const roundCoord = Math.round(coord);
		newPos[horizontal ? 1 : 0] = roundCoord;
	
		// console.log("test already sent");
	
		//test if the coordinate being sent wasn't already sent earlier
		// console.log(lastChangedDirPos);
		if (
			(my_dir === 0 && newPos[0] <= this.lastChangedDirPos[0]) ||
			(my_dir == 1 && newPos[1] <= this.lastChangedDirPos[1]) ||
			(my_dir == 2 && newPos[0] >= this.lastChangedDirPos[0]) ||
			(my_dir == 3 && newPos[1] >= this.lastChangedDirPos[1])
		) {
			// console.log("same coordinate, don't send");
			this.addSendDirQueue(dir, skipQueue);
			return false;
		}
	
		let changeDirNow = false;
		const blockPos = coord - Math.floor(coord);
		if (my_dir <= 1) { //right or down
			if (blockPos < 0.45) {
				changeDirNow = true;
			}
		} else if (my_dir <= 3) { //left or up
			if (blockPos > 0.55) {
				changeDirNow = true;
			}
		} else { //paused
			changeDirNow = true;
		}
	
		// console.log("changeDirNow",changeDirNow);
	
		if (changeDirNow) {
            this.post({
                call: "change_my_dir",
                args: [dir, newPos],
            });
		} else {
            this.post({
                call: "change_dir",
                args: [{
                    next_dir: dir,
                    at: roundCoord,
                    is_horizontal: horizontal,
                }],
            });
			this.lastChangedDirPos = [newPos[0], newPos[1]];
		}
		// console.log("send ======= UPDATE_DIR ======",dir,newPos);
		this.wsSendMsg(sendAction.UPDATE_DIR, {
			dir: dir,
			coord: newPos,
		});
		return true;
	}

	render(){ // TODO give a better name to this method
		if (this.sendDirQueue.length > 0) {
			const thisDir = this.sendDirQueue[0];
			if (
				Date.now() - thisDir.addTime > 1.2 / GLOBAL_SPEED || // older than '1.2 blocks travel time'
				this.prepareSendDir(thisDir.dir, true) // senddir call was successful
			) {
				this.sendDirQueue.shift(); //remove item
			}
		}
		const maxPingTime = this.waitingForPing ? 10000 : 5000;
		if (Date.now() - this.lastPingTime > maxPingTime) {
			this.lastPingTime = Date.now();
			if (this.wsSendMsg(sendAction.PING)) {
				this.waitingForPing = true;
			}
		}
	}

	addSendDirQueue(dir, skip) {
		// console.log("adding sendDir to queue", dir, skip);
		if (!skip && this.sendDirQueue.length < 3) {
			this.sendDirQueue.push({
				dir: dir,
				addTime: Date.now(),
			});
		}
	}

	/**
	 * send a message to the websocket, returns true if successful
	 * @param {sendAction} action
	 * @param {Record<string,any>} data 
	 * @returns {bool} `true` if successful
	 */
	wsSendMsg(action, data) {
		let utf8Array;
		if (!!this.ws && this.ws.readyState == WebSocket.OPEN) {
			const array = [action];
			if (action == sendAction.UPDATE_DIR) {
				array.push(data.dir);
				const coordBytesX = intToBytes(data.coord[0], 2);
				array.push(coordBytesX[0]);
				array.push(coordBytesX[1]);
				const coordBytesY = intToBytes(data.coord[1], 2);
				array.push(coordBytesY[0]);
				array.push(coordBytesY[1]);
			}
			else if (
				action == sendAction.SET_USERNAME || action == sendAction.SET_TEAM_USERNAME ||
				action == sendAction.PATREON_CODE
			){
				utf8Array = toUTF8Array(data);
				array.push.apply(array, utf8Array);
			}
			else if (action == sendAction.SKIN) {
				array.push(data.blockColor);
				array.push(data.pattern);
			}
			else if (action == sendAction.REQUEST_CLOSE) {
				for (const b of data) {
					array.push(b);
				}
			}
			else if (action == sendAction.HONK) {
				array.push(data);
				this.post({
					call: "player_honk",
					args: [0,data],
				});
			}
			else if (action == sendAction.MY_TEAM_URL) {
				utf8Array = toUTF8Array(data);
				array.push.apply(array, utf8Array);
			}
			else if (action == sendAction.VERSION) {
				array.push(data.type);
				const verBytes = intToBytes(data.ver, 2);
				array.push(verBytes[0]);
				array.push(verBytes[1]);
			}
			const payload = new Uint8Array(array);
			try {
				this.ws.send(payload);
				return true;
			} catch (ex) {
				console.log("error sending message", action, data, array, ex);
			}
		}
		return false;
	}

	//when receiving a message from the websocket
	onMessage(evt) {
		// console.log(evt);
		let data = new Uint8Array(evt.data);
		// console.log(evt.data);
		// for(var key in receiveAction){
		// 	if(receiveAction[key] == data[0]){
		// 		console.log(key);
		// 	}
		// }
		if (data[0] == receiveAction.UPDATE_BLOCKS) {
			const x = bytesToInt(data[1], data[2]);
			const y = bytesToInt(data[3], data[4]);
			const type = data[5];
			this.post({
                call: "block",
                args: [x,y,type],
            });;
		}
		if (data[0] == receiveAction.PLAYER_POS) {
			const x = bytesToInt(data[1], data[2]);
			const y = bytesToInt(data[3], data[4]);
			const id = bytesToInt(data[5], data[6]);
			const new_dir = data[7];
			let doSetPos = true;
			if(id === 0){
				//if dir and pos are the first item of lastClientsideMoves
				//when two movements are made shortly after each other the
				//previous check (dir && pos) won't suffice, eg:
				// client makes move #1
				// client makes move #2
				// receives move #1 <-- different from current dir & pos
				// recieves move #2
				// console.log(lastClientsideMoves);
				if (this.lastClientsideMoves.length > 0) {
					const lastClientsideMove = this.lastClientsideMoves.shift();
					if (
						lastClientsideMove.dir == new_dir &&
						lastClientsideMove.pos[0] == x &&
						lastClientsideMove.pos[1] == y
					) {
						doSetPos = false;
						// console.log("new dir is same as last isClientside move");
						// console.log("doSetPos = false;");
					} else {
						this.lastClientsideMoves = [];
						// console.log("empty lastClientsideMoves");
					}
				}
			}
			const extendTrail = data.length > 8 && data[8] == 1;
			this.post({
                call: "player_pos",
                args: [id,x,y,new_dir,extendTrail,doSetPos,this.serverAvgPing],
            });;
			
		}
		if (data[0] == receiveAction.FILL_AREA) {
			const x = bytesToInt(data[1], data[2]);
			const y = bytesToInt(data[3], data[4]);
			const w = bytesToInt(data[5], data[6]);
			const h = bytesToInt(data[7], data[8]);
			const type = data[9];
			const pattern = data[10];
			const isEdgeChunk = data[11];
			this.post({
                call: "fill_area",
                args: [x, y, w, h, type, pattern, isEdgeChunk],
            });;
		}
		if (data[0] == receiveAction.SET_TRAIL) {
			const id = bytesToInt(data[1], data[2]);
			const newTrail = [];
			//wether the new trail should replace the old trail (don't play animation)
			//or append it to the trails list (do play animation)
			let replace = false;
			for (let i = 3; i < data.length; i += 4) {
				const coord = [bytesToInt(data[i], data[i + 1]), bytesToInt(data[i + 2], data[i + 3])];
				newTrail.push(coord);
			}
			if (id === 0) {
				if (this.skipTrailRequestResponse) {
					this.skipTrailRequestResponse = false;
					this.trailPushesDuringRequest = [];
				} else {
					if (this.isRequestingMyTrail) {
						this.isRequestingMyTrail = false;
						replace = true;
						for (const trail_push of this.trailPushesDuringRequest) {
							newTrail.push(trail_push);
						}
						this.trailPushesDuringRequest = [];
					}
                    // Some code depending on the player's data was moved in
                    // the call below.
				}
			}
			this.post({
                call: "player_trail",
                args: [id,newTrail,replace],
            });;
		}
		if (data[0] == receiveAction.EMPTY_TRAIL_WITH_LAST_POS) {
			const id = bytesToInt(data[1], data[2]);
			const x = bytesToInt(data[3], data[4]);
			const y = bytesToInt(data[5], data[6]);
			//fix for trailing while in own land
			//when your ping is high and trail very short
			//(one block or so) you'll start trailing
			//in your own land. It's a ghost trail and you make
			//ghost deaths every time you hit the line
			if (id === 0 && this.isRequestingMyTrail) {
				this.skipTrailRequestResponse = true;
			}

			this.post({
                call: "player_empty_trail_with_last_pos",
                args: [id,x,y],
            });;
		}
		if (data[0] == receiveAction.PLAYER_DIE) {
			const id = bytesToInt(data[1], data[2]);
			if (data.length > 3) {
				const x = bytesToInt(data[3], data[4]);
				const y = bytesToInt(data[5], data[6]);
				this.post({
                call: "player_die",
                args: [id,x,y],
            });;
			}
			this.post({
                call: "player_die",
                args: [id],
            });;
		}
		if (data[0] == receiveAction.CHUNK_OF_BLOCKS) {
			const x = bytesToInt(data[1], data[2]);
			const y = bytesToInt(data[3], data[4]);
			const w = bytesToInt(data[5], data[6]);
			const h = bytesToInt(data[7], data[8]);
            const chunk = data.slice(9);
			this.post({
                call: "chunk_of_blocks",
                args: [x,y,w,h,chunk],
            });;
			if (!this.hasReceivedChunkThisGame) {
				this.hasReceivedChunkThisGame = true;
				this.wsSendMsg(sendAction.READY);
			}
		}
		if (data[0] == receiveAction.REMOVE_PLAYER) {
			const id = bytesToInt(data[1], data[2]);
			this.post({
                call: "player_remove",
                args: [id],
            });;
		}
		if (data[0] == receiveAction.PLAYER_NAME) {
			const id = bytesToInt(data[1], data[2]);
			const nameBytes = data.subarray(3, data.length);
			const  name = Utf8ArrayToStr(nameBytes);
			this.post({
                call: "player_name",
                args: [id,name],
            });;
		}
		if (data[0] == receiveAction.MY_SCORE) {
			const blocks = bytesToInt(data[1], data[2], data[3], data[4]);
			const kills = data.length > 5 ? bytesToInt(data[5], data[6]) : 0;
			this.post({
                call: "my_score",
                args: [kills,blocks],
            });;
		}
		if (data[0] == receiveAction.MY_RANK) {
			const rank = bytesToInt(data[1], data[2]);
			this.myRankSent = true;
			this.post({
                call: "my_rank",
                args: [rank],
            });;
		}
		if (data[0] == receiveAction.LEADERBOARD) {
			const total_players = bytesToInt(data[1], data[2]);
			this.post({
                call: "leaderboard",
                args: [total_players,data.slice(3)],
            });;
		}
		if (data[0] == receiveAction.MAP_SIZE) {
			this.post({
                call: "map_size",
                args: [bytesToInt(data[1], data[2])],
            })
		}
		if (data[0] == receiveAction.YOU_DED) {
			this.closedBecauseOfDeath = true;
			this.post({
                call: "you_ded",
                args: [data],
            });;
		}
		if (data[0] == receiveAction.MINIMAP) {
			this.post({
                call: "minimap",
                args: [data],
            });;
		}
		if (data[0] == receiveAction.PLAYER_SKIN) {
			const id = bytesToInt(data[1], data[2]);
            this.post({
                call: "player_skin",
                args: [id,data[3]],
            });
		}
		if (data[0] == receiveAction.READY) {
            this.post({
                call: "ready",
                args: [],
            });
		}
		if (data[0] == receiveAction.PLAYER_HIT_LINE) {
			const id = bytesToInt(data[1], data[2]);
			const pointsColor = data[3];
			const x = bytesToInt(data[4], data[5]);
			const y = bytesToInt(data[6], data[7]);
			const hitSelf = data.length > 8 && data[8] == 1;
			this.post({
                call: "player_hit_line",
                args: [id,pointsColor,x,y,hitSelf],
            });;
		}
		if (data[0] == receiveAction.REFRESH_AFTER_DIE) {
			doRefreshAfterDie = true;
		}
		if (data[0] == receiveAction.PLAYER_HONK) {
			const id = bytesToInt(data[1], data[2]);
			const time = data[3];
			this.post({
                call: "player_honk",
                args: [id,time],
            });;
		}
		if (data[0] == receiveAction.PONG) {
			const ping = Date.now() - this.lastPingTime;
			const thisDiff = Math.abs(ping - this.serverLastPing);
			this.serverDiffPing = Math.max(this.serverDiffPing, thisDiff);
			this.serverDiffPing = lerp(thisDiff, this.serverDiffPing, 0.5);
			this.serverAvgPing = lerp(this.serverAvgPing, ping, 0.5);
			this.serverLastPing = ping;
			this.lastPingTime = Date.now();
			this.waitingForPing = false;
            this.post({
                call: "ping",
                args: [this.serverAvgPing, this.serverLastPing,this.serverDiffPing],
            })
		}
		if (data[0] == receiveAction.UNDO_PLAYER_DIE) {
			const id = bytesToInt(data[1], data[2]);
			this.post({
                call: "player_undo_die",
                args: [id],
            });;
		}
		if (data[0] == receiveAction.TEAM_LIFE_COUNT) {
			const currentLives = data[1];
			const totalLives = data[2];
			this.post({
                call: "life_count",
                args: [currentLives,totalLives],
            });;
		}
	}
	//#endregion
}


class RegisteredConnection {
	constructor({recording,..._rest}){
        console.log(recording);
		this.recording=recording
		this.data=undefined;
		this.starting_time = performance.now();
		this.offset = null;
		this.progress = undefined;
		console.log('Starting Replay');
		requestAnimationFrame(this.fake.bind(this));

	}

	fake(timeStamp){
		if(this.data){
			if(this.data.time-this.offset<timeStamp-this.starting_time){
				///console.log(this.data.call);
                self.postMessage({
                    call: this.data.call,
                    args: this.data.args,
                })
				this.data=undefined;
				this.progress+=1;
			} else {
				// console.log(this.data.time-this.offset,timeStamp-this.starting_time);
			}
			requestAnimationFrame(this.fake.bind(this));
		} else {
			let listing_store = db.transaction(["recording_data"],"readonly").objectStore('recording_data');
			const req = listing_store.index("recording").openCursor(this.recording);
			req.onsuccess = e => {
				const cursor = e.target.result;
				if(cursor){
					const data = cursor.value;
					if(this.offset === null){
						this.offset = data.time;
					} else if(this.progress > cursor.primaryKey){
						cursor.continuePrimaryKey(this.recording,this.progress);
						return
					}
					this.data=data;
					this.progress = cursor.primaryKey;
					requestAnimationFrame(this.fake.bind(this));
				} else {
					console.log("finished");
				}
			}
		}
	}
}