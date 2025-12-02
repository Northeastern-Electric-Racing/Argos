use scylla_server::rule_structs::{BiMapRemoveResult, BiMultiMap, ClientId, RuleId};

// Tests for BiMultiMap
#[test]
fn test_bi_multi_map_new() {
    let bimap: BiMultiMap<String, i32> = BiMultiMap::new();
    assert!(bimap.get_left(&1).is_none());
    assert!(bimap.get_right(&"test".to_string()).is_none());
}

#[test]
fn test_bi_multi_map_insert_single() {
    let mut bimap = BiMultiMap::new();
    let left = "client1".to_string();
    let right = 42;

    bimap.insert(&left, &right);

    assert_eq!(bimap.get_right(&left).unwrap().len(), 1);
    assert!(bimap.get_right(&left).unwrap().contains(&right));

    assert_eq!(bimap.get_left(&right).unwrap().len(), 1);
    assert!(bimap.get_left(&right).unwrap().contains(&left));
}

#[test]
fn test_bi_multi_map_insert_multiple_rights() {
    let mut bimap = BiMultiMap::new();
    let left = "client1".to_string();
    let right1 = 42;
    let right2 = 43;
    let right3 = 44;

    bimap.insert(&left, &right1);
    bimap.insert(&left, &right2);
    bimap.insert(&left, &right3);

    let rights = bimap.get_right(&left).unwrap();
    assert_eq!(rights.len(), 3);
    assert!(rights.contains(&right1));
    assert!(rights.contains(&right2));
    assert!(rights.contains(&right3));

    // Each right should map back to the left
    assert!(bimap.get_left(&right1).unwrap().contains(&left));
    assert!(bimap.get_left(&right2).unwrap().contains(&left));
    assert!(bimap.get_left(&right3).unwrap().contains(&left));
}

#[test]
fn test_bi_multi_map_insert_multiple_lefts() {
    let mut bimap = BiMultiMap::new();
    let left1 = "client1".to_string();
    let left2 = "client2".to_string();
    let left3 = "client3".to_string();
    let right = 42;

    bimap.insert(&left1, &right);
    bimap.insert(&left2, &right);
    bimap.insert(&left3, &right);

    let lefts = bimap.get_left(&right).unwrap();
    assert_eq!(lefts.len(), 3);
    assert!(lefts.contains(&left1));
    assert!(lefts.contains(&left2));
    assert!(lefts.contains(&left3));

    // Each left should map to the right
    assert!(bimap.get_right(&left1).unwrap().contains(&right));
    assert!(bimap.get_right(&left2).unwrap().contains(&right));
    assert!(bimap.get_right(&left3).unwrap().contains(&right));
}

#[test]
fn test_bi_multi_map_insert_many_to_many() {
    let mut bimap = BiMultiMap::new();
    let left1 = "client1".to_string();
    let left2 = "client2".to_string();
    let right1 = 42;
    let right2 = 43;

    // Create many-to-many relationships
    bimap.insert(&left1, &right1);
    bimap.insert(&left1, &right2);
    bimap.insert(&left2, &right1);
    bimap.insert(&left2, &right2);

    // Verify left1 maps to both rights
    let rights_for_left1 = bimap.get_right(&left1).unwrap();
    assert_eq!(rights_for_left1.len(), 2);
    assert!(rights_for_left1.contains(&right1));
    assert!(rights_for_left1.contains(&right2));

    // Verify left2 maps to both rights
    let rights_for_left2 = bimap.get_right(&left2).unwrap();
    assert_eq!(rights_for_left2.len(), 2);
    assert!(rights_for_left2.contains(&right1));
    assert!(rights_for_left2.contains(&right2));

    // Verify right1 maps to both lefts
    let lefts_for_right1 = bimap.get_left(&right1).unwrap();
    assert_eq!(lefts_for_right1.len(), 2);
    assert!(lefts_for_right1.contains(&left1));
    assert!(lefts_for_right1.contains(&left2));

    // Verify right2 maps to both lefts
    let lefts_for_right2 = bimap.get_left(&right2).unwrap();
    assert_eq!(lefts_for_right2.len(), 2);
    assert!(lefts_for_right2.contains(&left1));
    assert!(lefts_for_right2.contains(&left2));
}

#[test]
fn test_bi_multi_map_insert_duplicate() {
    let mut bimap = BiMultiMap::new();
    let left = "client1".to_string();
    let right = 42;

    bimap.insert(&left, &right);
    bimap.insert(&left, &right); // Duplicate insertion

    // Should still only have one mapping
    assert_eq!(bimap.get_right(&left).unwrap().len(), 1);
    assert_eq!(bimap.get_left(&right).unwrap().len(), 1);
}

