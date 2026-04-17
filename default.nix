{
  pkgs ? import <nixpkgs> { },
  system ? pkgs.stdenv.hostPlatform.system,
}:
let
  sources = builtins.fromJSON (builtins.readFile ./sources.json);
  getSource = systems: pkgs.fetchurl (systems.${system});
  getOverride =
    version: systems:
    pkgs.bun.overrideAttrs {
      inherit version;
      src = getSource systems;
    };
in
builtins.mapAttrs getOverride sources.versions
