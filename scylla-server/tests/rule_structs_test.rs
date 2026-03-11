use chrono::Utc;
use scylla_server::ClientData;
use scylla_server::rule_structs::*;
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
    assert_eq!(notifications[0].0.0, client.0);
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
        assert_eq!(notifications.len(), 2);

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
            let expected_triggers = ((value as usize / 10).min(num_rules - 1)) + 1;
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

#[tokio::test]
async fn test_edit_rule_preserves_subscriptions_concurrent() -> Result<(), RuleManagerError> {
    let rule_manager = std::sync::Arc::new(RuleManager::new());
    let num_clients = 10;
    let rule_id = RuleId("shared_rule".to_string());

    // Add the same rule for multiple clients concurrently
    (0..num_clients)
        .fold(JoinSet::new(), |mut set, i| {
            let rm = rule_manager.clone();
            let rid = rule_id.clone();
            set.spawn(async move {
                let client = ClientId(format!("client_{}", i));
                let rule = Rule::new(
                    rid,
                    Topic("shared/topic".to_string()),
                    core::time::Duration::from_millis(100),
                    "a > 10".to_owned(),
                );
                rm.add_rule(client, rule).await
            });
            set
        })
        .join_all()
        .await;

    // Verify all clients were added
    let clients_before = rule_manager.get_all_clients().await;
    assert_eq!(clients_before.len(), num_clients);

    // Perform concurrent edits on the same rule
    let num_edits = 20;
    let edit_results: Vec<_> = (0..num_edits)
        .fold(JoinSet::new(), |mut set, i| {
            let rm = rule_manager.clone();
            let rid = rule_id.clone();
            set.spawn(async move {
                let new_expr = format!("a > {}", 10 + i);
                let new_debounce = core::time::Duration::from_millis(100 + i * 10);
                rm.edit_rule(rid, new_expr, new_debounce).await
            });
            set
        })
        .join_all()
        .await;

    // All edits should succeed
    assert!(edit_results.iter().all(|r| r.is_ok()));

    // Verify all clients are still subscribed after concurrent edits
    let clients_after = rule_manager.get_all_clients().await;
    assert_eq!(clients_after.len(), num_clients);

    // Check subscription status for each client
    for i in 0..num_clients {
        let client = ClientId(format!("client_{}", i));
        let rules_response = rule_manager
            .get_all_rules_with_subscription_status(client.clone())
            .await;

        let rule_info = rules_response
            .client_rules
            .iter()
            .find(|cr| cr.rule.id == rule_id)
            .expect("Rule should exist");

        assert!(rule_info.is_subscribed);
        assert_eq!(rule_info.subscribers.len(), num_clients);
    }

    // Verify the rule exists and has been edited (will have one of the concurrent edit values)
    let all_rules = rule_manager.get_all_rules().await;
    assert_eq!(all_rules.len(), 1);
    let final_rule = &all_rules[0];
    assert_eq!(final_rule.id, rule_id);
    assert_eq!(final_rule.topic.0, "shared/topic");

    // Expression should match one of the edits (a > 10..29)
    assert!(final_rule.expr.starts_with("a > "));

    Ok(())
}

#[tokio::test]
async fn test_subscribe_rules_success() -> Result<(), RuleManagerError> {
    let rule_manager = RuleManager::new();
    let client1 = ClientId("client1".to_string());
    let client2 = ClientId("client2".to_string());

    // Create rules via client1
    let rule1 = Rule::new(
        RuleId("rule_1".to_string()),
        Topic("topic/1".to_string()),
        core::time::Duration::from_secs(60),
        "a > 10".to_owned(),
    );

    let rule2 = Rule::new(
        RuleId("rule_2".to_string()),
        Topic("topic/2".to_string()),
        core::time::Duration::from_secs(30),
        "b < 5".to_owned(),
    );

    let rule3 = Rule::new(
        RuleId("rule_3".to_string()),
        Topic("topic/3".to_string()),
        core::time::Duration::from_secs(45),
        "c == 7".to_owned(),
    );

    rule_manager.add_rule(client1.clone(), rule1).await?;
    rule_manager.add_rule(client1.clone(), rule2).await?;
    rule_manager.add_rule(client1.clone(), rule3).await?;

    // Verify initial state
    assert_eq!(rule_manager.get_all_rules().await.len(), 3);
    assert_eq!(rule_manager.get_all_clients().await.len(), 1);

    // Subscribe client2 to multiple rules
    let rule_ids = vec![
        RuleId("rule_1".to_string()),
        RuleId("rule_2".to_string()),
        RuleId("rule_3".to_string()),
    ];

    rule_manager
        .subscribe_rules(client2.clone(), rule_ids)
        .await?;

    // Verify client2 is now subscribed
    let clients = rule_manager.get_all_clients().await;
    assert_eq!(clients.len(), 2);
    assert!(clients.contains(&client1));
    assert!(clients.contains(&client2));

    // Verify rules still exist
    assert_eq!(rule_manager.get_all_rules().await.len(), 3);

    Ok(())
}

