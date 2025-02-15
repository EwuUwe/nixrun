import '@girs/gnome-shell/dist/extensions/global';

import Clutter from '@girs/clutter-15';
import Gio from '@girs/gio-2.0';
import { Ui } from '@girs/gnome-shell';
import type { ExtensionBase } from '@girs/gnome-shell/dist/extensions/sharedInternals';
import Shell from '@girs/shell-15';
import St from '@girs/st-15';
import { InputBox } from '@nixrun/components/inputBox';
import { registerGObjectClass } from '@nixrun/utils/gjs';
import { getMonitorConstraint } from '@nixrun/utils/ui';

@registerGObjectClass
export class MainWindow extends St.BoxLayout {
  private inputBox: InputBox;

  constructor(ext: ExtensionBase) {
    super({
      name: 'main-window',
      constraints: getMonitorConstraint(),
      styleClass: 'main-window',
      visible: false,
      vertical: true,
      reactive: true,
      opacity: 0,
      canFocus: true,
    });

    const themeContext = St.ThemeContext.get_for_stage(Shell.Global.get().get_stage());

    this.setWindowDimensions(themeContext.scaleFactor);
    themeContext.connect('notify::scale-factor', () => {
      this.setWindowDimensions(themeContext.scaleFactor);
    });

    this.inputBox = new InputBox(ext);

    this.setupInputBox();

    this.add_child(this.inputBox);
    console.log(ext.dir);
  }

  private setWindowDimensions(scaleFactor: number) {
    this.remove_style_class_name('vertical');
    this.set_height(90 * scaleFactor);
  }

  private setupInputBox() {
    this.inputBox.connect('input-focus-out', () => {});
    this.inputBox.connect('input-submit', () => {
      try {
        const proc = new Gio.Subprocess({
          argv: ['nix', 'run', `nixpkgs#${this.inputBox.getText()}`, '--impure'],
          flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
        });

        proc.init(null);

        // Connect to "wait_async" to be notified when the process exits
        proc.wait_async(null, (proc, res) => {
          try {
            console.log('Process finished');
            const success = proc?.wait_finish(res);
            const stdout = this.readStream(proc!.get_stdout_pipe()!);
            const stderr = this.readStream(proc!.get_stderr_pipe()!);
            console.log(success);
            console.log(stdout);
            console.log(stderr);
            if (proc?.get_exit_status() !== 0) {
              Ui.main.notify('Failed', stdout + stderr);
            }
          } catch (e) {
            console.error(e);
          }
        });
      } catch (e) {
        console.error(e);
      }

      this.hide();
    });
    this.inputBox.connect('input-text-changed', (_: any, text: string, itemType, showFavorites: boolean) => {
      console.log(text, itemType, showFavorites);
    });
  }

  readStream(stream: Gio.InputStream): string {
    try {
      const data = stream.read_bytes(4096, null);
      return new TextDecoder().decode(data.get_data());
    } catch (e) {
      console.error(e);
      return '';
    }
  }

  toggle(): void {
    this.is_visible() ? this.hide() : this.show();
  }

  override show() {
    this.clear_constraints();
    this.add_constraint(getMonitorConstraint());
    super.show();
    this.inputBox.clear();
    this.inputBox.focus();
    this.ease({
      opacity: 255,
      duration: 250,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
    });

    return Clutter.EVENT_PROPAGATE;
  }

  override hide() {
    this.ease({
      opacity: 0,
      duration: 200,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
      onComplete: () => {
        this.inputBox.clear();
        super.hide();
      },
    });

    return Clutter.EVENT_PROPAGATE;
  }

  override vfunc_key_press_event(event: Clutter.Event): boolean {
    if (event.get_key_symbol() === Clutter.KEY_Escape) {
      this.hide();
    }

    return Clutter.EVENT_PROPAGATE;
  }

  override destroy(): void {
    this.inputBox.destroy();
    super.destroy();
  }
}
