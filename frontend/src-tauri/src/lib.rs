mod compute;

use compute::types::{ComputeInput, ComputeMetricsResponse};
use once_cell::sync::Lazy;
use serde::Serialize;
use std::collections::VecDeque;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

const DEFAULT_BACKEND_URL: &str = "http://127.0.0.1:8000";
const HEALTH_PATH: &str = "/health";
const HEALTH_TIMEOUT: Duration = Duration::from_secs(20);
const HEALTH_INTERVAL: Duration = Duration::from_millis(250);
const START_ATTEMPTS: u8 = 3;
const RETRY_BACKOFF: Duration = Duration::from_millis(700);
const LOG_CAPACITY: usize = 500;
const APP_BUNDLE_ID: &str = "space.tryambakam.fmrl";
const LEGACY_DEEP_LINK_AUTH_CALLBACK: &str = "fmrl://auth/callback";
const TAURI_LOCALHOST_AUTH_CALLBACK_HTTPS: &str = "https://tauri.localhost/";
const TAURI_LOCALHOST_AUTH_CALLBACK_HTTP: &str = "http://tauri.localhost/";

#[derive(Debug)]
struct BackendState {
    child: Option<Child>,
    url: String,
    working_dir: PathBuf,
    logs: Arc<Mutex<VecDeque<String>>>,
}

