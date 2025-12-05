use chrono::Utc;
use scylla_server::rule_structs::*;
use scylla_server::ClientData;
use tokio::task::JoinSet;

#[tokio::test]
async fn test_add_multiple_rules_same_client() -> Result<(), RuleManagerError> {
    let rule_manager = RuleManager::new();
    let client = ClientId("test_client".to_string());

    let rule1 = Rule::new(
        RuleId("rule_1".to_string()),
        Topic("test/topic1".to_string()),
        core::time::Duration::from_secs(60),
        "a > 10".to_owned(),
    );

    let rule2 = Rule::new(
        RuleId("rule_2".to_string()),
        Topic("test/topic2".to_string()),
        core::time::Duration::from_secs(30),
        "b < 5".to_owned(),
    );

    rule_manager.add_rule(client.clone(), rule1).await?;
    rule_manager.add_rule(client, rule2).await?;

    assert_eq!(rule_manager.get_all_rules().await.len(), 2);
    Ok(())
}

#[tokio::test]
async fn test_delete_rule_success() -> Result<(), RuleManagerError> {
    let rule_manager = RuleManager::new();
    let client = ClientId("test_client".to_string());
    let rule_id = RuleId("rule_1".to_string());

    let rule = Rule::new(
        rule_id.clone(),
        Topic("test/topic".to_string()),
        core::time::Duration::from_secs(60),
        "a > 10".to_owned(),
    );

    rule_manager.add_rule(client.clone(), rule).await?;
    assert_eq!(rule_manager.get_all_rules().await.len(), 1);

    rule_manager.delete_rule(client, rule_id).await?;
    assert_eq!(rule_manager.get_all_rules().await.len(), 1); // Rule still exists but client is unsubscribed

    Ok(())
}

#[tokio::test]
async fn test_delete_client_success() -> Result<(), RuleManagerError> {
    let rule_manager = RuleManager::new();
    let client = ClientId("test_client".to_string());

    let rule1 = Rule::new(
        RuleId("rule_1".to_string()),
        Topic("test/topic1".to_string()),
        core::time::Duration::from_secs(60),
        "a > 10".to_owned(),
    );

    let rule2 = Rule::new(
        RuleId("rule_2".to_string()),
        Topic("test/topic2".to_string()),
        core::time::Duration::from_secs(30),
        "b < 5".to_owned(),
    );

    rule_manager.add_rule(client.clone(), rule1).await?;
    rule_manager.add_rule(client.clone(), rule2).await?;
    assert_eq!(rule_manager.get_all_rules().await.len(), 2);
    assert_eq!(rule_manager.get_all_clients().await.len(), 1);

    rule_manager.delete_client(client).await?;
    assert!(rule_manager.get_all_clients().await.is_empty());
    assert_eq!(rule_manager.get_all_rules().await.len(), 2);

    Ok(())
}

#[tokio::test]
async fn test_handle_msg_no_matching_rule() {
    let rule_manager = RuleManager::new();

    let client_data = ClientData {
        run_id: 1,
        name: "nonexistent/topic".to_string(),
        unit: "test_unit".to_string(),
        values: vec![15.0, 20.0],
        timestamp: Utc::now(),
    };

    let result = rule_manager.handle_msg(&client_data).await;
    assert!(matches!(result, Err(RuleManagerError::NoMatchingRule)));
}

#[tokio::test]
async fn test_handle_msg_rule_triggered() -> Result<(), RuleManagerError> {
    let rule_manager = RuleManager::new();
    let client = ClientId("test_client".to_string());

    let rule = Rule::new(
        RuleId("rule_1".to_string()),
        Topic("test/topic".to_string()),
        core::time::Duration::from_secs(1),
        "a > 10".to_owned(), // First value (a) should be > 10
    );

    rule_manager.add_rule(client.clone(), rule).await?;

    let client_data = ClientData {
        run_id: 1,
        name: "test/topic".to_string(),
        unit: "test_unit".to_string(),
        values: vec![15.0], // a = 15.0 > 10, should trigger
        timestamp: Utc::now(),
    };

    // First trigger might not fire due to debounce logic
    let empty_notifications = rule_manager.handle_msg(&client_data).await;
    assert!(empty_notifications.is_ok_and(|op| op.is_none()));

    // Wait for debounce time
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    let result = rule_manager.handle_msg(&client_data).await?;

    let notifications = result.unwrap();
    assert!(!notifications.is_empty());
    assert_eq!(notifications[0].0 .0, client.0);
    assert_eq!(notifications[0].1.topic.0, "test/topic");

    Ok(())
}

