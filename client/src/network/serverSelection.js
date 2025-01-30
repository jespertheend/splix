document.addEventListener('DOMContentLoaded', ()=>{
	serverSelectEl = /** @type {HTMLSelectElement} */ (document.getElementById("serverSelect"));
});
async function initServerSelection() {
	let endPoint;
	if (!IS_DEV_BUILD) {
		endPoint = "https://splix.io/gameservers";
	} else {
		const url = new URL(location.href);
		url.pathname = "/servermanager/gameservers";
		endPoint = url.href;
	}

	const response = await fetch(endPoint);
	/** @type {import("../../serverManager/src/ServerManager.js").ServersJson} */
	const servers = await response.json();

	while (serverSelectEl.firstChild) {
		serverSelectEl.firstChild.remove();
	}

	const officialGroup = document.createElement("optgroup");
	officialGroup.label = "Official";
	const unofficialGroup = document.createElement("optgroup");
	unofficialGroup.label = "Unofficial";

	/** @type {HTMLOptionElement[]} */
	const officialEndpoints = [];
	/** @type {HTMLOptionElement?} */
	let selectedEndpoint = null;
	const lastSelectedEndpoint = localStorage.getItem("lastSelectedEndpoint");
	const serverEndpoints = new Set(servers.servers.map((server) => server.endpoint));

	for (const server of servers.servers) {
		const optionEl = document.createElement("option");
		optionEl.value = server.endpoint;
		let textContent = server.displayName;
		if (server.playerCount > 0) {
			textContent += ` - ${server.playerCount}`;
		}
		optionEl.textContent = textContent;

		if (server.official) {
			officialEndpoints.push(optionEl);
			officialGroup.appendChild(optionEl);
		} else {
			unofficialGroup.appendChild(optionEl);
		}
		if (lastSelectedEndpoint && serverEndpoints.has(lastSelectedEndpoint)) {
			if (lastSelectedEndpoint === server.endpoint) {
				selectedEndpoint = optionEl;
			}
		} else if (server.recommended) {
			selectedEndpoint = optionEl;
		}
	}

	if (location.hash.indexOf("#ip=") == 0) {
		const optionEl = document.createElement("option");
		optionEl.value = location.hash.substring(4);
		optionEl.textContent = "From url";
		unofficialGroup.appendChild(optionEl);
		selectedEndpoint = optionEl;
	}

	if (!selectedEndpoint) {
		selectedEndpoint = officialEndpoints[0] || null;
	}

	if (officialGroup.childElementCount > 0) serverSelectEl.appendChild(officialGroup);
	if (unofficialGroup.childElementCount > 0) serverSelectEl.appendChild(unofficialGroup);

	serverSelectEl.selectedIndex = selectedEndpoint.index;

	serverSelectEl.disabled = false;
	joinButton.disabled = false;
}

function getSelectedServer() {
	return serverSelectEl.value;
}