static BACKEND_STATE: Lazy<Mutex<BackendState>> = Lazy::new(|| {
    let working_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../backend");

    Mutex::new(BackendState {
        child: None,
        url: DEFAULT_BACKEND_URL.to_string(),
        working_dir,
        logs: Arc::new(Mutex::new(VecDeque::with_capacity(LOG_CAPACITY))),
    })
});

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackendStatus {
    healthy: bool,
    running: bool,
    url: String,
    message: String,
    pid: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdvancedMetricsResponse {
    runtime: &'static str,
    output: compute::types::ComputeOutput,
    endpoint: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ParityGateResponse {
    approved: bool,
    warnings: Vec<String>,
    runtime: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NonlinearBenchmarkResponse {
    iterations: u32,
    total_ms: u128,
    avg_ms: f64,
    p95_ms: f64,
}

fn push_log(logs: &Arc<Mutex<VecDeque<String>>>, message: impl Into<String>) {
    if let Ok(mut buf) = logs.lock() {
        if buf.len() >= LOG_CAPACITY {
            buf.pop_front();
        }
        buf.push_back(message.into());
    }
}

fn spawn_log_reader<R: Read + Send + 'static>(reader: R, tag: &'static str, logs: Arc<Mutex<VecDeque<String>>>) {
    thread::spawn(move || {
        let mut buffered = BufReader::new(reader);
        let mut line = String::new();

        loop {
            line.clear();
            match buffered.read_line(&mut line) {
                Ok(0) => break,
                Ok(_) => {
                    let trimmed = line.trim();
                    if !trimmed.is_empty() {
                        push_log(&logs, format!("[{tag}] {trimmed}"));
                    }
                }
                Err(err) => {
                    push_log(&logs, format!("[{tag}] log reader error: {err}"));
                    break;
                }
            }
        }
    });
}

fn python_candidates(working_dir: &PathBuf) -> Vec<String> {
    let mut candidates = Vec::new();

    if let Ok(explicit) = std::env::var("SELEMENE_PYTHON") {
        let trimmed = explicit.trim();
        if !trimmed.is_empty() {
            candidates.push(trimmed.to_string());
        }
    }

    for rel in [
        ".venv/bin/python3",
        ".venv/bin/python",
        "venv/bin/python3",
        "venv/bin/python",
    ] {
        let path = working_dir.join(rel);
        if path.exists() {
            candidates.push(path.to_string_lossy().to_string());
        }
    }

    candidates.push("python3".to_string());
    candidates.push("python".to_string());

    let mut deduped = Vec::new();
    for candidate in candidates {
        if !deduped.contains(&candidate) {
            deduped.push(candidate);
        }
    }

    deduped
}

fn python_has_backend_deps(candidate: &str) -> bool {
    Command::new(candidate)
        .args(["-c", "import fastapi, uvicorn, pydantic_settings"])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn python_invokable(candidate: &str) -> bool {
    Command::new(candidate)
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn run_command_for_bootstrap(
    program: &str,
    args: &[&str],
    cwd: &PathBuf,
) -> Result<(), String> {
    let output = Command::new(program)
        .current_dir(cwd)
        .args(args)
        .output()
        .map_err(|err| format!("Failed to execute '{program} {}': {err}", args.join(" ")))?;

    if output.status.success() {
        return Ok(());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    Err(format!(
        "Command '{program} {}' failed with status {}. stdout='{}' stderr='{}'",
        args.join(" "),
        output.status,
        stdout.trim(),
        stderr.trim()
    ))
}

fn bootstrap_backend_venv(
    working_dir: &PathBuf,
    logs: &Arc<Mutex<VecDeque<String>>>,
) -> Result<String, String> {
    let venv_python = working_dir.join(".venv/bin/python3");
    let venv_python_str = venv_python.to_string_lossy().to_string();

    if venv_python.exists() && python_has_backend_deps(&venv_python_str) {
        push_log(
            logs,
            format!("[lifecycle] using existing backend venv runtime: {venv_python_str}"),
        );
        return Ok(venv_python_str);
    }

    let bootstrap_python = ["python3", "python"]
        .into_iter()
        .find(|candidate| python_invokable(candidate))
        .ok_or_else(|| {
            "No bootstrap python runtime found (python3/python) to create backend venv"
                .to_string()
        })?;

    push_log(
        logs,
        format!(
            "[lifecycle] provisioning backend virtualenv via {bootstrap_python} at {}",
            working_dir.to_string_lossy()
        ),
    );

    run_command_for_bootstrap(bootstrap_python, &["-m", "venv", ".venv"], working_dir)?;
    run_command_for_bootstrap(
        &venv_python_str,
        &["-m", "pip", "install", "-r", "requirements.txt"],
        working_dir,
    )?;

    if python_has_backend_deps(&venv_python_str) {
        push_log(
            logs,
            format!("[lifecycle] backend virtualenv ready: {venv_python_str}"),
        );
        Ok(venv_python_str)
    } else {
        Err(
            "Backend virtualenv was created but required modules (fastapi/uvicorn) are still unavailable"
                .to_string(),
        )
    }
}

fn resolve_python_executable(
    working_dir: &PathBuf,
    logs: &Arc<Mutex<VecDeque<String>>>,
) -> Result<String, String> {
    if !working_dir.exists() {
        return Err(format!(
            "Desktop backend directory is missing at '{}'. This build does not include the packaged backend sidecar yet.",
            working_dir.display()
        ));
    }

    for candidate in python_candidates(working_dir) {
        if python_has_backend_deps(&candidate) {
            push_log(logs, format!("[lifecycle] selected python runtime: {candidate}"));
            return Ok(candidate);
        }
        push_log(
            logs,
            format!(
                "[lifecycle] skipping python runtime without fastapi/uvicorn: {candidate}"
            ),
        );
    }

    push_log(
        logs,
        "[lifecycle] no suitable python runtime found; attempting backend venv bootstrap",
    );

    bootstrap_backend_venv(working_dir, logs).map_err(|err| {
        format!(
            "Python runtime with required modules not found and bootstrap failed: {err}"
        )
    })
}

fn is_backend_healthy(url: &str) -> bool {
    let normalized = url
        .strip_prefix("http://")
        .or_else(|| url.strip_prefix("https://"))
        .unwrap_or(url);

    let host_port = normalized
        .split('/')
        .next()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("127.0.0.1:8000");

    let with_port = if host_port.contains(':') {
        host_port.to_string()
    } else {
        format!("{host_port}:80")
    };

    let mut addrs = match with_port.to_socket_addrs() {
        Ok(a) => a,
        Err(_) => return false,
    };

    let addr = match addrs.next() {
        Some(addr) => addr,
        None => return false,
    };

    let mut stream = match TcpStream::connect_timeout(&addr, Duration::from_millis(400)) {
        Ok(stream) => stream,
        Err(_) => return false,
    };

    let _ = stream.set_read_timeout(Some(Duration::from_millis(600)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(600)));

    let request = format!(
        "GET {HEALTH_PATH} HTTP/1.1\r\nHost: {host_port}\r\nConnection: close\r\n\r\n"
    );

    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }

    let mut response = String::new();
    if stream.read_to_string(&mut response).is_err() {
        return false;
    }

    response.starts_with("HTTP/1.1 200") || response.starts_with("HTTP/1.0 200")
}

fn wait_for_health_with_process(url: &str, timeout: Duration) -> Result<(), String> {
    let start = Instant::now();

    while start.elapsed() < timeout {
        if is_backend_healthy(url) {
            return Ok(());
        }

        {
            let mut state = BACKEND_STATE.lock().expect("backend state lock poisoned");
            let (running, _pid, process_message) = process_running(&mut state);
            if !running {
                return Err(process_message.unwrap_or_else(|| {
                    "Backend process exited before health endpoint became ready".to_string()
                }));
            }
        }

        thread::sleep(HEALTH_INTERVAL);
    }

    Err(format!(
        "Health endpoint did not become ready within {:?}",
        timeout
    ))
}

fn process_running(state: &mut BackendState) -> (bool, Option<u32>, Option<String>) {
    let Some(child) = state.child.as_mut() else {
        return (false, None, None);
    };

    let pid = Some(child.id());

    match child.try_wait() {
        Ok(None) => (true, pid, None),
        Ok(Some(status)) => {
            state.child = None;
            (
                false,
                None,
                Some(format!("Backend process exited with status: {status}")),
            )
        }
        Err(err) => {
            state.child = None;
            (
                false,
                None,
                Some(format!("Failed to inspect backend process: {err}")),
            )
        }
    }
}

fn terminate_child(state: &mut BackendState) -> String {
    let Some(mut child) = state.child.take() else {
        return "No running backend process to terminate".to_string();
    };

    let pid = child.id();
    let kill_result = child.kill();
    let wait_result = child.wait();

    match (kill_result, wait_result) {
        (Ok(_), Ok(status)) => format!("Backend process {pid} stopped ({status})"),
        (Err(kill_err), Ok(status)) => {
            format!("Backend process {pid} may have already exited ({status}): {kill_err}")
        }
        (Ok(_), Err(wait_err)) => {
            format!("Backend process {pid} kill sent but wait failed: {wait_err}")
        }
        (Err(kill_err), Err(wait_err)) => {
            format!("Failed to stop backend process {pid}: kill error={kill_err}; wait error={wait_err}")
        }
    }
}

fn spawn_backend_process(state: &mut BackendState, python: &str) -> Result<u32, String> {
    let mut child = Command::new(python)
        .current_dir(&state.working_dir)
        .arg("-m")
        .arg("uvicorn")
        .arg("main:app")
        .arg("--host")
        .arg("127.0.0.1")
        .arg("--port")
        .arg("8000")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|err| format!("Failed to spawn backend process: {err}"))?;

    let pid = child.id();
    let logs = Arc::clone(&state.logs);

    if let Some(stdout) = child.stdout.take() {
        spawn_log_reader(stdout, "stdout", Arc::clone(&logs));
    }

    if let Some(stderr) = child.stderr.take() {
        spawn_log_reader(stderr, "stderr", logs);
    }

    state.child = Some(child);
    Ok(pid)
}

fn shutdown_backend_for_exit() {
    let mut state = BACKEND_STATE.lock().expect("backend state lock poisoned");
    let message = terminate_child(&mut state);
    push_log(&state.logs, format!("[lifecycle] app exit cleanup: {message}"));
}

#[tauri::command]
fn start_backend() -> BackendStatus {
    let (url, existing_pid, existing_msg, logs, working_dir) = {
        let mut state = BACKEND_STATE.lock().expect("backend state lock poisoned");
        let (running, pid, msg) = process_running(&mut state);

        if running {
            let healthy = is_backend_healthy(&state.url);
            return BackendStatus {
                healthy,
                running: true,
                url: state.url.clone(),
                message: "Backend process already running".to_string(),
                pid,
            };
        }

        // If another process is already serving the configured backend URL,
        // don't spawn a duplicate uvicorn process that will fail on bind.
        if is_backend_healthy(&state.url) {
            push_log(
                &state.logs,
                "[lifecycle] backend endpoint already healthy on configured URL; reusing existing process",
            );
            return BackendStatus {
                healthy: true,
                running: true,
                url: state.url.clone(),
                message: "Backend endpoint already healthy (existing process detected)".to_string(),
                pid: None,
            };
        }

        (
            state.url.clone(),
            pid,
            msg,
            Arc::clone(&state.logs),
            state.working_dir.clone(),
        )
    };

    let python = match resolve_python_executable(&working_dir, &logs) {
        Ok(cmd) => cmd,
        Err(msg) => {
            push_log(&logs, format!("[lifecycle] {msg}"));
            return BackendStatus {
                healthy: false,
                running: false,
                url,
                message: msg,
                pid: existing_pid,
            };
        }
    };

    let mut last_error = existing_msg;

    for attempt in 1..=START_ATTEMPTS {
        let pid = {
            let mut state = BACKEND_STATE.lock().expect("backend state lock poisoned");
            push_log(
                &state.logs,
                format!("[lifecycle] start attempt {attempt}/{START_ATTEMPTS}"),
            );

            match spawn_backend_process(&mut state, &python) {
                Ok(pid) => pid,
                Err(err) => {
                    last_error = Some(err.clone());
                    push_log(&state.logs, format!("[lifecycle] {err}"));
                    continue;
                }
            }
        };

        match wait_for_health_with_process(&url, HEALTH_TIMEOUT) {
            Ok(()) => {
                let base_message = format!(
                    "Backend process started and health endpoint is reachable (attempt {attempt}/{START_ATTEMPTS})"
                );
                let message = match last_error {
                    Some(previous) => format!("{base_message}. Previous state: {previous}"),
                    None => base_message,
                };

                let state = BACKEND_STATE.lock().expect("backend state lock poisoned");
                push_log(&state.logs, format!("[lifecycle] backend healthy on pid {pid}"));

                return BackendStatus {
                    healthy: true,
                    running: true,
                    url,
                    message,
                    pid: Some(pid),
                };
            }
            Err(wait_error) => {
                let mut state = BACKEND_STATE.lock().expect("backend state lock poisoned");
                let stop_message = terminate_child(&mut state);
                push_log(
                    &state.logs,
                    format!(
                        "[lifecycle] startup wait failed on attempt {attempt}: {wait_error}; {stop_message}"
                    ),
                );
                last_error = Some(format!("{wait_error} on attempt {attempt}"));
            }
        }

        if attempt < START_ATTEMPTS {
            thread::sleep(RETRY_BACKOFF);
        }
    }

    let message = format!(
        "Failed to start backend after {START_ATTEMPTS} attempts. {}",
        last_error.unwrap_or_else(|| "Unknown startup failure".to_string())
    );
    push_log(&logs, format!("[lifecycle] {message}"));

    BackendStatus {
        healthy: false,
        running: false,
        url,
        message,
        pid: None,
    }
}

#[tauri::command]
fn stop_backend() -> BackendStatus {
    let mut state = BACKEND_STATE.lock().expect("backend state lock poisoned");
    let message = terminate_child(&mut state);
    push_log(&state.logs, format!("[lifecycle] {message}"));

    BackendStatus {
        healthy: false,
        running: false,
        url: state.url.clone(),
        message,
        pid: None,
    }
}

#[tauri::command]
fn backend_health() -> BackendStatus {
    let mut state = BACKEND_STATE.lock().expect("backend state lock poisoned");
    let (managed_running, pid, process_message) = process_running(&mut state);
    let endpoint_healthy = is_backend_healthy(&state.url);
    let running = managed_running || endpoint_healthy;
    let healthy = endpoint_healthy;

    let message = if healthy && pid.is_none() {
        "Backend endpoint is healthy (existing external process detected)".to_string()
    } else if managed_running && healthy {
        "Backend process is running and healthy".to_string()
    } else if managed_running {
        "Backend process is running but health endpoint is unreachable".to_string()
    } else {
        process_message.unwrap_or_else(|| "Backend process is not running".to_string())
    };

    BackendStatus {
        healthy,
        running,
        url: state.url.clone(),
        message,
        pid,
    }
}

#[tauri::command]
fn backend_logs(limit: Option<usize>) -> Vec<String> {
    let state = BACKEND_STATE.lock().expect("backend state lock poisoned");
    let logs = state.logs.lock().expect("backend logs lock poisoned");

    let max_items = limit.unwrap_or(100).min(LOG_CAPACITY);
    let start = logs.len().saturating_sub(max_items);
    logs.iter().skip(start).cloned().collect()
}

/// Open a URL in the system default browser (bypasses plugin ACL)
#[tauri::command]
fn open_url_in_browser(url: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {e}"))?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", &url])
            .spawn()
            .map_err(|e| format!("Failed to open URL: {e}"))?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {e}"))?;
    }
    Ok(())
}

