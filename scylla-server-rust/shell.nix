# ln -s /home/jack/Documents/nixos/shell-rust.nix /home/jack/Projects/NER/Calypso/shell.nix

{
  pkgs ? import <nixpkgs> { },
}:
pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    rustc
    cargo
    gcc
    rustfmt
    clippy

    # for paho-mqtt
    openssl
    pkg-config
    cmake
    python3
    python311Packages.ruamel-yaml-clib
python311Packages.ruamel-base
python311Packages.ruamel-yaml
    # rust
    rust-analyzer
  ];

  # Certain Rust tools won't work without this
  # This can also be fixed by using oxalica/rust-overlay and specifying the rust-src extension
  # See https://discourse.nixos.org/t/rust-src-not-found-and-other-misadventures-of-developing-rust-on-nixos/11570/3?u=samuela. for more details.
  RUST_SRC_PATH = "${pkgs.rust.packages.stable.rustPlatform.rustLibSrc}";
}
