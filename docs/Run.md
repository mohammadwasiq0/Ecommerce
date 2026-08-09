# Run — Application Commands

## NPM Scripts (Recommended)

```bash
cd "C:\Users\ADS JOYA\Downloads\Ecommerce"

npm start       # Start the server
npm stop        # Stop / kill all Node processes
npm restart     # Stop then start again
```

The server runs on **http://localhost:3000**.

---

## Manual Commands

### Start

```bash
cd "C:\Users\ADS JOYA\Downloads\Ecommerce"
node server.js
```

### Run in Background (Windows)

```bash
cd "C:\Users\ADS JOYA\Downloads\Ecommerce"
node server.js > server_stdout.log 2>&1 &
```

### Stop / Kill the Running Process

**Option 1** — Kill by process name:

```bash
tskill node
```

**Option 2** — Find the PID and kill it:

```bash
netstat -ano | findstr :3000
```

Look for the `LISTENING` entry and note the PID (last column), then:

```bash
tskill <PID>
```

**Option 3** — Force kill all Node processes:

```bash
taskkill /F /IM node.exe
```

### Verify it Stopped

```bash
netstat -ano | findstr :3000
```

No output means the server is stopped. If you see `TIME_WAIT` entries (not `LISTENING`), the port will be free within a few seconds.