#[test]
fn test_bi_multi_map_remove_left_single() {
    let mut bimap = BiMultiMap::new();
    let left = "client1".to_string();
    let right = 42;

    bimap.insert(&left, &right);

    let result = bimap.remove_left(&left);
    assert!(matches!(result, BiMapRemoveResult::RemovedWithCleanUp(_)));

    if let BiMapRemoveResult::RemovedWithCleanUp(removed_rights) = result {
        assert_eq!(removed_rights.len(), 1);
        assert!(removed_rights.contains(&right));
    }

    // Verify both directions are cleaned up
    assert!(bimap.get_right(&left).is_none());
    assert!(bimap.get_left(&right).is_none());
}

#[test]
fn test_bi_multi_map_remove_left_shared_right() {
    let mut bimap = BiMultiMap::new();
    let left1 = "client1".to_string();
    let left2 = "client2".to_string();
    let right = 42;

    bimap.insert(&left1, &right);
    bimap.insert(&left2, &right);

    let result = bimap.remove_left(&left1);
    assert!(matches!(result, BiMapRemoveResult::RemovedOnly));

    // left1 should be gone
    assert!(bimap.get_right(&left1).is_none());

    // right should still exist and map to left2
    let remaining_lefts = bimap.get_left(&right).unwrap();
    assert_eq!(remaining_lefts.len(), 1);
    assert!(remaining_lefts.contains(&left2));

    // left2 should still map to right
    assert!(bimap.get_right(&left2).unwrap().contains(&right));
}

#[test]
fn test_bi_multi_map_remove_left_nonexistent() {
    let mut bimap: BiMultiMap<String, i32> = BiMultiMap::new();
    let left = "nonexistent".to_string();

    let result = bimap.remove_left(&left);
    assert!(matches!(result, BiMapRemoveResult::NothingToRemove));
}

#[test]
fn test_bi_multi_map_remove_right_single() {
    let mut bimap = BiMultiMap::new();
    let left = "client1".to_string();
    let right = 42;

    bimap.insert(&left, &right);

    let result = bimap.remove_right(&right);
    assert!(matches!(result, BiMapRemoveResult::RemovedWithCleanUp(_)));

    if let BiMapRemoveResult::RemovedWithCleanUp(removed_lefts) = result {
        assert_eq!(removed_lefts.len(), 1);
        assert!(removed_lefts.contains(&left));
    }

    // Verify both directions are cleaned up
    assert!(bimap.get_right(&left).is_none());
    assert!(bimap.get_left(&right).is_none());
}

#[test]
fn test_bi_multi_map_remove_right_shared_left() {
    let mut bimap = BiMultiMap::new();
    let left = "client1".to_string();
    let right1 = 42;
    let right2 = 43;

    bimap.insert(&left, &right1);
    bimap.insert(&left, &right2);

    let result = bimap.remove_right(&right1);
    assert!(matches!(result, BiMapRemoveResult::RemovedOnly));

    // right1 should be gone
    assert!(bimap.get_left(&right1).is_none());

    // left should still exist and map to right2
    let remaining_rights = bimap.get_right(&left).unwrap();
    assert_eq!(remaining_rights.len(), 1);
    assert!(remaining_rights.contains(&right2));

    // right2 should still map to left
    assert!(bimap.get_left(&right2).unwrap().contains(&left));
}

#[test]
fn test_bi_multi_map_remove_right_from_left() {
    let mut bimap = BiMultiMap::new();
    let left = "client1".to_string();
    let right1 = 42;
    let right2 = 43;

    bimap.insert(&left, &right1);
    bimap.insert(&left, &right2);

    let result = bimap.remove_right_from_left(&left, &right1);
    assert!(matches!(result, BiMapRemoveResult::RemovedWithCleanUp(_)));

    if let BiMapRemoveResult::RemovedWithCleanUp(removed_right) = result {
        assert_eq!(removed_right, right1);
    }

    // left should still exist but only map to right2
    let remaining_rights = bimap.get_right(&left).unwrap();
    assert_eq!(remaining_rights.len(), 1);
    assert!(remaining_rights.contains(&right2));

    // right1 should be completely removed
    assert!(bimap.get_left(&right1).is_none());

    // right2 should still map to left
    assert!(bimap.get_left(&right2).unwrap().contains(&left));
}

