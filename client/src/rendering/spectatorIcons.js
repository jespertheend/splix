/** @type {Promise<Image>?} */
let spectatorImagePromise = null;

function getSpectatorImage() {
	if (!spectatorImagePromise) {
		spectatorImagePromise = new Promise((resolve, reject) => {
			const img = new Image();
			img.src = "./static/img/spectator.svg";
			img.addEventListener("load", () => {
				resolve(img);
			});
			img.addEventListener("error", () => {
				reject(new Error("Spectator image failed to load"));
			});
		});
	}
	return spectatorImagePromise;
}

/** @type {Map<string, Promise<HTMLCanvasElement>>} */
const iconsCache = new Map();

/**
 * @param {string} color
 */
async function createSpectatorIcon(color) {
	const img = await getSpectatorImage();
	const canvas = document.createElement("canvas");
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext("2d");

	ctx.drawImage(img, 0, 0);

	ctx.globalCompositeOperation = "source-in";
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, img.width, img.height);
	return canvas;
}

/**
 * @param {string} color
 */
export function getSpectatorIcon(color) {
	const existing = iconsCache.get(color);
	if (existing) return existing;

	const promise = createSpectatorIcon(color);
	iconsCache.set(color, promise);
	return promise;
}
