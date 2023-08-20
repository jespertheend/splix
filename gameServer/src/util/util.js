/**
 * Checks if a point lies within a trail segment.
 * @param {import("renda").Vec2} point
 * @param {import("renda").Vec2} start
 * @param {import("renda").Vec2} end
 */
export function checkTrailSegment(point, start, end) {
	if (start.x != end.x && start.y != end.y) {
		throw new Error("Assertion failed, trail with diagonal segment found.");
	}
	const minX = Math.min(start.x, end.x);
	const minY = Math.min(start.y, end.y);
	const maxX = Math.max(start.x, end.x);
	const maxY = Math.max(start.y, end.y);

	if (point.x == minX) {
		if (point.y >= minY && point.y <= maxY) return true;
	} else if (point.y == minY) {
		if (point.x >= minX && point.x <= maxX) return true;
	}
	return false;
}
