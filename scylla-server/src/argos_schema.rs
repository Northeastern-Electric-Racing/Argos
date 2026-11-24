// @generated automatically by Diesel CLI.

diesel::table! {
    lap (id) {
        id -> Int4,
        runId -> Int4,
        trackId -> Int4,
        startMs -> Float8,
        endMs -> Float8,
    }
}

diesel::table! {
    track (id) {
        id -> Int4,
        name -> Text,
        startLine -> Nullable<Array<Nullable<Float8>>>,
        finishLine -> Nullable<Array<Nullable<Float8>>>,
    }
}

diesel::joinable!(lap -> track (trackId));

diesel::allow_tables_to_appear_in_same_query!(lap, track,);
