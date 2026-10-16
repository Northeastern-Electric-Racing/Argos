use scylla_server::services::data_service;

#[test]
fn test_downsampling_sampling_rate_calculation() {
    // Test core sampling rate calculation logic
    assert_eq!(
        data_service::calculate_auto_sampling_rate(5000),
        1,
        "Small dataset should not be downsampled"
    );
    assert_eq!(
        data_service::calculate_auto_sampling_rate(10000),
        1,
        "At threshold should not be downsampled"
    );
    assert_eq!(
        data_service::calculate_auto_sampling_rate(15000),
        3,
        "15k points should have rate 3"
    );
    assert_eq!(
        data_service::calculate_auto_sampling_rate(50000),
        10,
        "50k points should have rate 10"
    );
}
