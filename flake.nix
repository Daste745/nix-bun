{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-darwin"
        "x86_64-linux"
      ];
      eachSystem = f: nixpkgs.lib.genAttrs systems (system: f (import nixpkgs { inherit system; }));
    in
    {
      packages = eachSystem (
        pkgs:
        let
          sources = builtins.fromJSON (builtins.readFile ./sources.json);
          system = pkgs.stdenv.hostPlatform.system;
          getSource = systems: pkgs.fetchurl (systems.${system});
          getOverride =
            version: systems:
            pkgs.bun.overrideAttrs {
              inherit version;
              src = getSource systems;
            };
        in
        pkgs.lib.mapAttrs getOverride sources.versions
      );

      devShells = eachSystem (pkgs: {
        default = pkgs.mkShell {
          packages = [ pkgs.bun ];
        };
      });
    };
}
