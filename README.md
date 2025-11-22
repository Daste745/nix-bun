# nix-bun

Nix flake with all bun versions.

## Usage

This flake exposes all bun versions as separate packages. You can access them via `packages.${system}."version"`.

### devShell in a flake

```nix
{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    bun = {
      url = "github:Daste745/nix-bun";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs:
    let
      system = "x86_64-linux";
      pkgs = import inputs.nixpkgs { inherit system; };
      bun = inputs.bun.packages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        # All versions can be accessed via `bun."version"`
        packages = [ bun."1.3.0" ];
      };
    };
}
```

### Nix shell

Use `#'"version"'` to select a specific version of Bun:

```sh
# nix shell github:Daste745/nix-bun#'"1.3.0"'
```

## References

- [oven-sh/bun](https://github.com/oven-sh/bun)
- [0xBigBoss/bun-overlay](https://github.com/0xBigBoss/bun-overlay)
- [cachix/nixpkgs-python](https://github.com/cachix/nixpkgs-python)