/// Open a managed WebView window for OAuth that intercepts the callback redirect.
/// Extracts tokens from the redirect URL fragment and emits them via event.
#[tauri::command]
async fn open_oauth_window(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri::{Emitter, Manager, Url, WebviewUrl, WebviewWindowBuilder};

    let oauth_url = Url::parse(&url).map_err(|e| format!("Invalid OAuth URL: {e}"))?;

    // Close any existing OAuth window
    if let Some(existing) = app.get_webview_window("oauth") {
        let _ = existing.close();
    }

    let app_handle = app.clone();

    WebviewWindowBuilder::new(&app, "oauth", WebviewUrl::External(oauth_url))
        .title("Sign in — FMRL")
        .inner_size(520.0, 720.0)
        .resizable(true)
        .on_navigation(move |nav_url| {
            let url_str = nav_url.as_str();
            let is_auth_callback = url_str.starts_with(LEGACY_DEEP_LINK_AUTH_CALLBACK)
                || url_str.starts_with(TAURI_LOCALHOST_AUTH_CALLBACK_HTTPS)
                || url_str.starts_with(TAURI_LOCALHOST_AUTH_CALLBACK_HTTP);

            // Intercept the OAuth callback redirect before the WebView fully
            // navigates into the bundled app origin.
            if is_auth_callback {
                // Prefer hash fragment (implicit flow), fall back to query params (PKCE)
                let token_string = match nav_url.fragment() {
                    Some(f) if !f.is_empty() => f.to_string(),
                    _ => nav_url.query().unwrap_or("").to_string(),
                };

                if !token_string.is_empty() {
                    let ah = app_handle.clone();
                    let _ = ah.emit("oauth-tokens", token_string);
                    // Close the window after a brief delay to avoid deadlock
                    std::thread::spawn(move || {
                        use tauri::Manager;
                        std::thread::sleep(Duration::from_millis(300));
                        if let Some(win) = ah.get_webview_window("oauth") {
                            let _ = win.close();
                        }
                    });
                } else {
                    eprintln!(
                        "[FMRL] OAuth callback URL had no tokens: {}",
                        &url_str[..url_str.len().min(80)]
                    );
                }
                return false; // Prevent navigation to non-HTTP scheme
            }
            true
        })
        .build()
        .map_err(|e| format!("Failed to open OAuth window: {e}"))?;

    Ok(())
}

