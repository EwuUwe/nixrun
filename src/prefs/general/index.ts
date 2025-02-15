import Adw from '@girs/adw-1';
import type { ExtensionBase } from '@girs/gnome-shell/dist/extensions/sharedInternals';
import { GeneralGroup } from '@nixrun/prefs/general/generalGroup';
import { registerGObjectClass } from '@nixrun/utils/gjs';
import { gettext } from '@nixrun/utils/shell';

@registerGObjectClass
export class GeneralPage extends Adw.PreferencesPage {
  constructor(ext: ExtensionBase) {
    const _ = gettext(ext);
    super({
      title: _('General'),
      iconName: 'preferences-system-symbolic',
    });

    this.add(new GeneralGroup(ext));
  }
}
