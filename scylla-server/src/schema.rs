// @generated automatically by Diesel CLI.

diesel::table! {
    data (time, dataTypeName) {
        values -> Array<Nullable<Float4>>,
        time -> Int8,
        dataTypeName -> Text,
        runId -> Int4,
    }
}

diesel::table! {
    data_type (name) {
        name -> Text,
        unit -> Text,
    }
}

diesel::table! {
    run (runId) {
        runId -> Int4,
        driverName -> Text,
        locationName -> Text,
        notes -> Text,
        time -> Timestamptz,
    }
}

diesel::table! {
    track (id) {
        id -> Int4,
        name -> Text,
        startALat -> Nullable<Float8>,
        startALon -> Nullable<Float8>,
        startBLat -> Nullable<Float8>,
        startBLon -> Nullable<Float8>,
        finishALat -> Nullable<Float8>,
        finishALon -> Nullable<Float8>,
        finishBLat -> Nullable<Float8>,
        finishBLon -> Nullable<Float8>,
    }
}

diesel::joinable!(data -> data_type (dataTypeName));
diesel::joinable!(data -> run (runId));

diesel::allow_tables_to_appear_in_same_query!(data, data_type, run, track,);
