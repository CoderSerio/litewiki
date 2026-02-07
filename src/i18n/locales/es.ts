import type { TranslationKeys } from "./en.js";

export const es: Record<TranslationKeys, string> = {
  locale: "es",
  label: "Espa\u00F1ol",

  // CLI root
  "cli.title": "litewiki",
  "cli.selectAction": "Selecciona una acci\u00F3n",
  "cli.action.run": "ejecutar",
  "cli.action.run.hint": "Analizar un directorio",
  "cli.action.report": "informe",
  "cli.action.report.hint": "Ver informes archivados",
  "cli.action.profile": "perfil",
  "cli.action.profile.hint": "Gestionar perfiles de prompt",
  "cli.action.config": "configuraci\u00F3n",
  "cli.action.config.hint": "Configuraci\u00F3n del sistema",
  "cli.action.language": "idioma",
  "cli.action.language.hint": "Cambiar el idioma de visualizaci\u00F3n",
  "cli.action.help": "ayuda",
  "cli.action.help.hint": "Mostrar todos los comandos",
  "cli.done": "listo",

  // Language
  "language.select": "Selecciona un idioma",
  "language.changed": "Idioma cambiado",

  // Config
  "config.title": "Configuraciones",
  "config.new": "+ nueva",
  "config.new.hint": "crear una configuraci\u00F3n",
  "config.broken": "[roto]",
  "config.broken.reason":
    "JSON de configuraci\u00F3n inv\u00E1lido o no analizable",
  "config.id": "ID de configuraci\u00F3n",
  "config.provider": "proveedor",
  "config.model": "modelo",
  "config.key": "clave",
  "config.baseUrl": "URL base",
  "config.created": "Creado y activado: {id}",
  "config.activate": "activar",
  "config.activate.hint": "establecer esta configuraci\u00F3n como activa",
  "config.edit": "editar",
  "config.edit.hint": "cambiar proveedor, modelo o claves",
  "config.delete": "eliminar",
  "config.delete.hint": "eliminar este archivo de configuraci\u00F3n",
  "config.activated": "Activado",
  "config.deleted": "Eliminado",
  "config.edit.title": "Editar {id}",
  "config.edit.id": "id: {value}",
  "config.edit.id.hint": "renombrar esta configuraci\u00F3n",
  "config.edit.provider": "proveedor: {value}",
  "config.edit.provider.hint": "establecer el ID del proveedor",
  "config.edit.model": "modelo: {value}",
  "config.edit.model.hint": "establecer el modelo predeterminado",
  "config.edit.key": "clave: {value}",
  "config.edit.key.hint": "actualizar la clave API",
  "config.edit.baseUrl": "URL base: {value}",
  "config.edit.baseUrl.hint": "anular la URL base",
  "config.edit.newId": "Nuevo ID",
  "config.renamed": "Renombrado",
  "config.updated.provider": "Proveedor actualizado",
  "config.updated.model": "Modelo actualizado",
  "config.updated.key": "Clave actualizada",
  "config.updated.baseUrl": "URL base actualizada",
  "config.provider.unsupported":
    'El proveedor "{provider}" a\u00FAn no es compatible; guardar har\u00E1 que las ejecuciones fallen por ahora.',
  "config.provider.unsupported.confirm":
    "\u00BFGuardar este proveedor de todos modos?",
  "config.active": "{id} (activo)",

  // Profiles
  "profile.select": "Selecciona un perfil",
  "profile.new": "+ nuevo perfil",
  "profile.new.hint": "crear y editar un nuevo archivo de perfil",
  "profile.broken": "[roto]",
  "profile.broken.reason": "JSON de perfil inv\u00E1lido o no analizable",
  "profile.builtin": "integrado, solo lectura",

  // Reports
  "report.title": "Informes",
  "report.none": "No se encontraron informes archivados",
  "report.view": "ver",
  "report.view.hint": "abrir el \u00FAltimo informe en un navegador local",
  "report.delete": "eliminar",
  "report.delete.hint": "eliminar informes archivados de este proyecto",
  "report.delete.title": "Eliminar informes",
  "report.delete.all": "todos",
  "report.delete.all.hint":
    "eliminar todas las ejecuciones guardadas de este proyecto",
  "report.delete.history": "historial",
  "report.delete.history.hint":
    "mantener la \u00FAltima ejecuci\u00F3n y eliminar las anteriores",
  "report.deleted": "Informes de este proyecto eliminados",
  "report.deleted.history":
    "Historial eliminado; se mantuvo el m\u00E1s reciente",
  "report.pick": "Elige uno para previsualizar",
  "report.broken": "[roto]",
  "report.broken.reason": "meta.json inv\u00E1lido o falta report.md",
  "report.opened":
    "Abierto en el navegador: {url}\nPresiona Ctrl+C para salir de la vista previa",
  "report.current": "actual; {path}",

  // Run
  "run.spinner": "Ejecutando agente...",
  "run.done": "Listo",
  "run.failed": "Fallido",
  "run.archived": "Archivado en: {path}",
  "run.proceed": "\u00BFContinuar?",
  "run.status.dirty": "Estado: con cambios sin confirmar",
  "run.status.clean": "Estado: limpio",
  "run.noPrior":
    "No se encontr\u00F3 un informe anterior. \u00BFCambiar a modo nuevo?",

  // Ensure AI config
  "ensureConfig.noValid": "No se encontr\u00F3 configuraci\u00F3n v\u00E1lida",
  "ensureConfig.configsDir": "Directorio de configuraciones: {path}",
  "ensureConfig.profilesDir": "Directorio de perfiles: {path}",
  "ensureConfig.createHint":
    "Por favor, crea una configuraci\u00F3n para tu proveedor de modelos.",
  "ensureConfig.openManager":
    "No se encontr\u00F3 configuraci\u00F3n. \u00BFAbrir el gestor de configuraci\u00F3n para crear una?",
  "ensureConfig.howToContinue":
    "Sin configuraci\u00F3n v\u00E1lida. \u00BFC\u00F3mo continuar?",
  "ensureConfig.manage": "gestionar configuraciones",
  "ensureConfig.manage.hint":
    "abrir el gestor para seleccionar, crear y activar",
  "ensureConfig.temp": "usar configuraci\u00F3n temporal",
  "ensureConfig.temp.hint":
    "introducir proveedor/modelo/clave solo para esta ejecuci\u00F3n",
  "ensureConfig.clean": "limpiar configuraciones inv\u00E1lidas",
  "ensureConfig.clean.hint":
    "eliminar configuraciones que no se pudieron cargar",
  "ensureConfig.noInvalid": "No se encontraron configuraciones inv\u00E1lidas",
  "ensureConfig.pickBroken": "Elige una configuraci\u00F3n rota para eliminar",
  "ensureConfig.noRemain":
    "No quedan configuraciones v\u00E1lidas. \u00BFAbrir el gestor para crear una?",
  "ensureConfig.provider.unsupported":
    'El proveedor "{provider}" a\u00FAn no es compatible; la ejecuci\u00F3n fallar\u00E1 por ahora.',
  "ensureConfig.provider.unsupported.confirm":
    "\u00BFContinuar de todos modos?",

  // Common
  "common.back": "\u2190 Volver",
  "common.canceled": "Cancelado",
  "common.set": "(establecido)",
  "common.empty": "(vac\u00EDo)",

  // File ops
  "fileOps.deleteConfirm": "\u00BFEliminar este elemento roto?",
  "fileOps.deleted": "Eliminado: {path}",

  // Pick directory
  "pickDir.message": "Directorio objetivo",

  // Pick run mode
  "pickMode.message": "Modo de ejecuci\u00F3n",
  "pickMode.fresh": "nuevo",
  "pickMode.fresh.hint": "comenzar desde cero",
  "pickMode.incremental": "incremental",
  "pickMode.incremental.hint":
    "usar el \u00FAltimo informe archivado como entrada",

  // Pick profile
  "pickProfile.message": "Selecciona un perfil",
  "pickProfile.default": "predeterminado",
  "pickProfile.default.hint": "perfil predeterminado integrado",
};
