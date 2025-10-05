{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs, ... }:
    let
      lib = nixpkgs.lib;
      systems = [ "aarch64-darwin" ];
      eachSystem = f: lib.genAttrs systems (system: f (import nixpkgs { inherit system; }));
    in
    {
      packages = eachSystem (pkgs: {
        bun =
          let
            sources = builtins.fromJSON (lib.strings.fileContents ./sources.json);
            # TODO)) Configurable version
            version = "1.2.22";
            packageSource =
              if builtins.hasAttr version sources then
                sources.${version}.systems.${pkgs.system}
              else
                throw "Unknown bun source version: ${version}";
            src = pkgs.fetchurl { inherit (packageSource) url hash; };
          in
          pkgs.bun.overrideAttrs {
            inherit version src;
          };
      });

      overlays.default = final: prev: {
        bun = self.packages.${prev.system}.bun;
      };

      devShells = eachSystem (pkgs: {
        default = pkgs.mkShell {
          packages = [ pkgs.bun ];
        };
      });
    };
}
