/**
 * How many different skin colors there are.
 * Clients only have a few hardcoded skin colors.
 * This is a limit to make sure we don't send skin ids that the client doesn't know about.
 */
export const SKINS_COUNT = 13;

/**
 * Defines a rectangle around the players position for which tiles are guaranteed to be visible.
 * Tiles outside this viewport may also have been sent,
 * but might not be due to `VIEWPORT_EDGE_CHUNK_SIZE` not being reached yet.
 */
export const MIN_TILES_VIEWPORT_RECT_SIZE = 20;

/**
 * The width or height of chunks of tiles that will be sent to a client when the player moves.
 */
export const VIEWPORT_EDGE_CHUNK_SIZE = 5;

/**
 * Defines a rectangle around the players position for which events will be sent to the player.
 */
export const UPDATES_VIEWPORT_RECT_SIZE = MIN_TILES_VIEWPORT_RECT_SIZE + VIEWPORT_EDGE_CHUNK_SIZE;

/**
 * How many tiles around the player should be filled when the player joins a game.
 */
export const PLAYER_SPAWN_RADIUS = 2;

/**
 * How many tiles players move per millisecond. This should be the same value as on the client.
 */
export const PLAYER_TRAVEL_SPEED = 0.006;
