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

diesel::joinable!(data -> data_type (dataTypeName));
diesel::joinable!(data -> run (runId));

diesel::allow_tables_to_appear_in_same_query!(
    data,
    data_type,
    run,
);
