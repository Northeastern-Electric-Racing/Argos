use std::collections::BTreeMap;

use scylla_server::{
    lap_timing::{GeoPoint, Lap, LineKind, TimingLine},
    track_handler::RunLaps,
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
fn the_tracks_and_laps_messages_are_camel_case() {
    let track = PublicTrack {
        id: 1,
        name: "Michigan – Endurance".to_owned(),
        start_line: Some(start_line()),
        finish_line: None,
    };
    let laps = [Lap {
        start_ms: 1_712_345_678_901.25,
        end_ms: 1_712_345_751_005.5,
        duration_ms: 72_104.25,
    }];
    let run_laps = RunLaps {
        run_id: 3,
        laps: BTreeMap::from([(7, &laps[..])]),
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
    assert_eq!(
        serde_json::to_value(&run_laps).unwrap(),
        json!({
            "runId": 3,
            "laps": { "7": [{ "startMs": 1_712_345_678_901.25, "endMs": 1_712_345_751_005.5, "durationMs": 72_104.25 }] }
        })
    );
}

#[test]
fn line_kind_deserializes_from_the_route() {
    assert_eq!(
        serde_json::from_value::<LineKind>(json!("start")).unwrap(),
        LineKind::Start
    );
    assert_eq!(
        serde_json::from_value::<LineKind>(json!("finish")).unwrap(),
        LineKind::Finish
    );
    assert!(serde_json::from_value::<LineKind>(json!("middle")).is_err());
}
