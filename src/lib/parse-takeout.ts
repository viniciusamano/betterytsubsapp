import { parse } from "csv-parse/sync";

export type TakeoutSubscription = {
  channelId: string;
  channelUrl: string;
  channelTitle: string;
};

/**
 * Parses the `subscriptions.csv` file from a Google Takeout export
 * (Takeout -> YouTube and YouTube Music -> subscriptions).
 *
 * The header row is always "Channel Id,Channel Url,Channel Title" in
 * column order, but the header *text* is localized to the account's
 * language — so this reads by column position and always skips row 0,
 * rather than matching header names.
 */
export function parseTakeoutSubscriptions(csvText: string): TakeoutSubscription[] {
  // Google Takeout CSVs are exported with a UTF-8 BOM.
  const withoutBom = csvText.replace(/^﻿/, "");

  const rows: string[][] = parse(withoutBom, {
    skip_empty_lines: true,
  });

  if (rows.length === 0) {
    return [];
  }

  const [, ...dataRows] = rows; // drop the (localized) header row

  return dataRows
    .filter((row) => row.length >= 3 && row[0]?.trim())
    .map((row) => ({
      channelId: row[0].trim(),
      channelUrl: row[1]?.trim() ?? "",
      channelTitle: row[2]?.trim() ?? row[0].trim(),
    }));
}
