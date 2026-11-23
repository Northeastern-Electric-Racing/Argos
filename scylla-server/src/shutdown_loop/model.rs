//! The shutdown loop in series order. Mirrors `SHUTDOWN_LOOP` in the angular-client
//! (`angular-client/src/pages/shutdown-page/shutdown-loop.model.ts`); a test below asserts they match.

use crate::metadata_structs::Node;

/// The board that publishes a loop node's reading
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum Board {
    Vcu,
    Bms,
}

impl Board {
    /// The CAN node a Fault seen by this board is attributed to
    #[must_use]
    pub fn fault_node(self) -> Node {
        match self {
            Board::Vcu => Node::Vcu,
            Board::Bms => Node::Bms,
        }
    }

    /// The name used in Fault topics, matching how `Node` serializes
    #[must_use]
    pub const fn fault_segment(self) -> &'static str {
        match self {
            Board::Vcu => "Vcu",
            Board::Bms => "Bms",
        }
    }
}

/// One element of the series loop (a "loop node", not a CAN Node)
#[derive(Debug, PartialEq, Eq)]
pub struct LoopNode {
    /// Stable kebab-case id, as in the angular-client
    pub id: &'static str,
    /// Topic reading the loop voltage just after this node (1 = closed, 0 = open); `None` = unmeasured
    pub topic: Option<&'static str>,
    /// Board publishing `topic`; present iff `topic` is
    pub board: Option<Board>,
}

/// Not published by the car: derived from [`VCU_CRITICAL_FAULT_TOPICS`] (1 = all clear, 0 = any tripped)
pub const CAN_LATCH_TOPIC: &str = "VCU/Faults/Critical";

/// Critical VCU faults (CAN 0x502): 0 when clear, non-zero when tripped. Any tripped one opens the CAN latch.
pub const VCU_CRITICAL_FAULT_TOPICS: [&str; 5] = [
    "VCU/Faults/Critical/CAN_OUTGOING_FAULT",
    "VCU/Faults/Critical/CAN_INCOMING_FAULT",
    "VCU/Faults/Critical/BMS_CAN_MONITOR_FAULT",
    "VCU/Faults/Critical/LIGHTNING_CAN_MONITOR_FAULT",
    "VCU/Faults/Critical/PRECHARGE_FLOATING_FAULT",
];

const fn unmeasured(id: &'static str) -> LoopNode {
    LoopNode {
        id,
        topic: None,
        board: None,
    }
}

const fn measured(id: &'static str, topic: &'static str, board: Board) -> LoopNode {
    LoopNode {
        id,
        topic: Some(topic),
        board: Some(board),
    }
}

