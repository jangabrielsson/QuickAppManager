use tauri::{Emitter, Manager};
use tauri::menu::{Menu, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};

#[tauri::command]
fn get_hc3_config() -> Result<serde_json::Value, String> {
    let host = std::env::var("HC3_HOST").unwrap_or_default();
    let user = std::env::var("HC3_USER").unwrap_or_default();
    let password = std::env::var("HC3_PASSWORD").unwrap_or_default();
    let protocol = std::env::var("HC3_PROTOCOL").unwrap_or_else(|_| "http".to_string());

    if host.is_empty() || user.is_empty() || password.is_empty() {
        return Err("HC3 credentials not configured. Please set up .env file.".to_string());
    }

    Ok(serde_json::json!({
        "host": host,
        "user": user,
        "password": password,
        "protocol": protocol
    }))
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    println!("Opening URL in browser: {}", url);
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(&["/C", "start", &url])
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![get_hc3_config, open_url])
    .setup(|app| {
      // Create menu items
      let check_for_updates = MenuItemBuilder::with_id("check_for_updates", "Check for Updates...")
        .build(app)?;
      
      let toggle_devtools = MenuItemBuilder::with_id("toggle_devtools", "Toggle DevTools")
        .accelerator("CmdOrCtrl+Shift+I")
        .build(app)?;
      
      // Create app menu (first menu on macOS)
      let app_menu = SubmenuBuilder::new(app, "HC3 QuickApp Manager")
        .item(&PredefinedMenuItem::about(app, None, None)?)
        .item(&check_for_updates)
        .separator()
        .item(&PredefinedMenuItem::services(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, None)?)
        .item(&PredefinedMenuItem::hide_others(app, None)?)
        .item(&PredefinedMenuItem::show_all(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, None)?)
        .build()?;
      
      let view_menu = SubmenuBuilder::new(app, "View")
        .item(&toggle_devtools)
        .build()?;
      
      let menu = Menu::new(app)?;
      menu.append(&app_menu)?;
      menu.append(&view_menu)?;
      
      app.set_menu(menu)?;
      
      // Handle menu events
      app.on_menu_event(move |app, event| {
        println!("Menu event triggered: {:?}", event.id());
        if event.id() == "check_for_updates" {
          println!("Check for updates menu clicked");
          if let Some(window) = app.get_webview_window("main") {
            window.emit("check-for-updates", ()).unwrap();
          }
        } else if event.id() == "toggle_devtools" {
          println!("Toggle devtools event received");
          if let Some(window) = app.get_webview_window("main") {
            println!("Got window 'main'");
            if window.is_devtools_open() {
              println!("Closing devtools");
              window.close_devtools();
            } else {
              println!("Opening devtools");
              window.open_devtools();
            }
          } else {
            println!("Could not find window 'main'");
            // Try to list all windows
            for label in app.webview_windows().keys() {
              println!("Available window: {}", label);
            }
          }
        }
      });

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Load .env file from project root
      let resource_path = app.path().resource_dir().expect("failed to get resource dir");
      let env_path = resource_path.join(".env");
      
      println!("Loaded .env from: {:?}", env_path);
      if env_path.exists() {
        match dotenvy::from_path(&env_path) {
          Ok(_) => println!("Successfully loaded .env from project directory"),
          Err(e) => println!("Failed to load .env from project: {}", e),
        }
      }

      // Try to load from home directory as fallback
      if let Some(home_dir) = dirs::home_dir() {
        let home_env_path = home_dir.join(".env");
        println!("Trying to load .env from home: {:?}", home_env_path);
        if home_env_path.exists() {
          match dotenvy::from_path(&home_env_path) {
            Ok(_) => println!("Successfully loaded .env from home directory"),
            Err(e) => println!("Failed to load .env from home: {}", e),
          }
        }
      }

      // Print loaded config (without sensitive data)
      println!("Reading HC3 config:");
      println!("  HC3_HOST: {}", if std::env::var("HC3_HOST").is_ok() { "set" } else { "NOT SET" });
      println!("  HC3_USER: {}", if std::env::var("HC3_USER").is_ok() { "set" } else { "NOT SET" });
      println!("  HC3_PASSWORD: {}", if std::env::var("HC3_PASSWORD").is_ok() { "set" } else { "NOT SET" });
      println!("  HC3_PROTOCOL: {}", if std::env::var("HC3_PROTOCOL").is_ok() { "set" } else { "NOT SET" });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
