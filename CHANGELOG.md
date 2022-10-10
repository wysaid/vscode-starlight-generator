# Change Log

All notable changes to the "starlight-generator" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 0.5.0

- Support single file generate when focused on `*.spv.vert` or `*.spv.frag` files.
  1. The plugin will try to find the `*.sl.json` file for all parent folders recursively.
  2. Once any config with the focused file is found, the searching stopped and the config is used.

## 0.4.1

- Change pre-release to release

## 0.3.7

- Use TypeScript.
- Support binary.
- Auto remove useless log files.

## 0.3.6

- Fix Encode/Decode, use <https://yyyyy.tech>

## 0.3.4

- Encode/Decode support find files recursively.
- make Encoding url configurable.
- Add success notification on status bar.

## 0.3.1

- Add Encode/Decode Function to lua file/folder.

## 0.3.0

- Support template creation on explorer context menu.

## 0.2.2

- Force "*.sl.json" as default index files suffix.

## 0.2.1

- Fix wrong tips after click `cancel`.

## 0.2.0

- Implement `cancel`.
- Fix progress bar.
- End process in 60 seconds.

## 0.1.1

- Readme spell fix
- Show warning msg when process with invalid folders/files.

## 0.1.0

- Initial release
