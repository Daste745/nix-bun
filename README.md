# nix-bun

All [Bun releases](https://github.com/oven-sh/bun/releases) as separate nix packages, updated daily.

Bun is built for the following systems. All are available in nix-bun:

- `aarch64-darwin`
- `aarch64-linux`
- `x86_64-darwin`
- `x86_64-linux`

## Usage

### flake.nix

When using flakes, you can access all versions via `packages.${system}."version"`.

```nix
{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
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

### shell.nix (without flakes)

Without flakes, import nix-bun using nixpkgs for the target system. All versions are available as toplevel attributes of `default.nix`'s output.

This can be combined with [npins](https://github.com/andir/npins) or [niv](https://github.com/nmattia/niv) for more convenient flake-less dependency pinning.

```nix
{
  pkgs ? import <nixpkgs> { },
}:
let
  # Also, preferrably lock to a specific commit + sha256
  nix-bun = fetchTarball "https://github.com/Daste745/nix-bun/archive/main.tar.gz";
  bun = import nix-bun { inherit pkgs; };
in
pkgs.mkShell {
  # All versions can be accessed via `bun."version"`
  packages = [ bun."1.3.0" ];
}
```

### Temporary nix shell

Use `#'"version"'` to select a specific version of Bun to avoid shells unescaping the version:

```sh
$ nix shell github:Daste745/nix-bun#'"1.3.0"'
```

## References

- [oven-sh/bun](https://github.com/oven-sh/bun)
- [0xBigBoss/bun-overlay](https://github.com/0xBigBoss/bun-overlay)
- [cachix/nixpkgs-python](https://github.com/cachix/nixpkgs-python)