#[tauri::command]
fn open_app_settings(target: Option<String>) -> Result<bool, String> {
    let target_value = target.unwrap_or_else(|| "camera".to_string());
    let target_normalized = target_value.to_lowercase();

    #[cfg(target_os = "macos")]
    {
        let deep_link = match target_normalized.as_str() {
            "camera" => "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera",
            "storage" => "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles",
            _ => {
                return Err(format!(
                    "Unsupported settings target: {target_value}. Expected 'camera' or 'storage'."
                ))
            }
        };

        let status = Command::new("open")
            .arg(deep_link)
            .status()
            .map_err(|err| format!("Failed to launch System Settings for {target_value}: {err}"))?;

        if status.success() {
            Ok(true)
        } else {
            Err(format!(
                "System Settings launch exited with non-success status: {status}"
            ))
        }
    }

    #[cfg(target_os = "ios")]
    {
        Err(format!(
            "iOS settings deep-link target '{target_value}' should use 'app-settings:' when mobile runtime wiring is enabled"
        ))
    }

    #[cfg(not(any(target_os = "macos", target_os = "ios")))]
    {
        Err(format!(
            "Native settings deep-link is not supported on this OS for target '{target_value}'"
        ))
    }
}

#[tauri::command]
fn open_camera_privacy_settings() -> Result<bool, String> {
    open_app_settings(Some("camera".to_string()))
}