#[test]
fn test_bi_multi_map_remove_right_from_left_shared_right() {
    let mut bimap = BiMultiMap::new();
    let left1 = "client1".to_string();
    let left2 = "client2".to_string();
    let right = 42;

    bimap.insert(&left1, &right);
    bimap.insert(&left2, &right);

    let result = bimap.remove_right_from_left(&left1, &right);
    assert!(matches!(result, BiMapRemoveResult::RemovedOnly));

    // left1 should be gone
    assert!(bimap.get_right(&left1).is_none());

    // right should still exist and map to left2
    let remaining_lefts = bimap.get_left(&right).unwrap();
    assert_eq!(remaining_lefts.len(), 1);
    assert!(remaining_lefts.contains(&left2));
}

#[test]
fn test_bi_multi_map_remove_right_from_left_nonexistent() {
    let mut bimap: BiMultiMap<String, i32> = BiMultiMap::new();
    let left = "client1".to_string();
    let right = 42;

    let result = bimap.remove_right_from_left(&left, &right);
    assert!(matches!(result, BiMapRemoveResult::NothingToRemove));
}

#[test]
fn test_bi_multi_map_remove_left_from_right() {
    let mut bimap = BiMultiMap::new();
    let left1 = "client1".to_string();
    let left2 = "client2".to_string();
    let right = 42;

    bimap.insert(&left1, &right);
    bimap.insert(&left2, &right);

    let result = bimap.remove_left_from_right(&right, &left1);
    assert!(matches!(result, BiMapRemoveResult::RemovedWithCleanUp(_)));

    if let BiMapRemoveResult::RemovedWithCleanUp(removed_left) = result {
        assert_eq!(removed_left, left1);
    }

    // right should still exist but only map to left2
    let remaining_lefts = bimap.get_left(&right).unwrap();
    assert_eq!(remaining_lefts.len(), 1);
    assert!(remaining_lefts.contains(&left2));

    // left1 should be completely removed
    assert!(bimap.get_right(&left1).is_none());

    // left2 should still map to right
    assert!(bimap.get_right(&left2).unwrap().contains(&right));
}

#[test]
fn test_bi_multi_map_complex_operations() {
    let mut bimap = BiMultiMap::new();

    // Set up a complex mapping
    bimap.insert(&"client1", &"rule1");
    bimap.insert(&"client1", &"rule2");
    bimap.insert(&"client2", &"rule1");
    bimap.insert(&"client2", &"rule3");
    bimap.insert(&"client3", &"rule3");

    // Remove a shared rule from one client
    let result = bimap.remove_right_from_left(&"client1", &"rule1");
    assert!(matches!(result, BiMapRemoveResult::RemovedOnly));

    // Verify rule1 still exists for client2
    assert!(bimap.get_right(&"client2").unwrap().contains(&"rule1"));

    // Verify client1 still has rule2
    assert!(bimap.get_right(&"client1").unwrap().contains(&"rule2"));
    assert!(!bimap.get_right(&"client1").unwrap().contains(&"rule1"));

    // Remove client2 entirely
    let result = bimap.remove_left(&"client2");
    assert!(matches!(result, BiMapRemoveResult::RemovedWithCleanUp(_)));

    if let BiMapRemoveResult::RemovedWithCleanUp(removed_rights) = result {
        assert_eq!(removed_rights.len(), 1);
        assert!(removed_rights.contains(&"rule1")); // rule1 should be cleaned up
    }

    // rule3 should still exist for client3
    assert!(bimap.get_left(&"rule3").unwrap().contains(&"client3"));

    // rule1 should be completely gone
    assert!(bimap.get_left(&"rule1").is_none());
}

#[test]
fn test_bi_multi_map_with_rule_manager_types() {
    let mut bimap: BiMultiMap<ClientId, RuleId> = BiMultiMap::new();

    let client1 = ClientId("client1".to_string());
    let client2 = ClientId("client2".to_string());
    let rule1 = RuleId("rule1".to_string());
    let rule2 = RuleId("rule2".to_string());

    bimap.insert(&client1, &rule1);
    bimap.insert(&client1, &rule2);
    bimap.insert(&client2, &rule1);

    // Test with actual types used in RuleManager
    assert_eq!(bimap.get_right(&client1).unwrap().len(), 2);
    assert_eq!(bimap.get_left(&rule1).unwrap().len(), 2);

    let result = bimap.remove_left(&client1);
    assert!(matches!(result, BiMapRemoveResult::RemovedWithCleanUp(_)));

    if let BiMapRemoveResult::RemovedWithCleanUp(removed_rules) = result {
        assert_eq!(removed_rules.len(), 1);
        assert!(removed_rules.contains(&rule2)); // rule2 should be cleaned up
    }

    // rule1 should still exist for client2
    assert!(bimap.get_left(&rule1).unwrap().contains(&client2));
}