#[tokio::test]
async fn test_handle_msg_multiple_clients_same_rule() -> Result<(), RuleManagerError> {
    let rule_manager = RuleManager::new();
    let client1 = ClientId("client1".to_string());
    let client2 = ClientId("client2".to_string());

    let rule1 = Rule::new(
        RuleId("rule_1".to_string()),
        Topic("shared/topic".to_string()),
        core::time::Duration::from_millis(100),
        "a > 10".to_owned(),
    );

    let rule2 = Rule::new(
        RuleId("rule_2".to_string()),
        Topic("shared/topic".to_string()),
        core::time::Duration::from_millis(100),
        "a > 5".to_owned(), // Different condition but same topic
    );

    rule_manager.add_rule(client1.clone(), rule1).await?;
    rule_manager.add_rule(client2.clone(), rule2).await?;

    let client_data = ClientData {
        run_id: 1,
        name: "shared/topic".to_string(),
        unit: "test_unit".to_string(),
        values: vec![15.0],
        timestamp: Utc::now(),
    };

    // First trigger to start debounce timers
    let empty = rule_manager.handle_msg(&client_data).await;
    assert!(empty.is_ok_and(|op| op.is_none()));

    // Wait for debounce
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

    let result = rule_manager.handle_msg(&client_data).await?;

    if let Some(notifications) = result {
        // Both rules should trigger since 15.0 > 10 and 15.0 > 5
        assert!(notifications.len() >= 1);

        let client_ids: Vec<_> = notifications.iter().map(|(id, _)| id.clone()).collect();
        assert!(client_ids.contains(&client1) && client_ids.contains(&client2));
    }

    Ok(())
}

fn check_rules_present(rules: Vec<Rule>, prefix: &str, k: usize) {
    assert_eq!(rules.len(), k);
    let topics = rules.into_iter().map(|r| r.topic.0).collect::<Vec<_>>();
    assert!((0..k).all(|i| topics.contains(&format!("{}{}", prefix, i))));
}

fn check_clients_present(clients: Vec<ClientId>, prefix: &str, k: usize) {
    assert_eq!(clients.len(), k);
    let client_strings = clients.into_iter().map(|c| c.0).collect::<Vec<_>>();
    assert!((0..k).all(|i| client_strings.contains(&format!("{}{}", prefix, i))));
}

#[tokio::test]
async fn test_rule_manager_concurrent_add_rule() -> Result<(), RuleManagerError> {
    let num_rules = 10;
    let rule_manager = std::sync::Arc::new(RuleManager::new());

    (0..num_rules)
        .fold(JoinSet::new(), |mut set, i| {
            let rm = rule_manager.clone();
            set.spawn(async move {
                let client = ClientId(format!("client_{}", i));
                let rule = Rule::new(
                    RuleId(format!("rule_{}", i)),
                    Topic(format!("topic/{}", i)),
                    core::time::Duration::from_secs(60),
                    "a > 5".to_owned(),
                );

                rm.add_rule(client, rule).await.unwrap();
            });
            set
        })
        .join_all()
        .await;

    let clients = rule_manager.get_all_clients().await;
    check_clients_present(clients, "client_", num_rules);

    let rules = rule_manager.get_all_rules().await;
    check_rules_present(rules, "topic/", num_rules);

    Ok(())
}

#[tokio::test]
async fn test_rule_manager_concurrent_delete_rule() -> Result<(), RuleManagerError> {
    let num_rules = 10;
    let rule_manager = std::sync::Arc::new(RuleManager::new());

    (0..num_rules)
        .fold(JoinSet::new(), |mut set, i| {
            let rm = rule_manager.clone();
            set.spawn(async move {
                let client = ClientId(format!("client_{}", i));
                let rule = Rule::new(
                    RuleId(format!("rule_{}", i)),
                    Topic(format!("topic/{}", i)),
                    core::time::Duration::from_secs(60),
                    "a > 5".to_owned(),
                );

                rm.add_rule(client, rule).await.unwrap();
            });
            set
        })
        .join_all()
        .await;

    check_clients_present(rule_manager.get_all_clients().await, "client_", num_rules);
    check_rules_present(rule_manager.get_all_rules().await, "topic/", num_rules);

    let f = async || {
        (0..10)
            .fold(JoinSet::new(), |mut set, i| {
                let rm = rule_manager.clone();
                set.spawn(async move {
                    let client = ClientId(format!("client_{}", i));
                    let rule_id = RuleId(format!("rule_{}", i));
                    rm.delete_rule(client, rule_id).await
                });
                set
            })
            .join_all()
            .await
    };

    // Deleting rules from calling client side code doesn't actually remove rules
    let res = f().await;
    assert!(res.into_iter().all(|e| e.is_ok()));
    check_rules_present(rule_manager.get_all_rules().await, "topic/", num_rules);
    assert!(rule_manager.get_all_clients().await.is_empty());

    // Deleting again will result in NoSuchClient errors
    let res = f().await;
    assert!(res.into_iter().all(|e| e.is_err()));
    check_rules_present(rule_manager.get_all_rules().await, "topic/", num_rules);
    assert!(rule_manager.get_all_clients().await.is_empty());

    Ok(())
}

