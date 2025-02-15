import Gio from '@girs/gio-2.0';
import GLib from '@girs/glib-2.0';
import type { ExtensionBase } from '@girs/gnome-shell/dist/extensions/sharedInternals';

export const logger =
  (prefix: string) =>
  (content: string): void =>
    console.log(`[nixrun] [${prefix}] ${content}`);

const debug = logger('shell-utils');

export const deleteFile = (file: Gio.File) => {
  return new Promise((resolve, reject) => {
    file.delete_async(GLib.PRIORITY_DEFAULT, null, (_file, res) => {
      try {
        resolve(file.delete_finish(res));
      } catch (e) {
        reject(e);
      }
    });
  });
};

export const deleteDirectory = async (file: Gio.File) => {
  try {
    const iter: Gio.FileEnumerator | undefined = await new Promise((resolve, reject) => {
      file.enumerate_children_async(
        'standard::type',
        Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
        GLib.PRIORITY_DEFAULT,
        null,
        (file, res) => {
          try {
            resolve(file?.enumerate_children_finish(res));
          } catch (e) {
            reject(e);
          }
        },
      );
    });

    if (!iter) {
      return;
    }

    const branches: any[] = [];

    while (true) {
      const infos: Gio.FileInfo[] = await new Promise((resolve, reject) => {
        iter.next_files_async(10, GLib.PRIORITY_DEFAULT, null, (it, res) => {
          try {
            resolve(it ? it.next_files_finish(res) : []);
          } catch (e) {
            reject(e);
          }
        });
      });

      if (infos.length === 0) {
        break;
      }

      for (const info of infos) {
        const child = iter.get_child(info);
        const type = info.get_file_type();

        let branch;

        switch (type) {
          case Gio.FileType.REGULAR:
          case Gio.FileType.SYMBOLIC_LINK:
            branch = deleteFile(child);
            break;

          case Gio.FileType.DIRECTORY:
            branch = deleteDirectory(child);
            break;

          default:
            continue;
        }

        branches.push(branch);
      }
    }

    await Promise.all(branches);
  } catch (e) {
  } finally {
    return deleteFile(file);
  }
};

export const getAppDataPath = (ext: ExtensionBase): string => `${GLib.get_user_data_dir()}/${ext.uuid}`;

export const getImagesPath = (ext: ExtensionBase): string => `${getAppDataPath(ext)}/images`;

export const getCachePath = (ext: ExtensionBase): string => `${GLib.get_user_cache_dir()}/${ext.uuid}`;

export const setupAppDirs = (ext: ExtensionBase): void => {
  const imagePath = Gio.File.new_for_path(getImagesPath(ext));
  if (!imagePath.query_exists(null)) {
    imagePath.make_directory_with_parents(null);
  }
  const cachePath = Gio.File.new_for_path(getCachePath(ext));
  if (!cachePath.query_exists(null)) {
    cachePath.make_directory_with_parents(null);
  }
  const dbPath = Gio.File.new_for_path(`${getDbPath(ext)}`);
  if (!dbPath.query_exists(null)) {
    dbPath.make_directory_with_parents(null);
  }
};
export const deleteAppDirs = async (ext: ExtensionBase): Promise<void> => {
  const appDataPath = Gio.File.new_for_path(getAppDataPath(ext));
  if (appDataPath.query_exists(null)) {
    await deleteDirectory(appDataPath);
  }
  const cachePath = Gio.File.new_for_path(getCachePath(ext));
  if (cachePath.query_exists(null)) {
    await deleteDirectory(cachePath);
  }
};

export const getDbPath = (ext: ExtensionBase): string => {
  const path = getCurrentExtensionSettings(ext).get_string('database-location');
  if (!path) {
    return getAppDataPath(ext);
  }

  return path;
};
export const getCurrentExtensionSettings = (ext: ExtensionBase): Gio.Settings => ext.getSettings();

export const loadInterfaceXML = (ext: ExtensionBase, iface: string): any => {
  const uri = `file:///${ext.path}/dbus/${iface}.xml`;
  const file = Gio.File.new_for_uri(uri);

  try {
    const [, bytes] = file.load_contents(null);
    return new TextDecoder().decode(bytes);
  } catch (e) {
    debug(`Failed to load D-Bus interface ${iface}`);
  }

  return null;
};

export let debounceIds: number[] = [];

export function debounce<T extends any[]>(func: (...args: T) => void | Promise<void>, wait: number) {
  let sourceId: null | number;
  return function (...args: T) {
    const debouncedFunc = function (this: unknown) {
      debounceIds = debounceIds.filter((id) => id !== sourceId);
      sourceId = null;
      func.apply(this, args);

      return GLib.SOURCE_REMOVE;
    };

    if (sourceId) {
      GLib.Source.remove(sourceId);
      debounceIds = debounceIds.filter((id) => id !== sourceId);
    }
    sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, wait, debouncedFunc);
    debounceIds.push(sourceId);
  };
}

export const openLinkInBrowser = (url: string) => {
  try {
    Gio.app_info_launch_default_for_uri(url, null);
  } catch (e) {
    debug(`Failed to open url ${url}`);
  }
};

export function gettext(ext: ExtensionBase): (str: string) => string {
  return ext.gettext.bind(ext);
}
