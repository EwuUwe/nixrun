import { ExtensionPreferences, gettext as _ } from '@custom_types/gnome-shell/dist/extensions/prefs';
import Adw from '@girs/adw-1';
import Gdk4 from '@girs/gdk-4.0';
import Gtk4 from '@girs/gtk-4.0';
import { GeneralPage } from '@nixrun/prefs/general';
import { isGnome47 } from '@nixrun/utils/compatibility';

export default class NixRunExtensionPreferences extends ExtensionPreferences {
  override fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> | void {
    window.add(new GeneralPage(this));
    window.searchEnabled = true;

    const display = Gdk4.Display.get_default();
    if (display) {
      Gtk4.IconTheme.get_for_display(display).add_search_path(`${this.path}/icons/`);
    }

    /**
     * gnome 47 explicitly states, that we need to return a Promise, so we check the version at runtime and decide what to return, to support older versions of gnome shell, that don't expected a promise here
     * @see https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/extensions/prefs.js#L34
     */
    if (isGnome47()) {
      return Promise.resolve();
    }
    return;
  }
}
