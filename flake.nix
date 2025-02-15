{
  inputs = {
    # Nixpkgs
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };
  outputs = inputs @ {
    flake-parts,
    systems,
    ...
  }:
    flake-parts.lib.mkFlake {inherit inputs;} {
      systems = import systems;
      perSystem = {pkgs, ...}: {
        formatter = pkgs.alejandra;

        devShells = {
          default = pkgs.mkShell {
            buildInputs = [pkgs.glib.dev pkgs.yarn];
          };
        };

        packages.nixrun = pkgs.stdenv.mkDerivation (finalAttrs: {
          pname = "nixrun";
          version = "0.0.1";

          src = ./.;

          yarnOfflineCache = pkgs.fetchYarnDeps {
            yarnLock = finalAttrs.src + "/yarn.lock";
            hash = "sha256-FbC6CgNqTvKekrEjtaLRIqy9Fsl9G2g2kxdtWHK8iBA=";
          };

          nativeBuildInputs = with pkgs; [
            yarnConfigHook
            yarnBuildHook
            yarnInstallHook
            nodejs
            glib
          ];

          yarnKeepDevDeps = true;

          buildPhase = ''
            export HOME=$(mktemp -d)
            yarn --offline build
          '';

          installPhase = ''
            mkdir -p $out/share/gnome-shell/extensions/nixrun@ewuuwe.github.com
            cp -r dist/* $out/share/gnome-shell/extensions/nixrun@ewuuwe.github.com/
          '';
        });
      };
    };
}
