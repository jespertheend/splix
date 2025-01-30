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

const tilesBoard = /** @type {HTMLDivElement} */ (document.getElementById("tilesBoard"));
const rankingFirstBoard = /** @type {HTMLDivElement} */ (document.getElementById("rankingFirstBoard"));
const trailBoard = /** @type {HTMLDivElement} */ (document.getElementById("trailBoard"));
const timeAliveBoard = /** @type {HTMLDivElement} */ (document.getElementById("timeAliveBoard"));
const killsBoard = /** @type {HTMLDivElement} */ (document.getElementById("killsBoard"));

const tilesButton = /** @type {HTMLAnchorElement} */ (document.getElementById("tilesButton"));
const rankingFirstButton = /** @type {HTMLAnchorElement} */ (document.getElementById("rankingFirstButton"));
const trailButton = /** @type {HTMLAnchorElement} */ (document.getElementById("trailButton"));
const timeAliveButton = /** @type {HTMLAnchorElement} */ (document.getElementById("timeAliveButton"));
const killsButton = /** @type {HTMLAnchorElement} */ (document.getElementById("killsButton"));

function setVisibleLeaderboard() {
	/** @type {[hash: string, leaderboardEl: HTMLDivElement, buttonEl: HTMLAnchorElement][]} */
	var linkedElements = [
		["blocks", tilesBoard, tilesButton],
		["time_on_one", rankingFirstBoard, rankingFirstButton],
		["trail_length", trailBoard, trailButton],
		["time_alive", timeAliveBoard, timeAliveButton],
		["kills", killsBoard, killsButton],
	];
	var hashExists = false;
	for (const [hash, leaderboardEl, buttonEl] of linkedElements) {
		const isCurrent = location.hash == "#" + hash;
		if (isCurrent) hashExists = true;
		leaderboardEl.style.display = isCurrent ? null : "none";
		buttonEl.classList.toggle("selected", isCurrent);
	}
	if (!hashExists) {
		location.hash = "#blocks";
	}
}

window.onhashchange = setVisibleLeaderboard;
setVisibleLeaderboard();

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
		nameEl.classList.add("name-cell");
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
const { daily, weekly } = leaderboardData;
createLeaderboards(daily.kills, weekly.kills, killsBoard, "Kills");
createLeaderboards(daily.tiles, weekly.tiles, tilesBoard, "Tiles");
createLeaderboards(daily.timeAliveSeconds, weekly.timeAliveSeconds, timeAliveBoard, "Time", true);
createLeaderboards(daily.rankingFirstSeconds, weekly.rankingFirstSeconds, rankingFirstBoard, "Time", true);
createLeaderboards(daily.trailLength, weekly.trailLength, trailBoard, "Length");
