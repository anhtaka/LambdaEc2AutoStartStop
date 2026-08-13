# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

AWS Lambda function that automatically starts and stops EC2 instances based on EC2 tags. Triggered by EventBridge (CloudWatch Events) every 10 minutes. Written in Node.js 22 as an ESM module.

## Commands

```bash
# Install dependencies
npm install

# Lint
npm run lint

# Create deployment zip (Linux/macOS)
zip -rq release.zip node_modules/ app.js jstDate.js package.json

# Create deployment zip (Windows PowerShell)
Compress-Archive -Path node_modules, app.js, jstDate.js, package.json -DestinationPath release.zip
```

**Docker (alternative to local Node install):**
```bash
docker-compose up
docker-compose run app npm install
docker-compose run app zip -rq release.zip node_modules/ app.js jstDate.js package.json
```

There are currently no tests (`npm test` is a no-op).

## Architecture

Main files: `app.js`（Lambda ハンドラー本体）と `jstDate.js`（JST 日時変換ユーティリティ）。The Lambda exports one function: `handler`.

**Execution flow:**
1. `getHoliday()` — parses `holidaylist` env var (CSV of `YYYY-MM-DD` dates) into `AryHoliday`
2. `getMinute10(now)` — rounds current JST time down to the nearest 10-minute boundary (e.g. `09:17` → `09:10`), matching EventBridge's 10-minute trigger cadence
3. `DescribeInstancesCommand` — fetches all EC2 instances in the current region
4. Per-instance loop — reads tags, calls `getDateValue()` to resolve start/stop times, then `handleInstance()` to decide action, then `startInstance()` / `stopInstance()`

**Tag resolution logic (`getDateValue`):**

| Tag | Value `"1"` | Value `"0"` | HH:mm |
|-----|-------------|-------------|-------|
| `AutoStart` | `08:30` (hardcoded default) | `99:99` (skip) | used as-is |
| `AutoStop` | `20:00` or `23:00` at 23:00 (hardcoded) | `99:99` (skip) | used as-is |

`AutoStart = "1"` is only active when `AutoStartDueDate` (format `YYYYMMDD`) is valid and not yet past.
`DayOffBoot = "1"` on an instance overrides the holiday/weekend skip for `AutoStart`.
`99:99` is the sentinel value meaning "do nothing."

**Holiday logic (`chkHoliday`):** returns `1` if the date is Saturday, Sunday, or in `AryHoliday`; `0` otherwise. `AutoStart` is suppressed on holidays unless `DayOffBoot = "1"`.

## Deployment

The Lambda function is deployed as a zip file uploaded to AWS. There is no IaC — deployment is manual via the AWS Console or the GitHub Actions workflow (`.github/workflows/manual-release.yml`, triggered via `workflow_dispatch`).

**Required Lambda environment variable:**
- `holidaylist` — comma-separated list of holiday dates in `YYYY-MM-DD` format (e.g. `2025-01-01,2025-01-13`)

**Required IAM permissions for the Lambda execution role:**
- `ec2:DescribeInstances`
- `ec2:StartInstances`
- `ec2:StopInstances`

## Lint Rules

ESLint enforces: 4-space indentation, Windows line endings (`\r\n`), double quotes, semicolons.

## Known Limitations

See `IMPROVEMENTS.md` for a full list. Key issues to be aware of when editing:
- Time validation in `validValue()` uses string comparison (bug — `getHour` / `getMinute` return strings).
- `DescribeInstances` has no pagination; will miss instances beyond the API's single-page limit.
- Timezone is hardcoded to JST (`+09:00`).
- Default start/stop times for `AutoStart/AutoStop = "1"` are hardcoded in `getDateValue()`.
