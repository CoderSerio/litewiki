export const en = {
  locale: "en",
  label: "English",

  // CLI root
  "cli.title": "litewiki",
  "cli.selectAction": "Select an action",
  "cli.action.run": "run",
  "cli.action.run.hint": "Analyze a directory",
  "cli.action.report": "report",
  "cli.action.report.hint": "View archived reports",
  "cli.action.profile": "profile",
  "cli.action.profile.hint": "Manage prompt profiles",
  "cli.action.config": "config",
  "cli.action.config.hint": "System configuration",
  "cli.action.language": "language",
  "cli.action.language.hint": "Change display language",
  "cli.action.help": "help",
  "cli.action.help.hint": "Show all commands",
  "cli.done": "done",

  // Language
  "language.select": "Select a language",
  "language.changed": "Language changed",

  // Config
  "config.title": "Configs",
  "config.new": "+ new",
  "config.new.hint": "create a config",
  "config.broken": "[broken]",
  "config.broken.reason": "Invalid or unparsable config JSON",
  "config.id": "Config id",
  "config.provider": "provider",
  "config.model": "model",
  "config.key": "key",
  "config.baseUrl": "baseUrl",
  "config.created": "Created and activated: {id}",
  "config.activate": "activate",
  "config.activate.hint": "set this config as active",
  "config.edit": "edit",
  "config.edit.hint": "change provider, model, or keys",
  "config.delete": "delete",
  "config.delete.hint": "remove this config file",
  "config.activated": "Activated",
  "config.deleted": "Deleted",
  "config.edit.title": "Edit {id}",
  "config.edit.id": "id: {value}",
  "config.edit.id.hint": "rename this config",
  "config.edit.provider": "provider: {value}",
  "config.edit.provider.hint": "set the provider id",
  "config.edit.model": "model: {value}",
  "config.edit.model.hint": "set the default model",
  "config.edit.key": "key: {value}",
  "config.edit.key.hint": "update the api key",
  "config.edit.baseUrl": "baseUrl: {value}",
  "config.edit.baseUrl.hint": "override the base url",
  "config.edit.newId": "New id",
  "config.renamed": "Renamed",
  "config.updated.provider": "Updated provider",
  "config.updated.model": "Updated model",
  "config.updated.key": "Updated key",
  "config.updated.baseUrl": "Updated baseUrl",
  "config.provider.unsupported":
    'Provider "{provider}" is not supported yet; saving will make runs fail for now.',
  "config.provider.unsupported.confirm": "Still save this provider?",
  "config.active": "{id} (active)",

  // Profiles
  "profile.select": "Select a profile",
  "profile.new": "+ new profile",
  "profile.new.hint": "create and edit a new profile file",
  "profile.broken": "[broken]",
  "profile.broken.reason": "Invalid or unparsable profile JSON",
  "profile.builtin": "builtin, read-only",

  // Reports
  "report.title": "Reports",
  "report.none": "No archived reports found",
  "report.view": "view",
  "report.view.hint": "open the latest report in a local browser",
  "report.delete": "delete",
  "report.delete.hint": "remove archived reports for this project",
  "report.delete.title": "Delete reports",
  "report.delete.all": "all",
  "report.delete.all.hint": "delete every saved run for this project",
  "report.delete.history": "history",
  "report.delete.history.hint": "keep the latest run and delete older ones",
  "report.deleted": "Deleted reports for this project",
  "report.deleted.history": "Deleted history; kept latest",
  "report.pick": "Pick one to preview",
  "report.broken": "[broken]",
  "report.broken.reason": "Invalid meta.json or missing report.md",
  "report.opened": "Opened in browser: {url}\nPress Ctrl+C to exit preview",
  "report.current": "current; {path}",

  // Run
  "run.spinner": "Running agent...",
  "run.done": "Done",
  "run.failed": "Failed",
  "run.archived": "Archived to: {path}",
  "run.proceed": "Proceed?",
  "run.status.dirty": "Status: dirty",
  "run.status.clean": "Status: clean",
  "run.noPrior": "No previous report found. Switch to fresh?",

  // Ensure AI config
  "ensureConfig.noValid": "No valid config found",
  "ensureConfig.configsDir": "Configs dir: {path}",
  "ensureConfig.profilesDir": "Profiles dir: {path}",
  "ensureConfig.createHint": "Please create a config for your model provider.",
  "ensureConfig.openManager":
    "No config found. Open config manager to create one?",
  "ensureConfig.howToContinue": "No valid config. How to continue?",
  "ensureConfig.manage": "manage configs",
  "ensureConfig.manage.hint":
    "open the config manager to pick, create, and activate",
  "ensureConfig.temp": "use a temporary config",
  "ensureConfig.temp.hint": "input provider/model/key for this run only",
  "ensureConfig.clean": "clean invalid configs",
  "ensureConfig.clean.hint": "delete configs that failed to load",
  "ensureConfig.noInvalid": "No invalid configs found",
  "ensureConfig.pickBroken": "Pick a broken config to delete",
  "ensureConfig.noRemain":
    "No valid configs remain. Open config manager to create one?",
  "ensureConfig.provider.unsupported":
    'Provider "{provider}" is not supported yet; run will fail for now.',
  "ensureConfig.provider.unsupported.confirm": "Still continue?",

  // Common
  "common.back": "\u2190 Back",
  "common.canceled": "Canceled",
  "common.set": "(set)",
  "common.empty": "(empty)",

  // File ops
  "fileOps.deleteConfirm": "Delete this broken item?",
  "fileOps.deleted": "Deleted: {path}",

  // Pick directory
  "pickDir.message": "Target directory",

  // Pick run mode
  "pickMode.message": "Run mode",
  "pickMode.fresh": "fresh",
  "pickMode.fresh.hint": "start from scratch",
  "pickMode.incremental": "incremental",
  "pickMode.incremental.hint": "use last archived report as input",

  // Pick profile
  "pickProfile.message": "Select a profile",
  "pickProfile.default": "default",
  "pickProfile.default.hint": "built-in default profile",
} as const;

export type TranslationKeys = keyof typeof en;
