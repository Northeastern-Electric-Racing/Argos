use crate::ClientData;
use futures_util::SinkExt;
use tokio::sync::broadcast;
use tokio_tungstenite::connect_async;
use tokio_util::sync::CancellationToken;
use tracing::{debug, trace, warn};

pub async fn grafana_live_handler(
    cancel_token: CancellationToken,
    mut data_channel: broadcast::Receiver<ClientData>,
    gf_url: String,
    gf_token: String,
    gf_socket: String,
    _gf_measurement: String,
) {
    let req = tungstenite::client::ClientRequestBuilder::new(
        (format!("{}/api/live/push/{}", gf_url, gf_socket))
            .parse()
            .expect("Invalid Grafana URL"),
    )
    .with_header("Authorization", format!("Bearer {gf_token}"));
    let (mut ws_st, _) = match connect_async(req).await {
        Ok(res) => res,
        Err(res) => {
            warn!("Could not connect to Grafana! {}", res);
            warn!("Bailing out of Grafana handler!");
            return;
        }
    };

    loop {
        tokio::select! {
            _ = cancel_token.cancelled() => {
                debug!("Shutting down Grafana handler!");
                break;
            },
            Ok(data) = data_channel.recv() => {
                match ws_st.send(tungstenite::Message::Text(data.to_influx_lp().into())).await {
                    Ok(_) => trace!("Pushed message to Grafana"),
                    Err(_) => debug!("Could not push Grafana message!"),
                }
            }
        }
    }
}