#[tauri::command]
fn repair_camera_permission_state() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let reset_camera = Command::new("tccutil")
            .args(["reset", "Camera", APP_BUNDLE_ID])
            .output()
            .map_err(|err| format!("Failed to execute tccutil camera reset: {err}"))?;

        if !reset_camera.status.success() {
            let stderr = String::from_utf8_lossy(&reset_camera.stderr);
            return Err(format!(
                "Camera permission reset failed (status: {}). {}",
                reset_camera.status,
                stderr.trim()
            ));
        }

        let reset_microphone = Command::new("tccutil")
            .args(["reset", "Microphone", APP_BUNDLE_ID])
            .output()
            .map_err(|err| format!("Failed to execute tccutil microphone reset: {err}"))?;

        if !reset_microphone.status.success() {
            let stderr = String::from_utf8_lossy(&reset_microphone.stderr);
            return Err(format!(
                "Microphone permission reset failed (status: {}). {}",
                reset_microphone.status,
                stderr.trim()
            ));
        }

        let _ = open_app_settings(Some("camera".to_string()));

        Ok("Permissions reset complete. Quit FMRL, reopen from /Applications, then click Request Camera Access again.".to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Permission repair is currently implemented for macOS only.".to_string())
    }
}

#[tauri::command]
fn compute_metrics(input: ComputeInput) -> ComputeMetricsResponse {
    let output = compute::run_compute_metrics(input);
    ComputeMetricsResponse {
        runtime: "tauri-rust-metrics-v2c",
        output,
    }
}