#[tokio::test]
async fn test_concurrent_topic_index_stress() -> Result<(), RuleManagerError> {
    let num_topics = 20;
    let num_rules_per_topic = 5;
    let rule_manager = std::sync::Arc::new(RuleManager::new());

    // Create multiple rules for the same topics concurrently
    let results: Vec<_> = (0..num_topics)
        .flat_map(|topic_idx| (0..num_rules_per_topic).map(move |rule_idx| (topic_idx, rule_idx)))
        .fold(JoinSet::new(), |mut set, (topic_idx, rule_idx)| {
            let rm = rule_manager.clone();
            set.spawn(async move {
                let client = ClientId(format!("topic_client_{}_{}", topic_idx, rule_idx));
                let rule = Rule::new(
                    RuleId(format!("topic_rule_{}_{}", topic_idx, rule_idx)),
                    Topic(format!("topic/{}", topic_idx)),
                    core::time::Duration::from_millis(50),
                    format!("a > {}", rule_idx),
                );
                rm.add_rule(client.clone(), rule)
                    .await
                    .map(|_| (topic_idx, rule_idx, client))
            });
            set
        })
        .join_all()
        .await;

    // Verify all operations succeeded
    let successful_adds: Vec<_> = results.into_iter().filter_map(|r| r.ok()).collect();
    let total_expected = num_topics * num_rules_per_topic;
    assert_eq!(successful_adds.len(), total_expected);

    // Verify final counts
    assert_eq!(rule_manager.get_all_rules().await.len(), total_expected);
    assert_eq!(rule_manager.get_all_clients().await.len(), total_expected);

    // Verify topic distribution
    let all_rules = rule_manager.get_all_rules().await;
    let mut topic_counts = std::collections::HashMap::new();
    for rule in all_rules {
        *topic_counts.entry(rule.topic.0).or_insert(0) += 1;
    }

    assert_eq!(topic_counts.len(), num_topics);
    for i in 0..num_topics {
        let topic_name = format!("topic/{}", i);
        assert_eq!(topic_counts[&topic_name], num_rules_per_topic);
    }

    // Test that all topics can handle messages concurrently
    let message_results: Vec<_> = (0..num_topics)
        .fold(JoinSet::new(), |mut set, topic_idx| {
            let rm = rule_manager.clone();
            set.spawn(async move {
                let client_data = ClientData {
                    run_id: 1,
                    name: format!("topic/{}", topic_idx),
                    unit: "test".to_string(),
                    values: vec![10.0], // Should trigger rules with threshold < 10
                    timestamp: Utc::now(),
                };
                rm.handle_msg(&client_data)
                    .await
                    .map(|result| (topic_idx, result))
            });
            set
        })
        .join_all()
        .await;

    // Verify all messages were processed
    let successful_messages: Vec<_> = message_results.into_iter().filter_map(|r| r.ok()).collect();
    assert_eq!(successful_messages.len(), num_topics);

    // Wait for debounce and try again
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    let second_round_results: Vec<_> = (0..num_topics)
        .fold(JoinSet::new(), |mut set, topic_idx| {
            let rm = rule_manager.clone();
            set.spawn(async move {
                let client_data = ClientData {
                    run_id: 1,
                    name: format!("topic/{}", topic_idx),
                    unit: "test".to_string(),
                    values: vec![10.0],
                    timestamp: Utc::now(),
                };
                rm.handle_msg(&client_data).await
            });
            set
        })
        .join_all()
        .await;

    // Count total notifications from second round (should have some due to debounce completion)
    let total_notifications: usize = second_round_results
        .iter()
        .filter_map(|r| r.as_ref().ok())
        .map(|result| result.as_ref().map(|n| n.len()).unwrap_or(0))
        .sum();

    // Should have triggered some rules (those with threshold < 10)
    // Each topic has rules with thresholds 0,1,2,3,4 so value 10.0 should trigger all of them
    assert!(total_notifications > 0);
    println!(
        "Total notifications in second round: {}",
        total_notifications
    );

    Ok(())
}

