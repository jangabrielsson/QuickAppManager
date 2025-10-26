# HC3 QuickApp Manager

A desktop application for managing Fibaro HC3 QuickApps, built with Tauri 2.x.

## Features

- 🚀 Auto-updater with cryptographic signing
- 🔧 DevTools support for debugging
- 💬 Native OS dialogs
- 🔒 Secure .env configuration
- 📦 Cross-platform (macOS, Windows)

## Development

### Prerequisites

- Rust (latest stable)
- Cargo
- Node.js (for package management)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/jangabrielsson/QuickAppManager.git
cd QuickAppManager
```

2. Create a `.env` file (or `~/.env` in your home directory):
```bash
HC3_HOST=192.168.1.57
HC3_USER=admin
HC3_PASSWORD=yourpassword
HC3_PROTOCOL=http
```

### Running in Development

```bash
cd src-tauri
cargo tauri dev
```

### Building for Production

```bash
cd src-tauri
cargo tauri build
```

## Project Structure

```
QuickAppManager/
├── src/                    # Frontend (HTML/CSS/JS)
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/
│       └── default.json
└── .env.example           # Configuration template
```

## Configuration

The application reads HC3 credentials from a `.env` file in either:
1. The project root directory
2. Your home directory (`~/.env`)

Required environment variables:
- `HC3_HOST`: IP address of your HC3
- `HC3_USER`: HC3 username
- `HC3_PASSWORD`: HC3 password
- `HC3_PROTOCOL`: `http` or `https`

## Documentation

Comprehensive guides are available in the [`docs/`](docs/) directory:

- **[UPDATER_SETUP.md](docs/UPDATER_SETUP.md)** - Complete auto-updater setup with signing
- **[DEV_GUIDE.md](docs/DEV_GUIDE.md)** - Development workflow and commands
- **[CODESIGNING.md](docs/CODESIGNING.md)** - macOS code signing and notarization

See [docs/README.md](docs/README.md) for a complete index.

## License

MIT
