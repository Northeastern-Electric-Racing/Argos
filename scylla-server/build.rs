/* Prebuild script */
fn main() {
    println!("cargo:rerun-if-changed=src/proto");
    // embed_migrations! does not notice a new migration directory, and argos migrations are added as new ones
    println!("cargo:rerun-if-changed=argos_migrations");

    protobuf_codegen::Codegen::new()
        .pure()
        // All inputs and imports from the inputs must reside in `includes` directories.
        .includes(["src/proto"])
        // Inputs must reside in some of include paths.
        .input("src/proto/serverdata.proto")
        .input("src/proto/command_data.proto")
        .input("src/proto/playback_data.proto")
        // Specify output directory relative to Cargo output directory.
        .out_dir("src/proto")
        .run_from_script();
}
