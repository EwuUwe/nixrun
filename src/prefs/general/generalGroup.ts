import Adw from '@girs/adw-1';
import type { ExtensionBase } from '@girs/gnome-shell/dist/extensions/sharedInternals';
import { ShortcutRow } from '@nixrun/prefs/general/shortcutRow';
import { registerGObjectClass } from '@nixrun/utils/gjs';
import { gettext } from '@nixrun/utils/shell';

@registerGObjectClass
export class GeneralGroup extends Adw.PreferencesGroup {
  constructor(ext: ExtensionBase) {
    const _ = gettext(ext);
    super({
      title: _('General Options'),
    });

    this.add(new ShortcutRow(ext));
  }
}
