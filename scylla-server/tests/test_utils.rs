use std::time::Duration;

use diesel_async::{
    AsyncPgConnection, RunQueryDsl,
    pooled_connection::{AsyncDieselConnectionManager, bb8::Pool},
};
use dotenvy::dotenv;
use scylla_server::schema::{data, data_type, run};

pub async fn cleanup_and_prepare() -> Result<Pool<AsyncPgConnection>, diesel::result::Error> {
    dotenv().ok();

    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be specified");
    //let mut config = ManagerConfig::default();
    let manager = AsyncDieselConnectionManager::<AsyncPgConnection>::new(db_url);
    let pool: Pool<AsyncPgConnection> = Pool::builder()
        .max_size(10)
        .min_idle(Some(5))
        .max_lifetime(Some(Duration::from_secs(60 * 60 * 24)))
        .idle_timeout(Some(Duration::from_secs(60 * 2)))
        .build(manager)
        .await
        .unwrap();
    let mut client = pool.get().await.unwrap();

    diesel::delete(data::table).execute(&mut client).await?;
    diesel::delete(data_type::table)
        .execute(&mut client)
        .await?;
    diesel::delete(run::table).execute(&mut client).await?;

    Ok(pool.clone())
}