#[tokio::test]
async fn test_concurrent_high_frequency_messages() -> Result<(), RuleManagerError> {
    let rule_manager = std::sync::Arc::new(RuleManager::new());

    // Set up multiple rules that will receive high-frequency messages
    let num_rules = 5;
    for i in 0..num_rules {
        let client = ClientId(format!("high_freq_client_{}", i));
        let rule = Rule::new(
            RuleId(format!("high_freq_rule_{}", i)),
            Topic("high_freq/topic".to_string()),
            core::time::Duration::from_millis(50),
            format!("a > {}", i * 10), // Thresholds: 0, 10, 20, 30, 40
        );
        rule_manager.add_rule(client, rule).await?;
    }

    // Verify setup
    assert_eq!(rule_manager.get_all_rules().await.len(), num_rules);
    assert_eq!(rule_manager.get_all_clients().await.len(), num_rules);

    let messages_per_task = 20;
    let num_tasks = 10;
    let total_messages = messages_per_task * num_tasks;

    // Send high-frequency messages from multiple tasks
    let results: Vec<_> = (0..num_tasks)
        .fold(JoinSet::new(), |mut set, task_id| {
            let rm = rule_manager.clone();
            set.spawn(async move {
                let mut task_results = Vec::new();
                for msg_id in 0..messages_per_task {
                    let value = (task_id * messages_per_task + msg_id) as f32 % 100.0;
                    let client_data = ClientData {
                        run_id: task_id as i32,
                        name: "high_freq/topic".to_string(),
                        unit: "test".to_string(),
                        values: vec![value],
                        timestamp: Utc::now(),
                    };

                    let result = rm.handle_msg(&client_data).await;
                    task_results.push((msg_id, value, result));

                    // Small delay to simulate realistic message timing
                    if msg_id % 5 == 0 {
                        tokio::task::yield_now().await;
                    }
                }
                (task_id, task_results)
            });
            set
        })
        .join_all()
        .await;

    // Verify all tasks completed
    assert_eq!(results.len(), num_tasks);

    // Flatten and verify all message results
    let all_message_results: Vec<_> = results
        .into_iter()
        .flat_map(|(task_id, task_results)| {
            task_results
                .into_iter()
                .map(move |(msg_id, value, result)| (task_id, msg_id, value, result))
        })
        .collect();

    assert_eq!(all_message_results.len(), total_messages);

    // Verify all messages were processed successfully
    let successful_messages: Vec<_> = all_message_results
        .iter()
        .filter(|(_, _, _, result)| result.is_ok())
        .collect();
    assert_eq!(successful_messages.len(), total_messages);

    println!(
        "Successfully processed {} high-frequency messages",
        total_messages
    );

    // Wait for any pending debounce timers
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Send final test messages with known values that should trigger specific rules
    let test_values = vec![5.0, 15.0, 25.0, 35.0, 45.0]; // Should trigger different numbers of rules
    let final_results: Vec<_> = test_values
        .into_iter()
        .fold(JoinSet::new(), |mut set, value| {
            let rm = rule_manager.clone();
            set.spawn(async move {
                let client_data = ClientData {
                    run_id: 999,
                    name: "high_freq/topic".to_string(),
                    unit: "test".to_string(),
                    values: vec![value],
                    timestamp: Utc::now(),
                };

                // Wait for debounce
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                let result = rm.handle_msg(&client_data).await;
                (value, result)
            });
            set
        })
        .join_all()
        .await;

    // Verify final test results
    assert_eq!(final_results.len(), 5);

    for (value, result) in final_results {
        assert!(
            result.is_ok(),
            "Failed to process message with value {}",
            value
        );

        if let Ok(Some(notifications)) = result {
            // Count how many rules should trigger for this value
            let expected_triggers = num_rules - (value as usize / 10).min(num_rules);
            if expected_triggers > 0 {
                assert!(
                    !notifications.is_empty(),
                    "Value {} should have triggered some rules",
                    value
                );
                assert!(
                    notifications.len() <= expected_triggers,
                    "Value {} triggered {} rules, expected at most {}",
                    value,
                    notifications.len(),
                    expected_triggers
                );

                // Verify notification structure
                for (client_id, notification) in notifications {
                    assert!(client_id.0.starts_with("high_freq_client_"));
                    assert_eq!(notification.topic.0, "high_freq/topic");
                    assert_eq!(notification.values, vec![value]);
                }
            }
        }
    }

    // Verify system state is unchanged
    assert_eq!(rule_manager.get_all_rules().await.len(), num_rules);
    assert_eq!(rule_manager.get_all_clients().await.len(), num_rules);

    Ok(())
}
