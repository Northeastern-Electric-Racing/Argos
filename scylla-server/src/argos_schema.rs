// @generated automatically by Diesel CLI.

diesel::table! {
    track (id) {
        id -> Int4,
        name -> Text,
        startLine -> Nullable<Array<Nullable<Float8>>>,
        finishLine -> Nullable<Array<Nullable<Float8>>>,
    }
}