/// The shutdown loop in series order, from GLV source to the AIR coils
pub const SHUTDOWN_LOOP: &[LoopNode] = &[
    unmeasured("glvms"),
    unmeasured("side-brb-r"),
    unmeasured("side-brb-l"),
    measured("bms-latch", "VCU/Shutdown/BMS_GPIO", Board::Vcu),
    measured("imd-latch", "VCU/Shutdown/IMD_GPIO", Board::Vcu),
    measured("bspd-latch", "VCU/Shutdown/BSPD_GPIO", Board::Vcu),
    measured("can-latch", CAN_LATCH_TOPIC, Board::Vcu),
    measured("mc-hvil", "VCU/Shutdown/HV_C_GPIO", Board::Vcu),
    measured("bots", "VCU/Shutdown/BOTS_GPIO", Board::Vcu),
    measured("inertia", "VCU/Shutdown/INERTIA_SW_GPIO", Board::Vcu),
    measured("cockpit-brb", "VCU/Shutdown/CKPT_GPIO", Board::Vcu),
    measured("tsms", "VCU/Shutdown/TSMS_GPIO", Board::Vcu),
    measured("hvd", "VCU/Shutdown/HVD_GPIO", Board::Vcu),
    unmeasured("em-interlock"),
    measured("acc-sense", "BMS/Shutdown/Acc_Sense", Board::Bms),
    measured("tsip-sense", "BMS/Shutdown/TSIP_Sense", Board::Bms),
    measured("ts-minus", "BMS/Shutdown/TS_Minus_Sense", Board::Bms),
    measured("ts-plus", "BMS/Shutdown/TS_Plus_Sense", Board::Bms),
    unmeasured("airs"),
];

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use regex::Regex;
    use rustc_hash::FxHashMap;

    use super::*;

    fn read_client_file(name: &str) -> String {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../angular-client/src/pages/shutdown-page")
            .join(name);
        std::fs::read_to_string(&path).unwrap_or_else(|e| {
            panic!(
                "{} must exist to check the loop matches the angular-client: {e}",
                path.display()
            )
        })
    }

    /// `SHUTDOWN_TOPICS` from shutdown-page.topics.ts, keyed `VCU.TSMS` etc.
    fn client_topics(src: &str) -> FxHashMap<String, String> {
        let group = Regex::new(r"^\s*(VCU|BMS): \{").unwrap();
        let entry = Regex::new(r"^\s*(\w+): '([^']+)'").unwrap();
        let mut current = None;
        let mut topics = FxHashMap::default();
        for line in src.lines() {
            if let Some(c) = group.captures(line) {
                current = Some(c[1].to_string());
            } else if line.trim_start().starts_with('}') {
                current = None;
            } else if let (Some(g), Some(c)) = (&current, entry.captures(line)) {
                topics.insert(format!("{g}.{}", &c[1]), c[2].to_string());
            }
        }
        topics
    }

    #[test]
    fn matches_the_angular_client_loop() {
        let topics = client_topics(&read_client_file("shutdown-page.topics.ts"));
        let model = read_client_file("shutdown-loop.model.ts");
        let loop_src = &model[model.find("SHUTDOWN_LOOP").expect("SHUTDOWN_LOOP in model")..];
        let id = Regex::new(r"id: '([^']+)'").unwrap();
        let topic = Regex::new(r"topic: (VCU|BMS)\.(\w+)").unwrap();
        let board = Regex::new(r"board: '(VCU|BMS)'").unwrap();

        let starts: Vec<_> = id.captures_iter(loop_src).collect();
        let mut client = Vec::new();
        for (i, c) in starts.iter().enumerate() {
            let from = c.get(0).unwrap().start();
            let to = starts
                .get(i + 1)
                .map_or(loop_src.len(), |n| n.get(0).unwrap().start());
            let entry = &loop_src[from..to];
            let t = topic
                .captures(entry)
                .map(|t| topics[&format!("{}.{}", &t[1], &t[2])].clone());
            let b = board.captures(entry).map(|b| match &b[1] {
                "VCU" => Board::Vcu,
                _ => Board::Bms,
            });
            client.push((c[1].to_string(), t, b));
        }

        let server: Vec<_> = SHUTDOWN_LOOP
            .iter()
            .map(|n| (n.id.to_string(), n.topic.map(str::to_string), n.board))
            .collect();
        assert_eq!(
            server, client,
            "scylla's SHUTDOWN_LOOP must match the angular-client's"
        );
    }

    #[test]
    fn critical_faults_match_the_angular_client() {
        let src = read_client_file("shutdown-page.topics.ts");
        let block = &src[src
            .find("VCU_CRITICAL_FAULT_TOPICS")
            .expect("fault topics in client")..];
        let block = &block[..block.find("as const").unwrap()];
        let client: Vec<_> = Regex::new(r"'([^']+)'")
            .unwrap()
            .captures_iter(block)
            .map(|c| c[1].to_string())
            .collect();
        assert_eq!(VCU_CRITICAL_FAULT_TOPICS.to_vec(), client);
    }

    #[test]
    fn measured_nodes_have_a_board() {
        for node in SHUTDOWN_LOOP {
            assert_eq!(node.topic.is_some(), node.board.is_some(), "{}", node.id);
        }
    }
}
