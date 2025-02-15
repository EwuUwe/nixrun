import './styles/stylesheet.css';

import Gio from '@girs/gio-2.0';
import GLib from '@girs/glib-2.0';
import { Extensions } from '@girs/gnome-shell';
import type { ExtensionMetadata } from '@girs/gnome-shell/dist/types/extension-metadata';
import Shell from '@girs/shell-15';
const { Extension } = Extensions.extension;
import Meta from '@girs/meta-15';
import { MainWindow } from '@nixrun/containers/mainWindow';
import { KeyManager } from '@nixrun/utils/keyManager';
import { loadInterfaceXML, logger } from '@nixrun/utils/shell';
import { addTopChrome, removeChrome } from '@nixrun/utils/ui';

const debug = logger('extension');

const global = Shell.Global.get();

export default class NixRunExtension extends Extension {
  private keyManager: KeyManager | null = null;
  private mainWindow: MainWindow | null = null;

  private dbus: Gio.DBusExportedObject | null = null;
  //private settings: Gio.Settings | null = null;
  private windowTrackerId: number | null = null;
  private timeoutId: number | null = null;

  constructor(props: ExtensionMetadata) {
    super(props);
    debug('extension is initialized');
  }

  override enable() {
    //thiis.settings = getCurrentExtensionSettings(this);
    this.keyManager = new KeyManager(this);
    this.start();
    this.enableDbus();
    Meta.disable_unredirect_for_display(global.display);
    debug('extension is enabled');
  }

  override disable(): void {
    this.stop();
    this.disableDbus();
    //this.settings = null;
    this.keyManager = null;
    Meta.enable_unredirect_for_display(global.display);
    debug('extension is disabled');
  }

  // for dbus
  start() {
    if (this.keyManager !== null) {
      this.mainWindow = new MainWindow(this);
      this.trackWindow();
      addTopChrome(this.mainWindow);
      this.keyManager.listenFor('global-shortcut-t', () => this.mainWindow?.toggle());
    }
  }

  // for dbus
  stop() {
    this.keyManager?.stopListening('global-shortcut-t');
    this.untrackWindow();
    if (this.mainWindow) {
      removeChrome(this.mainWindow);
    }
    this.mainWindow?.destroy();
    this.mainWindow = null;
  }

  // for dbus
  show() {
    this.mainWindow?.show();
  }

  // for dbus
  hide() {
    this.mainWindow?.hide();
  }

  // for dbus
  toggle() {
    this.mainWindow?.toggle();
  }

  private enableDbus() {
    const iface = loadInterfaceXML(this, 'com.ewuuwe.nixrun');
    this.dbus = Gio.DBusExportedObject.wrapJSObject(iface, this);
    this.dbus.export(Gio.DBus.session, '/com/ewuuwe/nixrun');
  }

  private disableDbus() {
    this.dbus?.unexport();
    this.dbus = null;
  }

  private trackWindow() {
    this.windowTrackerId = Shell.Global.get().display.connect('notify::focus-window', () => {
      const focussedWindow = Shell.Global.get().display.focusWindow;
      if (focussedWindow && this.mainWindow?.is_visible()) {
        this.mainWindow.hide();
      }
    });
  }

  private untrackWindow() {
    if (this.windowTrackerId) {
      Shell.Global.get().display.disconnect(this.windowTrackerId);
      this.windowTrackerId = null;
    }
    if (this.timeoutId) {
      GLib.Source.remove(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