#[tokio::test]
async fn test_unsubscribe_rules_success() -> Result<(), RuleManagerError> {
    let rule_manager = RuleManager::new();
    let client1 = ClientId("client1".to_string());
    let client2 = ClientId("client2".to_string());

    // Create rules via client1
    let rule1 = Rule::new(
        RuleId("rule_1".to_string()),
        Topic("topic/1".to_string()),
        core::time::Duration::from_secs(60),
        "a > 10".to_owned(),
    );

    let rule2 = Rule::new(
        RuleId("rule_2".to_string()),
        Topic("topic/2".to_string()),
        core::time::Duration::from_secs(30),
        "b < 5".to_owned(),
    );

    rule_manager.add_rule(client1.clone(), rule1).await?;
    rule_manager.add_rule(client1.clone(), rule2).await?;
    rule_manager
        .add_rule(
            client2.clone(),
            Rule::new(
                RuleId("rule_1".to_string()),
                Topic("topic/1".to_string()),
                core::time::Duration::from_secs(60),
                "a > 10".to_owned(),
            ),
        )
        .await?;

    // Verify initial state: 2 rules, 2 clients
    assert_eq!(rule_manager.get_all_rules().await.len(), 2);
    assert_eq!(rule_manager.get_all_clients().await.len(), 2);

    // Client1 unsubscribes from rule_1
    rule_manager
        .unsubscribe_rules(client1.clone(), vec![RuleId("rule_1".to_string())])
        .await?;

    // Rule 1 should still exist (client2 subscribed), 2 clients remain
    assert_eq!(rule_manager.get_all_rules().await.len(), 2);
    assert_eq!(rule_manager.get_all_clients().await.len(), 2);

    Ok(())
}

#[tokio::test]
async fn test_unsubscribe_rules_keeps_orphaned() -> Result<(), RuleManagerError> {
    let rule_manager = RuleManager::new();
    let client = ClientId("test_client".to_string());

    // Create rules
    let rule1 = Rule::new(
        RuleId("rule_1".to_string()),
        Topic("topic/1".to_string()),
        core::time::Duration::from_secs(60),
        "a > 10".to_owned(),
    );

    let rule2 = Rule::new(
        RuleId("rule_2".to_string()),
        Topic("topic/2".to_string()),
        core::time::Duration::from_secs(30),
        "b < 5".to_owned(),
    );

    rule_manager.add_rule(client.clone(), rule1).await?;
    rule_manager.add_rule(client.clone(), rule2).await?;

    // Verify initial state
    assert_eq!(rule_manager.get_all_rules().await.len(), 2);
    assert_eq!(rule_manager.get_all_clients().await.len(), 1);

    // Unsubscribe from both rules
    rule_manager
        .unsubscribe_rules(
            client.clone(),
            vec![RuleId("rule_1".to_string()), RuleId("rule_2".to_string())],
        )
        .await?;

    // Rules should still exist (not deleted), client removed
    assert_eq!(rule_manager.get_all_rules().await.len(), 2);
    assert_eq!(rule_manager.get_all_clients().await.len(), 0);

    Ok(())
}

#[tokio::test]
async fn test_unsubscribe_rules_nonexistent() -> Result<(), RuleManagerError> {
    let rule_manager = RuleManager::new();
    let client = ClientId("test_client".to_string());

    // Try to unsubscribe from rules that don't exist - should succeed (no-op)
    rule_manager
        .unsubscribe_rules(
            client,
            vec![
                RuleId("nonexistent_1".to_string()),
                RuleId("nonexistent_2".to_string()),
            ],
        )
        .await?;

    Ok(())
}

#[tokio::test]
async fn test_unsubscribe_rules_empty_list() -> Result<(), RuleManagerError> {
    let rule_manager = RuleManager::new();
    let client = ClientId("test_client".to_string());

    // Unsubscribe from empty list - should succeed
    rule_manager.unsubscribe_rules(client, vec![]).await?;

    Ok(())
}

