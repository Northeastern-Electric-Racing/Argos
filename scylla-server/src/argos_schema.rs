// @generated automatically by Diesel CLI.

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
