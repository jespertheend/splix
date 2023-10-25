/**
 * How many of the skins should be randomly assigned to players if they either didn't provide one,
 * or when two players have the same skin and a new color needs to be picked to distinguish the two players.
 */
export const FREE_SKINS_COUNT = 12;

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

/**
 * Time in milliseconds that we allow the player to undo events.
 * This is essentially the max ping we allow the player to have before they start having a bad time.
 * If the player kills a player or themselves for instance, we give the client this amount of milliseconds
 * to make a turn and prevent the event from happening.
 */
export const MAX_UNDO_EVENT_TIME = 600;

/**
 * How many tiles players are allowed to move backwards due to latency.
 * Assuming a speed of 6 tiles per second and a value of 3 would mean that clients need more than 500ms ping
 * in order to not be able to control themselves.
 */
export const MAX_UNDO_TILE_COUNT = 5;

/**
 * The maximum allowed skin color id.
 */
export const VALID_SKIN_COLOR_RANGE = 13;

/**
 * The maximum allowed pattern id.
 */
export const VALID_SKIN_PATTERN_RANGE = 27;

/**
 * How often (in milliseconds) a new part of the minimap is updated.
 * The minimap is divided in 4 parts, so a value of 250 would mean the full map sent every second.
 */
export const MINIMAP_PART_UPDATE_FREQUENCY = 250;

/**
 * How often (in milliseconds) the leaderboard is sent to all players in a game.
 */
export const LEADERBOARD_UPDATE_FREQUENCY = 3_000;
