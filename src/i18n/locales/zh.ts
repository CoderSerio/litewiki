import type { TranslationKeys } from "./en.js";

export const zh: Record<TranslationKeys, string> = {
  locale: "zh",
  label: "\u4E2D\u6587",

  // CLI root
  "cli.title": "litewiki",
  "cli.selectAction": "\u9009\u62E9\u64CD\u4F5C",
  "cli.action.run": "\u8FD0\u884C",
  "cli.action.run.hint": "\u5206\u6790\u76EE\u5F55",
  "cli.action.report": "\u62A5\u544A",
  "cli.action.report.hint": "\u67E5\u770B\u5F52\u6863\u62A5\u544A",
  "cli.action.profile": "\u914D\u7F6E\u6A21\u677F",
  "cli.action.profile.hint": "\u7BA1\u7406 Prompt \u914D\u7F6E\u6A21\u677F",
  "cli.action.config": "\u7CFB\u7EDF\u914D\u7F6E",
  "cli.action.config.hint": "\u7CFB\u7EDF\u8BBE\u7F6E",
  "cli.action.language": "\u8BED\u8A00",
  "cli.action.language.hint": "\u5207\u6362\u663E\u793A\u8BED\u8A00",
  "cli.action.help": "\u5E2E\u52A9",
  "cli.action.help.hint": "\u663E\u793A\u6240\u6709\u547D\u4EE4",
  "cli.done": "\u5B8C\u6210",

  // Language
  "language.select": "\u9009\u62E9\u8BED\u8A00",
  "language.changed": "\u8BED\u8A00\u5DF2\u5207\u6362",

  // Config
  "config.title": "\u914D\u7F6E\u5217\u8868",
  "config.new": "+ \u65B0\u5EFA",
  "config.new.hint": "\u521B\u5EFA\u914D\u7F6E",
  "config.broken": "[\u635F\u574F]",
  "config.broken.reason":
    "\u65E0\u6548\u6216\u65E0\u6CD5\u89E3\u6790\u7684\u914D\u7F6E JSON",
  "config.id": "\u914D\u7F6E ID",
  "config.provider": "\u63D0\u4F9B\u5546",
  "config.model": "\u6A21\u578B",
  "config.key": "\u5BC6\u94A5",
  "config.baseUrl": "\u57FA\u7840 URL",
  "config.created": "\u5DF2\u521B\u5EFA\u5E76\u6FC0\u6D3B\uFF1A{id}",
  "config.activate": "\u6FC0\u6D3B",
  "config.activate.hint": "\u8BBE\u4E3A\u5F53\u524D\u6D3B\u8DC3\u914D\u7F6E",
  "config.edit": "\u7F16\u8F91",
  "config.edit.hint":
    "\u4FEE\u6539\u63D0\u4F9B\u5546\u3001\u6A21\u578B\u6216\u5BC6\u94A5",
  "config.delete": "\u5220\u9664",
  "config.delete.hint": "\u5220\u9664\u6B64\u914D\u7F6E\u6587\u4EF6",
  "config.activated": "\u5DF2\u6FC0\u6D3B",
  "config.deleted": "\u5DF2\u5220\u9664",
  "config.edit.title": "\u7F16\u8F91 {id}",
  "config.edit.id": "id: {value}",
  "config.edit.id.hint": "\u91CD\u547D\u540D\u6B64\u914D\u7F6E",
  "config.edit.provider": "\u63D0\u4F9B\u5546: {value}",
  "config.edit.provider.hint": "\u8BBE\u7F6E\u63D0\u4F9B\u5546 ID",
  "config.edit.model": "\u6A21\u578B: {value}",
  "config.edit.model.hint": "\u8BBE\u7F6E\u9ED8\u8BA4\u6A21\u578B",
  "config.edit.key": "\u5BC6\u94A5: {value}",
  "config.edit.key.hint": "\u66F4\u65B0 API \u5BC6\u94A5",
  "config.edit.baseUrl": "baseUrl: {value}",
  "config.edit.baseUrl.hint": "\u8986\u76D6\u57FA\u7840 URL",
  "config.edit.newId": "\u65B0 ID",
  "config.renamed": "\u5DF2\u91CD\u547D\u540D",
  "config.updated.provider": "\u5DF2\u66F4\u65B0\u63D0\u4F9B\u5546",
  "config.updated.model": "\u5DF2\u66F4\u65B0\u6A21\u578B",
  "config.updated.key": "\u5DF2\u66F4\u65B0\u5BC6\u94A5",
  "config.updated.baseUrl": "\u5DF2\u66F4\u65B0 baseUrl",
  "config.provider.unsupported":
    '\u63D0\u4F9B\u5546 "{provider}" \u5C1A\u672A\u652F\u6301\uFF0C\u4FDD\u5B58\u540E\u8FD0\u884C\u4F1A\u5931\u8D25\u3002',
  "config.provider.unsupported.confirm":
    "\u4ECD\u7136\u4FDD\u5B58\u8BE5\u63D0\u4F9B\u5546\u5417\uFF1F",
  "config.active": "{id}\uFF08\u6D3B\u8DC3\uFF09",

  // Profiles
  "profile.select": "\u9009\u62E9\u914D\u7F6E\u6A21\u677F",
  "profile.new": "+ \u65B0\u5EFA\u6A21\u677F",
  "profile.new.hint":
    "\u521B\u5EFA\u5E76\u7F16\u8F91\u65B0\u7684\u914D\u7F6E\u6A21\u677F\u6587\u4EF6",
  "profile.broken": "[\u635F\u574F]",
  "profile.broken.reason":
    "\u65E0\u6548\u6216\u65E0\u6CD5\u89E3\u6790\u7684\u6A21\u677F JSON",
  "profile.builtin": "\u5185\u7F6E\uFF0C\u53EA\u8BFB",

  // Reports
  "report.title": "\u62A5\u544A",
  "report.none": "\u672A\u627E\u5230\u5F52\u6863\u62A5\u544A",
  "report.view": "\u67E5\u770B",
  "report.view.hint":
    "\u5728\u672C\u5730\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00\u6700\u65B0\u62A5\u544A",
  "report.delete": "\u5220\u9664",
  "report.delete.hint":
    "\u5220\u9664\u8BE5\u9879\u76EE\u7684\u5F52\u6863\u62A5\u544A",
  "report.delete.title": "\u5220\u9664\u62A5\u544A",
  "report.delete.all": "\u5168\u90E8",
  "report.delete.all.hint":
    "\u5220\u9664\u8BE5\u9879\u76EE\u7684\u6240\u6709\u8FD0\u884C\u8BB0\u5F55",
  "report.delete.history": "\u5386\u53F2\u8BB0\u5F55",
  "report.delete.history.hint":
    "\u4FDD\u7559\u6700\u65B0\u4E00\u6B21\uFF0C\u5220\u9664\u65E7\u8BB0\u5F55",
  "report.deleted": "\u5DF2\u5220\u9664\u8BE5\u9879\u76EE\u7684\u62A5\u544A",
  "report.deleted.history":
    "\u5DF2\u5220\u9664\u5386\u53F2\u8BB0\u5F55\uFF0C\u4FDD\u7559\u4E86\u6700\u65B0\u4E00\u6B21",
  "report.pick": "\u9009\u62E9\u4E00\u4E2A\u8FDB\u884C\u9884\u89C8",
  "report.broken": "[\u635F\u574F]",
  "report.broken.reason":
    "\u65E0\u6548\u7684 meta.json \u6216\u7F3A\u5C11 report.md",
  "report.opened":
    "\u5DF2\u5728\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00\uFF1A{url}\n\u6309 Ctrl+C \u9000\u51FA\u9884\u89C8",
  "report.current": "\u5F53\u524D\uFF1B{path}",

  // Run
  "run.spinner": "\u6B63\u5728\u8FD0\u884C Agent...",
  "run.done": "\u5B8C\u6210",
  "run.failed": "\u5931\u8D25",
  "run.archived": "\u5DF2\u5F52\u6863\u81F3\uFF1A{path}",
  "run.proceed": "\u7EE7\u7EED\uFF1F",
  "run.status.dirty":
    "\u72B6\u6001\uFF1A\u6709\u672A\u63D0\u4EA4\u7684\u66F4\u6539",
  "run.status.clean": "\u72B6\u6001\uFF1A\u5E72\u51C0",
  "run.noPrior":
    "\u672A\u627E\u5230\u5148\u524D\u7684\u62A5\u544A\u3002\u5207\u6362\u5230\u5168\u65B0\u6A21\u5F0F\uFF1F",

  // Ensure AI config
  "ensureConfig.noValid": "\u672A\u627E\u5230\u6709\u6548\u914D\u7F6E",
  "ensureConfig.configsDir": "\u914D\u7F6E\u76EE\u5F55\uFF1A{path}",
  "ensureConfig.profilesDir": "\u6A21\u677F\u76EE\u5F55\uFF1A{path}",
  "ensureConfig.createHint":
    "\u8BF7\u4E3A\u4F60\u7684\u6A21\u578B\u63D0\u4F9B\u5546\u521B\u5EFA\u914D\u7F6E\u3002",
  "ensureConfig.openManager":
    "\u672A\u627E\u5230\u914D\u7F6E\u3002\u6253\u5F00\u914D\u7F6E\u7BA1\u7406\u5668\u521B\u5EFA\u4E00\u4E2A\uFF1F",
  "ensureConfig.howToContinue":
    "\u65E0\u6709\u6548\u914D\u7F6E\uFF0C\u5982\u4F55\u7EE7\u7EED\uFF1F",
  "ensureConfig.manage": "\u7BA1\u7406\u914D\u7F6E",
  "ensureConfig.manage.hint":
    "\u6253\u5F00\u914D\u7F6E\u7BA1\u7406\u5668\u8FDB\u884C\u9009\u62E9\u3001\u521B\u5EFA\u548C\u6FC0\u6D3B",
  "ensureConfig.temp": "\u4F7F\u7528\u4E34\u65F6\u914D\u7F6E",
  "ensureConfig.temp.hint":
    "\u4EC5\u4E3A\u672C\u6B21\u8FD0\u884C\u8F93\u5165\u63D0\u4F9B\u5546/\u6A21\u578B/\u5BC6\u94A5",
  "ensureConfig.clean": "\u6E05\u7406\u65E0\u6548\u914D\u7F6E",
  "ensureConfig.clean.hint":
    "\u5220\u9664\u52A0\u8F7D\u5931\u8D25\u7684\u914D\u7F6E",
  "ensureConfig.noInvalid": "\u672A\u627E\u5230\u65E0\u6548\u914D\u7F6E",
  "ensureConfig.pickBroken":
    "\u9009\u62E9\u8981\u5220\u9664\u7684\u635F\u574F\u914D\u7F6E",
  "ensureConfig.noRemain":
    "\u6CA1\u6709\u6709\u6548\u914D\u7F6E\u4E86\u3002\u6253\u5F00\u914D\u7F6E\u7BA1\u7406\u5668\u521B\u5EFA\u4E00\u4E2A\uFF1F",
  "ensureConfig.provider.unsupported":
    '\u63D0\u4F9B\u5546 "{provider}" \u5C1A\u672A\u652F\u6301\uFF0C\u8FD0\u884C\u4F1A\u5931\u8D25\u3002',
  "ensureConfig.provider.unsupported.confirm":
    "\u4ECD\u7136\u7EE7\u7EED\u5417\uFF1F",

  // Common
  "common.back": "\u2190 \u8FD4\u56DE",
  "common.canceled": "\u5DF2\u53D6\u6D88",
  "common.set": "(\u5DF2\u8BBE\u7F6E)",
  "common.empty": "(\u7A7A)",

  // File ops
  "fileOps.deleteConfirm": "\u5220\u9664\u6B64\u635F\u574F\u9879\uFF1F",
  "fileOps.deleted": "\u5DF2\u5220\u9664\uFF1A{path}",

  // Pick directory
  "pickDir.message": "\u76EE\u6807\u76EE\u5F55",

  // Pick run mode
  "pickMode.message": "\u8FD0\u884C\u6A21\u5F0F",
  "pickMode.fresh": "\u5168\u65B0",
  "pickMode.fresh.hint": "\u4ECE\u96F6\u5F00\u59CB",
  "pickMode.incremental": "\u589E\u91CF",
  "pickMode.incremental.hint":
    "\u4F7F\u7528\u4E0A\u6B21\u5F52\u6863\u62A5\u544A\u4F5C\u4E3A\u8F93\u5165",

  // Pick profile
  "pickProfile.message": "\u9009\u62E9\u914D\u7F6E\u6A21\u677F",
  "pickProfile.default": "\u9ED8\u8BA4",
  "pickProfile.default.hint": "\u5185\u7F6E\u9ED8\u8BA4\u6A21\u677F",
};
