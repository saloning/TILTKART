# TILT KART — GitHub Pages edition

No Node.js, npm, local server, or downloaded app required.

## Publish
1. Create a **public** GitHub repository (for example `tilt-kart`).
2. Upload **all files in this folder** to the repository root (not the outer folder). You can do this with GitHub **Add file → Upload files**, or with VS Code Source Control.
3. Open repository **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/(root)`, then Save.
4. After publishing, open `https://YOUR-USERNAME.github.io/tilt-kart/` on the laptop. GitHub Pages can take a few minutes to publish.
5. Wait until the lobby says **Room ready**. Share the **same website address** shown on the laptop. On phones, the website automatically opens the **Join Race** screen. Each player enters the 4-letter PIN shown on the laptop and their name; once connected, their steering, gas, brake, and boost controls appear. No separate URL is needed.
6. Click **START RACE** on laptop. Keep host tab open.

## Important
- This is **static hosting** with **PeerJS** WebRTC peer-to-peer connections, using PeerJS's public signaling server and potentially STUN/TURN infrastructure. It is **not offline** and not exclusively GitHub infrastructure.
- The public PeerJS server is best-effort and may be unavailable or blocked by some networks. Some restrictive NAT/firewall combinations will prevent joining.
- Phone tilt steering works on supported phones with motion permissions; HTTPS from GitHub Pages helps. Touch arrows are always available.
- Host is authoritative; it runs the race simulation and sends positions to phones. Up to eight players in one room. The 4-letter room ID can theoretically collide; the host retries on a collision.
- If the phone cannot join, verify the host lobby says **Room ready**, both devices have internet, and the code is correct.
- The game uses an external PeerJS JavaScript CDN, so internet is required.

## Phone screen routing
- Laptop/desktop: the main website opens the host race screen.
- Phone: the same website automatically redirects to `controller.html` for the PIN/name join screen and then the controls.
- To host from a mobile browser deliberately, add `?host=1` to the main website URL.
- After uploading updated files, allow a minute for GitHub Pages to deploy, then refresh both browsers.

## Race upgrades
Original scrolling road camera restored. Cars bounce from boundaries and one another. Gas is required to move (cars coast to a stop on release). Boost flames appear when GAS + BOOST are held. Start uses red signal lights and a four-second countdown. Pause/Resume is in the host header and freezes race simulation and countdown.


## Stadium visuals update
The original scrolling road remains, but the camera zoom now makes the racing surface take up most of the game canvas. The roadside grass and trees have been replaced by concrete grandstands, bleacher rows, safety fencing, and colorful crowds. The existing room PIN, phone controllers, collisions, boost flames, pause, and starting lights are unchanged.

## Closed circuit and live minimap
Each NEW TRACK creates a smooth, randomized **closed-loop** circuit with bends, a start/finish stripe, and three laps. The main camera follows the race around the course, retaining the large scrolling stadium road. Once the race starts, the right sidebar displays a complete map of the circuit with color-coded live player positions. Road boundaries, car collisions, boost flames, starting lights, gas control, and pause remain enabled.

## New: race map and turbo boost
- After pressing **START RACE**, the **LIVE TRACK MAP** replaces the joining instructions at the top of the **right sidebar**. It shows the complete circuit and moving, player-colored dots plus a name legend. The roster remains below it.
- On the phone, **hold GAS and BOOST simultaneously** to accelerate faster (610 versus 320 track units/second). Orange/yellow flames appear behind the kart while turbo is engaged. BRAKE overrides boost. Releasing GAS slows the car.
- If the published website still looks old, make sure you uploaded and committed **all six files** to the repository root, wait for GitHub Pages deployment, then hard-refresh the host and phone browsers.

## Leader camera and tilt-only steering
The main race camera centers on the leading kart (highest race progress), while the right-side minimap continues to show every racer. Steering comes only from phone orientation after tapping ENABLE TILT CONTROL and allowing motion permission. If tilt is unavailable, the car stays straight; gas, brake, and boost still work. GitHub Pages HTTPS is recommended for device orientation access.
