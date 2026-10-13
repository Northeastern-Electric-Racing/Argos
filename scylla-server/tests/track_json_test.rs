use scylla_server::{
    controllers::track_controller::{AddTrackPayload, EditTrackPayload},
    lap_timing::{GeoPoint, Lap, TimingLine},
    transformers::track_transformer::PublicTrack,
};
use serde_json::json;

fn start_line() -> TimingLine {
    TimingLine {
        a: GeoPoint {
            lat: 42.1,
            lon: -84.2,
        },
        b: GeoPoint {
            lat: 42.3,
            lon: -84.4,
        },
    }
}

#[test]
fn track_serializes_to_nested_camel_case_lines() {
    let track = PublicTrack {
        id: 1,
        name: "Michigan – Endurance".to_owned(),
        start_line: Some(start_line()),
        finish_line: None,
    };

    assert_eq!(
        serde_json::to_value(&track).unwrap(),
        json!({
            "id": 1,
            "name": "Michigan – Endurance",
            "startLine": { "a": { "lat": 42.1, "lon": -84.2 }, "b": { "lat": 42.3, "lon": -84.4 } },
            "finishLine": null
        })
    );
}

#[test]
fn track_without_lines_serializes_null_lines() {
    let track = PublicTrack {
        id: 2,
        name: "Skidpad".to_owned(),
        start_line: None,
        finish_line: None,
    };

    assert_eq!(
        serde_json::to_value(&track).unwrap(),
        json!({ "id": 2, "name": "Skidpad", "startLine": null, "finishLine": null })
    );
}

#[test]
fn add_body_deserializes_the_name() {
    assert_eq!(
        serde_json::from_value::<AddTrackPayload>(json!({ "name": "Skidpad" })).unwrap(),
        AddTrackPayload {
            name: "Skidpad".to_owned()
        }
    );
}

#[test]
fn edit_body_deserializes_both_lines() {
    let body = json!({
        "startLine": { "a": { "lat": 42.1, "lon": -84.2 }, "b": { "lat": 42.3, "lon": -84.4 } },
        "finishLine": { "a": { "lat": 42.3, "lon": -84.4 }, "b": { "lat": 42.1, "lon": -84.2 } }
    });

    assert_eq!(
        serde_json::from_value::<EditTrackPayload>(body).unwrap(),
        EditTrackPayload {
            start_line: Some(start_line()),
            finish_line: Some(TimingLine {
                a: start_line().b,
                b: start_line().a,
            }),
        }
    );
}

#[test]
fn edit_body_deserializes_null_lines_as_no_lines() {
    assert_eq!(
        serde_json::from_value::<EditTrackPayload>(
            json!({ "startLine": null, "finishLine": null })
        )
        .unwrap(),
        EditTrackPayload {
            start_line: None,
            finish_line: None,
        }
    );
}

#[test]
fn lap_serializes_with_millisecond_field_names() {
    let lap = Lap {
        number: 1,
        start_ms: 1_712_345_678_901.25,
        end_ms: 1_712_345_751_005.5,
        duration_ms: 72_104.25,
    };

    assert_eq!(
        serde_json::to_value(&lap).unwrap(),
        json!({ "number": 1, "startMs": 1_712_345_678_901.25, "endMs": 1_712_345_751_005.5, "durationMs": 72_104.25 })
    );
}
