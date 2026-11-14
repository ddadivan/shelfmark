/**
 * `MeStatsQuery.firstDay` (#352): the ISO weekday the weeks of `weeklyLinks` start on, 1 Monday …
 * 7 Sunday (the web sends `LocaleService.firstDay`, which follows Settings › Language › Week
 * starts on). Without it the weeks start on Monday.
 */
export const ME_STATS_FIRST_DAY = { Min: 1, Max: 7, Default: 1 } as const;
