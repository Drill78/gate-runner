ALTER TABLE `expeditions` ADD `peak_mantissa` real;--> statement-breakpoint
ALTER TABLE `expeditions` ADD `peak_exponent` integer;
--> statement-breakpoint
UPDATE expeditions SET peak_exponent = CASE WHEN peak_squad >= 1e15 THEN 15 WHEN peak_squad >= 1e14 THEN 14 WHEN peak_squad >= 1e13 THEN 13 WHEN peak_squad >= 1e12 THEN 12 WHEN peak_squad >= 1e11 THEN 11 WHEN peak_squad >= 1e10 THEN 10 WHEN peak_squad >= 1e9 THEN 9 WHEN peak_squad >= 1e8 THEN 8 WHEN peak_squad >= 1e7 THEN 7 WHEN peak_squad >= 1e6 THEN 6 WHEN peak_squad >= 1e5 THEN 5 WHEN peak_squad >= 1e4 THEN 4 WHEN peak_squad >= 1e3 THEN 3 WHEN peak_squad >= 1e2 THEN 2 WHEN peak_squad >= 1e1 THEN 1 ELSE 0 END;
--> statement-breakpoint
UPDATE expeditions SET peak_mantissa = peak_squad / CASE peak_exponent WHEN 1 THEN 1e1 WHEN 2 THEN 1e2 WHEN 3 THEN 1e3 WHEN 4 THEN 1e4 WHEN 5 THEN 1e5 WHEN 6 THEN 1e6 WHEN 7 THEN 1e7 WHEN 8 THEN 1e8 WHEN 9 THEN 1e9 WHEN 10 THEN 1e10 WHEN 11 THEN 1e11 WHEN 12 THEN 1e12 WHEN 13 THEN 1e13 WHEN 14 THEN 1e14 WHEN 15 THEN 1e15 ELSE 1 END;
