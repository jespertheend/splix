/**
 * LocalStorage with ios private mode error handling
 * @param {string} name
 * @param {string} value
 */
export function lsSet(name, value) {
	try {
		localStorage.setItem(name, value);
		return true;
	} catch (error) {
		return false;
	}
}
