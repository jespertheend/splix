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

/**
 * Module function which always returns a non-negative result.
 * Unlike the js 'remainder' operator (%) which returns a negative number when a negative number is provided as input.
 * @param {number} n
 * @param {number} m
 */
export function mod(n, m) {
	return ((n % m) + m) % m;
}
