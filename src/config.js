/**
 * How many different skin colors there are.
 * Clients only have a few hardcoded skin colors.
 * This is a limit to make sure we don't send skin ids that the client doesn't know about.
 */
export const SKINS_COUNT = 13;

/**
 * Defines a rectangle around the players position for which events will be sent to the player.
 */
export const UPDATES_VIEWPORT_RECT_SIZE = 30;
