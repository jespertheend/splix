import "./globals.js";

async function loadLeaderboardData() {
	let endPoint;
	if (!IS_DEV_BUILD) {
		endPoint = "https://splix.io/api/leaderboards";
	} else {
		const url = new URL(location.href);
		url.pathname = "/servermanager/leaderboards";
		endPoint = url.href;
	}

	const response = await fetch(endPoint);
	/** @type {import("../../serverManager/src/LeaderboardManager.js").ApiLeaderboardData} */
	const data = await response.json();
	return data;
}

const blocksBoard = /** @type {HTMLDivElement} */ (document.getElementById("blocksBoard"));
const no1Board = /** @type {HTMLDivElement} */ (document.getElementById("no1Board"));
const trailBoard = /** @type {HTMLDivElement} */ (document.getElementById("trailBoard"));
const aliveBoard = /** @type {HTMLDivElement} */ (document.getElementById("aliveBoard"));
const killsBoard = /** @type {HTMLDivElement} */ (document.getElementById("killsBoard"));

const blocksBtn = document.getElementById("blocksBtn");
const no1Btn = document.getElementById("no1Btn");
const trailBtn = document.getElementById("trailBtn");
const aliveBtn = document.getElementById("aliveBtn");
const killsBtn = document.getElementById("killsBtn");

function setVisibleLb() {
	var boards = {
		"blocks": [blocksBoard, blocksBtn],
		"time_on_one": [no1Board, no1Btn],
		"trail_length": [trailBoard, trailBtn],
		"time_alive": [aliveBoard, aliveBtn],
		"kills": [killsBoard, killsBtn],
	};
	var hashExists = false;
	for (var key in boards) {
		var item = boards[key];
		var isCurrent = location.hash == "#" + key;
		if (isCurrent) hashExists = true;
		item[0].style.display = isCurrent ? null : "none";
		item[1].className = isCurrent ? "navBtn selected" : "navBtn";
	}
	if (!hashExists) {
		location.hash = "#blocks";
	}
}

window.onhashchange = setVisibleLb;
setVisibleLb();

function parseTimeToString(seconds) {
	var hours = Math.floor(seconds / 3600);
	var minutes = Math.floor((seconds - (hours * 3600)) / 60);
	seconds = Math.floor(seconds - (hours * 3600) - (minutes * 60));
	if (hours < 10) hours = "0" + hours;
	if (minutes < 10) minutes = "0" + minutes;
	if (seconds < 10) seconds = "0" + seconds;
	return hours + ":" + minutes + ":" + seconds;
}

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

/**
 * @param {import("../../serverManager/src/Leaderboard.js").ApiLeaderboardScoreEntry[]} dailyScores
 * @param {import("../../serverManager/src/Leaderboard.js").ApiLeaderboardScoreEntry[]} weeklyScores
 * @param {HTMLDivElement} leaderboardsContainer
 * @param {string} metric
 */
function createLeaderboards(dailyScores, weeklyScores, leaderboardsContainer, metric, isTimeValue = false) {
	const dailyEl = createLeaderboard(dailyScores, "Today", metric, isTimeValue);
	leaderboardsContainer.appendChild(dailyEl);
	const weeklyEl = createLeaderboard(weeklyScores, "This Week", metric, isTimeValue);
	leaderboardsContainer.appendChild(weeklyEl);
}

/**
 * @param {import("../../serverManager/src/Leaderboard.js").ApiLeaderboardScoreEntry[]} scores
 * @param {string} title
 * @param {string} metric
 * @param {number} isTimeValue
 */
function createLeaderboard(scores, title, metric, isTimeValue) {
	const leaderboardEl = document.createElement("div");
	leaderboardEl.classList.add("board");

	const titleEl = document.createElement("h2");
	titleEl.classList.add("tblHead");
	titleEl.textContent = title;

	const tableEl = document.createElement("table");

	const trEl = document.createElement("tr");
	tableEl.append(trEl);

	const rankHead = document.createElement("th");
	rankHead.style.width = "20px";
	rankHead.textContent = "#";
	trEl.appendChild(rankHead);

	const nameHead = document.createElement("th");
	nameHead.textContent = "Name";
	trEl.appendChild(nameHead);

	const valueHead = document.createElement("th");
	valueHead.textContent = metric;
	valueHead.style.width = "60px";
	trEl.appendChild(valueHead);

	for (const [i, score] of scores.entries()) {
		const trEl = document.createElement("tr");

		const rankEl = document.createElement("td");
		rankEl.textContent = "#" + (i + 1);

		const nameEl = document.createElement("td");
		nameEl.classList.add("nameCell");
		nameEl.textContent = filter(score.name);

		const valueEl = document.createElement("td");
		if (isTimeValue) {
			valueEl.textContent = parseTimeToString(score.score);
		} else {
			valueEl.textContent = score.score;
		}

		trEl.append(rankEl, nameEl, valueEl);

		tableEl.append(trEl);
	}

	leaderboardEl.append(titleEl, tableEl);
	return leaderboardEl;
}

const leaderboardData = await loadLeaderboardData();
createLeaderboards(leaderboardData.daily.kills, leaderboardData.weekly.kills, killsBoard, "Kills");
createLeaderboards(leaderboardData.daily.tiles, leaderboardData.weekly.tiles, blocksBoard, "Tiles");
createLeaderboards(
	leaderboardData.daily.timeAliveSeconds,
	leaderboardData.weekly.timeAliveSeconds,
	aliveBoard,
	"Time",
	true,
);
createLeaderboards(
	leaderboardData.daily.rankingFirstSeconds,
	leaderboardData.weekly.rankingFirstSeconds,
	no1Board,
	"Time",
	true,
);
createLeaderboards(leaderboardData.daily.trailLength, leaderboardData.weekly.trailLength, trailBoard, "Length");
