use serde::Serialize;

use crate::{lap_timing::TimingLine, models::Track};

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
        let (start_line, finish_line) = value.lines();
        PublicTrack {
            id: value.id,
            name: value.name,
            start_line,
            finish_line,
        }
    }
}
