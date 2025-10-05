{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs, ... }:
    let
      systems = [ "aarch64-darwin" ];
      eachSystem = f: nixpkgs.lib.genAttrs systems (system: f (import nixpkgs { inherit system; }));
    in
    {
      packages = eachSystem (
        pkgs:
        let
          sources = builtins.fromJSON (builtins.readFile ./sources.json);
          getSource = systems: pkgs.fetchurl (systems.${pkgs.system});
          getOverride =
            version: systems:
            pkgs.bun.overrideAttrs {
              inherit version;
              src = getSource systems;
            };
        in
        pkgs.lib.mapAttrs getOverride sources.versions
      );

      devShells = eachSystem (
        pkgs:
        let
          bun = self.packages.${pkgs.system};
        in
        {
          default = pkgs.mkShell {
            packages = [ bun."1.2.22" ];
          };
        }
      );
    };
}
