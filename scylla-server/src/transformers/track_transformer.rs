use serde::Serialize;

use crate::{
    lap_timing::TimingLine,
    models::{Track, line_from_column},
};

/// The struct defining the track format sent to the client
#[derive(Serialize, Debug, PartialEq)]
pub struct PublicTrack {
    pub id: i32,
    pub name: String,
    #[serde(rename = "startLine")]
    pub start_line: Option<TimingLine>,
    #[serde(rename = "finishLine")]
    pub finish_line: Option<TimingLine>,
}

impl From<Track> for PublicTrack {
    fn from(value: Track) -> Self {
        PublicTrack {
            id: value.id,
            name: value.name,
            start_line: line_from_column(value.startLine.as_deref()),
            finish_line: line_from_column(value.finishLine.as_deref()),
        }
    }
}
