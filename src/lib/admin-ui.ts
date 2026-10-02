/**
 * Small client-safe UI constants shared between the admin server layout and the
 * client shell. Keep this module free of any `"use client"` / DB imports so both
 * sides can read it.
 */

/** Cookie remembering whether the admin sidebar is collapsed ("1") or not ("0"). */
export const NAV_COOKIE = "kmc_admin_nav";
/** One year. */
export const NAV_COOKIE_MAX_AGE = 31536000;
