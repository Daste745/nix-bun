export type NixSystemTuple = "aarch64-darwin" | "aarch64-linux" | "x86_64-darwin" | "x86_64-linux";
export type BunSystemTuple = "darwin-aarch64" | "linux-aarch64" | "darwin-x64" | "linux-x64";

export function nixToBunSystem(system: NixSystemTuple): BunSystemTuple {
  switch (system) {
    case "aarch64-darwin": return "darwin-aarch64";
    case "aarch64-linux": return "linux-aarch64";
    case "x86_64-darwin": return "darwin-x64";
    case "x86_64-linux": return "linux-x64";
  }
}

export function bunToNixSystem(system: BunSystemTuple): NixSystemTuple {
  switch (system) {
    case "darwin-aarch64": return "aarch64-darwin";
    case "linux-aarch64": return "aarch64-linux";
    case "darwin-x64": return "x86_64-darwin";
    case "linux-x64": return "x86_64-linux";
  }
}
