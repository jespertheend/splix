import { minify } from "$terser";

/**
 * A rollup plugin for minifying builds.
 * @param {import("$terser").MinifyOptions} minifyOptions
 * @returns {import("$rollup").Plugin}
 */
export function terser(minifyOptions = {}) {
	return {
		name: "terser",
		async renderChunk(code, chunk, outputOptions) {
			const output = await minify(code, minifyOptions);
			if (!output.code) return null;
			return {
				code: output.code,
			};
		},
	};
}
