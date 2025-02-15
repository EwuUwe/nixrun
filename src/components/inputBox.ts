import Clutter from '@girs/clutter-15';
import Gio from '@girs/gio-2.0';
import type { ExtensionBase } from '@girs/gnome-shell/dist/extensions/sharedInternals';
import GObject from '@girs/gobject-2.0';
import Meta from '@girs/meta-15';
import Shell from '@girs/shell-15';
import St from '@girs/st-15';
import { registerGObjectClass, SignalRepresentationType, SignalsDefinition } from '@nixrun/utils/gjs';
import { getCurrentExtensionSettings, gettext } from '@nixrun/utils/shell';

export type InputBoxSignalType =
  | 'input-text-changed'
  | 'input-item-select-shortcut'
  | 'input-focus-out'
  | 'input-submit';

interface InputBoxSignals extends SignalsDefinition<InputBoxSignalType> {
  'input-text-changed': SignalRepresentationType<
    [GObject.GType<string>, GObject.GType<string>, GObject.GType<boolean>]
  >;
  'input-item-select-shortcut': SignalRepresentationType<[GObject.GType<number>]>;
  'input-focus-out': Record<string, never>;
  'input-submit': Record<string, never>;
}
@registerGObjectClass
export class InputBox extends St.BoxLayout {
  static metaInfo: GObject.MetaInfo<Record<string, never>, Record<string, never>, InputBoxSignals> = {
    GTypeName: 'InputBox',
    Signals: {
      'input-text-changed': {
        param_types: [GObject.TYPE_STRING, GObject.TYPE_STRING, GObject.TYPE_BOOLEAN],
        accumulator: 0,
      },
      'input-item-select-shortcut': {
        param_types: [GObject.TYPE_INT],
        accumulator: 0,
      },
      'input-focus-out': {},
      'input-submit': {},
    },
  };

  private search: St.Entry;
  private settings: Gio.Settings;

  constructor(ext: ExtensionBase) {
    super({
      xAlign: Clutter.ActorAlign.CENTER,
      styleClass: 'input-entry-container',
      vertical: false,
      trackHover: true,
      reactive: true,
    });

    const _ = gettext(ext);

    this.settings = getCurrentExtensionSettings(ext);

    const themeContext = St.ThemeContext.get_for_stage(Shell.Global.get().get_stage());

    this.search = new St.Entry({
      canFocus: true,
      hintText: _('Enter package to run'),
      naturalWidth: 300 * themeContext.scaleFactor,
      height: 40 * themeContext.scaleFactor,
      trackHover: true,
      primaryIcon: this.createSearchEntryIcon('edit-find-symbolic', 'input-entry-icon'),
    });

    themeContext.connect('notify::scale-factor', () => {
      this.search.naturalWidth = 300 * themeContext.scaleFactor;
      this.search.set_height(40 * themeContext.scaleFactor);
    });

    this.search.clutterText.connect('key-press-event', (_: St.Entry, event: Clutter.Event) => {
      if (
        event.get_key_symbol() === Clutter.KEY_Down ||
        (event.get_key_symbol() === Clutter.KEY_Right &&
          (this.search.clutterText.cursorPosition === -1 || this.search.text?.length === 0))
      ) {
        this.emit('input-focus-out');
        return Clutter.EVENT_STOP;
      } else if (
        event.get_key_symbol() === Clutter.KEY_Right &&
        this.search.clutterText.get_selection() !== null &&
        this.search.clutterText.get_selection() === this.search.text
      ) {
        this.search.clutterText.set_cursor_position(this.search.text?.length ?? 0);
        return Clutter.EVENT_STOP;
      }
      if (
        event.get_key_symbol() === Clutter.KEY_Return ||
        event.get_key_symbol() === Clutter.KEY_ISO_Enter ||
        event.get_key_symbol() === Clutter.KEY_KP_Enter
      ) {
        this.emit('input-submit');
        return Clutter.EVENT_STOP;
      }

      if (event.has_control_modifier() && event.get_key_symbol() >= 49 && event.get_key_symbol() <= 57) {
        this.emit('input-item-select-shortcut', event.get_key_symbol() - 49);
        return Clutter.EVENT_STOP;
      }

      return Clutter.EVENT_PROPAGATE;
    });
    this.add_child(this.search);
    this.setStyle();
    this.settings.connect('changed::input-bar-font-family', this.setStyle.bind(this));
    this.settings.connect('changed::input-bar-font-size', this.setStyle.bind(this));
  }

  private setStyle() {
    this.search.set_style('font-size: 16px;');
  }

  private createSearchEntryIcon(iconNameOrProto: string | Gio.Icon, styleClass: string) {
    const icon = new St.Icon({
      styleClass: styleClass,
      iconSize: 13,
      trackHover: true,
    });

    if (typeof iconNameOrProto === 'string') {
      icon.set_icon_name(iconNameOrProto);
    } else {
      icon.set_gicon(iconNameOrProto);
    }

    icon.connect('enter-event', () => {
      Shell.Global.get().display.set_cursor(Meta.Cursor.POINTING_HAND);
    });
    icon.connect('motion-event', () => {
      Shell.Global.get().display.set_cursor(Meta.Cursor.POINTING_HAND);
    });
    icon.connect('leave-event', () => {
      Shell.Global.get().display.set_cursor(Meta.Cursor.DEFAULT);
    });

    return icon;
  }

  focus() {
    this.search.grab_key_focus();
  }

  removeChar() {
    this.search.text = this.search.text?.slice(0, -1) ?? '';
  }

  appendText(text: string) {
    this.search.text += text;
  }

  selectAll() {
    this.search.clutterText.set_selection(0, this.search.text?.length ?? 0);
  }

  clear() {
    this.search.text = '';
  }

  getText(): string {
    return this.search.text || '';
  }
}
