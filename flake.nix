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
          getSource = version: system: pkgs.fetchurl (sources.versions.${version}.systems.${system});
          getOverride =
            version: system:
            pkgs.bun.overrideAttrs {
              inherit version;
              src = getSource version system;
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