#[tauri::command]
fn compute_probe(input: ComputeInput) -> ComputeMetricsResponse {
    // Backward-compatible alias during migration from Phase 2A -> 2B
    compute_metrics(input)
}

#[tauri::command]
fn compute_advanced_metrics(input: ComputeInput) -> AdvancedMetricsResponse {
    let output = compute::run_compute_metrics(input);
    AdvancedMetricsResponse {
        runtime: "tauri-rust-metrics-v2c",
        output,
        endpoint: "compute_advanced_metrics",
    }
}

#[tauri::command]
fn compute_parity_gate(input: ComputeInput) -> ParityGateResponse {
    let output = compute::run_compute_metrics(input);
    ParityGateResponse {
        approved: output.ok && output.consistency.parity_gate_ready,
        warnings: output.consistency.warnings,
        runtime: "tauri-rust-metrics-v2c",
    }
}

#[tauri::command]
fn benchmark_nonlinear_compute(iterations: Option<u32>) -> NonlinearBenchmarkResponse {
    let loops = iterations.unwrap_or(120).clamp(10, 2000);

    let width = 128u32;
    let height = 96u32;
    let pixels = (width as usize) * (height as usize);
    let mut bytes = Vec::with_capacity(pixels);
    for i in 0..pixels {
        bytes.push(((i * 37 + 17) % 255) as u8);
    }

    let frame = compute::buffer::FrameBuffer::try_new(width, height, compute::buffer::PixelFormat::Gray8, bytes)
        .expect("synthetic benchmark frame should always be valid");

    let mut samples_ms = Vec::with_capacity(loops as usize);
    let start_all = Instant::now();

    for _ in 0..loops {
        let tick = Instant::now();
        let _ = compute::metrics::nonlinear::compute(&frame);
        samples_ms.push(tick.elapsed().as_secs_f64() * 1000.0);
    }

    let total_ms = start_all.elapsed().as_millis();
    samples_ms.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let p95_idx = ((samples_ms.len() as f64) * 0.95).floor() as usize;
    let p95_ms = samples_ms
        .get(p95_idx.min(samples_ms.len().saturating_sub(1)))
        .copied()
        .unwrap_or(0.0);

    NonlinearBenchmarkResponse {
        iterations: loops,
        total_ms,
        avg_ms: if loops > 0 {
            total_ms as f64 / loops as f64
        } else {
            0.0
        },
        p95_ms,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Deserialize;
    use serde_json::json;
    use std::fs;

    #[derive(Debug, Deserialize)]
    struct ParityFrame {
        id: String,
        width: u32,
        height: u32,
        format: String,
        bytes: Vec<u8>,
    }

    #[derive(Debug, Deserialize)]
    struct ParityDataset {
        frames: Vec<ParityFrame>,
    }

    fn synthetic_input() -> ComputeInput {
        let width = 96u32;
        let height = 72u32;
        let pixels = (width as usize) * (height as usize);
        let mut bytes = Vec::with_capacity(pixels);
        for i in 0..pixels {
            bytes.push(((i * 19 + 11) % 255) as u8);
        }

        ComputeInput {
            width,
            height,
            format: compute::buffer::PixelFormat::Gray8,
            bytes,
            frame_id: Some("parity-test".to_string()),
            timestamp_ms: Some(0),
        }
    }

    #[test]
    fn parity_gate_is_evaluable() {
        let output = compute::run_compute_metrics(synthetic_input());
        assert!(output.ok);
        assert!(output.consistency.warnings.len() <= 4);
        assert!(output.scores.energy_score <= 100);
        assert!(output.scores.coherence_score <= 100);
    }

    #[test]
    fn parity_export_rust_metrics() {
        let dataset_path = std::env::var("PARITY_DATASET_PATH").ok();
        let output_path = std::env::var("PARITY_RUST_OUTPUT").ok();

        if dataset_path.is_none() || output_path.is_none() {
            println!("parity_export_rust_metrics skipped (PARITY_DATASET_PATH/PARITY_RUST_OUTPUT not set)");
            return;
        }

        let dataset_raw = fs::read_to_string(dataset_path.expect("dataset path must exist")).expect("failed to read dataset");
        let dataset: ParityDataset = serde_json::from_str(&dataset_raw).expect("invalid parity dataset");

        let mut outputs = Vec::new();

        for frame in dataset.frames {
            let format = match frame.format.as_str() {
                "Gray8" => compute::buffer::PixelFormat::Gray8,
                "Rgb8" => compute::buffer::PixelFormat::Rgb8,
                "Rgba8" => compute::buffer::PixelFormat::Rgba8,
                _ => compute::buffer::PixelFormat::Gray8,
            };

            let output = compute::run_compute_metrics(ComputeInput {
                width: frame.width,
                height: frame.height,
                format,
                bytes: frame.bytes,
                frame_id: Some(frame.id.clone()),
                timestamp_ms: Some(0),
            });

            outputs.push(json!({
                "id": frame.id,
                "basic": output.basic,
                "color": output.color,
                "geometric": {
                    "horizontal_symmetry": output.geometric.horizontal_symmetry,
                    "vertical_symmetry": output.geometric.vertical_symmetry
                },
                "nonlinear": {
                    "fractal_dimension": output.nonlinear.fractal_dimension,
                    "hurst_exponent": output.nonlinear.hurst_exponent
                },
                "advanced_symmetry": {
                    "body_symmetry": output.advanced_symmetry.body_symmetry
                },
                "scores": {
                    "energy_score": output.scores.energy_score,
                    "coherence_score": output.scores.coherence_score
                }
            }));
        }

        let out_payload = json!({ "outputs": outputs });
        fs::write(
            output_path.expect("output path must exist"),
            serde_json::to_string_pretty(&out_payload).expect("serialize rust parity output"),
        )
        .expect("write rust parity output");
    }

    #[test]
    fn nonlinear_benchmark_command_runs() {
        let result = benchmark_nonlinear_compute(Some(80));
        assert_eq!(result.iterations, 80);
        assert!(result.avg_ms >= 0.0);
        assert!(result.p95_ms >= 0.0);
        println!(
            "nonlinear benchmark: iterations={} total_ms={} avg_ms={:.3} p95_ms={:.3}",
            result.iterations, result.total_ms, result.avg_ms, result.p95_ms
        );
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                if let Err(e) = app.deep_link().register_all() {
                    eprintln!("[FMRL] Deep link registration failed (non-fatal): {e}");
                }
            }
            Ok(())
        })
        .on_window_event(|_, event| {
            if matches!(
                event,
                tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed
            ) {
                shutdown_backend_for_exit();
            }
        })
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            backend_health,
            backend_logs,
            open_app_settings,
            open_camera_privacy_settings,
            open_url_in_browser,
            open_oauth_window,
            repair_camera_permission_state,
            compute_metrics,
            compute_probe,
            compute_advanced_metrics,
            compute_parity_gate,
            benchmark_nonlinear_compute
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
