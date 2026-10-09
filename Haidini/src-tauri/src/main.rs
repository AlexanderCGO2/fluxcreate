#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{io::{BufRead, BufReader}, path::PathBuf, process::{Child, Command, Stdio}, sync::{mpsc, Mutex}, time::Duration};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

struct LocalService(Mutex<Option<Child>>);
impl Drop for LocalService {
    fn drop(&mut self) {
        if let Ok(child) = self.0.get_mut() {
            if let Some(mut child) = child.take() { let _ = child.kill(); let _ = child.wait(); }
        }
    }
}

fn main() {
    let app = tauri::Builder::default().setup(|app| {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().unwrap().to_path_buf();
        let resources = app.path().resource_dir()?;
        let (node, server, web, data) = if cfg!(debug_assertions) {
            (root.join(".runtime/node.exe"), root.join("server-dist/server.mjs"), root.join("dist"), root.join(".data"))
        } else {
            (resources.join("runtime/node.exe"), resources.join("service/server.mjs"), resources.join("web"), app.path().app_data_dir()?)
        };
        std::fs::create_dir_all(&data)?;
        let mut command = Command::new(node);
        command.arg(server).env("FLUXINI_DATA_DIR", data).env("FLUXINI_WEB_DIR", web)
            .env("FLUXINI_PORT", "0").env("FLUXINI_PARENT_PID", std::process::id().to_string())
            .stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::null());
        #[cfg(windows)] {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        let mut child = command.spawn()?;
        let stdout = child.stdout.take().ok_or("Local service has no output stream")?;
        let guard = LocalService(Mutex::new(Some(child)));
        let (sender, receiver) = mpsc::channel();
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                if let Some(url) = line.strip_prefix("FLUXINI_READY ") { let _ = sender.send(url.to_owned()); }
            }
        });
        let origin = receiver.recv_timeout(Duration::from_secs(20)).map_err(|_| "The local Fluxini service could not start. Check the configured Flux environment file and local data directory.")?;
        let url: tauri::Url = origin.parse()?;
        if url.host_str() != Some("127.0.0.1") || url.scheme() != "http" { return Err("Invalid local service address".into()); }
        let allowed_origin = url.origin();
        app.manage(guard);
        WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url))
            .title("Fluxini — Motion + Procedural").inner_size(1512.0, 980.0).min_inner_size(1050.0, 680.0)
            .on_navigation(move |url| url.origin() == allowed_origin)
            .build()?;
        Ok(())
    }).build(tauri::generate_context!()).expect("Unable to start Fluxini");
    app.run(|handle, event| {
        if let tauri::RunEvent::Exit = event {
            if let Some(state) = handle.try_state::<LocalService>() {
                if let Ok(mut child) = state.0.lock() {
                    if let Some(mut child) = child.take() { let _ = child.kill(); let _ = child.wait(); }
                }
            }
        }
    });
}