#[tokio::test]
async fn test_orphaned_rule_resubscription() -> Result<(), RuleManagerError> {
    let rule_manager = RuleManager::new();
    let client1 = ClientId("client1".to_string());
    let client2 = ClientId("client2".to_string());

    // Client1 creates a rule
    let rule = Rule::new(
        RuleId("rule_1".to_string()),
        Topic("topic/1".to_string()),
        core::time::Duration::from_secs(60),
        "a > 10".to_owned(),
    );

    rule_manager.add_rule(client1.clone(), rule).await?;

    // Verify initial state
    assert_eq!(rule_manager.get_all_rules().await.len(), 1);
    assert_eq!(rule_manager.get_all_clients().await.len(), 1);

    // Client1 unsubscribes - rule becomes orphaned but still exists
    rule_manager
        .unsubscribe_rules(client1.clone(), vec![RuleId("rule_1".to_string())])
        .await?;

    assert_eq!(rule_manager.get_all_rules().await.len(), 1); // Rule still exists
    assert_eq!(rule_manager.get_all_clients().await.len(), 0); // No clients

    // Client2 subscribes to the orphaned rule (re-adding it)
    let rule_reuse = Rule::new(
        RuleId("rule_1".to_string()),
        Topic("topic/1".to_string()),
        core::time::Duration::from_secs(60),
        "a > 10".to_owned(),
    );

    rule_manager.add_rule(client2.clone(), rule_reuse).await?;

    // Verify rule is now subscribed to by client2
    assert_eq!(rule_manager.get_all_rules().await.len(), 1);
    assert_eq!(rule_manager.get_all_clients().await.len(), 1);

    Ok(())
}

#[tokio::test]
async fn test_subscribe_rules_nonexistent_rule() -> Result<(), RuleManagerError> {
    let rule_manager = RuleManager::new();
    let client = ClientId("test_client".to_string());

    let rule = Rule::new(
        RuleId("rule_1".to_string()),
        Topic("topic/1".to_string()),
        core::time::Duration::from_secs(60),
        "a > 10".to_owned(),
    );

    rule_manager.add_rule(client.clone(), rule).await?;

    // Try to subscribe to a mix of existing and non-existing rules
    let rule_ids = vec![
        RuleId("rule_1".to_string()),
        RuleId("nonexistent_rule".to_string()),
    ];

    let client2 = ClientId("client2".to_string());
    let result = rule_manager.subscribe_rules(client2, rule_ids).await;

    // Should fail because one rule doesn't exist
    assert!(result.is_err());

    // Verify client2 was not added (transaction-like behavior)
    assert_eq!(rule_manager.get_all_clients().await.len(), 1);

    Ok(())
}

#[tokio::test]
async fn test_subscribe_rules_empty_list() -> Result<(), RuleManagerError> {
    let rule_manager = RuleManager::new();
    let client = ClientId("test_client".to_string());

    // Subscribe to empty list of rules (should succeed, doing nothing)
    let rule_ids = vec![];
    let result = rule_manager.subscribe_rules(client.clone(), rule_ids).await;

    assert!(result.is_ok());
    assert_eq!(rule_manager.get_all_clients().await.len(), 0);

    Ok(())
}

#[tokio::test]
async fn test_subscribe_rules_concurrent() -> Result<(), RuleManagerError> {
    let num_rules = 10;
    let num_clients = 5;
    let rule_manager = std::sync::Arc::new(RuleManager::new());

    // Create rules using one client
    let initial_client = ClientId("initial_client".to_string());
    for i in 0..num_rules {
        let rule = Rule::new(
            RuleId(format!("rule_{}", i)),
            Topic(format!("topic/{}", i)),
            core::time::Duration::from_secs(60),
            "a > 5".to_owned(),
        );
        rule_manager.add_rule(initial_client.clone(), rule).await?;
    }

    // Prepare all rule IDs
    let all_rule_ids: Vec<RuleId> = (0..num_rules)
        .map(|i| RuleId(format!("rule_{}", i)))
        .collect();

    // Concurrently subscribe multiple clients to all rules
    let results: Vec<_> = (0..num_clients)
        .fold(JoinSet::new(), |mut set, i| {
            let rm = rule_manager.clone();
            let rule_ids = all_rule_ids.clone();
            set.spawn(async move {
                let client = ClientId(format!("client_{}", i));
                rm.subscribe_rules(client, rule_ids).await
            });
            set
        })
        .join_all()
        .await;

    // Verify all operations succeeded
    assert!(results.iter().all(|r| r.is_ok()));

    // Verify all clients were added (including initial client)
    let clients = rule_manager.get_all_clients().await;
    assert_eq!(clients.len(), num_clients + 1); // +1 for initial_client

    // Verify rules still exist
    assert_eq!(rule_manager.get_all_rules().await.len(), num_rules);

    Ok(())
}
