# Change Log

All notable changes to the "starlight-generator" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 0.6.6

- 修复模板shader的语法错误

## 0.6.5

- outputFormat 支持选择 `typescript`.

## 0.6.3

- 优化用户体验, 在 `outputFormat` 不存在的情况下, 弹窗用户选择.

## 0.6.2

- 生成出错时自动弹出问题窗口

## 0.6.1

- 加回触发事件, 兼容 1.74 以下的 VSCode

## 0.6.0

- 支持在问题窗口显示错误.
- 统一用 `outputFormat` 字段来决定输出格式.
- 增加生成配置文件(`*.sl.json`)的代码提示.
- 移除素材加密解密功能, 需要相关功能请使用 [Magicka 插件](https://marketplace.visualstudio.com/items?itemName=kwai.magicka).

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
