// src-tauri/src/mods/p2p_chat.rs
use std::{
    collections::hash_map::DefaultHasher,
    hash::{Hash, Hasher},
    sync::Arc,
    time::Duration,
};
use libp2p::{
    gossipsub, mdns, noise,
    swarm::{NetworkBehaviour, SwarmEvent},
    tcp, yamux,
};
use futures::stream::StreamExt;
use tauri::{AppHandle, Emitter};
use serde::{Serialize, Deserialize};
use tokio::sync::Mutex;
use std::io;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub from: String,
    pub content: String,
}

#[derive(NetworkBehaviour)]
struct MyBehaviour {
    gossipsub: gossipsub::Behaviour,
    mdns: mdns::tokio::Behaviour,
}

pub struct P2PChat {
    swarm: Arc<Mutex<libp2p::swarm::Swarm<MyBehaviour>>>,
    topic: gossipsub::IdentTopic,
    app: AppHandle,
}

impl P2PChat {
pub async fn new(app: AppHandle) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let swarm = libp2p::SwarmBuilder::with_new_identity()
            .with_tokio()
            .with_tcp(
                tcp::Config::default(),
                noise::Config::new,
                yamux::Config::default,
            )?
            .with_quic()
            .with_behaviour(|key| {
                let message_id_fn = |message: &gossipsub::Message| {
                    let mut s = DefaultHasher::new();
                    message.data.hash(&mut s);
                    gossipsub::MessageId::from(s.finish().to_string())
                };

                let gossipsub_config = gossipsub::ConfigBuilder::default()
                    .heartbeat_interval(Duration::from_secs(10))
                    .validation_mode(gossipsub::ValidationMode::Strict)
                    .message_id_fn(message_id_fn)
                    .build()
                    .map_err(io::Error::other)?;

                let gossipsub = gossipsub::Behaviour::new(
                    gossipsub::MessageAuthenticity::Signed(key.clone()),
                    gossipsub_config,
                )?;

                let mdns = mdns::tokio::Behaviour::new(
                    mdns::Config::default(),
                    key.public().to_peer_id(),
                )?;

                Ok(MyBehaviour { gossipsub, mdns })
            })?
            .build();

        let topic = gossipsub::IdentTopic::new("p2p-chat");
        
        let mut swarm_guard = swarm;
        swarm_guard.behaviour_mut().gossipsub.subscribe(&topic)?;
        swarm_guard.listen_on("/ip4/0.0.0.0/tcp/0".parse()?)?;

        let peer_id = swarm_guard.local_peer_id().to_string();
        let _ = app.emit("p2p_ready", peer_id);

        Ok(Self { 
            swarm: Arc::new(Mutex::new(swarm_guard)),
            topic, 
            app 
        })
    }

// src-tauri/src/mods/p2p_chat.rs - 修复后的 run 方法

pub async fn run(self: Arc<Self>) {
    tokio::spawn(async move {
        let mut swarm = self.swarm.lock().await;
        loop {
            match swarm.select_next_some().await {
                SwarmEvent::Behaviour(MyBehaviourEvent::Mdns(mdns::Event::Discovered(list))) => {
                    for (peer_id, addr) in list {
                        println!("mDNS discovered a new peer: {}", peer_id);
                        
                        // 添加显式 peer
                        swarm.behaviour_mut().gossipsub.add_explicit_peer(&peer_id);
                        
                        // 🔥 关键：主动建立连接
                        if let Err(e) = swarm.dial(addr.clone()) {
                            println!("Dial to {} failed: {:?}", peer_id, e);
                        }
                        
                        let _ = self.app.emit("p2p_peer", peer_id.to_string());
                    }
                }
                SwarmEvent::Behaviour(MyBehaviourEvent::Mdns(mdns::Event::Expired(list))) => {
                    for (peer_id, _addr) in list {
                        println!("mDNS peer expired: {}", peer_id);
                        swarm.behaviour_mut().gossipsub.remove_explicit_peer(&peer_id);
                        let _ = self.app.emit("p2p_peer_gone", peer_id.to_string());
                    }
                }
                SwarmEvent::Behaviour(MyBehaviourEvent::Gossipsub(gossipsub::Event::Message {
                    message, ..
                })) => {
                    if let Ok(text) = String::from_utf8(message.data) {
                        println!("Received message: {}", text);
                        let msg = ChatMessage {
                            from: message.source.map(|p| p.to_string()).unwrap_or("unknown".to_string()),
                            content: text,
                        };
                        let _ = self.app.emit("p2p_msg", msg);
                    }
                }
                SwarmEvent::ConnectionEstablished { peer_id, .. } => {
                    println!("Connection established to: {}", peer_id);
                    let _ = self.app.emit("p2p_connected", peer_id.to_string());
                }
                SwarmEvent::NewListenAddr { address, .. } => {
                    println!("Listening on: {}", address);
                    let _ = self.app.emit("p2p_listen", address.to_string());
                }
                _ => {}
            }
        }
    });
}

    pub async fn send(&self, msg: &str) -> Result<(), String> {
        let mut swarm = self.swarm.lock().await;
        swarm
            .behaviour_mut()
            .gossipsub
            .publish(self.topic.clone(), msg.as_bytes())
            .map_err(|e| format!("发送失败: {:?}", e))?;
        Ok(())
    }
}

pub struct P2PState(pub Arc<Mutex<Option<Arc<P2PChat>>>>);

impl P2PState {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(None)))
    }
}

#[tauri::command]
pub async fn start_p2p(
    state: tauri::State<'_, P2PState>,
    app: AppHandle,
) -> Result<String, String> {
    let mut guard = state.0.lock().await;
    
    if guard.is_some() {
        return Err("P2P 已经在运行".to_string());
    }
    
    match P2PChat::new(app).await {
        Ok(chat) => {
            let peer_id = {
                let swarm = chat.swarm.lock().await;
                swarm.local_peer_id().to_string()
            };
            
            let chat_arc = Arc::new(chat);
            chat_arc.clone().run().await;
            *guard = Some(chat_arc);
            Ok(format!("启动成功, ID: {}", peer_id))
        }
        Err(e) => Err(format!("启动失败: {}", e))
    }
}

#[tauri::command]
pub async fn stop_p2p(state: tauri::State<'_, P2PState>) -> Result<String, String> {
    let mut guard = state.0.lock().await;
    *guard = None;
    Ok("P2P 已停止".to_string())
}

#[tauri::command]
pub async fn send_p2p(
    state: tauri::State<'_, P2PState>,
    message: String,
) -> Result<String, String> {
    let guard = state.0.lock().await;
    
    if let Some(chat) = guard.as_ref() {
        chat.send(&message).await?;
        Ok("已发送".to_string())
    } else {
        Err("P2P 未启动".to_string())
    }
}

#[tauri::command]
pub async fn p2p_status(state: tauri::State<'_, P2PState>) -> Result<bool, String> {
    let guard = state.0.lock().await;
    Ok(guard.is_some())
}